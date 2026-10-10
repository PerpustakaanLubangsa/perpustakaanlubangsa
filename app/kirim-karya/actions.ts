'use server';

import { randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { supabase as supabasePublik } from '@/lib/supabase';
import {
  BATAS,
  KATEGORI_KARYA,
  type AnggotaHasil,
  type HasilCari,
  type HasilKirim,
  type NamaField,
} from './konfigurasi';

// Jika SUPABASE_SERVICE_ROLE_KEY tersedia (hanya di server), pakai itu agar pencarian anggota
// dan penyimpanan karya tidak terhalang RLS. Kunci ini tidak pernah dikirim ke browser.
const db =
  process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL
    ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false },
      })
    : supabasePublik;

const POLA_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function buatSlug(judul: string) {
  const dasar =
    judul
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60)
      .replace(/-+$/g, '') || 'karya';
  // Akhiran acak menjaga slug tetap unik tanpa perlu query tambahan
  return `${dasar}-${randomBytes(3).toString('hex')}`;
}

// Hanya 3 digit terakhir yang terlihat, cukup untuk membedakan nama yang sama
function samarkanNis(nis: string) {
  if (nis.length <= 3) return nis;
  return `${'•'.repeat(Math.min(nis.length - 3, 6))}${nis.slice(-3)}`;
}

const teks = (fd: FormData, nama: string) => {
  const nilai = fd.get(nama);
  return typeof nilai === 'string' ? nilai : '';
};

// Pencarian anggota untuk dropdown: dibatasi jumlah hasil dan hanya kolom yang perlu
export async function cariAnggota(kueri: string): Promise<HasilCari> {
  // Buang karakter yang punya arti khusus di filter PostgREST / pola ilike
  const q = String(kueri ?? '')
    .replace(/[%_,()*\\"']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60);

  if (q.length < BATAS.kueriMin) return { hasil: [] };

  const { data, error } = await db
    .from('anggota')
    .select('id, nama, nis, jenjang, organisasi')
    .or(`nama.ilike.%${q}%,nis.eq.${q}`)
    .order('nama', { ascending: true })
    .limit(BATAS.hasilMaks);

  if (error) {
    console.error('Gagal mencari anggota:', error);
    return { hasil: [], galat: true };
  }

  const hasil: AnggotaHasil[] = (data ?? []).map((a) => ({
    id: a.id,
    nama: a.nama,
    nisSamar: samarkanNis(String(a.nis ?? '')),
    jenjang: a.jenjang,
    organisasi: a.organisasi ?? null,
  }));

  return { hasil };
}

export async function kirimKarya(_sebelumnya: HasilKirim, formData: FormData): Promise<HasilKirim> {
  // Kolom jebakan untuk bot: manusia tidak pernah melihat atau mengisinya
  if (teks(formData, 'situs')) {
    return { status: 'gagal', pesan: 'Pengiriman ditolak.', galat: {} };
  }

  const anggotaId = teks(formData, 'anggota_id').trim();
  const penulisInput = teks(formData, 'penulis').replace(/\s+/g, ' ').trim();
  const kategori = teks(formData, 'kategori').trim();
  const judul = teks(formData, 'judul').replace(/\s+/g, ' ').trim();
  const isi = teks(formData, 'isi').replace(/\r\n?/g, '\n').trim();

  const galat: Partial<Record<NamaField, string>> = {};

  if (!POLA_UUID.test(anggotaId)) galat.anggota = 'Cari dan pilih nama Anda dari daftar anggota perpustakaan.';
  if (penulisInput.length > BATAS.penulisMaks) galat.penulis = `Nama penulis maksimal ${BATAS.penulisMaks} karakter.`;
  if (!(KATEGORI_KARYA as readonly string[]).includes(kategori)) galat.kategori = 'Pilih salah satu kategori.';
  if (judul.length < BATAS.judulMin) galat.judul = `Judul minimal ${BATAS.judulMin} karakter.`;
  else if (judul.length > BATAS.judulMaks) galat.judul = `Judul maksimal ${BATAS.judulMaks} karakter.`;
  if (isi.length < BATAS.isiMin) galat.isi = `Isi karya minimal ${BATAS.isiMin} karakter.`;
  else if (isi.length > BATAS.isiMaks) galat.isi = `Isi karya maksimal ${BATAS.isiMaks.toLocaleString('id-ID')} karakter.`;

  if (Object.keys(galat).length > 0) {
    return { status: 'gagal', pesan: 'Periksa kembali bagian yang ditandai.', galat };
  }

  // Pastikan anggota benar-benar ada. Nama dipakai sebagai cadangan jika penulis dikosongkan.
  const { data: anggota, error: errAnggota } = await db
    .from('anggota')
    .select('id, nama')
    .eq('id', anggotaId)
    .maybeSingle();

  if (errAnggota) {
    console.error('Gagal memverifikasi anggota:', errAnggota);
    return { status: 'gagal', pesan: 'Verifikasi anggota gagal. Coba lagi beberapa saat lagi.', galat: {} };
  }
  if (!anggota) {
    return {
      status: 'gagal',
      pesan: 'Anggota tidak ditemukan.',
      galat: { anggota: 'Anggota tidak ditemukan. Cari dan pilih ulang nama Anda.' },
    };
  }

  // nis, organisasi, status_anggota, dan nama_anggota diisi otomatis oleh Supabase dari tabel anggota,
  // jadi tidak dikirim dari sini. `penulis` adalah nama tampil pilihan pengirim (boleh nama pena).
  const { error: errSimpan } = await db.from('karya').insert({
    anggota_id: anggota.id,
    kategori,
    judul,
    isi,
    penulis: penulisInput || anggota.nama || null,
    slug: buatSlug(judul),
    status: 'pending',
    dibuat_pada: new Date().toISOString(),
  });

  if (errSimpan) {
    console.error('Gagal menyimpan karya:', errSimpan);
    return { status: 'gagal', pesan: 'Karya belum tersimpan. Coba kirim ulang beberapa saat lagi.', galat: {} };
  }

  // Tidak ada revalidatePath: karya pending belum tampil di galeri
  return { status: 'sukses', judul };
}