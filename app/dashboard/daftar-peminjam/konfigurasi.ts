export const TABLE = 'sirkulasi';
export const COLUMNS = 'id, tgl_pinjam, nis, nama_anggota, kode_eksemplar, judul_buku, kamar, penulis';

// Jumlah data per "Muat Lebih Banyak"
export const PAGE_SIZE = 20;
// Batas baris per request (default maksimum Supabase = 1000). Hanya dipakai saat salin/ekspor
export const EXPORT_BATCH = 1000;

// Masa pinjam 5 hari: pinjam tgl 1 -> batas tgl 5 -> tgl 6 sudah terlambat
export const LOAN_DAYS = 5;
// Denda per hari keterlambatan
export const FINE_PER_DAY = 1000;

export const DAY_MS = 86_400_000;

export type Scope = 'all' | 'late';
export type Action = 'copy' | 'excel';

export interface Loan {
  id: number;
  nama: string;
  nis: string;
  kamar: string;
  judul: string;
  penulis: string;
  kode: string;
  tglPinjam: Date;
  jatuhTempo: Date;
  hariTerlambat: number; // 0 jika belum terlambat
  sisaHari: number; // 0 jika sudah lewat / hari terakhir
  denda: number;
}

export interface Counts {
  borrowed: number | null;
  late: number | null;
  terlamaHari: number | null;
}

export const dateFormatter = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const rupiahFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

export const rupiah = (n: number) => rupiahFormatter.format(n);

export const TITLE = 'Daftar Peminjam';
export const SUBTITLE = `Buku yang sedang dipinjam. Terlambat setelah batas ${LOAN_DAYS} hari, denda ${rupiah(
  FINE_PER_DAY,
)} per hari.`;