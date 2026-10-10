import {
  KOLOM_MENTAH_LIST,
  NAMA_HARI,
  bangunMentah,
  deskripsiDim,
  deskripsiWaktu,
  labelTren,
  tingkatTren,
  type Butir,
  type FilterDim,
  type Pengunjung,
  type Statistik,
  type Waktu,
} from './konfigurasi';

const BATCH = 1000; // batas baris per permintaan di Supabase
export const MAKS_EKSPOR = 50000;

const hariIni = () => new Date().toISOString().slice(0, 10);
const persen = (n: number, total: number) => (total ? Math.round((n / total) * 1000) / 10 : 0);

type Sel = string | number;

// Ringkasan semua grafik dalam satu file Excel (satu sheet per grafik)
export async function eksporRingkasan(s: Statistik, w: Waktu, f: FilterDim) {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();
  const { total, unik, hari_aktif } = s.ringkasan;
  const tingkat = tingkatTren(w);

  const tambah = (nama: string, baris: Sel[][], lebar: number[]) => {
    const ws = XLSX.utils.aoa_to_sheet(baris);
    ws['!cols'] = lebar.map((wch) => ({ wch }));
    XLSX.utils.book_append_sheet(wb, ws, nama);
  };

  const tabel = (judul: string, data: Butir[], pembanding: number, label?: (k: string) => string): Sel[][] => [
    ['No', judul, 'Jumlah', 'Persen (%)'],
    ...data.map((b, i) => [i + 1, label ? label(b.k) : b.k, b.n, persen(b.n, pembanding)]),
  ];

  tambah(
    'Ringkasan',
    [
      ['Rentang waktu', deskripsiWaktu(w)],
      ['Filter', deskripsiDim(f)],
      [],
      ['Total kunjungan', total],
      ['Pengunjung unik', unik],
      ['Hari aktif', hari_aktif],
      ['Rata-rata per hari aktif', hari_aktif ? Math.round((total / hari_aktif) * 10) / 10 : 0],
      [],
      ['Diekspor pada', hariIni()],
    ],
    [26, 48],
  );

  const totalTren = s.tren.reduce((a, b) => a + b.n, 0);
  const judulTren = tingkat === 'tahun' ? 'Tahun' : tingkat === 'bulan' ? 'Bulan' : 'Hari';
  tambah('Tren', tabel(judulTren, s.tren, totalTren, (k) => labelTren(k, tingkat)), [6, 22, 10, 12]);
  tambah('Jenjang', tabel('Jenjang', s.jenjang, total), [6, 28, 10, 12]);
  tambah('Kategori', tabel('Kategori', s.kategori, total), [6, 28, 10, 12]);
  tambah('Aktivitas', tabel('Aktivitas', s.aktivitas, total), [6, 28, 10, 12]);
  tambah('Kamar (10 teratas)', tabel('Kamar', s.kamar, total), [6, 28, 10, 12]);
  tambah('Buku (10 teratas)', tabel('Judul Buku', s.buku, total), [6, 50, 10, 12]);
  tambah('Pengunjung (10 teratas)', tabel('Nama', s.nama, total), [6, 34, 10, 12]);
  tambah('Hari', tabel('Hari', s.minggu, total, (k) => NAMA_HARI[Number(k) - 1] ?? k), [6, 16, 10, 12]);

  XLSX.writeFile(wb, `data-pengunjung-ringkasan-${hariIni()}.xlsx`);
}

// Data mentah sesuai filter aktif, diambil per 1.000 baris
export async function eksporMentah(w: Waktu, f: FilterDim, onProgres: (n: number) => void) {
  const XLSX = await import('xlsx');
  const semua: Pengunjung[] = [];

  for (let dari = 0; dari < MAKS_EKSPOR; dari += BATCH) {
    const { data, error } = await bangunMentah(w, f, false).range(dari, dari + BATCH - 1);
    if (error) throw error;
    const potong = (data ?? []) as Pengunjung[];
    semua.push(...potong);
    onProgres(semua.length);
    if (potong.length < BATCH) break;
  }

  const baris: Sel[][] = [
    ['No', ...KOLOM_MENTAH_LIST.map((k) => k.judul)],
    ...semua.map((b, i) => [i + 1, ...KOLOM_MENTAH_LIST.map((k) => b[k.kunci] ?? '')]),
  ];

  // Nilai teks tetap teks di Excel, jadi angka 0 di depan NIS tidak hilang
  const ws = XLSX.utils.aoa_to_sheet(baris);
  ws['!cols'] = [6, 18, 30, 16, 12, 12, 40, 16, 16].map((wch) => ({ wch }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data Mentah');
  XLSX.writeFile(wb, `data-pengunjung-mentah-${hariIni()}.xlsx`);
  return semua.length;
}