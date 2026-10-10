'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, Loader2, RotateCcw, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Pengunjung = {
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

type Filter = {
  kueri: string;
  dari: string;
  sampai: string;
  jenjang: string;
  kategori: string;
  aktivitas: string;
};

type Opsi = { jenjang: string[]; kategori: string[]; aktivitas: string[] };

const FILTER_AWAL: Filter = { kueri: '', dari: '', sampai: '', jenjang: '', kategori: '', aktivitas: '' };
const UKURAN_HALAMAN = [25, 50, 100] as const;
const DEBOUNCE_MS = 350;
const BATCH_EKSPOR = 1000; // batas baris per permintaan di Supabase
const MAKS_EKSPOR = 50000;

const KOLOM = 'id, nama, kamar, jenjang, judul_buku, kategori, aktivitas, tanggal_kunjungan, created_at, id_anggota, nis';

const KOLOM_CSV: { kunci: keyof Pengunjung; judul: string }[] = [
  { kunci: 'tanggal_kunjungan', judul: 'Tanggal Kunjungan' },
  { kunci: 'nama', judul: 'Nama' },
  { kunci: 'nis', judul: 'NIS' },
  { kunci: 'kamar', judul: 'Kamar' },
  { kunci: 'jenjang', judul: 'Jenjang' },
  { kunci: 'judul_buku', judul: 'Judul Buku' },
  { kunci: 'kategori', judul: 'Kategori' },
  { kunci: 'aktivitas', judul: 'Aktivitas' },
];

const kelasInput =
  'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500';

const dasarTombol =
  'inline-flex cursor-pointer touch-manipulation select-none items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-[transform,box-shadow] duration-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [@media(hover:hover)]:hover:translate-y-1 [@media(hover:hover)]:hover:shadow-none active:translate-y-1 active:shadow-none';
const tombolUtama = `${dasarTombol} border-blue-800 bg-blue-600 text-white shadow-[0_4px_0_0_#1e40af]`;
const tombolSekunder = `${dasarTombol} border-slate-300 bg-white text-slate-700 shadow-[0_4px_0_0_#cbd5e1]`;

// Buang karakter yang punya arti khusus di filter PostgREST / pola ilike
const bersihkan = (s: string) => s.replace(/[%_,()*\\"']/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);

function bangunQuery(f: Filter, hitung: boolean) {
  let k = supabase.from('data_pengunjung').select(KOLOM, { count: hitung ? 'exact' : undefined });

  const q = bersihkan(f.kueri);
  if (q) k = k.or(`nama.ilike.%${q}%,nis.ilike.%${q}%,judul_buku.ilike.%${q}%`);
  if (f.dari) k = k.gte('tanggal_kunjungan', f.dari);
  if (f.sampai) k = k.lte('tanggal_kunjungan', f.sampai);
  if (f.jenjang) k = k.eq('jenjang', f.jenjang);
  if (f.kategori) k = k.eq('kategori', f.kategori);
  if (f.aktivitas) k = k.eq('aktivitas', f.aktivitas);

  // `id` sebagai pembeda terakhir agar urutan antar halaman tidak melompat
  return k
    .order('tanggal_kunjungan', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false, nullsFirst: false })
    .order('id', { ascending: true });
}

const tanggalIndo = (t: string | null) => {
  if (!t) return '—';
  const d = new Date(`${t}T00:00:00`);
  return Number.isNaN(d.getTime())
    ? t
    : d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
};

// Sel CSV: kutip ganda digandakan, dan awalan rumus (=, +, -, @) dinetralkan agar tidak dieksekusi Excel
function selCsv(v: unknown) {
  let s = v == null ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

function PilihFilter({
  label,
  nilai,
  opsi,
  onUbah,
}: {
  label: string;
  nilai: string;
  opsi: string[];
  onUbah: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-slate-700">{label}</span>
      <select value={nilai} onChange={(e) => onUbah(e.target.value)} className={`${kelasInput} cursor-pointer`}>
        <option value="">Semua</option>
        {opsi.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function DataPengunjung() {
  const [filter, setFilter] = useState<Filter>(FILTER_AWAL);
  const [cari, setCari] = useState('');
  const [halaman, setHalaman] = useState(1);
  const [ukuran, setUkuran] = useState<number>(25);
  const [baris, setBaris] = useState<Pengunjung[]>([]);
  const [total, setTotal] = useState(0);
  const [memuat, setMemuat] = useState(true);
  const [pernahMuat, setPernahMuat] = useState(false);
  const [galatMuat, setGalatMuat] = useState(false);
  const [opsi, setOpsi] = useState<Opsi>({ jenjang: [], kategori: [], aktivitas: [] });
  const [mengekspor, setMengekspor] = useState(false);
  const [progres, setProgres] = useState(0);
  const [galatEkspor, setGalatEkspor] = useState('');
  const permintaan = useRef(0);

  const tanggalSalah = Boolean(filter.dari && filter.sampai && filter.dari > filter.sampai);
  const totalHalaman = Math.max(1, Math.ceil(total / ukuran));
  const awalBaris = total === 0 ? 0 : (halaman - 1) * ukuran + 1;
  const akhirBaris = Math.min(halaman * ukuran, total);
  const adaFilter = JSON.stringify(filter) !== JSON.stringify(FILTER_AWAL);

  const ubah = (patch: Partial<Filter>) => {
    setFilter((f) => ({ ...f, ...patch }));
    setHalaman(1);
  };

  // Pilihan filter diambil sekali lewat fungsi SQL, bukan dengan menarik ribuan baris
  useEffect(() => {
    let batal = false;
    (async () => {
      const { data, error } = await supabase.rpc('opsi_data_pengunjung');
      if (batal) return;
      if (error || !data) {
        console.error('Gagal memuat opsi filter:', error);
        return;
      }
      const o = data as Partial<Opsi>;
      setOpsi({ jenjang: o.jenjang ?? [], kategori: o.kategori ?? [], aktivitas: o.aktivitas ?? [] });
    })();
    return () => {
      batal = true;
    };
  }, []);

  // Pencarian ditunda supaya tidak query di setiap ketukan
  useEffect(() => {
    const t = setTimeout(() => {
      setFilter((f) => (f.kueri === cari ? f : { ...f, kueri: cari }));
      setHalaman(1);
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [cari]);

  useEffect(() => {
    if (tanggalSalah) {
      setBaris([]);
      setTotal(0);
      setMemuat(false);
      return;
    }
    const id = ++permintaan.current;
    setMemuat(true);
    setGalatMuat(false);
    (async () => {
      const dari = (halaman - 1) * ukuran;
      const { data, error, count } = await bangunQuery(filter, true).range(dari, dari + ukuran - 1);
      if (id !== permintaan.current) return; // abaikan respons lama
      if (error) {
        console.error('Gagal memuat data pengunjung:', error);
        setGalatMuat(true);
        setBaris([]);
        setTotal(0);
      } else {
        setBaris((data ?? []) as Pengunjung[]);
        setTotal(count ?? 0);
      }
      setMemuat(false);
      setPernahMuat(true);
    })();
  }, [filter, halaman, ukuran, tanggalSalah]);

  function atur() {
    setFilter(FILTER_AWAL);
    setCari('');
    setHalaman(1);
  }

  async function ekspor() {
    if (mengekspor || tanggalSalah || total === 0) return;
    setMengekspor(true);
    setProgres(0);
    setGalatEkspor('');

    const semua: Pengunjung[] = [];
    try {
      for (let dari = 0; dari < MAKS_EKSPOR; dari += BATCH_EKSPOR) {
        const { data, error } = await bangunQuery(filter, false).range(dari, dari + BATCH_EKSPOR - 1);
        if (error) throw error;
        const potong = (data ?? []) as Pengunjung[];
        semua.push(...potong);
        setProgres(semua.length);
        if (potong.length < BATCH_EKSPOR) break;
      }

      const kepala = ['No', ...KOLOM_CSV.map((k) => k.judul)].map(selCsv).join(',');
      const isi = semua.map((b, i) => [i + 1, ...KOLOM_CSV.map((k) => b[k.kunci])].map(selCsv).join(','));
      // BOM agar Excel membaca UTF-8 dengan benar
      const blob = new Blob(['\uFEFF' + [kepala, ...isi].join('\r\n')], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `data-pengunjung-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Gagal mengekspor:', err);
      setGalatEkspor('Ekspor gagal. Coba lagi sebentar.');
    } finally {
      setMengekspor(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Filter */}
      <section aria-label="Pencarian dan filter" className="rounded-3xl border border-blue-100 bg-white p-4 sm:p-6">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            placeholder="Cari nama, NIS, atau judul buku"
            aria-label="Cari pengunjung"
            autoComplete="off"
            className={`${kelasInput} pl-10`}
          />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-700">Dari tanggal</span>
            <input
              type="date"
              value={filter.dari}
              onChange={(e) => ubah({ dari: e.target.value })}
              className={kelasInput}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-700">Sampai tanggal</span>
            <input
              type="date"
              value={filter.sampai}
              onChange={(e) => ubah({ sampai: e.target.value })}
              className={kelasInput}
            />
          </label>
          {opsi.jenjang.length > 0 && (
            <PilihFilter label="Jenjang" nilai={filter.jenjang} opsi={opsi.jenjang} onUbah={(v) => ubah({ jenjang: v })} />
          )}
          {opsi.kategori.length > 0 && (
            <PilihFilter label="Kategori" nilai={filter.kategori} opsi={opsi.kategori} onUbah={(v) => ubah({ kategori: v })} />
          )}
          {opsi.aktivitas.length > 0 && (
            <PilihFilter
              label="Aktivitas"
              nilai={filter.aktivitas}
              opsi={opsi.aktivitas}
              onUbah={(v) => ubah({ aktivitas: v })}
            />
          )}
        </div>

        {tanggalSalah && (
          <p role="alert" className="mt-3 text-xs font-medium text-red-600">
            Tanggal awal tidak boleh lebih besar dari tanggal akhir.
          </p>
        )}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-blue-100 pt-4">
          <p className="text-sm text-slate-600" aria-live="polite">
            {memuat && !pernahMuat ? (
              'Memuat data…'
            ) : (
              <>
                <span className="font-semibold text-slate-900">{total.toLocaleString('id-ID')}</span> kunjungan
                {adaFilter ? ' sesuai filter' : ''}
              </>
            )}
          </p>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={atur} disabled={!adaFilter} className={tombolSekunder}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Atur ulang
            </button>
            <button
              type="button"
              onClick={ekspor}
              disabled={mengekspor || total === 0 || tanggalSalah}
              className={tombolUtama}
            >
              {mengekspor ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Mengekspor {progres.toLocaleString('id-ID')}
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" aria-hidden="true" />
                  Ekspor CSV
                </>
              )}
            </button>
          </div>
        </div>
        {galatEkspor && (
          <p role="alert" className="mt-3 text-xs font-medium text-red-600">
            {galatEkspor}
          </p>
        )}
        {total > MAKS_EKSPOR && (
          <p className="mt-3 text-xs text-slate-500">
            Ekspor dibatasi {MAKS_EKSPOR.toLocaleString('id-ID')} baris teratas. Persempit filter tanggal untuk
            mengekspor sisanya.
          </p>
        )}
      </section>

      {/* Tabel */}
      <section aria-label="Daftar kunjungan" className="overflow-hidden rounded-3xl border border-blue-100 bg-white">
        <div className={`overflow-x-auto transition-opacity ${memuat && pernahMuat ? 'opacity-60' : ''}`}>
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
              <tr>
                <th scope="col" className="px-4 py-3">Tanggal</th>
                <th scope="col" className="px-4 py-3">Nama</th>
                <th scope="col" className="px-4 py-3">NIS</th>
                <th scope="col" className="px-4 py-3">Kamar</th>
                <th scope="col" className="px-4 py-3">Jenjang</th>
                <th scope="col" className="px-4 py-3">Judul buku</th>
                <th scope="col" className="px-4 py-3">Kategori</th>
                <th scope="col" className="px-4 py-3">Aktivitas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {!pernahMuat && memuat ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} aria-hidden="true">
                    {Array.from({ length: 8 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 animate-pulse rounded bg-slate-100" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : galatMuat ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-red-600">
                    Data gagal dimuat. Periksa koneksi lalu ubah filter atau muat ulang halaman.
                  </td>
                </tr>
              ) : baris.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-500">
                    {tanggalSalah ? 'Perbaiki rentang tanggal untuk menampilkan data.' : 'Tidak ada data kunjungan yang cocok.'}
                  </td>
                </tr>
              ) : (
                baris.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-3 tabular-nums">{tanggalIndo(b.tanggal_kunjungan)}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{b.nama || '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3 tabular-nums">{b.nis || '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3">{b.kamar || '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3">{b.jenjang || '—'}</td>
                    <td className="max-w-[18rem] px-4 py-3">{b.judul_buku || '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3">{b.kategori || '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3">{b.aktivitas || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginasi */}
        <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
            <span className="tabular-nums">
              {awalBaris.toLocaleString('id-ID')}–{akhirBaris.toLocaleString('id-ID')} dari{' '}
              {total.toLocaleString('id-ID')}
            </span>
            <label className="flex items-center gap-2">
              <span className="text-xs">Per halaman</span>
              <select
                value={ukuran}
                onChange={(e) => {
                  setUkuran(Number(e.target.value));
                  setHalaman(1);
                }}
                className="h-9 cursor-pointer rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {UKURAN_HALAMAN.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setHalaman((h) => Math.max(1, h - 1))}
              disabled={halaman <= 1 || memuat}
              className={tombolSekunder}
              aria-label="Halaman sebelumnya"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              Sebelumnya
            </button>
            <span className="whitespace-nowrap text-sm tabular-nums text-slate-600">
              {halaman.toLocaleString('id-ID')} / {totalHalaman.toLocaleString('id-ID')}
            </span>
            <button
              type="button"
              onClick={() => setHalaman((h) => Math.min(totalHalaman, h + 1))}
              disabled={halaman >= totalHalaman || memuat}
              className={tombolSekunder}
              aria-label="Halaman berikutnya"
            >
              Berikutnya
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}