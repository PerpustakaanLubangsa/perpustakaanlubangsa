// Jumlah karya yang dimuat per halaman. Kecil agar halaman tetap ringan.
export const UKURAN_HALAMAN = 10;

export const DAFTAR_STATUS = ['pending', 'approved', 'rejected'] as const;
export type StatusKarya = (typeof DAFTAR_STATUS)[number];

export const adalahStatus = (nilai: string): nilai is StatusKarya =>
  (DAFTAR_STATUS as readonly string[]).includes(nilai);

// Versi ringan untuk daftar: hanya cuplikan, isi lengkap diambil saat karya dibuka untuk diedit
export interface KaryaAdmin {
  id: string;
  judul: string;
  cuplikan: string;
  kategori: string;
  penulis: string | null;
  nis: string | null;
  santri: boolean;
  slug: string | null;
  status: StatusKarya;
  foto_url: string | null;
  dibuat_pada: string;
}

export interface KaryaEdit {
  id: string;
  judul: string;
  kategori: string;
  penulis: string;
  isi: string;
  foto_url: string;
}

export interface MasukanEdit {
  judul: string;
  kategori: string;
  penulis: string;
  isi: string;
  foto_url: string;
}