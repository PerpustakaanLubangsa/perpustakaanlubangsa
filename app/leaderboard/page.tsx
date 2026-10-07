'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import {
  ArrowLeft,
  Trophy,
  Search,
  Crown,
  Footprints,
  BookOpen,
  BookMarked,
  AlertCircle,
  RefreshCw,
  X,
  Loader2,
  ChevronDown,
  Users,
  GraduationCap,
  Info,
} from 'lucide-react';
// Sesuaikan path import ini dengan lokasi file modal Anda
import VisitorProfileModal, { ProfileTarget } from './components/VisitorProfileModal';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

/* =========================================================
   KONSTANTA & TIPE
   ========================================================= */

const VIEW = 'leaderboard_anggota';
const COLUMNS =
  'id, nis, nama, jenjang, kamar, rank_nama, total_kunjungan, total_baca, total_pinjam, total_poin, avatar_rank, peringkat, peringkat_jenjang';
const PAGE_SIZE = 24;

type JenjangKey = 'Semua' | 'SLTP' | 'SLTA' | 'PT';

const FILTERS: {
  key: JenjangKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { key: 'Semua', label: 'Semua Jenjang', icon: Users },
  { key: 'SLTP', label: 'SLTP', icon: GraduationCap },
  { key: 'SLTA', label: 'SLTA', icon: GraduationCap },
  { key: 'PT', label: 'Perguruan Tinggi', icon: GraduationCap },
];

/* Satu definisi kolom agar header & baris selalu sejajar */
const GRID =
  'grid-cols-[56px_minmax(0,2.2fr)_minmax(0,1fr)_84px_84px_84px_minmax(0,1.5fr)]';

interface Row {
  id: string;
  nis: string | null;
  nama: string;
  jenjang: string | null;
  kamar: string | null;
  rank_nama: string | null;
  total_kunjungan: number | null;
  total_baca: number | null;
  total_pinjam: number | null;
  total_poin: number | null;
  avatar_rank: string | null;
  peringkat: number;
  peringkat_jenjang: number | null;
}

interface Item extends Row {
  posisi: number;
  delay: number;
}

/* =========================================================
   UTIL
   ========================================================= */

const fmt = (n: number | null | undefined) => (n ?? 0).toLocaleString('id-ID');

const sanitize = (s: string) => s.replace(/[,()%*"\\]/g, ' ').trim();

/* Perangkat low-end / hemat data / reduced motion -> mode ringan */
function detectLite(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean };
  };
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const mem = nav.deviceMemory;
  const cores = nav.hardwareConcurrency;
  return !!(
    reduce ||
    nav.connection?.saveData ||
    (mem !== undefined && mem <= 2) ||
    (cores !== undefined && cores <= 4)
  );
}

/* Angka berhitung naik (langsung ke DOM, tanpa re-render per frame) */
function CountUp({ value, lite }: { value: number; lite: boolean }) {
  const ref = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (lite) {
      el.textContent = fmt(value);
      return;
    }
    const dur = 900;
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(Math.round(value * e));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, lite]);

  return <span ref={ref}>{lite ? fmt(value) : '0'}</span>;
}

/* =========================================================
   EMBLEM (fallback perisai biru jika gambar gagal)
   ========================================================= */

function Emblem({ src, alt, className = '' }: { src: string | null; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return (
      <svg viewBox="0 0 100 100" className={className} role="img" aria-label={alt}>
        <path
          d="M50 6 L88 20 V50 C88 74 70 90 50 96 C30 90 12 74 12 50 V20 Z"
          fill="#3b82f6"
          stroke="#dbeafe"
          strokeWidth="3"
        />
        <polygon
          points="50,28 56,44 73,45 60,56 64,72 50,63 36,72 40,56 27,45 44,44"
          fill="#eff6ff"
        />
      </svg>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      draggable={false}
      onError={() => setFailed(true)}
      className={`${className} object-contain`}
    />
  );
}

/* =========================================================
   PODIUM
   ========================================================= */

interface PodiumStyle {
  card: string;
  minH: string;
  avatar: string;
  name: string;
  sub: string;
  chip: string;
  tile: string;
  watermark: string;
  delay: number;
}

const PODIUM_STYLE: Record<1 | 2 | 3, PodiumStyle> = {
  1: {
    card: 'border-blue-400 bg-gradient-to-b from-blue-500 to-blue-800 text-white',
    minH: 'min-h-[410px]',
    avatar: 'h-36 w-36',
    name: 'text-white',
    sub: 'text-blue-100',
    chip: 'bg-white text-blue-700',
    tile: 'bg-white/15 text-white',
    watermark: 'text-white',
    delay: 0.1,
  },
  2: {
    card: 'border-blue-300 bg-gradient-to-b from-blue-100 to-white text-slate-800',
    minH: 'min-h-[350px]',
    avatar: 'h-28 w-28',
    name: 'text-slate-900',
    sub: 'text-blue-700',
    chip: 'bg-blue-600 text-white',
    tile: 'bg-white text-blue-800 border border-blue-100',
    watermark: 'text-blue-600',
    delay: 0.25,
  },
  3: {
    card: 'border-blue-200 bg-gradient-to-b from-blue-50 to-white text-slate-800',
    minH: 'min-h-[320px]',
    avatar: 'h-24 w-24',
    name: 'text-slate-900',
    sub: 'text-blue-600',
    chip: 'bg-blue-500 text-white',
    tile: 'bg-white text-blue-800 border border-blue-100',
    watermark: 'text-blue-500',
    delay: 0.4,
  },
};

function PodiumCard({
  item,
  place,
  lite,
  onOpen,
}: {
  item: Item;
  place: 1 | 2 | 3;
  lite: boolean;
  onOpen: (a: Item) => void;
}) {
  const s = PODIUM_STYLE[place];
  const first = place === 1;

  return (
    <div
      className="lb-rise"
      style={{ ['--d' as string]: `${s.delay}s` } as React.CSSProperties}
    >
      <button
        type="button"
        onClick={() => onOpen(item)}
        aria-label={`Lihat profil ${item.nama}, peringkat ${item.posisi}`}
        className={`group relative flex w-full cursor-pointer flex-col items-center overflow-hidden rounded-3xl border-2 px-6 pb-6 pt-7 text-center transition-transform duration-300 hover:-translate-y-2 active:scale-[.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-400/60 ${s.card} ${s.minH}`}
        style={
          first
            ? {
                backgroundImage:
                  'radial-gradient(rgba(255,255,255,.16) 1.5px, transparent 1.5px), linear-gradient(to bottom, #3b82f6, #1e40af)',
                backgroundSize: '18px 18px, 100% 100%',
              }
            : undefined
        }
      >
        {/* angka besar sebagai watermark (teks biasa, sangat ringan) */}
        <span
          aria-hidden
          className={`pointer-events-none absolute -bottom-10 -right-3 select-none text-[11rem] font-black leading-none opacity-10 ${s.watermark}`}
        >
          {item.posisi}
        </span>

        {/* chip peringkat */}
        <span
          className={`relative z-10 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-extrabold uppercase tracking-[0.2em] ${s.chip}`}
        >
          {item.posisi === 1 && <Crown className="h-3.5 w-3.5" />}
          Peringkat {item.posisi}
        </span>

        {/* emblem + cincin statis */}
        <div className={`relative z-10 mt-6 ${s.avatar} ${first && !lite ? 'lb-float lb-inf' : ''}`}>
          {first && (
            <>
              <span className="lb-pulse lb-inf absolute -inset-3 rounded-full border-2 border-white/50" />
              <span className="absolute -inset-6 rounded-full border border-white/25" />
            </>
          )}
          {!first && <span className="absolute -inset-2.5 rounded-full border border-blue-300" />}
          <Emblem
            src={item.avatar_rank}
            alt={`Rank ${item.rank_nama || ''}`}
            className="relative h-full w-full transition-transform duration-300 group-hover:scale-110"
          />
        </div>

        {/* identitas */}
        <div className="relative z-10 mt-6 w-full min-w-0">
          <div className={`truncate text-xl font-extrabold ${s.name}`}>{item.nama}</div>
          <div className={`mt-0.5 text-xs font-bold uppercase tracking-[0.25em] ${s.sub}`}>
            {item.rank_nama || 'Warrior'}
          </div>
          <div className={`mt-1 truncate text-xs ${s.sub}`}>
            {item.jenjang || '-'} • Kamar {item.kamar || '-'}
          </div>
        </div>

        {/* poin */}
        <div className="relative z-10 mt-4">
          <div className="text-4xl font-black leading-none">
            <CountUp value={item.total_poin ?? 0} lite={lite} />
          </div>
          <div className={`mt-1 text-[11px] font-bold uppercase tracking-[0.3em] ${s.sub}`}>poin</div>
        </div>

        {/* statistik mini */}
        <div className="relative z-10 mt-auto grid w-full grid-cols-3 gap-2 pt-5">
          {[
            { icon: Footprints, v: item.total_kunjungan, t: 'Kunjungan' },
            { icon: BookOpen, v: item.total_baca, t: 'Baca' },
            { icon: BookMarked, v: item.total_pinjam, t: 'Pinjam' },
          ].map(({ icon: Icon, v, t }) => (
            <div key={t} className={`rounded-xl px-2 py-2 ${s.tile}`} title={t}>
              <Icon className="mx-auto h-3.5 w-3.5" />
              <div className="mt-1 text-sm font-extrabold leading-none">{fmt(v)}</div>
            </div>
          ))}
        </div>
      </button>
    </div>
  );
}

function Podium({
  top,
  lite,
  onOpen,
}: {
  top: Item[];
  lite: boolean;
  onOpen: (a: Item) => void;
}) {
  // Susunan visual: juara 2 - juara 1 - juara 3
  const slots: { item: Item | undefined; place: 1 | 2 | 3 }[] = [
    { item: top[1], place: 2 },
    { item: top[0], place: 1 },
    { item: top[2], place: 3 },
  ];

  return (
    <div className="grid grid-cols-3 items-end gap-6 pt-2">
      {slots.map(({ item, place }) =>
        item ? (
          <PodiumCard key={item.id} item={item} place={place} lite={lite} onOpen={onOpen} />
        ) : (
          <div key={`empty-${place}`} />
        )
      )}
    </div>
  );
}

/* =========================================================
   BARIS PERINGKAT
   ========================================================= */

function RankRow({
  item,
  maxPoin,
  onOpen,
}: {
  item: Item;
  maxPoin: number;
  onOpen: (a: Item) => void;
}) {
  const top = item.posisi <= 3;
  const poin = item.total_poin ?? 0;
  const ratio = maxPoin > 0 ? Math.max(poin > 0 ? 0.02 : 0, Math.min(1, poin / maxPoin)) : 0;

  return (
    <li
      className="lb-slide"
      style={{ ['--d' as string]: `${item.delay}s` } as React.CSSProperties}
    >
      <button
        type="button"
        onClick={() => onOpen(item)}
        aria-label={`Lihat profil ${item.nama}, peringkat ${item.posisi}`}
        className={`group relative grid w-full ${GRID} cursor-pointer items-center gap-4 rounded-2xl border bg-white px-4 py-3 text-left transition-[transform,background-color,border-color] duration-200 hover:translate-x-1.5 hover:border-blue-400 hover:bg-blue-50 active:scale-[.995] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
          top ? 'border-blue-300' : 'border-slate-200'
        }`}
      >
        {/* garis aksen yang muncul saat hover */}
        <span className="pointer-events-none absolute bottom-3 left-0 top-3 w-1 origin-center scale-y-0 rounded-full bg-blue-600 transition-transform duration-200 group-hover:scale-y-100" />

        {/* nomor */}
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-extrabold transition-transform duration-200 group-hover:scale-110 ${
            top ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700'
          }`}
        >
          {item.posisi}
        </div>

        {/* anggota */}
        <div className="flex min-w-0 items-center gap-3">
          <div className="h-11 w-11 shrink-0 transition-transform duration-200 group-hover:scale-110">
            <Emblem src={item.avatar_rank} alt={`Rank ${item.rank_nama || ''}`} className="h-full w-full" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-bold text-slate-900">{item.nama}</div>
            <div className="truncate text-[11px] font-bold uppercase tracking-[0.2em] text-blue-600">
              {item.rank_nama || 'Warrior'}
            </div>
          </div>
        </div>

        {/* jenjang & kamar */}
        <div className="min-w-0 text-xs text-slate-500">
          <div className="truncate font-semibold text-slate-700">{item.jenjang || '-'}</div>
          <div className="truncate">Kamar {item.kamar || '-'}</div>
        </div>

        {/* angka */}
        <div className="text-center text-sm font-bold text-slate-700">{fmt(item.total_kunjungan)}</div>
        <div className="text-center text-sm font-bold text-slate-700">{fmt(item.total_baca)}</div>
        <div className="text-center text-sm font-bold text-slate-700">{fmt(item.total_pinjam)}</div>

        {/* poin + bar */}
        <div className="min-w-0">
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-extrabold text-slate-900">{fmt(poin)}</span>
            <span className="text-[11px] font-semibold text-blue-500">poin</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-blue-100">
            <div
              className="lb-bar h-full origin-left rounded-full bg-gradient-to-r from-blue-400 to-blue-700"
              style={
                {
                  ['--r' as string]: String(ratio),
                  ['--d' as string]: `${item.delay + 0.2}s`,
                } as React.CSSProperties
              }
            />
          </div>
        </div>
      </button>
    </li>
  );
}

/* =========================================================
   SKELETON
   ========================================================= */

function RowSkeleton() {
  return (
    <div
      className={`grid ${GRID} animate-pulse items-center gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3`}
    >
      <div className="h-10 w-10 rounded-xl bg-blue-100" />
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-full bg-blue-100" />
        <div className="flex-1">
          <div className="mb-2 h-3.5 w-2/3 rounded bg-blue-100" />
          <div className="h-3 w-1/3 rounded bg-blue-50" />
        </div>
      </div>
      <div className="h-3.5 w-1/2 rounded bg-blue-100" />
      <div className="mx-auto h-3.5 w-8 rounded bg-blue-100" />
      <div className="mx-auto h-3.5 w-8 rounded bg-blue-100" />
      <div className="mx-auto h-3.5 w-8 rounded bg-blue-100" />
      <div>
        <div className="mb-2 h-4 w-16 rounded bg-blue-100" />
        <div className="h-1.5 w-full rounded-full bg-blue-50" />
      </div>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div role="status" aria-busy="true">
      <span className="sr-only">Memuat leaderboard...</span>
      <div className="grid animate-pulse grid-cols-3 items-end gap-6">
        {[350, 410, 320].map((h, i) => (
          <div key={i} className="rounded-3xl border-2 border-blue-100 bg-blue-50" style={{ height: h }} />
        ))}
      </div>
      <div className="mt-10 space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <RowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

/* =========================================================
   HALAMAN UTAMA
   ========================================================= */

export default function LeaderboardPage() {
  const [jenjang, setJenjang] = useState<JenjangKey>('Semua');
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');

  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [moreError, setMoreError] = useState(false);
  const [stats, setStats] = useState<{ total: number; maxPoin: number } | null>(null);

  const [profileTarget, setProfileTarget] = useState<ProfileTarget | null>(null);
  const [lite, setLite] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  const reqIdRef = useRef(0);

  useEffect(() => {
    setLite(detectLite());
  }, []);

  /* debounce pencarian */
  useEffect(() => {
    const t = setTimeout(() => setSearch(sanitize(input)), 300);
    return () => clearTimeout(t);
  }, [input]);

  /* ---------- ambil satu halaman data dari server ---------- */
  const runQuery = useCallback(
    async (from: number) => {
      const rankCol = jenjang === 'Semua' ? 'peringkat' : 'peringkat_jenjang';

      let q: any = supabase
        .from(VIEW)
        .select(COLUMNS, { count: from === 0 ? 'exact' : undefined });

      if (jenjang !== 'Semua') q = q.eq('jenjang', jenjang);
      if (search) q = q.or(`nama.ilike.%${search}%,nis.ilike.%${search}%`);

      const { data, error, count } = await q
        .order(rankCol, { ascending: true })
        .order('total_kunjungan', { ascending: false, nullsFirst: false })
        .order('nama', { ascending: true })
        .order('id', { ascending: true })
        .range(from, from + PAGE_SIZE - 1);

      if (error) throw error;
      return { rows: (data || []) as Row[], count: count as number | null };
    },
    [jenjang, search]
  );

  const decorate = useCallback(
    (rows: Row[]): Item[] =>
      rows.map((r, i) => ({
        ...r,
        posisi: jenjang === 'Semua' ? r.peringkat : r.peringkat_jenjang ?? r.peringkat,
        delay: Math.min(i, 14) * 0.035,
      })),
    [jenjang]
  );

  /* ---------- muat ulang dari halaman pertama saat filter berubah ---------- */
  useEffect(() => {
    const id = ++reqIdRef.current;
    setLoading(true);
    setLoadingMore(false);
    setErrorMsg(null);
    setMoreError(false);
    setItems([]);
    setTotal(null);

    runQuery(0)
      .then(({ rows, count }) => {
        if (id !== reqIdRef.current) return;
        setItems(decorate(rows));
        setTotal(count ?? rows.length);
      })
      .catch((err: any) => {
        if (id !== reqIdRef.current) return;
        setErrorMsg(err?.message || 'Gagal memuat leaderboard.');
      })
      .finally(() => {
        if (id === reqIdRef.current) setLoading(false);
      });
  }, [runQuery, decorate, retryKey]);

  /* ---------- statistik jenjang (total anggota & poin tertinggi untuk bar) ---------- */
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        let q: any = supabase.from(VIEW).select('total_poin', { count: 'exact' });
        if (jenjang !== 'Semua') q = q.eq('jenjang', jenjang);
        const { data, count, error } = await q
          .order('total_poin', { ascending: false, nullsFirst: false })
          .limit(1);
        if (error) throw error;
        if (active) setStats({ total: count ?? 0, maxPoin: data?.[0]?.total_poin ?? 0 });
      } catch {
        if (active) setStats(null);
      }
    })();
    return () => {
      active = false;
    };
  }, [jenjang, retryKey]);

  /* ---------- load more ---------- */
  const loadMore = async () => {
    if (loading || loadingMore) return;
    const id = reqIdRef.current;
    setLoadingMore(true);
    setMoreError(false);
    try {
      const { rows } = await runQuery(items.length);
      if (id !== reqIdRef.current) return;
      setItems((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...decorate(rows.filter((r) => !seen.has(r.id)))];
      });
    } catch {
      if (id === reqIdRef.current) setMoreError(true);
    } finally {
      if (id === reqIdRef.current) setLoadingMore(false);
    }
  };

  const openProfile = useCallback((a: Item) => {
    setProfileTarget({ id: a.id, nama: a.nama });
  }, []);

  /* ---------- turunan ---------- */
  const searching = search.length > 0;
  const top3 = searching ? [] : items.slice(0, 3);
  const listItems = searching ? items : items.slice(3);
  const maxPoin = stats?.maxPoin || items[0]?.total_poin || 0;
  const hasMore =
    total !== null
      ? items.length < total
      : items.length > 0 && items.length % PAGE_SIZE === 0;
  const remaining = total !== null ? Math.max(0, total - items.length) : 0;
  const activeIdx = Math.max(
    0,
    FILTERS.findIndex((f) => f.key === jenjang)
  );
  const activeLabel = FILTERS[activeIdx].label;

  return (
    <div
      data-lite={lite ? 'true' : 'false'}
      className="min-h-screen min-w-[1180px] bg-[#f7f8fa] text-slate-800"
    >
      <style>{`
        @keyframes lb-rise{from{opacity:0;transform:translate3d(0,26px,0)}}
        @keyframes lb-slide{from{opacity:0;transform:translate3d(-26px,0,0)}}
        @keyframes lb-pop{from{opacity:0;transform:scale(.85)}}
        @keyframes lb-bar{from{transform:scaleX(0)}}
        @keyframes lb-float{0%,100%{transform:translate3d(0,0,0)}50%{transform:translate3d(0,-8px,0)}}
        @keyframes lb-pulse{0%{opacity:.6;transform:scale(1)}100%{opacity:0;transform:scale(1.35)}}
        .lb-rise{animation:lb-rise .6s cubic-bezier(.2,.8,.2,1) var(--d,0s) backwards}
        .lb-slide{animation:lb-slide .55s cubic-bezier(.2,.8,.2,1) var(--d,0s) backwards}
        .lb-pop{animation:lb-pop .5s cubic-bezier(.34,1.56,.64,1) var(--d,0s) backwards}
        .lb-bar{transform:scaleX(var(--r,1));animation:lb-bar .9s cubic-bezier(.2,.8,.2,1) var(--d,0s) backwards}
        .lb-float{animation:lb-float 3.2s ease-in-out infinite}
        .lb-pulse{animation:lb-pulse 2.4s ease-out infinite}
        [data-lite="true"] .lb-float,
        [data-lite="true"] .lb-pulse{animation:none}
        [data-lite="true"] .lb-rise,
        [data-lite="true"] .lb-slide,
        [data-lite="true"] .lb-pop{animation-duration:.25s}
        @media (prefers-reduced-motion: reduce){
          .lb-rise,.lb-slide,.lb-pop,.lb-bar,.lb-float,.lb-pulse{animation:none!important}
        }
      `}</style>

      <div className="grid grid-cols-[340px_minmax(0,1fr)]">
        {/* ================= SIDEBAR ================= */}
        <aside className="bg-gradient-to-b from-blue-700 to-blue-900">
          <div className="sticky top-0 flex h-screen flex-col gap-6 overflow-y-auto p-7 text-white">
            {/* hiasan lingkaran statis */}
            <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute -bottom-28 -left-28 h-80 w-80 rounded-full border border-white/10" />
              <div className="absolute -bottom-12 -left-12 h-48 w-48 rounded-full border border-white/10" />
              <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full border border-white/10" />
            </div>

            <Link
              href="/"
              className="lb-slide relative inline-flex w-fit items-center gap-2 rounded-xl border border-white/25 px-3.5 py-2 text-sm font-bold text-white transition-[transform,background-color] duration-200 hover:-translate-x-1 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Beranda
            </Link>

            <div className="lb-rise relative" style={{ ['--d' as string]: '0.05s' } as React.CSSProperties}>
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-blue-700">
                <Trophy className="h-8 w-8" />
              </div>
              <h1 className="mt-4 text-4xl font-black leading-none tracking-tight">Leaderboard</h1>
              <p className="mt-2 text-sm leading-relaxed text-blue-100">
                Peringkat pengunjung perpustakaan berdasarkan total poin.
              </p>
            </div>

            {/* pencarian */}
            <div className="lb-rise relative" style={{ ['--d' as string]: '0.12s' } as React.CSSProperties}>
              <label htmlFor="lb-search" className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-blue-200">
                Cari anggota
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                  <Search className="h-4 w-4 text-blue-200" />
                </div>
                <input
                  id="lb-search"
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Nama atau NIS..."
                  autoComplete="off"
                  className="block w-full rounded-xl border border-white/20 bg-white/10 py-3 pl-10 pr-10 text-sm text-white placeholder-blue-200 transition-colors focus:border-white focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/40"
                />
                {input && (
                  <button
                    type="button"
                    onClick={() => setInput('')}
                    aria-label="Hapus pencarian"
                    className="absolute inset-y-0 right-0 flex cursor-pointer items-center pr-3.5 text-blue-200 transition-colors hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* filter jenjang dengan pil yang meluncur */}
            <div className="lb-rise relative" style={{ ['--d' as string]: '0.19s' } as React.CSSProperties}>
              <div className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-blue-200">Jenjang</div>
              <div role="tablist" aria-label="Filter jenjang" className="relative flex flex-col gap-1">
                <div
                  aria-hidden
                  className="absolute left-0 top-0 h-11 w-full rounded-xl bg-white"
                  style={{
                    transform: `translate3d(0, ${activeIdx * 48}px, 0)`,
                    transition: 'transform .35s cubic-bezier(.2,.8,.2,1)',
                  }}
                />
                {FILTERS.map((f) => {
                  const active = f.key === jenjang;
                  const Icon = f.icon;
                  return (
                    <button
                      key={f.key}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setJenjang(f.key)}
                      className={`relative z-10 flex h-11 cursor-pointer items-center gap-3 rounded-xl px-4 text-sm font-bold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                        active ? 'text-blue-800' : 'text-blue-100 hover:text-white'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {f.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ringkasan */}
            <div className="lb-rise relative grid grid-cols-2 gap-3" style={{ ['--d' as string]: '0.26s' } as React.CSSProperties}>
              <div className="rounded-2xl bg-white/10 p-4">
                <div className="text-[11px] font-bold uppercase tracking-widest text-blue-200">Anggota</div>
                <div className="mt-1 text-2xl font-black">
                  {stats ? <CountUp value={stats.total} lite={lite} /> : '-'}
                </div>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <div className="text-[11px] font-bold uppercase tracking-widest text-blue-200">Poin Teratas</div>
                <div className="mt-1 text-2xl font-black">
                  {stats ? <CountUp value={stats.maxPoin} lite={lite} /> : '-'}
                </div>
              </div>
            </div>

            <p className="relative mt-auto flex items-start gap-2 text-xs leading-relaxed text-blue-200">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Klik pengunjung mana pun untuk melihat profil lengkapnya.
            </p>
          </div>
        </aside>

        {/* ================= KONTEN ================= */}
        <main className="min-w-0 px-12 py-10">
          <div className="mx-auto max-w-[1180px]">
            <header className="mb-8 flex items-end justify-between gap-6">
              <div className="lb-slide">
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-blue-600">{activeLabel}</p>
                <h2 className="mt-1 text-4xl font-black tracking-tight text-slate-900">
                  {searching ? 'Hasil Pencarian' : 'Peringkat Teratas'}
                </h2>
                {searching && (
                  <p className="mt-1 text-sm text-slate-500">
                    Kata kunci: <span className="font-bold text-blue-700">&ldquo;{search}&rdquo;</span>
                  </p>
                )}
              </div>
              {!loading && !errorMsg && total !== null && (
                <p className="text-sm font-medium text-slate-500" aria-live="polite">
                  Menampilkan <span className="font-bold text-slate-800">{fmt(items.length)}</span> dari{' '}
                  <span className="font-bold text-slate-800">{fmt(total)}</span> anggota
                </p>
              )}
            </header>

            {loading ? (
              <PageSkeleton />
            ) : errorMsg ? (
              <div
                role="alert"
                className="flex flex-col items-center rounded-3xl border border-blue-200 bg-blue-50 px-8 py-14 text-center"
              >
                <AlertCircle className="h-10 w-10 text-blue-600" />
                <p className="mt-4 text-base font-bold text-blue-900">{errorMsg}</p>
                <p className="mt-1 text-sm text-blue-700">
                  Pastikan view <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs">{VIEW}</code>{' '}
                  sudah dibuat di Supabase.
                </p>
                <button
                  type="button"
                  onClick={() => setRetryKey((k) => k + 1)}
                  className="mt-6 flex cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition-transform duration-200 hover:-translate-y-0.5 hover:bg-blue-700 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Coba lagi
                </button>
              </div>
            ) : items.length === 0 ? (
              <div className="lb-pop flex flex-col items-center rounded-3xl border border-blue-100 bg-white px-8 py-20 text-center">
                <Search className="h-12 w-12 text-blue-300" />
                <p className="mt-4 text-base font-bold text-slate-800">
                  {searching ? 'Nama atau NIS tidak ditemukan.' : 'Belum ada data peringkat.'}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {searching ? 'Coba kata kunci lain atau ganti jenjang.' : 'Data akan muncul setelah ada kunjungan.'}
                </p>
              </div>
            ) : (
              <>
                {!searching && top3.length > 0 && <Podium top={top3} lite={lite} onOpen={openProfile} />}

                {listItems.length > 0 && (
                  <section className={searching ? '' : 'mt-12'}>
                    {/* header kolom (menempel saat scroll) */}
                    <div className="sticky top-0 z-20 bg-[#f7f8fa] pb-3 pt-2">
                      <div
                        className={`grid ${GRID} items-center gap-4 px-4 text-[11px] font-bold uppercase tracking-[0.18em] text-blue-600`}
                      >
                        <div className="text-center">#</div>
                        <div>Anggota</div>
                        <div>Jenjang</div>
                        <div className="text-center">Kunjungan</div>
                        <div className="text-center">Baca</div>
                        <div className="text-center">Pinjam</div>
                        <div>Total Poin</div>
                      </div>
                    </div>

                    <ul className="space-y-3">
                      {listItems.map((item) => (
                        <RankRow key={item.id} item={item} maxPoin={maxPoin} onOpen={openProfile} />
                      ))}
                    </ul>

                    {loadingMore && (
                      <div role="status" aria-busy="true" className="mt-3 space-y-3">
                        <span className="sr-only">Memuat data berikutnya...</span>
                        <RowSkeleton />
                        <RowSkeleton />
                        <RowSkeleton />
                      </div>
                    )}
                  </section>
                )}

                {/* LOAD MORE */}
                <div className="mt-10 flex flex-col items-center gap-3">
                  {moreError && (
                    <p className="flex items-center gap-2 text-sm font-semibold text-blue-800">
                      <AlertCircle className="h-4 w-4" />
                      Gagal memuat data berikutnya. Coba lagi.
                    </p>
                  )}

                  {hasMore ? (
                    <button
                      type="button"
                      onClick={loadMore}
                      disabled={loadingMore}
                      className="group flex cursor-pointer items-center gap-3 rounded-2xl bg-blue-600 px-8 py-4 text-sm font-bold text-white transition-[transform,background-color] duration-200 hover:-translate-y-0.5 hover:bg-blue-700 active:translate-y-0 active:scale-95 disabled:cursor-wait disabled:bg-blue-300 disabled:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                    >
                      {loadingMore ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Memuat...
                        </>
                      ) : (
                        <>
                          Muat lebih banyak
                          {remaining > 0 && (
                            <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs">
                              {fmt(remaining)} lagi
                            </span>
                          )}
                          <ChevronDown className="h-4 w-4 transition-transform duration-200 group-hover:translate-y-1" />
                        </>
                      )}
                    </button>
                  ) : (
                    <p className="text-sm font-medium text-slate-400">Semua peringkat sudah ditampilkan.</p>
                  )}
                </div>
              </>
            )}
          </div>
        </main>
      </div>

      {/* Modal profil (intro bergaya game) */}
      <VisitorProfileModal
        isOpen={profileTarget !== null}
        target={profileTarget}
        onClose={() => setProfileTarget(null)}
      />
    </div>
  );
}