import {
  KOLOM_MENTAH_LIST,
  bangunMentah,
  lengkapiTren,
  namaLokasi,
  rentang,
  type Butir,
  type Lokasi,
  type Pengunjung,
  type Statistik,
} from './konfigurasi';

const BATCH = 1000; // batas baris per permintaan di Supabase
export const MAKS_EKSPOR = 50000;

type Sel = string | number;

const hariIni = () => new Date().toISOString().slice(0, 10);
const persen = (n: number, total: number) => (total ? Math.round((n / total) * 1000) / 10 : 0);

export const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'data';

// exceljs dimuat hanya saat tombol ekspor diklik, supaya halaman tetap ringan
async function bukuBaru() {
  const ExcelJS = (await import('exceljs')).default;
  return new ExcelJS.Workbook();
}

type Buku = Awaited<ReturnType<typeof bukuBaru>>;

function tambahSheet(buku: Buku, nama: string, baris: Sel[][], lebar: number[], kepala: boolean) {
  const ws = buku.addWorksheet(nama);
  ws.columns = lebar.map((width) => ({ width }));
  ws.addRows(baris);
  if (kepala) {
    ws.getRow(1).font = { bold: true };
    ws.views = [{ state: 'frozen', ySplit: 1 }];
  }
}

async function unduh(buku: Buku, berkas: string) {
  const buffer = await buku.xlsx.writeBuffer();
  const blob = new Blob([buffer as ArrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = berkas;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Semua grafik pada satu lokasi dalam satu file Excel (satu sheet per grafik)
export async function eksporRingkasan(s: Statistik, l: Lokasi) {
  const buku = await bukuBaru();
  const { total, unik, hari_aktif } = s.ringkasan;

  const tabel = (judul: string, data: Butir[], pembanding: number): Sel[][] => [
    ['No', judul, 'Jumlah', 'Persen (%)'],
    ...data.map((b, i) => [i + 1, b.k, b.n, persen(b.n, pembanding)]),
  ];
  const jumlah = (d: Butir[]) => d.reduce((a, b) => a + b.n, 0);

  tambahSheet(
    buku,
    'Ringkasan',
    [
      ['Lokasi', namaLokasi(l)],
      [],
      ['Total kunjungan', total],
      ['Pengunjung unik', unik],
      ['Hari aktif', hari_aktif],
      ['Rata-rata per hari aktif', hari_aktif ? Math.round((total / hari_aktif) * 10) / 10 : 0],
      [],
      ['Diekspor pada', hariIni()],
    ],
    [26, 36],
    false,
  );

  const waktu = lengkapiTren(s.tren, l);
  tambahSheet(
    buku,
    'Waktu',
    tabel('Periode', waktu.map((t) => ({ k: t.label, n: t.n })), jumlah(waktu)),
    [6, 18, 10, 12],
    true,
  );
  tambahSheet(buku, 'Aktivitas', tabel('Aktivitas', s.aktivitas, jumlah(s.aktivitas)), [6, 28, 10, 12], true);
  tambahSheet(buku, 'Kategori', tabel('Kategori', s.kategori, jumlah(s.kategori)), [6, 28, 10, 12], true);
  tambahSheet(buku, 'Jenjang', tabel('Jenjang', s.jenjang, jumlah(s.jenjang)), [6, 28, 10, 12], true);
  tambahSheet(buku, 'Anggota terbanyak', tabel('Nama', s.nama, total), [6, 34, 10, 12], true);
  tambahSheet(buku, 'Buku populer', tabel('Judul Buku', s.buku, total), [6, 50, 10, 12], true);

  await unduh(buku, `data-pengunjung-${slug(namaLokasi(l))}-ringkasan-${hariIni()}.xlsx`);
}

// Data mentah pada satu lokasi, diambil per 1.000 baris
export async function eksporMentah(l: Lokasi, onProgres: (n: number) => void) {
  const buku = await bukuBaru();
  const { dari, sampai } = rentang(l);
  const semua: Pengunjung[] = [];

  for (let mulai = 0; mulai < MAKS_EKSPOR; mulai += BATCH) {
    const { data, error } = await bangunMentah(dari, sampai, false).range(mulai, mulai + BATCH - 1);
    if (error) throw error;
    const potong = (data ?? []) as Pengunjung[];
    semua.push(...potong);
    onProgres(semua.length);
    if (potong.length < BATCH) break;
  }

  // Nilai teks tetap teks di Excel, jadi angka 0 di depan NIS tidak hilang
  const baris: Sel[][] = [
    ['No', ...KOLOM_MENTAH_LIST.map((k) => k.judul)],
    ...semua.map((b, i) => [i + 1, ...KOLOM_MENTAH_LIST.map((k) => b[k.kunci] ?? '')]),
  ];

  tambahSheet(buku, 'Data Mentah', baris, [6, 18, 30, 16, 12, 12, 40, 16, 16], true);
  await unduh(buku, `data-pengunjung-${slug(namaLokasi(l))}-mentah-${hariIni()}.xlsx`);
  return semua.length;
}