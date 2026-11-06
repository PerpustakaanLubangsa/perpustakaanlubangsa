'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  BookOpen,
  Users,
  FileText,
  Library,
  Layers,
  BookMarked,
  TrendingUp,
  CalendarDays,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  RefreshCw,
} from 'lucide-react';

/* ===================== Konstanta & tipe ===================== */

const CARD = 'bg-white border border-slate-200 shadow-sm';
const BADGE = 'bg-blue-50 text-blue-600 border border-blue-200';

const TITLE = 'Ahlan Wa Sahlan, Pustakawan!';
const SUBTITLE = 'Berikut adalah rangkuman aktivitas sirkulasi dan literasi hari ini.';

const RANGES = [7, 14, 30, 90] as const;

// Jadwal animasi pembuka (milidetik sejak halaman siap)
const OPEN_AT = 2000; // tirai mulai terbelah
const REMOVE_AT = 2800; // overlay dilepas dari DOM
const CONTENT_DELAY = 2050; // konten dashboard mulai naik
const CHART_DELAY = 2450; // garis grafik mulai digambar
const DRAW_MS = 1800; // durasi garis digambar ke samping

type DailyVisitor = { tanggal: string; total: number };

type Totals = {
  anggota: number;
  judul: number;
  eksemplar: number;
  dipinjam: number;
  karyaPending: number;
};

type Activity = {
  id: number;
  nama_anggota: string | null;
  judul_buku: string | null;
  status: string | null;
  created_at: string;
};

/* ===================== Helper ===================== */

const nf = new Intl.NumberFormat('id-ID');

// Variabel CSS untuk animation-delay
const dl = (ms: number) => ({ '--d': `${ms}ms` } as React.CSSProperties);

const prefersReduced = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function fmtDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
  });
}

function fmtDateLong(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function timeAgo(iso: string) {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'baru saja';
  if (m < 60) return `${m} menit yang lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam yang lalu`;
  const d = Math.floor(h / 24);
  return `${d} hari yang lalu`;
}

// Pembulatan sumbu Y ke angka "enak dibaca"
function niceMax(v: number) {
  if (v <= 5) return 5;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * pow;
}

/* ===================== Animasi kata ===================== */

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

/* ===================== Angka berhitung naik ===================== */

function CountUp({
  value,
  startAt,
  offset = 0,
  duration = 1200,
}: {
  value: number;
  startAt: number;
  offset?: number;
  duration?: number;
}) {
  const [n, setN] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    if (prefersReduced()) {
      setN(value);
      fromRef.current = value;
      return;
    }
    const from = fromRef.current;
    const t0 = Math.max(performance.now(), startAt + offset);
    let raf = 0;

    const tick = (now: number) => {
      if (now < t0) {
        raf = requestAnimationFrame(tick);
        return;
      }
      const p = Math.min(1, (now - t0) / duration);
      const e = 1 - Math.pow(1 - p, 3); // ease-out cubic
      setN(Math.round(from + (value - from) * e));
      if (p < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = value;
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, startAt, offset, duration]);

  return <>{nf.format(n)}</>;
}

/* ===================== Grafik garis (SVG murni) ===================== */

function LineChart({ data, startAt }: { data: DailyVisitor[]; startAt: number }) {
  const W = 800;
  const H = 260;
  const P = { l: 40, r: 14, t: 14, b: 30 };
  const innerW = W - P.l - P.r;
  const innerH = H - P.t - P.b;

  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hover, setHover] = useState<number | null>(null);

  // Delay dihitung sekali saat grafik muncul.
  // Saat pertama kali: menunggu animasi pembuka selesai. Setelahnya: langsung jalan.
  const [delay] = useState(() => Math.max(0, startAt + CHART_DELAY - performance.now()));

  const { points, yMax, ticks, linePath, areaPath, xLabels } = useMemo(() => {
    const max = niceMax(Math.max(0, ...data.map((d) => d.total)));
    const n = data.length;
    const x = (i: number) => P.l + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
    const y = (v: number) => P.t + innerH - (v / max) * innerH;

    const pts = data.map((d, i) => ({ x: x(i), y: y(d.total), ...d }));
    const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const area = pts.length
      ? `${line} L${pts[pts.length - 1].x.toFixed(1)},${P.t + innerH} L${pts[0].x.toFixed(1)},${P.t + innerH} Z`
      : '';

    const tk = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
      value: Math.round(max * f),
      y: y(max * f),
    }));

    // Label X: maksimal ±7 label agar tidak bertumpuk
    const every = Math.max(1, Math.ceil(n / 7));
    const xl = pts
      .map((p, i) => ({ i, x: p.x, label: fmtDate(p.tanggal) }))
      .filter((p) => p.i % every === 0 || p.i === n - 1)
      .filter((p, idx, arr) => !(p.i === n - 1 && idx > 0 && p.i - arr[idx - 1].i < every / 2));

    return { points: pts, yMax: max, ticks: tk, linePath: line, areaPath: area, xLabels: xl };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const handleMove = (clientX: number) => {
    const el = svgRef.current;
    if (!el || points.length === 0) return;
    const rect = el.getBoundingClientRect();
    const px = ((clientX - rect.left) / rect.width) * W;
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < points.length; i++) {
      const d = Math.abs(points[i].x - px);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }
    setHover(best);
  };

  const hp = hover !== null ? points[hover] : null;
  const tipLeft = hp ? (hp.x / W) * 100 : 0;
  const tipTop = hp ? (hp.y / H) * 100 : 0;

  const beginSec = `${(delay / 1000).toFixed(2)}s`;
  const durSec = `${(DRAW_MS / 1000).toFixed(2)}s`;

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto touch-pan-y select-none"
        role="img"
        aria-label="Grafik garis jumlah pengunjung harian"
        onPointerMove={(e) => handleMove(e.clientX)}
        onPointerDown={(e) => handleMove(e.clientX)}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="visitorFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
          </linearGradient>

          {/* Tirai yang terbuka dari kiri ke kanan, mengikuti garis */}
          <clipPath id="visitorReveal">
            <rect
              className="reveal-rect"
              x={P.l}
              y={0}
              width={W - P.l}
              height={H}
              style={{ ...dl(delay), transformOrigin: `${P.l}px 0px` }}
            />
          </clipPath>
        </defs>

        {/* Garis bantu horizontal + label sumbu Y */}
        <g className="fade-in" style={dl(Math.max(0, delay - 300))}>
          {ticks.map((t, i) => (
            <g key={i}>
              <line x1={P.l} x2={W - P.r} y1={t.y} y2={t.y} stroke="#e2e8f0" strokeWidth="1" />
              <text x={P.l - 8} y={t.y + 3.5} textAnchor="end" fontSize="10" fontWeight="600" fill="#64748b">
                {nf.format(t.value)}
              </text>
            </g>
          ))}

          {/* Label sumbu X */}
          {xLabels.map((l) => (
            <text key={l.i} x={l.x} y={H - 8} textAnchor="middle" fontSize="10" fontWeight="600" fill="#64748b">
              {l.label}
            </text>
          ))}
        </g>

        {/* Area & titik: terungkap seiring garis bergerak ke samping */}
        <g clipPath="url(#visitorReveal)">
          {areaPath && <path d={areaPath} fill="url(#visitorFill)" />}
          {points.length <= 31 &&
            points.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r="2.5" fill="#fff" stroke="#2563eb" strokeWidth="1.5" />
            ))}
        </g>

        {/* Garis utama: digambar ke samping */}
        {linePath && (
          <path
            d={linePath}
            pathLength={1}
            className="draw-line"
            style={{ ...dl(delay), animationDuration: `${DRAW_MS}ms` }}
            fill="none"
            stroke="#2563eb"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {/* Titik pemandu yang berlari di ujung garis (tanpa blur) */}
        {points.length > 1 && (
          <g className="leader" opacity="0">
            <animateMotion
              path={linePath}
              begin={beginSec}
              dur={durSec}
              fill="freeze"
              calcMode="spline"
              keyTimes="0;1"
              keyPoints="0;1"
              keySplines="0.4 0 0.2 1"
            />
            <animate
              attributeName="opacity"
              values="0;1;1;0"
              keyTimes="0;0.02;0.93;1"
              begin={beginSec}
              dur={durSec}
              fill="freeze"
            />
            <circle r="5" fill="none" stroke="#60a5fa" strokeWidth="2">
              <animate attributeName="r" values="5;17" dur="0.7s" begin={beginSec} repeatCount="3" />
              <animate attributeName="opacity" values="0.7;0" dur="0.7s" begin={beginSec} repeatCount="3" />
            </circle>
            <circle r="5" fill="#2563eb" stroke="#fff" strokeWidth="2" />
          </g>
        )}

        {/* Penanda hover */}
        {hp && (
          <g>
            <line x1={hp.x} x2={hp.x} y1={P.t} y2={P.t + innerH} stroke="#93c5fd" strokeWidth="1" strokeDasharray="3 3" />
            <circle cx={hp.x} cy={hp.y} r="5" fill="#2563eb" stroke="#fff" strokeWidth="2" />
          </g>
        )}
      </svg>

      {hp && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg bg-slate-900 px-2.5 py-1.5 text-white shadow-lg"
          style={{
            left: `${Math.min(88, Math.max(12, tipLeft))}%`,
            top: `calc(${tipTop}% - 10px)`,
          }}
        >
          <span className="block text-[10px] font-medium text-slate-300 whitespace-nowrap">
            {fmtDateLong(hp.tanggal)}
          </span>
          <span className="block text-xs font-black">{nf.format(hp.total)} pengunjung</span>
        </div>
      )}

      <span className="sr-only">Nilai maksimum sumbu: {yMax}</span>
    </div>
  );
}

/* ===================== Animasi pembuka megah ===================== */

function IntroOverlay() {
  return (
    <div className="intro fixed inset-0 z-[100] overflow-hidden pointer-events-none" aria-hidden="true">
      {/* Dua tirai yang terbelah ke kiri & kanan */}
      <div className="intro-panel intro-left" />
      <div className="intro-panel intro-right" />

      {/* Cahaya menyapu */}
      <div className="intro-sweep" />

      {/* Isi tengah */}
      <div className="intro-center absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
        <div className="relative flex items-center justify-center w-40 h-40">
          <span className="intro-ring" style={dl(300)} />
          <span className="intro-ring" style={dl(700)} />
          <span className="intro-ring" style={dl(1100)} />
          <div className="intro-emblem relative w-20 h-20 rounded-3xl bg-white flex items-center justify-center shadow-xl">
            <BookOpen className="w-10 h-10 text-blue-700" strokeWidth={2.5} />
          </div>
        </div>

        <h1 className="mt-4 text-3xl sm:text-4xl font-black text-white tracking-tight">
          <AnimatedWords text="Ahlan Wa Sahlan" startDelay={600} step={150} />
        </h1>

        <p className="intro-sub mt-2 text-[11px] font-bold uppercase tracking-[0.35em] text-blue-200">
          Lubangsa Library
        </p>

        <div className="mt-6 h-1 w-44 rounded-full bg-blue-900 overflow-hidden">
          <div className="intro-bar h-full w-full rounded-full bg-white" />
        </div>
      </div>
    </div>
  );
}

/* ===================== Halaman Dashboard ===================== */

export default function DashboardPage() {
  const router = useRouter();
  const [authLoading, setAuthLoading] = useState(true);

  // 'idle' = belum mulai, 'play' = overlay tampil, 'done' = selesai/dilewati
  const [intro, setIntro] = useState<'idle' | 'play' | 'done'>('idle');
  const [t0, setT0] = useState(0); // waktu mulai animasi (performance.now)

  const [days, setDays] = useState<number>(30);
  const [visitors, setVisitors] = useState<DailyVisitor[]>([]);
  const [visitorsLoading, setVisitorsLoading] = useState(true);

  const [totals, setTotals] = useState<Totals | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Proteksi halaman
  useEffect(() => {
    let isMounted = true;
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!isMounted) return;
      if (!session) router.replace('/login');
      else setAuthLoading(false);
    })();
    return () => {
      isMounted = false;
    };
  }, [router]);

  // Jalankan animasi pembuka begitu autentikasi selesai
  useEffect(() => {
    if (authLoading) return;
    setT0(performance.now());
    if (prefersReduced()) {
      setIntro('done');
      return;
    }
    setIntro('play');
    const timer = setTimeout(() => setIntro('done'), REMOVE_AT);
    return () => clearTimeout(timer);
  }, [authLoading]);

  // Ambil data pengunjung harian (RPC)
  const loadVisitors = useCallback(async (p_days: number) => {
    setVisitorsLoading(true);
    const { data, error } = await supabase.rpc('get_daily_visitors', { p_days });
    if (error) {
      setError(`Gagal memuat grafik pengunjung: ${error.message}`);
      setVisitors([]);
    } else {
      setVisitors(
        (data ?? []).map((r: { tanggal: string; total: number | string }) => ({
          tanggal: r.tanggal,
          total: Number(r.total),
        }))
      );
    }
    setVisitorsLoading(false);
  }, []);

  // Ambil total-total & aktivitas terakhir
  const loadSummary = useCallback(async () => {
    const count = (table: string, filter?: (q: any) => any) => {
      let q: any = supabase.from(table).select('*', { count: 'exact', head: true });
      if (filter) q = filter(q);
      return q;
    };

    const [anggota, judul, eksemplar, dipinjam, karya, recent] = await Promise.all([
      count('anggota'),
      count('biblio'),
      count('eksemplar'),
      count('sirkulasi', (q) => q.eq('status', 'DIPINJAM')),
      count('karya', (q) => q.eq('status', 'pending')),
      supabase
        .from('sirkulasi')
        .select('id, nama_anggota, judul_buku, status, created_at')
        .order('created_at', { ascending: false })
        .limit(6),
    ]);

    const firstErr = [anggota, judul, eksemplar, dipinjam, karya, recent].find((r) => r.error)?.error;
    if (firstErr) setError(`Sebagian data gagal dimuat: ${firstErr.message}`);

    setTotals({
      anggota: anggota.count ?? 0,
      judul: judul.count ?? 0,
      eksemplar: eksemplar.count ?? 0,
      dipinjam: dipinjam.count ?? 0,
      karyaPending: karya.count ?? 0,
    });
    setActivities((recent.data as Activity[]) ?? []);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    loadSummary();
  }, [authLoading, loadSummary]);

  useEffect(() => {
    if (authLoading) return;
    loadVisitors(days);
  }, [authLoading, days, loadVisitors]);

  const refreshAll = async () => {
    setRefreshing(true);
    setError(null);
    await Promise.all([loadVisitors(days), loadSummary()]);
    setRefreshing(false);
  };

  // Ringkasan dari data grafik
  const stats = useMemo(() => {
    if (visitors.length === 0) return { today: 0, sum: 0, avg: 0, peak: 0, peakDate: '' };
    const sum = visitors.reduce((a, b) => a + b.total, 0);
    const peakItem = visitors.reduce((a, b) => (b.total > a.total ? b : a), visitors[0]);
    return {
      today: visitors[visitors.length - 1].total,
      sum,
      avg: sum / visitors.length,
      peak: peakItem.total,
      peakDate: peakItem.tanggal,
    };
  }, [visitors]);

  const STATS = [
    { title: 'Kunjungan Hari Ini', value: stats.today, info: 'Pengunjung tercatat hari ini', icon: Users },
    { title: 'Sedang Dipinjam', value: totals?.dipinjam, info: 'Eksemplar belum kembali', icon: BookMarked },
    { title: 'Total Anggota', value: totals?.anggota, info: 'Santri terdaftar', icon: Users },
    { title: 'Karya Tulis', value: totals?.karyaPending, info: 'Menunggu verifikasi', icon: FileText },
  ];

  const COLLECTION = [
    { title: 'Judul Buku', value: totals?.judul, icon: Library },
    { title: 'Total Eksemplar', value: totals?.eksemplar, icon: Layers },
    {
      title: 'Rasio Eksemplar / Judul',
      value: totals && totals.judul > 0 ? (totals.eksemplar / totals.judul).toFixed(1) : '0',
      icon: BookOpen,
    },
  ];

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-slate-800 flex flex-col font-sans">
      <style>{`
        /* ---------- Dasar ---------- */
        @keyframes word-in {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .word-in { opacity: 0; animation: word-in 0.4s cubic-bezier(.2,.8,.2,1) forwards; }

        @keyframes pulse-soft { 0%,100% { opacity: 1 } 50% { opacity: .5 } }
        .skeleton { background:#e2e8f0; border-radius:8px; animation: pulse-soft 1.2s ease-in-out infinite; }

        /* ---------- Konten naik satu per satu ---------- */
        @keyframes rise {
          from { opacity: 0; transform: translateY(22px) scale(.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .rise {
          opacity: 0;
          animation: rise .65s cubic-bezier(.2,.8,.2,1) forwards;
          animation-delay: var(--d, 0ms);
        }

        @keyframes fade-in { from { opacity: 0 } to { opacity: 1 } }
        .fade-in { opacity: 0; animation: fade-in .6s ease-out forwards; animation-delay: var(--d, 0ms); }

        /* ---------- Grafik: garis digambar ke samping ---------- */
        @keyframes draw { to { stroke-dashoffset: 0; } }
        .draw-line {
          stroke-dasharray: 1 1;
          stroke-dashoffset: 1;
          animation: draw 1.8s cubic-bezier(.4,0,.2,1) forwards;
          animation-delay: var(--d, 0ms);
        }
        @keyframes reveal { to { transform: scaleX(1); } }
        .reveal-rect {
          transform: scaleX(0);
          animation: reveal 1.8s cubic-bezier(.4,0,.2,1) forwards;
          animation-delay: var(--d, 0ms);
        }

        /* ---------- Intro megah ---------- */
        .intro-panel {
          position: absolute; top: 0; bottom: 0; width: 50.2%;
          background: linear-gradient(180deg, #0a2463 0%, #1d4ed8 100%);
          will-change: transform;
        }
        .intro-left  { left: 0;  animation: panel-l .75s cubic-bezier(.76,0,.24,1) ${OPEN_AT}ms forwards; box-shadow: 2px 0 0 #60a5fa; }
        .intro-right { right: 0; animation: panel-r .75s cubic-bezier(.76,0,.24,1) ${OPEN_AT}ms forwards; box-shadow: -2px 0 0 #60a5fa; }
        @keyframes panel-l { to { transform: translateX(-100%); } }
        @keyframes panel-r { to { transform: translateX(100%); } }

        .intro-center { animation: center-out .45s ease-in ${OPEN_AT - 80}ms forwards; will-change: transform, opacity; }
        @keyframes center-out { to { opacity: 0; transform: scale(1.15); } }

        .intro-emblem { opacity: 0; animation: emblem-pop .75s cubic-bezier(.2,1.5,.4,1) .15s forwards; }
        @keyframes emblem-pop {
          from { opacity: 0; transform: scale(.2) rotate(-25deg); }
          to   { opacity: 1; transform: scale(1) rotate(0); }
        }

        .intro-ring {
          position: absolute; inset: 0; border-radius: 9999px;
          border: 2px solid #93c5fd; opacity: 0;
          animation: ring 1.3s ease-out forwards;
          animation-delay: var(--d, 0ms);
        }
        @keyframes ring {
          from { opacity: .7; transform: scale(.5); }
          to   { opacity: 0;  transform: scale(3.4); }
        }

        .intro-sweep {
          position: absolute; top: 0; bottom: 0; left: 0; width: 30%;
          background: linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,.16), rgba(255,255,255,0));
          transform: translateX(-120%) skewX(-18deg);
          animation: sweep 1.2s ease-in-out .5s forwards;
        }
        @keyframes sweep { to { transform: translateX(420%) skewX(-18deg); } }

        .intro-sub { opacity: 0; animation: sub-in .7s ease-out 1.1s forwards; }
        @keyframes sub-in {
          from { opacity: 0; letter-spacing: .6em; }
          to   { opacity: 1; letter-spacing: .35em; }
        }

        .intro-bar { transform: scaleX(0); transform-origin: left; animation: bar 1.35s cubic-bezier(.4,0,.2,1) .55s forwards; }
        @keyframes bar { to { transform: scaleX(1); } }

        /* ---------- Aksesibilitas: kurangi gerak ---------- */
        @media (prefers-reduced-motion: reduce) {
          .word-in, .rise, .fade-in { opacity: 1; animation: none; transform: none; }
          .draw-line { stroke-dashoffset: 0; animation: none; }
          .reveal-rect { transform: none; animation: none; }
          .leader { display: none; }
          .skeleton { animation: none; }
        }
      `}</style>

      {intro === 'play' && <IntroOverlay />}

      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        {/* Selamat Datang */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-white tracking-tight [text-shadow:0_1px_3px_rgba(0,0,0,0.35)]">
              <AnimatedWords text={TITLE} startDelay={CONTENT_DELAY} step={80} />
            </h2>
            <p className="text-xs text-white font-medium [text-shadow:0_1px_2px_rgba(0,0,0,0.35)]">
              <AnimatedWords text={SUBTITLE} startDelay={CONTENT_DELAY + 380} step={35} />
            </p>
          </div>

          <button
            onClick={refreshAll}
            disabled={refreshing}
            className="rise flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider transition-colors active:scale-95 self-start md:self-auto"
            style={dl(CONTENT_DELAY + 200)}
          >
            <RefreshCw className={`w-3.5 h-3.5 stroke-[3] ${refreshing ? 'animate-spin' : ''}`} />
            Muat Ulang
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-blue-200 bg-white px-4 py-3 text-xs font-semibold text-slate-700 shadow-sm">
            {error}
          </div>
        )}

        {/* ===== Grafik Garis Pengunjung (paling atas) ===== */}
        <section className={`rise ${CARD} rounded-2xl p-5`} style={dl(CONTENT_DELAY + 100)}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Grafik Pengunjung</h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Jumlah kunjungan per hari, {days} hari terakhir
              </p>
            </div>

            <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 self-start">
              {RANGES.map((r) => (
                <button
                  key={r}
                  onClick={() => setDays(r)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-black transition-colors ${
                    days === r ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-blue-50'
                  }`}
                >
                  {r} Hari
                </button>
              ))}
            </div>
          </div>

          {/* Ringkasan mini */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {[
              { label: 'Hari ini', value: nf.format(stats.today), icon: CalendarDays },
              { label: `Total ${days} hari`, value: nf.format(stats.sum), icon: Users },
              { label: 'Rata-rata / hari', value: nf.format(Math.round(stats.avg * 10) / 10), icon: TrendingUp },
              {
                label: 'Puncak',
                value: stats.peak ? `${nf.format(stats.peak)} · ${fmtDate(stats.peakDate)}` : '0',
                icon: TrendingUp,
              },
            ].map((m) => (
              <div key={m.label} className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <m.icon className="w-3 h-3" /> {m.label}
                </span>
                <span className="text-sm font-black text-slate-900 block mt-0.5">
                  {visitorsLoading ? <span className="skeleton inline-block h-4 w-14 align-middle" /> : m.value}
                </span>
              </div>
            ))}
          </div>

          {visitorsLoading ? (
            <div className="skeleton w-full" style={{ aspectRatio: '800 / 260' }} />
          ) : visitors.length === 0 ? (
            <div className="py-16 text-center text-xs font-semibold text-slate-500">
              Belum ada data pengunjung.
            </div>
          ) : (
            <LineChart data={visitors} startAt={t0} />
          )}
        </section>

        {/* ===== Kartu Statistik ===== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {STATS.map((stat, i) => (
            <div
              key={stat.title}
              className={`rise ${CARD} p-5 rounded-2xl flex items-start justify-between`}
              style={dl(CONTENT_DELAY + 250 + i * 110)}
            >
              <div className="space-y-1">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                  {stat.title}
                </span>
                <span className="text-2xl font-black text-slate-900 tracking-tight block">
                  {stat.value === undefined ? (
                    <span className="skeleton inline-block h-7 w-16" />
                  ) : (
                    <CountUp value={stat.value} startAt={t0} offset={CONTENT_DELAY + 350 + i * 110} />
                  )}
                </span>
                <span className="text-[10px] text-slate-500 font-medium block">{stat.info}</span>
              </div>
              <div className={`w-10 h-10 ${BADGE} rounded-xl flex items-center justify-center shrink-0`}>
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
          ))}
        </div>

        {/* ===== Aktivitas + Koleksi ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Log Aktivitas */}
          <div
            className={`rise lg:col-span-2 ${CARD} rounded-2xl overflow-hidden`}
            style={dl(CONTENT_DELAY + 700)}
          >
            <div className="p-5 flex items-center justify-between border-b border-slate-200">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                  Peminjaman Terbaru
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">Pemantauan sirkulasi santri</p>
              </div>
              <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-md uppercase tracking-wider">
                Live View
              </span>
            </div>

            <div className="divide-y divide-slate-200">
              {!totals ? (
                [0, 1, 2].map((i) => (
                  <div key={i} className="p-4">
                    <div className="skeleton h-8 w-full" />
                  </div>
                ))
              ) : activities.length === 0 ? (
                <div className="p-8 text-center text-xs font-semibold text-slate-500">
                  Belum ada aktivitas sirkulasi.
                </div>
              ) : (
                activities.map((act) => {
                  const returned = act.status && act.status.toUpperCase() !== 'DIPINJAM';
                  return (
                    <div
                      key={act.id}
                      className="p-4 flex items-center justify-between gap-3 hover:bg-blue-50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 ${
                            returned
                              ? 'bg-blue-100 border-blue-300 text-blue-600'
                              : 'bg-blue-50 border-blue-200 text-blue-500'
                          }`}
                        >
                          {returned ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-black text-slate-900 block truncate">
                            {act.nama_anggota ?? 'Tanpa nama'}
                          </span>
                          <span className="text-[11px] text-slate-600 font-medium block truncate">
                            {returned ? 'Mengembalikan' : 'Meminjam'}{' '}
                            <span className="font-bold text-slate-800">“{act.judul_buku ?? '-'}”</span>
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium shrink-0">
                        <Clock className="w-3 h-3" /> {timeAgo(act.created_at)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Koleksi Perpustakaan */}
          <div className={`rise ${CARD} rounded-2xl p-5 space-y-4`} style={dl(CONTENT_DELAY + 820)}>
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Koleksi Perpustakaan</h3>
              <p className="text-[11px] text-slate-500 font-medium">Ringkasan katalog buku</p>
            </div>

            <div className="space-y-2">
              {COLLECTION.map((item) => (
                <div
                  key={item.title}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 ${BADGE} rounded-lg flex items-center justify-center`}>
                      <item.icon className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-700">{item.title}</span>
                  </div>
                  <span className="text-sm font-black text-slate-900">
                    {item.value === undefined ? (
                      <span className="skeleton inline-block h-4 w-10" />
                    ) : typeof item.value === 'number' ? (
                      <CountUp value={item.value} startAt={t0} offset={CONTENT_DELAY + 900} />
                    ) : (
                      item.value
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}