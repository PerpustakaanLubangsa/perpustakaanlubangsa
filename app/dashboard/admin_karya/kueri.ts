import { ringkas } from '../../karya-tulis/data';
import { dbAdmin } from './db';
import { DAFTAR_STATUS, UKURAN_HALAMAN, type KaryaAdmin, type StatusKarya } from './tipe';

// Berkas ini hanya dipakai di server (page.tsx dan actions.ts).
export const KOLOM = 'id, judul, isi, kategori, penulis, nis, anggota_id, slug, status, foto_url, dibuat_pada';

export interface Baris {
  id: string;
  judul: string;
  isi: string;
  kategori: string;
  penulis: string | null;
  nis: string | null;
  anggota_id: string | null;
  slug: string | null;
  status: StatusKarya;
  foto_url: string | null;
  dibuat_pada: string;
}

// Isi lengkap tidak ikut dikirim ke browser, hanya cuplikannya
export function keKaryaAdmin(b: Baris): KaryaAdmin {
  return {
    id: b.id,
    judul: b.judul,
    cuplikan: ringkas(b.isi, 240),
    kategori: b.kategori,
    penulis: b.penulis,
    nis: b.nis,
    santri: Boolean(b.anggota_id),
    slug: b.slug,
    status: b.status,
    foto_url: b.foto_url,
    dibuat_pada: b.dibuat_pada,
  };
}

export async function hitungPerStatus() {
  const db = dbAdmin();
  const hasil = await Promise.all(
    DAFTAR_STATUS.map(async (s) => {
      const { count } = await db.from('karya').select('id', { count: 'exact', head: true }).eq('status', s);
      return [s, count ?? 0] as const;
    })
  );
  return Object.fromEntries(hasil) as Record<StatusKarya, number>;
}

export async function ambilHalaman(status: StatusKarya, offset: number) {
  const { data, error, count } = await dbAdmin()
    .from('karya')
    .select(KOLOM, { count: 'exact' })
    .eq('status', status)
    // Antrean tinjauan dari yang paling lama, tab lain dari yang terbaru. id menjaga urutan tetap stabil.
    .order('dibuat_pada', { ascending: status === 'pending' })
    .order('id')
    .range(offset, offset + UKURAN_HALAMAN - 1);

  if (error) {
    console.error('Gagal memuat karya untuk petugas:', error);
    return { items: [] as KaryaAdmin[], total: 0, gagal: true };
  }
  return {
    items: ((data ?? []) as unknown as Baris[]).map(keKaryaAdmin),
    total: count ?? 0,
    gagal: false,
  };
}