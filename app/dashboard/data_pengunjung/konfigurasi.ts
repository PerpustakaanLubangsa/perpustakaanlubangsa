import { supabase } from '@/lib/supabase';

export type Butir = { k: string; n: number };

export type Statistik = {
  ringkasan: { total: number; unik: number; hari_aktif: number };
  tren: Butir[];
  jenjang: Butir[];
  kategori: Butir[];
  aktivitas: Butir[];
  kamar: Butir[];
  buku: Butir[];
  nama: Butir[];
  minggu: Butir[];
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

export type DimKey = 'jenjang' | 'kategori' | 'aktivitas' | 'kamar' | 'buku' | 'nama';
export type FilterDim = Partial<Record<DimKey, string>>;
export type Waktu = { tahun: number | null; bulan: number | null; hari: number | null };
export type Tingkat = 'tahun' | 'bulan' | 'hari';

export const TIDAK_DIISI = 'Tidak diisi';
export const WAKTU_AWAL: Waktu = { tahun: null, bulan: null, hari: null };

export const DIM: Record<DimKey, { label: string; kolom: string }> = {
  jenjang: { label: 'Jenjang', kolom: 'jenjang' },
  kategori: { label: 'Kategori', kolom: 'kategori' },
  aktivitas: { label: 'Aktivitas', kolom: 'aktivitas' },
  kamar: { label: 'Kamar', kolom: 'kamar' },
  buku: { label: 'Buku', kolom: 'judul_buku' },
  nama: { label: 'Pengunjung', kolom: 'nama' },
};

export const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];
export const BULAN_SINGKAT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
export const NAMA_HARI = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
export const HARI_SINGKAT = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

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

// Rentang tanggal dari pilihan waktu. `termasukHari` false = rentang induk (untuk grafik tren).
export function rentang(w: Waktu, termasukHari: boolean): { dari: string | null; sampai: string | null } {
  if (!w.tahun) return { dari: null, sampai: null };
  if (!w.bulan) return { dari: `${w.tahun}-01-01`, sampai: `${w.tahun}-12-31` };
  if (w.hari && termasukHari) {
    const t = `${w.tahun}-${dua(w.bulan)}-${dua(w.hari)}`;
    return { dari: t, sampai: t };
  }
  const akhir = new Date(w.tahun, w.bulan, 0).getDate();
  return { dari: `${w.tahun}-${dua(w.bulan)}-01`, sampai: `${w.tahun}-${dua(w.bulan)}-${dua(akhir)}` };
}

export function tanggalHari(w: Waktu): string | null {
  return w.tahun && w.bulan && w.hari ? `${w.tahun}-${dua(w.bulan)}-${dua(w.hari)}` : null;
}

export function tingkatTren(w: Waktu): Tingkat {
  if (!w.tahun) return 'tahun';
  if (!w.bulan) return 'bulan';
  return 'hari';
}

export function deskripsiWaktu(w: Waktu) {
  if (!w.tahun) return 'Semua waktu';
  if (!w.bulan) return String(w.tahun);
  if (!w.hari) return `${NAMA_BULAN[w.bulan - 1]} ${w.tahun}`;
  return `${w.hari} ${NAMA_BULAN[w.bulan - 1]} ${w.tahun}`;
}

export function deskripsiDim(f: FilterDim) {
  const bagian = (Object.keys(DIM) as DimKey[]).filter((d) => f[d]).map((d) => `${DIM[d].label}: ${f[d]}`);
  return bagian.length ? bagian.join('; ') : '—';
}

// k berbentuk 'YYYY-MM-DD' (awal tahun/bulan/hari)
export function labelTren(k: string, t: Tingkat) {
  const [y, m, d] = k.split('-').map(Number);
  if (t === 'tahun') return String(y);
  if (t === 'bulan') return `${BULAN_SINGKAT[m - 1]} ${y}`;
  return `${d} ${BULAN_SINGKAT[m - 1]} ${y}`;
}

export const tanggalIndo = (t: string | null) => {
  if (!t) return '—';
  const d = new Date(`${t}T00:00:00`);
  return Number.isNaN(d.getTime())
    ? t
    : d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
};

// Query data mentah dengan filter yang sama persis dengan fungsi SQL statistik
export function bangunMentah(w: Waktu, f: FilterDim, hitung: boolean) {
  let k = supabase
    .from('data_pengunjung')
    .select(KOLOM_MENTAH, { count: hitung ? 'exact' : undefined })
    .not('tanggal_kunjungan', 'is', null);

  const { dari, sampai } = rentang(w, true);
  if (dari) k = k.gte('tanggal_kunjungan', dari);
  if (sampai) k = k.lte('tanggal_kunjungan', sampai);

  for (const d of Object.keys(DIM) as DimKey[]) {
    const v = f[d];
    if (!v) continue;
    const kol = DIM[d].kolom;
    k = v === TIDAK_DIISI ? k.or(`${kol}.is.null,${kol}.eq.`) : k.eq(kol, v);
  }

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