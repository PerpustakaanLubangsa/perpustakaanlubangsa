// Pengaturan halaman kirim karya. Sesuaikan bagian bertanda "SESUAIKAN" dengan database Anda.

// SESUAIKAN: kolom di tabel `anggota` yang berisi NIS. Dipakai untuk label dan pencarian.
export const LABEL_IDENTITAS = 'NIS';

// Kategori yang bisa dipilih. Kategori puisi/sajak/syair/pantun/lirik otomatis tampil rata kiri
// di halaman detail karena regex di page.tsx.
export const KATEGORI_KARYA = ['Esai', 'Opini', 'Cerpen', 'Puisi', 'Syair', 'Pantun', 'Resensi', 'Artikel'] as const;

export const BATAS = {
  judulMin: 5,
  judulMaks: 120,
  isiMin: 100,
  isiMaks: 20000,
  penulisMaks: 80,
  // Pencarian anggota
  kueriMin: 2,
  hasilMaks: 8,
  debounceMs: 350,
} as const;

export type NamaField = 'anggota' | 'penulis' | 'kategori' | 'judul' | 'isi';

// Data anggota yang boleh sampai ke browser (NIS sudah disamarkan di server)
export type AnggotaHasil = {
  id: string;
  nama: string;
  nisSamar: string;
  jenjang: string;
  organisasi: string | null;
};

export type HasilCari = { hasil: AnggotaHasil[]; galat?: boolean };

export type HasilKirim =
  | { status: 'awal' }
  // Karya baru berstatus pending, jadi belum ada alamat publik untuk ditautkan
  | { status: 'sukses'; judul: string }
  | { status: 'gagal'; pesan: string; galat: Partial<Record<NamaField, string>> };