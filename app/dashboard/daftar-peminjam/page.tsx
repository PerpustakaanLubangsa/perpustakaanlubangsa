'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  BookMarked,
  AlertTriangle,
  CheckCircle2,
  Users,
  Wallet,
  Clock,
  Plus,
  Search,
  X,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Inbox,
} from 'lucide-react';

/* =========================================================
   ATURAN & KONFIGURASI
   ========================================================= */

const TABLE = 'sirkulasi';
const PAGE_SIZE = 10;
const FETCH_LIMIT = 1000;

// Masa pinjam 5 hari: pinjam tgl 1 -> batas tgl 5 -> tgl 6 sudah terlambat
const LOAN_DAYS = 5;
// Denda per hari keterlambatan
const FINE_PER_DAY = 1000;

/* =========================================================
   TIPE & HELPER
   ========================================================= */

interface LateLoan {
  id: number;
  nama: string;
  nis: string;
  kamar: string;
  judul: string;
  penulis: string;
  kode: string;
  tglPinjam: Date;
  jatuhTempo: Date;
  hariTerlambat: number;
  denda: number;
}

const DAY_MS = 86_400_000;

const dateFormatter = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const rupiahFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

const rupiah = (n: number) => rupiahFormatter.format(n);

function toDate(value: unknown): Date | null {
  if (!value) return null;
  const s = String(value);
  // "YYYY-MM-DD" dibaca sebagai tanggal lokal agar tidak bergeser zona waktu
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  const d = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toISODate(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function diffDays(a: Date, b: Date): number {
  return Math.round((startOfDay(a).getTime() - startOfDay(b).getTime()) / DAY_MS);
}

/** Ubah satu baris sirkulasi menjadi data terlambat (null jika belum terlambat) */
function mapRow(row: any, today: Date): LateLoan | null {
  const tglPinjam = toDate(row.tgl_pinjam);
  if (!tglPinjam) return null;

  // Batas kembali = hari ke-5 (tgl pinjam + 4 hari)
  const jatuhTempo = addDays(tglPinjam, LOAN_DAYS - 1);
  const hariTerlambat = diffDays(today, jatuhTempo);
  if (hariTerlambat <= 0) return null;

  return {
    id: row.id,
    nama: row.nama_anggota ?? '-',
    nis: row.nis ?? '-',
    kamar: row.kamar ?? '-',
    judul: row.judul_buku ?? '-',
    penulis: row.penulis ?? '',
    kode: row.kode_eksemplar ?? '-',
    tglPinjam,
    jatuhTempo,
    hariTerlambat,
    denda: hariTerlambat * FINE_PER_DAY,
  };
}

function initials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0] ?? '')
      .join('')
      .toUpperCase() || '?'
  );
}

/* =========================================================
   GAYA (mengikuti halaman dashboard)
   ========================================================= */

// Kartu solid: tanpa transparansi dan tanpa blur agar ringan di perangkat low-end
const CARD = 'bg-white border border-slate-200 shadow-sm';
const BADGE = 'bg-blue-50 text-blue-600 border border-blue-200';

const TITLE = 'Peminjam Terlambat';
const SUBTITLE = `Buku yang belum kembali setelah batas ${LOAN_DAYS} hari. Denda ${rupiah(
  FINE_PER_DAY
)} per hari.`;

// Kata muncul satu per satu. Hanya opacity + transform (dipercepat GPU, murah)
function AnimatedWords({
  text,
  startDelay = 0,
  step = 60,
}: {
  text: string;
  startDelay?: number;
  step?: number;
}) {
  return (
    <>
      {text.split(' ').map((word, i) => (
        <React.Fragment key={i}>
          <span
            className="word-in inline-block"
            style={{ animationDelay: `${startDelay + i * step}ms` }}
          >
            {word}
          </span>{' '}
        </React.Fragment>
      ))}
    </>
  );
}

function SkeletonRow() {
  return (
    <div className="animate-pulse px-5 py-3.5 grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 md:items-center">
      <div className="md:col-span-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-100 shrink-0" />
        <div className="space-y-2 flex-1">
          <div className="h-3 w-2/3 rounded bg-blue-100" />
          <div className="h-2.5 w-1/3 rounded bg-blue-50" />
        </div>
      </div>
      <div className="md:col-span-3 h-3 w-3/4 rounded bg-blue-100" />
      <div className="md:col-span-2 space-y-2">
        <div className="h-2.5 w-2/3 rounded bg-blue-50" />
        <div className="h-2.5 w-1/2 rounded bg-blue-50" />
      </div>
      <div className="md:col-span-3 md:flex md:flex-col md:items-end gap-2">
        <div className="h-6 w-28 rounded-md bg-blue-100" />
        <div className="h-3 w-16 rounded bg-blue-50" />
      </div>
    </div>
  );
}

/* =========================================================
   HALAMAN
   ========================================================= */

export default function DaftarPeminjamPage() {
  const router = useRouter();

  const [authReady, setAuthReady] = useState(false);
  const [loans, setLoans] = useState<LateLoan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  const mounted = useRef(true);
  useEffect(() => {
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

  const loadLoans = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const today = new Date();
      // Terlambat jika tgl_pinjam + (LOAN_DAYS - 1) < hari ini  <=>  tgl_pinjam <= hari ini - LOAN_DAYS
      const cutoff = toISODate(addDays(today, -LOAN_DAYS));

      const { data, error: fetchError } = await supabase
        .from(TABLE)
        .select('id, tgl_pinjam, nis, nama_anggota, kode_eksemplar, judul_buku, kamar, penulis')
        .is('tgl_kembali', null)
        .not('tgl_pinjam', 'is', null)
        .lte('tgl_pinjam', cutoff)
        .order('tgl_pinjam', { ascending: true })
        .limit(FETCH_LIMIT);

      if (!mounted.current) return;
      if (fetchError) throw fetchError;

      const late: LateLoan[] = [];
      for (const row of data ?? []) {
        const item = mapRow(row, today);
        if (item) late.push(item);
      }
      // Paling lama terlambat di atas
      late.sort((a, b) => b.hariTerlambat - a.hariTerlambat);
      setLoans(late);
    } catch (err: any) {
      if (!mounted.current) return;
      setError(err?.message || 'Gagal memuat data peminjam.');
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authReady) loadLoans();
  }, [authReady, loadLoans]);

  /* ---------- Statistik ---------- */
  const stats = useMemo(() => {
    const santri = new Set(loans.map((l) => l.nis)).size;
    const totalDenda = loans.reduce((sum, l) => sum + l.denda, 0);
    const terlama = loans.reduce((max, l) => Math.max(max, l.hariTerlambat), 0);
    const dash = (v: string) => (loading ? '–' : v);

    return [
      {
        title: 'Buku Terlambat',
        value: dash(loans.length.toLocaleString('id-ID')),
        info: 'Belum kembali melewati batas',
        icon: BookMarked,
      },
      {
        title: 'Santri Terlambat',
        value: dash(santri.toLocaleString('id-ID')),
        info: 'Jumlah peminjam berbeda',
        icon: Users,
      },
      {
        title: 'Total Denda',
        value: dash(rupiah(totalDenda)),
        info: `${rupiah(FINE_PER_DAY)} per hari per buku`,
        icon: Wallet,
      },
      {
        title: 'Terlama Terlambat',
        value: dash(`${terlama} hari`),
        info: 'Keterlambatan paling lama',
        icon: Clock,
      },
    ];
  }, [loans, loading]);

  /* ---------- Pencarian & halaman ---------- */
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return loans;
    return loans.filter((l) =>
      `${l.nama} ${l.nis} ${l.kamar} ${l.judul} ${l.kode}`.toLowerCase().includes(q)
    );
  }, [loans, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const visible = filtered.slice(startIndex, startIndex + PAGE_SIZE);

  const handleQuery = (val: string) => {
    setQuery(val);
    setPage(1);
  };

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-slate-800 flex flex-col font-sans">
      <style>{`
        @keyframes word-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .word-in {
          opacity: 0;
          animation: word-in 0.25s ease-out forwards;
        }
        @media (prefers-reduced-motion: reduce) {
          .word-in { opacity: 1; animation: none; }
        }
      `}</style>

      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        {/* Judul halaman */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-white tracking-tight [text-shadow:0_1px_3px_rgba(0,0,0,0.35)]">
              <AnimatedWords text={TITLE} step={70} />
            </h2>
            <p className="text-xs text-white font-medium [text-shadow:0_1px_2px_rgba(0,0,0,0.35)]">
              <AnimatedWords text={SUBTITLE} startDelay={200} step={35} />
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/sirkulasi"
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider transition-colors active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" /> Sirkulasi Baru
            </Link>
          </div>
        </div>

        {/* Kartu statistik */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div
              key={stat.title}
              className={`${CARD} p-5 rounded-2xl flex items-start justify-between`}
            >
              <div className="space-y-1 min-w-0">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                  {stat.title}
                </span>
                <span className="text-2xl font-black text-slate-900 tracking-tight block truncate">
                  {stat.value}
                </span>
                <span className="text-[10px] text-slate-500 font-medium block">{stat.info}</span>
              </div>
              <div
                className={`w-10 h-10 ${BADGE} rounded-xl flex items-center justify-center shrink-0`}
              >
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
          ))}
        </div>

        {/* Daftar terlambat */}
        <div className={`${CARD} rounded-2xl overflow-hidden`}>
          {/* Header: judul, pencarian, muat ulang */}
          <div className="p-5 space-y-4 border-b border-slate-200">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                  Daftar Keterlambatan
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  Batas kembali {LOAN_DAYS} hari sejak tanggal pinjam (hari pinjam dihitung hari ke-1)
                </p>
              </div>
              <button
                type="button"
                onClick={loadLoans}
                disabled={loading}
                aria-label="Muat ulang data"
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md uppercase tracking-wider transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                Muat Ulang
              </button>
            </div>

            {/* Kotak pencarian */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-600 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => handleQuery(e.target.value)}
                placeholder="Cari nama, NIS, kamar, judul, atau kode buku..."
                aria-label="Cari peminjam terlambat"
                className="block w-full pl-9 pr-9 py-2.5 text-base sm:text-sm bg-blue-50 border border-blue-100 rounded-xl text-slate-900 placeholder-slate-500 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition-colors"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => handleQuery('')}
                  aria-label="Hapus pencarian"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-700 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Judul kolom (desktop) */}
          <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-2.5 bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-wider">
            <span className="col-span-4">Peminjam</span>
            <span className="col-span-3">Buku</span>
            <span className="col-span-2">Tanggal</span>
            <span className="col-span-3 text-right">Keterlambatan & Denda</span>
          </div>

          {/* Isi daftar */}
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
                <button
                  type="button"
                  onClick={loadLoans}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider transition-colors active:scale-95 cursor-pointer"
                >
                  Coba Lagi
                </button>
              </div>
            ) : loans.length === 0 ? (
              <div className="px-5 py-12 flex flex-col items-center text-center gap-3">
                <div className={`w-12 h-12 ${BADGE} rounded-xl flex items-center justify-center`}>
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900">Tidak ada keterlambatan</p>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    Semua buku yang dipinjam masih dalam batas waktu atau sudah dikembalikan.
                  </p>
                </div>
              </div>
            ) : visible.length === 0 ? (
              <div className="px-5 py-12 flex flex-col items-center text-center gap-3">
                <div className={`w-12 h-12 ${BADGE} rounded-xl flex items-center justify-center`}>
                  <Inbox className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900">Tidak ada data yang cocok</p>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    Coba ubah kata kunci pencarian.
                  </p>
                </div>
              </div>
            ) : (
              visible.map((loan) => (
                <div
                  key={loan.id}
                  className="px-5 py-3.5 grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 md:items-center hover:bg-blue-50 transition-colors"
                >
                  {/* Peminjam */}
                  <div className="md:col-span-4 flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 text-white text-[11px] font-black flex items-center justify-center shrink-0">
                      {initials(loan.nama)}
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-black text-slate-900 block truncate">
                        {loan.nama}
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium block truncate">
                        {loan.nis} • Kamar {loan.kamar}
                      </span>
                    </div>
                  </div>

                  {/* Buku */}
                  <div className="md:col-span-3 flex items-start gap-2 min-w-0">
                    <BookMarked className="w-3.5 h-3.5 mt-0.5 text-blue-500 shrink-0" />
                    <div className="min-w-0">
                      <span className="text-[11px] font-bold text-slate-800 line-clamp-2 block">
                        {loan.judul}
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium block truncate">
                        {loan.kode}
                        {loan.penulis ? ` • ${loan.penulis}` : ''}
                      </span>
                    </div>
                  </div>

                  {/* Tanggal */}
                  <div className="md:col-span-2 space-y-0.5 text-[10px] text-slate-500 font-medium">
                    <span className="block">Pinjam: {dateFormatter.format(loan.tglPinjam)}</span>
                    <span className="block">Batas: {dateFormatter.format(loan.jatuhTempo)}</span>
                  </div>

                  {/* Keterlambatan & denda */}
                  <div className="md:col-span-3 flex md:flex-col md:items-end items-center gap-2 md:gap-1">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-blue-600 bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wider">
                      <AlertTriangle className="w-3 h-3" />
                      Terlambat {loan.hariTerlambat} hari
                    </span>
                    <span className="text-xs font-black text-slate-900">
                      Denda {rupiah(loan.denda)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          {!loading && !error && filtered.length > 0 && (
            <div className="px-5 py-3 flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50">
              <span className="text-[11px] text-slate-500 font-medium">
                Menampilkan {startIndex + 1}–{Math.min(startIndex + PAGE_SIZE, filtered.length)} dari{' '}
                {filtered.length.toLocaleString('id-ID')}
              </span>

              <div className="flex items-center gap-2">
                <span className="hidden sm:block text-[11px] text-slate-500 font-medium">
                  Halaman {safePage} dari {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage(safePage - 1)}
                  disabled={safePage <= 1}
                  aria-label="Halaman sebelumnya"
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-slate-200 disabled:hover:text-slate-600 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPage(safePage + 1)}
                  disabled={safePage >= totalPages}
                  aria-label="Halaman berikutnya"
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-slate-200 disabled:hover:text-slate-600 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}