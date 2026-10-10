import { supabase } from '@/lib/supabase';

export type Lokasi = { tahun: number | null; bulan: number | null; minggu: number | null };
export type Tingkat = 'tahun' | 'bulan' | 'minggu' | 'hari';
export type Butir = { k: string; n: number };
export type TitikTren = { k: number; n: number };
export type IsiFolder = { k: number; n: number; unik: number };

export type Statistik = {
  ringkasan: { total: number; unik: number; hari_aktif: number };
  tren: TitikTren[];
  aktivitas: Butir[];
  kategori: Butir[];
  jenjang: Butir[];
  nama: Butir[];
  buku: Butir[];
};

export type Pengunjung = {
  id: string;
  nama: string | null;
  kamar: string | null;
  jenjang: string | null;
  judul_buku: string | null;
  kategori: string | null;
  aktivitas: string | null;
  tanggal_kunjungan: string | null;
  created_at: string | null;
  id_anggota: string | null;
  nis: string | null;
};

export type TitikWaktu = { k: string; label: string; n: number; aktif: boolean };

export type TabGrafik = 'waktu' | 'aktivitas' | 'kategori' | 'jenjang' | 'anggota' | 'buku';

export const TAB_GRAFIK: { kunci: TabGrafik; label: string; judul: string }[] = [
  { kunci: 'waktu', label: 'Grafik waktu', judul: 'Kunjungan menurut waktu' },
  { kunci: 'aktivitas', label: 'Aktivitas', judul: 'Perbandingan aktivitas' },
  { kunci: 'kategori', label: 'Kategori', judul: 'Perbandingan kategori' },
  { kunci: 'jenjang', label: 'Jenjang', judul: 'Perbandingan jenjang' },
  { kunci: 'anggota', label: 'Anggota terbanyak', judul: 'Anggota paling sering berkunjung' },
  { kunci: 'buku', label: 'Buku populer', judul: 'Buku paling populer' },
];

export type SpesifikasiGrafik =
  | { jenis: 'waktu'; data: TitikWaktu[] }
  | { jenis: 'donut' | 'batang'; data: Butir[]; total: number };

export const LOKASI_AWAL: Lokasi = { tahun: null, bulan: null, minggu: null };

export const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];
export const BULAN_SINGKAT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

export const KOLOM_MENTAH_LIST: { kunci: keyof Pengunjung; judul: string }[] = [
  { kunci: 'tanggal_kunjungan', judul: 'Tanggal Kunjungan' },
  { kunci: 'nama', judul: 'Nama' },
  { kunci: 'nis', judul: 'NIS' },
  { kunci: 'kamar', judul: 'Kamar' },
  { kunci: 'jenjang', judul: 'Jenjang' },
  { kunci: 'judul_buku', judul: 'Judul Buku' },
  { kunci: 'kategori', judul: 'Kategori' },
  { kunci: 'aktivitas', judul: 'Aktivitas' },
];

const KOLOM_MENTAH =
  'id, nama, kamar, jenjang, judul_buku, kategori, aktivitas, tanggal_kunjungan, created_at, id_anggota, nis';

const dua = (n: number) => String(n).padStart(2, '0');

// Minggu = blok 7 hari: 1–7, 8–14, 15–21, 22–28, 29–akhir bulan
export function rentang(l: Lokasi): { dari: string | null; sampai: string | null } {
  if (!l.tahun) return { dari: null, sampai: null };
  if (!l.bulan) return { dari: `${l.tahun}-01-01`, sampai: `${l.tahun}-12-31` };
  const akhir = new Date(l.tahun, l.bulan, 0).getDate();
  const b = dua(l.bulan);
  if (!l.minggu) return { dari: `${l.tahun}-${b}-01`, sampai: `${l.tahun}-${b}-${dua(akhir)}` };
  const awal = (l.minggu - 1) * 7 + 1;
  const tutup = l.minggu >= 5 ? akhir : l.minggu * 7;
  return { dari: `${l.tahun}-${b}-${dua(awal)}`, sampai: `${l.tahun}-${b}-${dua(tutup)}` };
}

// Tingkat sumbu grafik waktu = tingkat folder di bawahnya
export function tingkatTren(l: Lokasi): Tingkat {
  if (!l.tahun) return 'tahun';
  if (!l.bulan) return 'bulan';
  if (!l.minggu) return 'minggu';
  return 'hari';
}

export const samaLokasi = (a: Lokasi, b: Lokasi) =>
  a.tahun === b.tahun && a.bulan === b.bulan && a.minggu === b.minggu;

export function namaLokasi(l: Lokasi) {
  if (!l.tahun) return 'Semua tahun';
  if (!l.bulan) return `Tahun ${l.tahun}`;
  if (!l.minggu) return `${NAMA_BULAN[l.bulan - 1]} ${l.tahun}`;
  return `Minggu ${l.minggu}, ${NAMA_BULAN[l.bulan - 1]} ${l.tahun}`;
}

export function gabungLainnya(data: Butir[], maks = 6): Butir[] {
  if (data.length <= maks) return data;
  const sisa = data.slice(maks).reduce((a, b) => a + b.n, 0);
  return [...data.slice(0, maks), { k: 'Lainnya', n: sisa }];
}

// Lengkapi periode yang kosong supaya sumbu waktu selalu utuh
export function lengkapiTren(tren: TitikTren[], l: Lokasi): TitikWaktu[] {
  const t = tingkatTren(l);
  const peta = new Map(tren.map((b) => [b.k, b.n]));
  const titik = (k: number, label: string): TitikWaktu => ({ k: String(k), label, n: peta.get(k) ?? 0, aktif: false });

  if (t === 'tahun') {
    const kunci = tren.map((b) => b.k);
    if (kunci.length === 0) return [];
    const awal = Math.min(...kunci);
    const akhir = Math.max(...kunci);
    return Array.from({ length: akhir - awal + 1 }, (_, i) => titik(awal + i, String(awal + i)));
  }
  if (t === 'bulan') return BULAN_SINGKAT.map((b, i) => titik(i + 1, b));
  if (t === 'minggu') return [1, 2, 3, 4, 5].map((m) => titik(m, `M${m}`));

  const { dari, sampai } = rentang(l);
  const awal = Number((dari ?? '').slice(8));
  const akhir = Number((sampai ?? '').slice(8));
  return Array.from({ length: Math.max(0, akhir - awal + 1) }, (_, i) => titik(awal + i, String(awal + i)));
}

const jumlah = (d: Butir[]) => d.reduce((a, b) => a + b.n, 0);

// Satu bentuk data untuk layar, gambar PNG, dan Excel
export function spesifikasi(s: Statistik, tab: TabGrafik, l: Lokasi): SpesifikasiGrafik {
  switch (tab) {
    case 'waktu':
      return { jenis: 'waktu', data: lengkapiTren(s.tren, l) };
    case 'aktivitas':
      return { jenis: 'donut', data: gabungLainnya(s.aktivitas), total: jumlah(s.aktivitas) };
    case 'jenjang':
      return { jenis: 'donut', data: gabungLainnya(s.jenjang), total: jumlah(s.jenjang) };
    case 'kategori':
      return { jenis: 'batang', data: s.kategori, total: jumlah(s.kategori) };
    case 'anggota':
      return { jenis: 'batang', data: s.nama, total: s.ringkasan.total };
    case 'buku':
      return { jenis: 'batang', data: s.buku, total: s.ringkasan.total };
  }
}

export const tanggalIndo = (t: string | null) => {
  if (!t) return '—';
  const d = new Date(`${t}T00:00:00`);
  return Number.isNaN(d.getTime())
    ? t
    : d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
};

export function bangunMentah(dari: string | null, sampai: string | null, hitung: boolean) {
  let k = supabase
    .from('data_pengunjung')
    .select(KOLOM_MENTAH, { count: hitung ? 'exact' : undefined })
    .not('tanggal_kunjungan', 'is', null);
  if (dari) k = k.gte('tanggal_kunjungan', dari);
  if (sampai) k = k.lte('tanggal_kunjungan', sampai);

  // `id` sebagai pembeda terakhir agar urutan antar halaman tidak melompat
  return k
    .order('tanggal_kunjungan', { ascending: false })
    .order('created_at', { ascending: false, nullsFirst: false })
    .order('id', { ascending: true });
}

// Gaya tombol: kotak sudut sedikit bulat, timbul, turun seperti ditekan saat hover/sentuh/klik. Tanpa blur.
const dasarTombol =
  'inline-flex cursor-pointer touch-manipulation select-none items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-[transform,box-shadow] duration-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [@media(hover:hover)]:hover:translate-y-1 [@media(hover:hover)]:hover:shadow-none active:translate-y-1 active:shadow-none';
export const tombolUtama = `${dasarTombol} border-blue-800 bg-blue-600 text-white shadow-[0_4px_0_0_#1e40af]`;
export const tombolSekunder = `${dasarTombol} border-slate-300 bg-white text-slate-700 shadow-[0_4px_0_0_#cbd5e1]`;