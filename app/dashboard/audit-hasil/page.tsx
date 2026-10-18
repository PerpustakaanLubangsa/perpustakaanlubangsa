'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  ClipboardCheck,
  Download,
  Inbox,
  Library,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

/* =====================================================================
   KONFIGURASI
   ===================================================================== */

const PAGE_SIZE = 20;
const COLUMNS =
  'id, kode, nomor_panggil, lokasi_rak, status, status_audit, created_at, biblio:biblio_id(judul, penulis)';

// Kolom untuk mengurutkan (tabel belum punya kolom waktu audit, jadi dipakai created_at)
const KOLOM_URUT = 'created_at';

// Ekspor: kolom yang diambil dan judul kolom di file CSV
const EXPORT_COLUMNS = 'id, kode, nomor_panggil, lokasi_rak, status, biblio:biblio_id(judul, penulis)';
const EXPORT_HEADER = ['No', 'Kode', 'Judul', 'Penulis', 'Nomor Panggil', 'Lokasi Rak', 'Status'];
const EXPORT_STEP = 1000; // batas baris per permintaan Supabase

interface Eksemplar {
  id: string;
  kode: string;
  nomorPanggil: string;
  lokasiRak: string;
  status: string;
  statusAudit: string;
  judul: string;
  penulis: string;
}

type Tally = Record<string, number>;

const TITLE = 'Hasil Audit';
const SUBTITLE = 'Pantau eksemplar yang sudah diaudit beserta hasilnya.';

/* =====================================================================
   GAYA
   ===================================================================== */

const CARD = 'bg-white border border-slate-200 shadow-sm';
const BADGE = 'bg-blue-50 text-blue-600 border border-blue-200';

const dasarTombol =
  'inline-flex cursor-pointer touch-manipulation select-none items-center justify-center gap-1.5 rounded-lg border px-4 py-2 text-xs font-extrabold uppercase tracking-wider transition-[transform,box-shadow] duration-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 [@media(hover:hover)]:hover:translate-y-1 [@media(hover:hover)]:hover:shadow-none active:translate-y-1 active:shadow-none';

const tombolUtama = `${dasarTombol} border-blue-800 bg-blue-600 text-white shadow-[0_4px_0_0_#1e40af]`;
const tombolSekunder = `${dasarTombol} border-slate-300 bg-white text-slate-700 shadow-[0_4px_0_0_#cbd5e1]`;
const tombolKecil = '!px-2.5 !py-1.5 !text-[10px]';

/* =====================================================================
   HELPER
   ===================================================================== */

// Tentukan warna badge dari arti status audit
function nadaStatus(status: string): 'hijau' | 'merah' | 'kuning' | 'biru' {
  const s = status.toLowerCase();
  if (/(tidak|hilang|rusak|missing|lost)/.test(s)) return 'merah';
  if (/(salah|pindah|beda|selisih|periksa|cek)/.test(s)) return 'kuning';
  if (/(ada|temu|sesuai|ok|baik|found|valid|sudah)/.test(s)) return 'hijau';
  return 'biru';
}

const NADA_BADGE: Record<string, string> = {
  hijau: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  merah: 'bg-red-50 text-red-700 border-red-200',
  kuning: 'bg-amber-50 text-amber-700 border-amber-200',
  biru: 'bg-blue-50 text-blue-700 border-blue-200',
};

const NADA_CHIP_AKTIF: Record<string, string> = {
  hijau: 'bg-emerald-600 text-white border-emerald-600',
  merah: 'bg-red-600 text-white border-red-600',
  kuning: 'bg-amber-500 text-white border-amber-500',
  biru: 'bg-blue-600 text-white border-blue-600',
};

function rapikan(status: string) {
  const t = status.replace(/[_-]+/g, ' ').trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

const fmt = (n: number) => n.toLocaleString('id-ID');

// Satu sel CSV: beri tanda kutip, lipat gandakan kutip di dalamnya,
// dan awali dengan ' bila diawali karakter yang dibaca Excel sebagai rumus.
function sel(value: unknown) {
  let s = String(value ?? '').replace(/\r?\n/g, ' ');
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

// Buat file CSV (pemisah titik koma, cocok untuk Excel berlokal Indonesia)
// lalu unduh. BOM di awal supaya karakter khusus terbaca benar.
function unduhCsv(namaFile: string, baris: string[][]) {
  const isi = baris.map((r) => r.map(sel).join(';')).join('\r\n');
  const blob = new Blob(['\uFEFF', isi], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = namaFile;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* =====================================================================
   KOMPONEN KECIL
   ===================================================================== */

function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className={`${CARD} rounded-2xl p-4 flex items-center gap-3 min-w-0`}>
      <div className={`w-10 h-10 shrink-0 ${BADGE} rounded-xl flex items-center justify-center`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider truncate">{label}</p>
        <p className="text-xl font-black text-slate-900 leading-tight">{value}</p>
        {hint && <p className="text-[11px] text-slate-500 font-medium truncate">{hint}</p>}
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="animate-pulse px-5 py-3.5 flex items-center gap-3">
      <div className="space-y-2 flex-1">
        <div className="h-3 w-1/2 rounded bg-blue-100" />
        <div className="h-2.5 w-1/3 rounded bg-blue-50" />
      </div>
      <div className="h-5 w-16 rounded-md bg-blue-100" />
      <div className="h-5 w-20 rounded-md bg-blue-100" />
    </div>
  );
}

/* =====================================================================
   HALAMAN
   ===================================================================== */

export default function HasilAuditPage() {
  const router = useRouter();

  const [authReady, setAuthReady] = useState(false);

  // Daftar
  const [rows, setRows] = useState<Eksemplar[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [moreError, setMoreError] = useState<string | null>(null);

  // Ringkasan
  const [totalEksemplar, setTotalEksemplar] = useState(0);
  const [tally, setTally] = useState<Tally>({});
  const [statsLoading, setStatsLoading] = useState(true);

  // Ekspor
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  // Pencarian & filter
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [filter, setFilter] = useState<string>('semua');

  const mounted = useRef(true);
  const reqId = useRef(0);
  const fetched = useRef(0);

  useEffect(() => {
    document.title = TITLE;
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Proteksi halaman
  useEffect(() => {
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!mounted.current) return;
      if (!session) router.replace('/login');
      else setAuthReady(true);
    })();
  }, [router]);

  // Tunda pencarian
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 350);
    return () => clearTimeout(t);
  }, [query]);

  /* ---------- Muat ringkasan ---------- */
  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const { count, error: cErr } = await supabase
        .from('eksemplar')
        .select('id', { count: 'exact', head: true });
      if (cErr) throw cErr;

      // Supabase membatasi 1000 baris per permintaan, jadi diambil bertahap
      const counts: Tally = {};
      const STEP = 1000;
      for (let from = 0; from < 100000; from += STEP) {
        const { data, error: sErr } = await supabase
          .from('eksemplar')
          .select('status_audit')
          .not('status_audit', 'is', null)
          .neq('status_audit', '')
          .order('id', { ascending: true })
          .range(from, from + STEP - 1);
        if (sErr) throw sErr;
        (data ?? []).forEach((r: any) => {
          const k = String(r.status_audit).trim();
          counts[k] = (counts[k] ?? 0) + 1;
        });
        if (!data || data.length < STEP) break;
      }

      if (!mounted.current) return;
      setTotalEksemplar(count ?? 0);
      setTally(counts);
    } catch {
      // ringkasan gagal dimuat: kartu tetap tampil dengan nilai 0
    } finally {
      if (mounted.current) setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authReady) loadStats();
  }, [authReady, loadStats]);

  /* ---------- Muat daftar ---------- */
  const loadPage = useCallback(
    async (offset: number) => {
      const id = ++reqId.current;
      const isFirst = offset === 0;

      if (isFirst) {
        setLoading(true);
        setError(null);
        setMoreError(null);
      } else {
        setLoadingMore(true);
        setMoreError(null);
      }

      try {
        let q: any = supabase
          .from('eksemplar')
          .select(COLUMNS, isFirst ? { count: 'exact' } : undefined)
          .not('status_audit', 'is', null)
          .neq('status_audit', '');

        if (filter !== 'semua') q = q.eq('status_audit', filter);

        const term = debouncedQuery.replace(/[%,()*\\]/g, ' ').replace(/\s+/g, ' ').trim();
        if (term) {
          const { data: bib, error: bibError } = await supabase
            .from('biblio')
            .select('id')
            .or(`judul.ilike.%${term}%,penulis.ilike.%${term}%`)
            .limit(200);
          if (bibError) throw bibError;
          if (!mounted.current || id !== reqId.current) return;

          const ids = (bib ?? []).map((b: any) => b.id);
          const parts = [`kode.ilike.%${term}%`, `nomor_panggil.ilike.%${term}%`];
          if (ids.length) parts.push(`biblio_id.in.(${ids.join(',')})`);
          q = q.or(parts.join(','));
        }

        const { data, error: fetchError, count } = await q
          .order(KOLOM_URUT, { ascending: false })
          .order('id', { ascending: false })
          .range(offset, offset + PAGE_SIZE - 1);

        if (!mounted.current || id !== reqId.current) return;
        if (fetchError) throw fetchError;

        const raw: any[] = data ?? [];
        const items: Eksemplar[] = raw.map((row) => {
          const b = Array.isArray(row.biblio) ? row.biblio[0] : row.biblio;
          return {
            id: row.id,
            kode: row.kode ?? '',
            nomorPanggil: row.nomor_panggil ?? '',
            lokasiRak: row.lokasi_rak ?? '',
            status: row.status ?? '',
            statusAudit: row.status_audit ?? '',
            judul: b?.judul ?? '-',
            penulis: b?.penulis ?? '',
          };
        });

        fetched.current = offset + raw.length;
        const totalMatch = isFirst ? count ?? raw.length : undefined;

        setRows((prev) => (isFirst ? items : [...prev, ...items]));
        if (totalMatch !== undefined) setTotal(totalMatch);
        setHasMore(
          raw.length === PAGE_SIZE && fetched.current < (totalMatch ?? Number.POSITIVE_INFINITY),
        );
      } catch (err: any) {
        if (!mounted.current || id !== reqId.current) return;
        const msg = err?.message || 'Gagal memuat hasil audit.';
        if (isFirst) setError(msg);
        else setMoreError(msg);
      } finally {
        if (mounted.current && id === reqId.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [debouncedQuery, filter],
  );

  useEffect(() => {
    if (authReady) loadPage(0);
  }, [authReady, loadPage]);

  const refreshAll = () => {
    loadStats();
    loadPage(0);
  };

  /* ---------- Ekspor yang belum diaudit ---------- */
  const exportBelumAudit = async () => {
    if (exporting) return;
    setExporting(true);
    setExportMsg(null);

    try {
      const semua: any[] = [];

      // Diambil bertahap karena Supabase membatasi 1000 baris per permintaan
      for (let from = 0; from < 200000; from += EXPORT_STEP) {
        const { data, error: eErr } = await supabase
          .from('eksemplar')
          .select(EXPORT_COLUMNS)
          .or('status_audit.is.null,status_audit.eq.')
          .order('kode', { ascending: true })
          .order('id', { ascending: true })
          .range(from, from + EXPORT_STEP - 1);
        if (eErr) throw eErr;
        semua.push(...(data ?? []));
        if (!data || data.length < EXPORT_STEP) break;
      }

      if (!mounted.current) return;

      if (semua.length === 0) {
        setExportMsg({ type: 'ok', text: 'Tidak ada yang perlu diekspor: semua eksemplar sudah diaudit.' });
        return;
      }

      const baris: string[][] = [
        EXPORT_HEADER,
        ...semua.map((row, i) => {
          const b: any = Array.isArray(row.biblio) ? row.biblio[0] : row.biblio;
          return [
            String(i + 1),
            row.kode ?? '',
            b?.judul ?? '',
            b?.penulis ?? '',
            row.nomor_panggil ?? '',
            row.lokasi_rak ?? '',
            row.status ?? '',
          ];
        }),
      ];

      const tanggal = new Date().toISOString().slice(0, 10);
      unduhCsv(`belum-audit-${tanggal}.csv`, baris);
      setExportMsg({ type: 'ok', text: `${fmt(semua.length)} eksemplar belum audit berhasil diekspor.` });
    } catch (err: any) {
      if (mounted.current) {
        setExportMsg({ type: 'error', text: err?.message || 'Gagal mengekspor data.' });
      }
    } finally {
      if (mounted.current) setExporting(false);
    }
  };

  /* ---------- Turunan ---------- */
  const statusList = Object.entries(tally).sort((a, b) => b[1] - a[1]);
  const sudahAudit = statusList.reduce((sum, [, n]) => sum + n, 0);
  const belumAudit = Math.max(0, totalEksemplar - sudahAudit);
  const persen = totalEksemplar > 0 ? Math.round((sudahAudit / totalEksemplar) * 100) : 0;
  const hasSearch = debouncedQuery.trim() !== '' || filter !== 'semua';

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-slate-800 flex flex-col font-sans">
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        {/* Judul halaman */}
        <div>
          <h2 className="text-xl font-black text-white tracking-tight [text-shadow:0_1px_3px_rgba(0,0,0,0.35)]">
            {TITLE}
          </h2>
          <p className="text-xs text-white font-medium [text-shadow:0_1px_2px_rgba(0,0,0,0.35)]">
            {SUBTITLE}
          </p>
        </div>

        {/* ===== Ringkasan ===== */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            icon={<Library className="w-5 h-5" />}
            label="Total Eksemplar"
            value={statsLoading ? '...' : fmt(totalEksemplar)}
          />
          <StatCard
            icon={<ClipboardCheck className="w-5 h-5" />}
            label="Sudah Diaudit"
            value={statsLoading ? '...' : fmt(sudahAudit)}
            hint={statsLoading ? undefined : `${persen}% dari seluruh koleksi`}
          />
          <StatCard
            icon={<CircleHelp className="w-5 h-5" />}
            label="Belum Diaudit"
            value={statsLoading ? '...' : fmt(belumAudit)}
          />
        </div>

        {/* ===== Daftar hasil ===== */}
        <div className={`${CARD} rounded-2xl overflow-hidden`}>
          <div className="p-5 space-y-4 border-b border-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                  Daftar Hasil Audit
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  Eksemplar yang sudah punya status audit • terbaru di atas
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={exportBelumAudit}
                  disabled={exporting || statsLoading || belumAudit === 0}
                  aria-label="Ekspor eksemplar yang belum diaudit"
                  className={`${tombolUtama} ${tombolKecil}`}
                >
                  {exporting ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <Download className="w-3 h-3" />
                  )}
                  {exporting ? 'Mengekspor...' : 'Ekspor Belum Audit'}
                </button>
                <button
                  type="button"
                  onClick={refreshAll}
                  disabled={loading}
                  aria-label="Muat ulang data"
                  className={`${tombolSekunder} ${tombolKecil}`}
                >
                  <RefreshCw className={`w-3 h-3 ${loading || statsLoading ? 'animate-spin' : ''}`} />
                  Muat Ulang
                </button>
              </div>
            </div>

            {exportMsg && (
              <div
                role={exportMsg.type === 'error' ? 'alert' : 'status'}
                className={`flex items-start justify-between gap-3 rounded-lg border px-3 py-2 text-[11px] font-medium ${
                  exportMsg.type === 'error'
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}
              >
                <span>{exportMsg.text}</span>
                <button
                  type="button"
                  onClick={() => setExportMsg(null)}
                  aria-label="Tutup pesan"
                  className="shrink-0 cursor-pointer opacity-70 hover:opacity-100"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Progress */}
            <div>
              <div className="h-2 w-full rounded-full bg-blue-50 border border-blue-100 overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-[width] duration-500"
                  style={{ width: `${persen}%` }}
                />
              </div>
              <p className="mt-1 text-[11px] text-slate-500 font-medium">
                {statsLoading ? 'Menghitung progres...' : `${persen}% koleksi sudah diaudit`}
              </p>
            </div>

            {/* Filter status */}
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter status audit">
              <button
                type="button"
                onClick={() => setFilter('semua')}
                aria-pressed={filter === 'semua'}
                className={`px-3 py-1.5 rounded-lg border text-[11px] font-extrabold uppercase tracking-wider transition-colors cursor-pointer ${
                  filter === 'semua'
                    ? 'bg-slate-800 text-white border-slate-800'
                    : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                }`}
              >
                Semua ({fmt(sudahAudit)})
              </button>
              {statusList.map(([status, n]) => {
                const nada = nadaStatus(status);
                const active = filter === status;
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setFilter(status)}
                    aria-pressed={active}
                    className={`px-3 py-1.5 rounded-lg border text-[11px] font-extrabold uppercase tracking-wider transition-colors cursor-pointer ${
                      active ? NADA_CHIP_AKTIF[nada] : `${NADA_BADGE[nada]} hover:brightness-95`
                    }`}
                  >
                    {rapikan(status)} ({fmt(n)})
                  </button>
                );
              })}
            </div>

            {/* Pencarian */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-600 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari kode, nomor panggil, judul, atau penulis..."
                aria-label="Cari hasil audit"
                className="block w-full pl-9 pr-9 py-2.5 text-base sm:text-sm bg-blue-50 border border-blue-100 rounded-xl text-slate-900 placeholder-slate-500 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition-colors"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Hapus pencarian"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-700 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="divide-y divide-slate-200" aria-busy={loading}>
            {loading ? (
              <>
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
              </>
            ) : error ? (
              <div role="alert" className="px-5 py-12 flex flex-col items-center text-center gap-3">
                <div className={`w-12 h-12 ${BADGE} rounded-xl flex items-center justify-center`}>
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900">Gagal memuat data</p>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">{error}</p>
                </div>
                <button type="button" onClick={() => loadPage(0)} className={tombolUtama}>
                  Coba Lagi
                </button>
              </div>
            ) : rows.length === 0 ? (
              <div className="px-5 py-12 flex flex-col items-center text-center gap-3">
                <div className={`w-12 h-12 ${BADGE} rounded-xl flex items-center justify-center`}>
                  <Inbox className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900">
                    {hasSearch ? 'Tidak ada data yang cocok' : 'Belum ada hasil audit'}
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    {hasSearch
                      ? 'Coba ubah kata kunci atau filter status.'
                      : 'Mulai audit lewat halaman Scanner.'}
                  </p>
                </div>
              </div>
            ) : (
              rows.map((item) => {
                const nada = nadaStatus(item.statusAudit);
                return (
                  <div key={item.id} className="flex items-center gap-3 px-5 py-3 hover:bg-blue-50 transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-black text-slate-900 truncate">{item.judul}</p>
                      <p className="text-[11px] text-slate-500 font-medium truncate">
                        {[
                          item.penulis,
                          item.nomorPanggil && `No. panggil ${item.nomorPanggil}`,
                          item.lokasiRak && `Rak ${item.lokasiRak}`,
                        ]
                          .filter(Boolean)
                          .join(' • ') || 'Tanpa keterangan'}
                      </p>
                    </div>
                    <span className="hidden sm:inline-block shrink-0 text-[10px] font-black text-slate-700 bg-slate-50 border border-slate-200 rounded-md px-2 py-1 tracking-wider">
                      {item.kode}
                    </span>
                    <span
                      className={`shrink-0 inline-flex items-center gap-1 text-[10px] font-black border rounded-md px-2 py-1 tracking-wider uppercase ${NADA_BADGE[nada]}`}
                    >
                      {nada === 'hijau' && <CheckCircle2 className="w-3 h-3" />}
                      {nada === 'merah' && <AlertTriangle className="w-3 h-3" />}
                      {rapikan(item.statusAudit)}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {!loading && !error && rows.length > 0 && (
            <div className="px-5 py-4 flex flex-col items-center gap-2.5 border-t border-slate-200 bg-slate-50">
              <span className="text-[11px] text-slate-500 font-medium">
                Menampilkan {fmt(rows.length)} dari {fmt(total)}
              </span>

              {moreError && (
                <span role="alert" className="text-[11px] text-red-600 font-medium">
                  {moreError}
                </span>
              )}

              {hasMore && (
                <button
                  type="button"
                  onClick={() => loadPage(fetched.current)}
                  disabled={loadingMore}
                  className={tombolSekunder}
                >
                  {loadingMore ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                  {loadingMore
                    ? 'Memuat...'
                    : `Muat Lebih Banyak (${fmt(Math.max(0, total - rows.length))} lagi)`}
                </button>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}