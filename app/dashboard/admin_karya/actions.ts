'use server';

import { revalidatePath } from 'next/cache';
import { BATAS } from '../../kirim-karya/konfigurasi';
import { dbAdmin } from './db';
import { KOLOM, ambilHalaman, keKaryaAdmin, type Baris } from './kueri';
import { adalahStatus, type KaryaAdmin, type KaryaEdit, type MasukanEdit } from './tipe';

export type HasilAksi = { ok: true } | { ok: false; pesan: string };

const HALAMAN_ADMIN = '/dashboard/admin_karya';
const TANPA_AKSES = 'Anda tidak punya akses.';

// Login dan sidebar sudah ditangani di tempat lain, jadi tidak ada pemeriksaan sesi di sini.
// Catatan: server action tetap bisa dipanggil langsung lewat HTTP. Jika sistem login Anda
// menyediakan cara membaca sesi di server, panggil di fungsi ini dan kembalikan false untuk
// non-petugas.
async function pastikanPetugas(): Promise<boolean> {
  return true;
}

function bersihkanCache(slug: string | null) {
  revalidatePath('/karya-tulis');
  if (slug) revalidatePath(`/karya-tulis/${encodeURIComponent(slug)}`);
  revalidatePath(HALAMAN_ADMIN);
}

function urlGambarValid(nilai: string) {
  try {
    const u = new URL(nilai);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export async function muatKarya(
  status: string,
  offset: number
): Promise<{ ok: true; items: KaryaAdmin[]; total: number } | { ok: false; pesan: string }> {
  if (!(await pastikanPetugas())) return { ok: false, pesan: TANPA_AKSES };
  if (!adalahStatus(status) || !Number.isInteger(offset) || offset < 0) {
    return { ok: false, pesan: 'Permintaan tidak valid.' };
  }
  const hasil = await ambilHalaman(status, offset);
  if (hasil.gagal) return { ok: false, pesan: 'Karya gagal dimuat. Coba lagi.' };
  return { ok: true, items: hasil.items, total: hasil.total };
}

export async function ambilKarya(
  id: string
): Promise<{ ok: true; karya: KaryaEdit } | { ok: false; pesan: string }> {
  if (!(await pastikanPetugas())) return { ok: false, pesan: TANPA_AKSES };

  const { data, error } = await dbAdmin()
    .from('karya')
    .select('id, judul, kategori, penulis, isi, foto_url')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Gagal mengambil karya:', error);
    return { ok: false, pesan: 'Karya gagal dimuat. Coba lagi.' };
  }
  if (!data) return { ok: false, pesan: 'Karya tidak ditemukan. Mungkin sudah dihapus.' };

  return {
    ok: true,
    karya: {
      id: data.id,
      judul: data.judul,
      kategori: data.kategori,
      penulis: data.penulis ?? '',
      isi: data.isi,
      foto_url: data.foto_url ?? '',
    },
  };
}

export async function simpanKarya(
  id: string,
  masukan: MasukanEdit
): Promise<{ ok: true; item: KaryaAdmin } | { ok: false; pesan: string }> {
  if (!(await pastikanPetugas())) return { ok: false, pesan: TANPA_AKSES };

  const judul = String(masukan.judul ?? '').replace(/\s+/g, ' ').trim();
  const kategori = String(masukan.kategori ?? '').trim();
  const penulis = String(masukan.penulis ?? '').replace(/\s+/g, ' ').trim();
  const isi = String(masukan.isi ?? '').replace(/\r\n?/g, '\n').trim();
  const fotoUrl = String(masukan.foto_url ?? '').trim();

  if (judul.length < 3) return { ok: false, pesan: 'Judul minimal 3 karakter.' };
  if (judul.length > BATAS.judulMaks) return { ok: false, pesan: `Judul maksimal ${BATAS.judulMaks} karakter.` };
  if (!kategori || kategori.length > 40) return { ok: false, pesan: 'Kategori wajib diisi (maksimal 40 karakter).' };
  if (penulis.length > BATAS.penulisMaks) return { ok: false, pesan: `Nama penulis maksimal ${BATAS.penulisMaks} karakter.` };
  if (!isi) return { ok: false, pesan: 'Isi karya tidak boleh kosong.' };
  if (isi.length > BATAS.isiMaks) return { ok: false, pesan: `Isi karya maksimal ${BATAS.isiMaks.toLocaleString('id-ID')} karakter.` };
  if (fotoUrl && (fotoUrl.length > 2000 || !urlGambarValid(fotoUrl))) {
    return { ok: false, pesan: 'URL gambar tidak valid. Gunakan alamat yang diawali http:// atau https://.' };
  }

  const { data, error } = await dbAdmin()
    .from('karya')
    .update({
      judul,
      kategori,
      penulis: penulis || null,
      isi,
      foto_url: fotoUrl || null,
    })
    .eq('id', id)
    .select(KOLOM)
    .maybeSingle();

  if (error) {
    console.error('Gagal menyimpan perubahan karya:', error);
    return {
      ok: false,
      pesan: 'Perubahan gagal disimpan. Pastikan izin update kolom judul, kategori, penulis, isi, dan foto_url sudah diberikan di Supabase.',
    };
  }
  if (!data) return { ok: false, pesan: 'Karya tidak ditemukan. Mungkin sudah dihapus.' };

  const baris = data as unknown as Baris;
  bersihkanCache(baris.slug);
  return { ok: true, item: keKaryaAdmin(baris) };
}

export async function ubahStatus(id: string, status: string): Promise<HasilAksi> {
  if (!(await pastikanPetugas())) return { ok: false, pesan: TANPA_AKSES };
  if (!adalahStatus(status)) return { ok: false, pesan: 'Status tidak valid.' };

  const { data, error } = await dbAdmin()
    .from('karya')
    .update({ status })
    .eq('id', id)
    .select('slug')
    .maybeSingle();

  if (error) {
    console.error('Gagal mengubah status karya:', error);
    return { ok: false, pesan: 'Status gagal diubah. Coba lagi.' };
  }
  if (!data) return { ok: false, pesan: 'Karya tidak ditemukan. Mungkin sudah dihapus.' };

  bersihkanCache(data.slug);
  return { ok: true };
}

export async function hapusKarya(id: string): Promise<HasilAksi> {
  if (!(await pastikanPetugas())) return { ok: false, pesan: TANPA_AKSES };

  const { data, error } = await dbAdmin().from('karya').delete().eq('id', id).select('slug').maybeSingle();

  if (error) {
    console.error('Gagal menghapus karya:', error);
    return { ok: false, pesan: 'Karya gagal dihapus. Coba lagi.' };
  }

  bersihkanCache(data?.slug ?? null);
  return { ok: true };
}