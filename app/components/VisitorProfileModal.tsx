'use client';

import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { createClient } from '@supabase/supabase-js';
import {
    X,
    Home,
    GraduationCap,
    Building2,
    BookOpen,
    BookMarked,
    Footprints,
    Star,
    Trophy,
    Layers,
    Clock,
    ShieldCheck,
} from 'lucide-react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface ProfileTarget {
    id: string;
    nama: string;
}

interface VisitorProfileModalProps {
    isOpen: boolean;
    target: ProfileTarget | null;
    onClose: () => void;
}

interface AnggotaProfile {
    id: string;
    nis: string;
    nama: string;
    jenjang: string;
    organisasi: string | null;
    kamar: string | null;
    role: string;
    rank: string | null;
    total_kunjungan: number | null;
    total_baca: number | null;
    total_pinjam: number | null;
    poin_tambahan: number | null;
    total_poin: number | null;
    avatar_rank: string | null;
    foto: string | null;
}

interface RiwayatItem {
    id: string | number;
    judul_buku: string | null;
    kategori: string | null;
    aktivitas: string | null;
    created_at: string;
}

interface KategoriStat {
    nama: string;
    baca: number;
    pinjam: number;
    total: number;
}

interface Stats {
    totalKunjungan: number;
    totalBaca: number;
    totalPinjam: number;
    kategoriFavorit: string | null;
    kategori: KategoriStat[];
}

type Phase = 'loading' | 'intro' | 'moving' | 'done' | 'error';
type Variant = 'up' | 'left' | 'right' | 'zoom' | 'pop' | 'flip' | 'fade';

const COLOR_BACA = '#3b82f6';
const COLOR_PINJAM = '#06b6d4';
const OVERLAY_BG = '#02030a';

/* ------------------------------------------------------------------ */
/* UTIL                                                                */
/* ------------------------------------------------------------------ */
function formatWaktu(iso: string) {
    try {
        return new Date(iso).toLocaleString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return iso;
    }
}

function preloadImage(url: string, timeoutMs = 2500): Promise<boolean> {
    return new Promise((resolve) => {
        const img = new Image();
        const timer = setTimeout(() => resolve(false), timeoutMs);
        img.onload = () => {
            clearTimeout(timer);
            resolve(true);
        };
        img.onerror = () => {
            clearTimeout(timer);
            resolve(false);
        };
        img.src = url;
    });
}

/* Deteksi perangkat low-end / hemat data / reduced motion -> mode ringan */
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

/* ------------------------------------------------------------------ */
/* SCROLL REVEAL (IntersectionObserver, hanya transform + opacity)     */
/* ------------------------------------------------------------------ */
const RevealCtx = createContext<{
    root: React.RefObject<HTMLDivElement | null>;
    enabled: boolean;
    lite: boolean;
}>({ root: { current: null }, enabled: false, lite: false });

function useReveal<T extends HTMLElement>() {
    const { root, enabled, lite } = useContext(RevealCtx);
    const ref = useRef<T | null>(null);
    const [inView, setInView] = useState(false);

    useEffect(() => {
        if (!enabled || inView) return;
        const el = ref.current;
        if (!el) return;
        if (typeof IntersectionObserver === 'undefined') {
            setInView(true);
            return;
        }
        const io = new IntersectionObserver(
            (entries) => {
                if (entries.some((e) => e.isIntersecting)) {
                    setInView(true);
                    io.disconnect();
                }
            },
            { root: root.current, threshold: 0.12, rootMargin: '0px 0px -5% 0px' }
        );
        io.observe(el);
        return () => io.disconnect();
    }, [enabled, inView, root]);

    return { ref, inView, lite };
}

function rvProps(inView: boolean, lite: boolean, variant: Variant, delay: number) {
    const v: Variant = lite ? 'fade' : variant;
    return {
        className: `vp-rv ${v}${inView ? ' in' : ''}`,
        style: { ['--d' as string]: `${lite ? Math.min(delay, 0.12) : delay}s` } as React.CSSProperties,
    };
}

function stag(on: boolean, lite: boolean, delay: number, dx = 0, dy = 0): React.CSSProperties {
    if (lite) {
        return { opacity: on ? 1 : 0, transition: `opacity .4s ease ${Math.min(delay, 0.15)}s` };
    }
    return {
        opacity: on ? 1 : 0,
        transform: on ? 'none' : `translate3d(${dx}px,${dy}px,0)`,
        transition: `opacity .6s ease ${delay}s, transform .7s cubic-bezier(.2,.8,.2,1) ${delay}s`,
    };
}

function Reveal({
    variant = 'up',
    delay = 0,
    className = '',
    children,
}: {
    variant?: Variant;
    delay?: number;
    className?: string;
    children: React.ReactNode;
}) {
    const { ref, inView, lite } = useReveal<HTMLDivElement>();
    const p = rvProps(inView, lite, variant, delay);
    return (
        <div ref={ref} className={`${p.className} ${className}`} style={p.style}>
            {children}
        </div>
    );
}

function CountUp({ value, active, lite }: { value: number; active: boolean; lite: boolean }) {
    const ref = useRef<HTMLSpanElement | null>(null);

    useEffect(() => {
        if (!active || lite) return;
        const el = ref.current;
        if (!el) return;
        const dur = 900;
        const t0 = performance.now();
        let raf = 0;
        const tick = (t: number) => {
            const p = Math.min(1, (t - t0) / dur);
            const e = 1 - Math.pow(1 - p, 3);
            el.textContent = String(Math.round(value * e));
            if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [active, lite, value]);

    return <span ref={ref}>{lite ? value : 0}</span>;
}

/* ------------------------------------------------------------------ */
/* EMBLEM                                                              */
/* ------------------------------------------------------------------ */
function Emblem({ src, alt }: { src: string | null; alt: string }) {
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        setFailed(false);
    }, [src]);

    if (!src || failed) {
        return (
            <svg viewBox="0 0 100 100" className="h-full w-full" aria-label={alt}>
                <defs>
                    <linearGradient id="vpShieldBlue" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#bfdbfe" />
                        <stop offset="50%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#1e3a8a" />
                    </linearGradient>
                </defs>
                <path
                    d="M50 6 L88 20 V50 C88 74 70 90 50 96 C30 90 12 74 12 50 V20 Z"
                    fill="url(#vpShieldBlue)"
                    stroke="#dbeafe"
                    strokeWidth="2"
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
            onError={() => setFailed(true)}
            draggable={false}
            className="h-full w-full object-contain"
        />
    );
}

/* ------------------------------------------------------------------ */
/* CHARTS (SVG/CSS ringan, animasi hanya transform + opacity)          */
/* ------------------------------------------------------------------ */
function DonutBacaPinjam({ baca, pinjam }: { baca: number; pinjam: number }) {
    const { ref, inView: on, lite } = useReveal<HTMLDivElement>();
    const total = baca + pinjam;
    const r = 54;
    const C = 2 * Math.PI * r;
    const bacaLen = total ? (C * baca) / total : 0;
    const pinjamLen = total ? (C * pinjam) / total : 0;
    const offTransform = lite ? 'rotate(-90deg)' : 'rotate(-200deg) scale(.7)';

    return (
        <div
            ref={ref}
            className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-8"
        >
            <div className="relative h-44 w-44 shrink-0">
                <svg
                    viewBox="0 0 140 140"
                    className="h-full w-full"
                    style={{
                        transform: on ? 'rotate(-90deg) scale(1)' : offTransform,
                        opacity: on ? 1 : 0,
                        transition: lite
                            ? 'opacity .5s ease'
                            : 'transform 1.1s cubic-bezier(.2,.8,.2,1), opacity .5s ease',
                    }}
                >
                    <circle cx="70" cy="70" r={r} fill="none" stroke="#e5eaf2" strokeWidth="16" />
                    {total > 0 && (
                        <>
                            <circle
                                cx="70"
                                cy="70"
                                r={r}
                                fill="none"
                                stroke={COLOR_BACA}
                                strokeWidth="16"
                                strokeDasharray={`${bacaLen} ${C}`}
                            />
                            <circle
                                cx="70"
                                cy="70"
                                r={r}
                                fill="none"
                                stroke={COLOR_PINJAM}
                                strokeWidth="16"
                                strokeDasharray={`${pinjamLen} ${C}`}
                                strokeDashoffset={-bacaLen}
                            />
                        </>
                    )}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-extrabold text-slate-800">
                        <CountUp value={total} active={on} lite={lite} />
                    </span>
                    <span className="text-xs font-medium text-slate-500">aktivitas</span>
                </div>
            </div>

            <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3" style={stag(on, lite, 0.45, -20)}>
                    <span className="h-3 w-3 rounded-full" style={{ background: COLOR_BACA }} />
                    <span className="text-slate-600">Baca</span>
                    <span className="font-bold text-slate-800">{baca}</span>
                    <span className="text-slate-400">{total ? Math.round((baca / total) * 100) : 0}%</span>
                </div>
                <div className="flex items-center gap-3" style={stag(on, lite, 0.6, -20)}>
                    <span className="h-3 w-3 rounded-full" style={{ background: COLOR_PINJAM }} />
                    <span className="text-slate-600">Pinjam</span>
                    <span className="font-bold text-slate-800">{pinjam}</span>
                    <span className="text-slate-400">{total ? Math.round((pinjam / total) * 100) : 0}%</span>
                </div>
            </div>
        </div>
    );
}

function KategoriChart({ data }: { data: KategoriStat[] }) {
    const { ref, inView: on, lite } = useReveal<HTMLDivElement>();

    if (data.length === 0) {
        return (
            <div ref={ref}>
                <p className="text-sm text-slate-500">Belum ada data kategori buku.</p>
            </div>
        );
    }
    const max = Math.max(...data.map((d) => d.total), 1);

    const seg = (pct: number, color: string, delay: number): React.CSSProperties => ({
        width: `${pct}%`,
        background: color,
        transformOrigin: 'left',
        transform: on || lite ? 'scaleX(1)' : 'scaleX(0)',
        transition: lite ? 'none' : `transform .9s cubic-bezier(.2,.8,.2,1) ${delay}s`,
    });

    return (
        <div ref={ref}>
            <div className="mb-4 flex items-center gap-5 text-xs font-medium text-slate-500">
                <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLOR_BACA }} />
                    Baca
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLOR_PINJAM }} />
                    Pinjam
                </span>
            </div>

            <div className="space-y-4">
                {data.map((d, i) => (
                    <div key={d.nama} style={stag(on, lite, 0.1 + i * 0.09, 28)}>
                        <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                            <span className="truncate font-semibold text-slate-700">{d.nama}</span>
                            <span className="shrink-0 text-xs text-slate-500">
                                <span style={{ color: COLOR_BACA }} className="font-bold">
                                    {d.baca}
                                </span>
                                {' · '}
                                <span style={{ color: COLOR_PINJAM }} className="font-bold">
                                    {d.pinjam}
                                </span>
                            </span>
                        </div>
                        <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-200/60">
                            <div style={seg((d.baca / max) * 100, COLOR_BACA, 0.25 + i * 0.09)} />
                            <div style={seg((d.pinjam / max) * 100, COLOR_PINJAM, 0.4 + i * 0.09)} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* SMALL PIECES                                                        */
/* ------------------------------------------------------------------ */
function StatItem({
    icon,
    label,
    value,
    color,
    variant,
    delay,
}: {
    icon: React.ReactNode;
    label: string;
    value: number;
    color: string;
    variant: Variant;
    delay: number;
}) {
    const { ref, inView, lite } = useReveal<HTMLDivElement>();
    const p = rvProps(inView, lite, variant, delay);
    return (
        <div
            ref={ref}
            className={`${p.className} flex flex-col items-center text-center`}
            style={p.style}
        >
            <div className={`mb-2 ${color}`}>{icon}</div>
            <div className="text-4xl font-extrabold leading-none text-slate-800">
                <CountUp value={value} active={inView} lite={lite} />
            </div>
            <div className="mt-2 text-xs font-semibold text-slate-500">{label}</div>
        </div>
    );
}

function InfoItem({
    icon,
    label,
    value,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
}) {
    return (
        <div className="flex items-center gap-3">
            <div className="text-blue-400">{icon}</div>
            <div className="min-w-0">
                <div className="text-[11px] font-semibold text-slate-400">{label}</div>
                <div className="truncate text-sm font-bold text-slate-800">{value}</div>
            </div>
        </div>
    );
}

function SectionTitle({
    children,
    variant = 'left',
}: {
    children: React.ReactNode;
    variant?: Variant;
}) {
    return (
        <Reveal variant={variant} className="mb-5">
            <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                {children}
            </h3>
        </Reveal>
    );
}

/* ------------------------------------------------------------------ */
/* MAIN                                                                */
/* ------------------------------------------------------------------ */
export default function VisitorProfileModal({
    isOpen,
    target,
    onClose,
}: VisitorProfileModalProps) {
    const [phase, setPhase] = useState<Phase>('loading');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [anggota, setAnggota] = useState<AnggotaProfile | null>(null);
    const [stats, setStats] = useState<Stats | null>(null);
    const [riwayat, setRiwayat] = useState<RiwayatItem[]>([]);
    const [emblemSrc, setEmblemSrc] = useState<string | null>(null);
    const [dest, setDest] = useState<{ x: number; y: number } | null>(null);
    const [vp, setVp] = useState({ w: 1024, h: 768 });
    const [lite, setLite] = useState(false);

    const placeholderRef = useRef<HTMLDivElement | null>(null);
    const scrollRef = useRef<HTMLDivElement | null>(null);

    const revealed = phase === 'moving' || phase === 'done';

    const ctxValue = useMemo(
        () => ({ root: scrollRef, enabled: revealed, lite }),
        [revealed, lite]
    );

    /* ukuran emblem: akhir (size) dan saat intro (big) */
    const isMobile = vp.w < 640;
    const size = isMobile ? 128 : 160;
    const big = Math.max(size, Math.min(size * 2.4, vp.h * 0.42, vp.w * 0.8));
    const k = big / size;

    /* deteksi perangkat */
    useEffect(() => {
        if (!isOpen) return;
        setLite(detectLite());
    }, [isOpen]);

    /* viewport */
    useEffect(() => {
        if (!isOpen) return;
        const update = () => setVp({ w: window.innerWidth, h: window.innerHeight });
        update();
        window.addEventListener('resize', update);
        return () => window.removeEventListener('resize', update);
    }, [isOpen]);

    /* kunci scroll body + Escape */
    useEffect(() => {
        if (!isOpen) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => {
            document.body.style.overflow = prev;
            window.removeEventListener('keydown', onKey);
        };
    }, [isOpen, onClose]);

    /* reset saat ditutup */
    useEffect(() => {
        if (isOpen) return;
        setPhase('loading');
        setAnggota(null);
        setStats(null);
        setRiwayat([]);
        setEmblemSrc(null);
        setDest(null);
    }, [isOpen]);

    /* load data */
    useEffect(() => {
        if (!isOpen || !target) return;

        let cancelled = false;

        async function load(id: string) {
            setPhase('loading');
            setErrorMsg(null);
            setAnggota(null);
            setStats(null);
            setRiwayat([]);
            setEmblemSrc(null);
            setDest(null);

            try {
                const [anggotaRes, totalRes, bacaRes, pinjamRes, recentRes, katRes] =
                    await Promise.all([
                        supabase.from('anggota').select('*').eq('id', id).single(),
                        supabase
                            .from('data_pengunjung')
                            .select('id', { count: 'exact', head: true })
                            .eq('id_anggota', id),
                        supabase
                            .from('data_pengunjung')
                            .select('id', { count: 'exact', head: true })
                            .eq('id_anggota', id)
                            .eq('aktivitas', 'Baca'),
                        supabase
                            .from('data_pengunjung')
                            .select('id', { count: 'exact', head: true })
                            .eq('id_anggota', id)
                            .eq('aktivitas', 'Pinjam'),
                        supabase
                            .from('data_pengunjung')
                            .select('id, judul_buku, kategori, aktivitas, created_at')
                            .eq('id_anggota', id)
                            .order('created_at', { ascending: false })
                            .limit(10),
                        supabase
                            .from('data_pengunjung')
                            .select('kategori, aktivitas')
                            .eq('id_anggota', id)
                            .not('kategori', 'is', null)
                            .limit(1000),
                    ]);

                if (anggotaRes.error) throw anggotaRes.error;
                if (totalRes.error) throw totalRes.error;
                if (bacaRes.error) throw bacaRes.error;
                if (pinjamRes.error) throw pinjamRes.error;
                if (recentRes.error) throw recentRes.error;

                const map: Record<string, KategoriStat> = {};
                if (!katRes.error && katRes.data) {
                    for (const row of katRes.data as {
                        kategori: string | null;
                        aktivitas: string | null;
                    }[]) {
                        if (!row.kategori) continue;
                        if (!map[row.kategori]) {
                            map[row.kategori] = { nama: row.kategori, baca: 0, pinjam: 0, total: 0 };
                        }
                        if (row.aktivitas === 'Pinjam') map[row.kategori].pinjam += 1;
                        else if (row.aktivitas === 'Baca') map[row.kategori].baca += 1;
                        else continue;
                        map[row.kategori].total += 1;
                    }
                }
                const kategori = Object.values(map)
                    .sort((a, b) => b.total - a.total)
                    .slice(0, 6);

                const profile = anggotaRes.data as AnggotaProfile;

                let src: string | null = null;
                if (profile.avatar_rank) {
                    const ok = await preloadImage(profile.avatar_rank);
                    src = ok ? profile.avatar_rank : null;
                }

                if (cancelled) return;

                setAnggota(profile);
                setEmblemSrc(src);
                setStats({
                    totalKunjungan: totalRes.count ?? 0,
                    totalBaca: bacaRes.count ?? 0,
                    totalPinjam: pinjamRes.count ?? 0,
                    kategoriFavorit: kategori.length > 0 ? kategori[0].nama : null,
                    kategori,
                });
                setRiwayat((recentRes.data || []) as RiwayatItem[]);
                setPhase('intro');
            } catch (err: any) {
                if (!cancelled) {
                    setErrorMsg(err?.message || 'Gagal memuat profil pengunjung.');
                    setPhase('error');
                }
            }
        }

        load(target.id);

        return () => {
            cancelled = true;
        };
    }, [isOpen, target]);

    /* pindahkan emblem ke posisi akhir */
    const startMove = useCallback(() => {
        const el = placeholderRef.current;
        if (el) {
            const r = el.getBoundingClientRect();
            setDest({ x: r.left, y: r.top });
        }
        setPhase((p) => (p === 'intro' ? 'moving' : p));
    }, []);

    useEffect(() => {
        if (phase !== 'intro') return;
        const t = setTimeout(startMove, lite ? 2200 : 3800);
        return () => clearTimeout(t);
    }, [phase, startMove, lite]);

    useEffect(() => {
        if (phase !== 'moving') return;
        const t = setTimeout(() => setPhase('done'), 1300);
        return () => clearTimeout(t);
    }, [phase]);

    if (!isOpen || !target) return null;

    const nama = anggota?.nama || target.nama;
    const terbaru = riwayat[0];
    const rankName = anggota?.rank || 'Warrior';
    const showOverlay = phase === 'loading' || phase === 'intro' || phase === 'moving';
    const showFixedEmblem = phase === 'intro' || phase === 'moving';

    /* geometri intro */
    const shift = Math.round(Math.min(48, vp.h * 0.06));
    const cx0 = vp.w / 2 - big / 2;
    const cy0 = (vp.h - big) / 2 - shift;
    const ex = vp.w / 2;
    const ey = cy0 + big / 2;
    const textTop = cy0 + big + 14;

    const emblemTransform =
        phase === 'moving' && dest
            ? `translate3d(${dest.x}px, ${dest.y}px, 0) scale(${1 / k})`
            : `translate3d(${cx0}px, ${cy0}px, 0) scale(1)`;

    /* timeline: T = detik saat emblem menghantam */
    const T = lite ? 0.5 : 1.05;

    const C = (s: number): React.CSSProperties => ({
        position: 'absolute',
        left: ex - s / 2,
        top: ey - s / 2,
        width: s,
        height: s,
        pointerEvents: 'none',
    });

    const sparks = Array.from({ length: 10 }, (_, i) => ({
        a: (360 / 10) * i + 12,
        d: 190 + ((i * 53) % 110),
    }));

    const raysSize = Math.min(900, Math.max(vp.w, vp.h) * 1.1);

    return (
        <div
            ref={scrollRef}
            className="fixed inset-0 z-[60] bg-[#f7f8fa] text-slate-800"
            style={{ overflowY: phase === 'done' || phase === 'error' ? 'auto' : 'hidden' }}
            role="dialog"
            aria-modal="true"
            aria-label="Profil Pengunjung"
        >
            <style>{`
        /* scroll reveal */
        .vp-rv{opacity:0;transition:opacity .6s ease var(--d,0s),transform .75s cubic-bezier(.2,.8,.2,1) var(--d,0s)}
        .vp-rv.up{transform:translate3d(0,28px,0)}
        .vp-rv.left{transform:translate3d(-36px,0,0)}
        .vp-rv.right{transform:translate3d(36px,0,0)}
        .vp-rv.zoom{transform:scale(.88)}
        .vp-rv.pop{transform:scale(.6);transition-timing-function:ease,cubic-bezier(.34,1.56,.64,1)}
        .vp-rv.flip{transform:perspective(700px) rotateX(40deg) translate3d(0,18px,0);transform-origin:50% 100%}
        .vp-rv.fade{transition:opacity .45s ease var(--d,0s)}
        .vp-rv.in{opacity:1;transform:none}

        /* intro game-style */
        @keyframes vp-drop{
          0%{opacity:0;transform:translate3d(0,-70px,0) scale(1.8) rotate(-10deg);animation-timing-function:cubic-bezier(.55,0,1,.5)}
          10%{opacity:1}
          55%{opacity:1;transform:translate3d(0,0,0) scale(.88) rotate(0deg);animation-timing-function:ease-out}
          72%{transform:translate3d(0,0,0) scale(1.07) rotate(0deg)}
          86%{transform:translate3d(0,0,0) scale(.97) rotate(0deg)}
          100%{opacity:1;transform:translate3d(0,0,0) scale(1) rotate(0deg)}
        }
        @keyframes vp-lite-in{
          0%{opacity:0;transform:scale(.6)}
          100%{opacity:1;transform:scale(1)}
        }
        @keyframes vp-shake{
          0%,100%{transform:translate3d(0,0,0)}
          15%{transform:translate3d(-6px,3px,0)}
          30%{transform:translate3d(5px,-4px,0)}
          45%{transform:translate3d(-4px,-2px,0)}
          60%{transform:translate3d(3px,3px,0)}
          80%{transform:translate3d(-1px,1px,0)}
        }
        @keyframes vp-flash{0%{opacity:0}10%{opacity:.8}100%{opacity:0}}
        @keyframes vp-ring{
          0%{transform:scale(.3);opacity:.9}
          100%{transform:scale(3);opacity:0}
        }
        @keyframes vp-fadescale{
          0%{opacity:0;transform:scale(.4)}
          100%{opacity:1;transform:scale(1)}
        }
        @keyframes vp-spin{to{transform:rotate(360deg)}}
        @keyframes vp-spin-rev{to{transform:rotate(-360deg)}}
        @keyframes vp-spark{
          0%{opacity:1;transform:rotate(var(--a)) translate3d(0,-30px,0) scaleY(1)}
          100%{opacity:0;transform:rotate(var(--a)) translate3d(0,var(--d),0) scaleY(.3)}
        }
        @keyframes vp-streak{
          0%{opacity:0;transform:translate3d(-100%,0,0)}
          20%{opacity:1}
          100%{opacity:0;transform:translate3d(100%,0,0)}
        }
        @keyframes vp-line{
          0%{opacity:0;transform:scaleX(0)}
          30%{opacity:1}
          75%{opacity:1;transform:scaleX(1)}
          100%{opacity:0;transform:scaleX(1)}
        }
        @keyframes vp-bracket{
          0%{opacity:0;transform:scale(1.8)}
          100%{opacity:.85;transform:scale(1)}
        }
        @keyframes vp-textin{
          0%{opacity:0;transform:translate3d(-70px,0,0) skewX(-16deg)}
          100%{opacity:1;transform:translate3d(0,0,0) skewX(0deg)}
        }
        @keyframes vp-labelin{
          0%{opacity:0;transform:translate3d(0,10px,0)}
          100%{opacity:1;transform:translate3d(0,0,0)}
        }
        @keyframes vp-bar{
          0%{opacity:0;transform:scaleX(0)}
          100%{opacity:1;transform:scaleX(1)}
        }
        @media (prefers-reduced-motion: reduce){
          .vp-rv{transition:none!important;opacity:1!important;transform:none!important}
          .vp-fx{display:none!important}
          .vp-anim{animation:none!important}
        }
      `}</style>

            {/* TOMBOL TUTUP */}
            <button
                type="button"
                onClick={onClose}
                aria-label="Tutup profil"
                className={`fixed right-4 top-4 z-[90] cursor-pointer rounded-full p-2.5 transition-colors duration-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:right-6 sm:top-6 ${phase === 'done' || phase === 'error'
                        ? 'text-slate-500 hover:bg-slate-200/70 hover:text-slate-800'
                        : 'text-white/40 hover:bg-white/10 hover:text-white'
                    }`}
            >
                <X className="h-6 w-6" />
            </button>

            {/* ============ HALAMAN PROFIL ============ */}
            <RevealCtx.Provider value={ctxValue}>
                <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col items-center px-5 pb-20 pt-16 sm:px-10 sm:pt-20">
                    {phase === 'error' && (
                        <div
                            role="alert"
                            className="mt-24 max-w-md text-center text-sm font-medium text-red-700"
                        >
                            {errorMsg}
                        </div>
                    )}

                    {anggota && stats && (
                        <>
                            {/* EMBLEM (posisi akhir) */}
                            <div
                                ref={placeholderRef}
                                className="relative shrink-0"
                                style={{ width: size, height: size }}
                            >
                                <div
                                    className="absolute rounded-full"
                                    style={{
                                        inset: -36,
                                        background:
                                            'radial-gradient(circle, rgba(59,130,246,.16) 0%, transparent 68%)',
                                        opacity: phase === 'done' ? 1 : 0,
                                        transition: 'opacity .8s ease',
                                    }}
                                />
                                {phase === 'done' && (
                                    <div className="relative h-full w-full">
                                        <Emblem src={emblemSrc} alt={`Rank ${anggota.rank || ''}`} />
                                    </div>
                                )}
                            </div>

                            {/* NAMA, NIS, RANK */}
                            <div className="mt-6 text-center">
                                <Reveal variant="up" delay={0.7}>
                                    <h2 className="text-3xl font-extrabold leading-tight text-slate-800 sm:text-4xl">
                                        {nama}
                                    </h2>
                                </Reveal>
                                <Reveal variant="up" delay={0.8}>
                                    <p className="mt-1.5 text-sm font-medium tracking-wide text-slate-500">
                                        NIS {anggota.nis || '-'}
                                    </p>
                                </Reveal>
                                <Reveal variant="pop" delay={0.95}>
                                    <p
                                        className="mt-3 text-lg font-extrabold uppercase tracking-[0.3em] sm:text-xl"
                                        style={{
                                            background: 'linear-gradient(90deg,#1d4ed8,#3b82f6,#06b6d4)',
                                            WebkitBackgroundClip: 'text',
                                            backgroundClip: 'text',
                                            color: 'transparent',
                                        }}
                                    >
                                        {rankName}
                                    </p>
                                </Reveal>
                                <Reveal variant="fade" delay={1.05}>
                                    <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold capitalize text-slate-400">
                                        <ShieldCheck className="h-3.5 w-3.5" />
                                        {anggota.role}
                                    </p>
                                </Reveal>
                            </div>

                            {/* KUNJUNGAN KE-N */}
                            <Reveal variant="up" delay={1.1} className="mt-8 max-w-xl">
                                <p className="text-center text-sm leading-relaxed text-slate-600">
                                    Terima kasih, <span className="font-bold text-slate-800">{anggota.nama}</span>!
                                    Kunjungan Anda tercatat sebagai kunjungan ke-
                                    <span className="font-extrabold text-blue-600">{stats.totalKunjungan}</span>
                                    {terbaru?.judul_buku ? (
                                        <>
                                            {' '}
                                            dengan {terbaru.aktivitas === 'Pinjam' ? 'meminjam' : 'membaca'}{' '}
                                            <span className="font-bold text-slate-800">
                                                &ldquo;{terbaru.judul_buku}&rdquo;
                                            </span>
                                        </>
                                    ) : null}
                                    .
                                </p>
                            </Reveal>

                            {/* STATISTIK */}
                            <div className="mt-14 grid w-full grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4">
                                <StatItem
                                    variant="left"
                                    delay={0}
                                    color="text-blue-500"
                                    label="Total Kunjungan"
                                    icon={<Footprints className="h-5 w-5" />}
                                    value={stats.totalKunjungan}
                                />
                                <StatItem
                                    variant="zoom"
                                    delay={0.08}
                                    color="text-sky-500"
                                    label="Total Baca"
                                    icon={<BookOpen className="h-5 w-5" />}
                                    value={stats.totalBaca}
                                />
                                <StatItem
                                    variant="zoom"
                                    delay={0.16}
                                    color="text-cyan-500"
                                    label="Total Pinjam"
                                    icon={<BookMarked className="h-5 w-5" />}
                                    value={stats.totalPinjam}
                                />
                                <StatItem
                                    variant="right"
                                    delay={0.24}
                                    color="text-indigo-500"
                                    label="Total Poin"
                                    icon={<Star className="h-5 w-5" />}
                                    value={anggota.total_poin ?? 0}
                                />
                            </div>

                            {/* DIAGRAM */}
                            <div className="mt-20 grid w-full gap-16 lg:grid-cols-2">
                                <div>
                                    <SectionTitle variant="left">Perbandingan Baca &amp; Pinjam</SectionTitle>
                                    <DonutBacaPinjam baca={stats.totalBaca} pinjam={stats.totalPinjam} />
                                </div>
                                <div>
                                    <SectionTitle variant="right">Kategori Buku</SectionTitle>
                                    <KategoriChart data={stats.kategori} />
                                </div>
                            </div>

                            {/* INFO + RIWAYAT */}
                            <div className="mt-20 grid w-full gap-16 lg:grid-cols-5">
                                <div className="lg:col-span-2">
                                    <SectionTitle variant="left">Informasi Anggota</SectionTitle>
                                    <div className="space-y-5">
                                        <Reveal variant="left" delay={0}>
                                            <InfoItem
                                                icon={<Home className="h-4 w-4" />}
                                                label="Kamar"
                                                value={anggota.kamar || '-'}
                                            />
                                        </Reveal>
                                        <Reveal variant="left" delay={0.07}>
                                            <InfoItem
                                                icon={<GraduationCap className="h-4 w-4" />}
                                                label="Jenjang"
                                                value={anggota.jenjang || '-'}
                                            />
                                        </Reveal>
                                        <Reveal variant="left" delay={0.14}>
                                            <InfoItem
                                                icon={<Building2 className="h-4 w-4" />}
                                                label="Organisasi"
                                                value={anggota.organisasi || '-'}
                                            />
                                        </Reveal>
                                        <Reveal variant="left" delay={0.21}>
                                            <InfoItem
                                                icon={<Layers className="h-4 w-4" />}
                                                label="Kategori Favorit"
                                                value={stats.kategoriFavorit || '-'}
                                            />
                                        </Reveal>
                                        <Reveal variant="left" delay={0.28}>
                                            <InfoItem
                                                icon={<Trophy className="h-4 w-4" />}
                                                label="Poin Tambahan"
                                                value={String(anggota.poin_tambahan ?? 0)}
                                            />
                                        </Reveal>
                                    </div>
                                </div>

                                <div className="lg:col-span-3">
                                    <SectionTitle variant="right">Riwayat Kunjungan Terakhir</SectionTitle>
                                    {riwayat.length === 0 ? (
                                        <Reveal variant="fade">
                                            <p className="text-sm text-slate-500">Belum ada riwayat kunjungan.</p>
                                        </Reveal>
                                    ) : (
                                        <ul className="space-y-5">
                                            {riwayat.map((r, i) => {
                                                const variants: Variant[] = ['right', 'flip', 'zoom'];
                                                const warna = r.aktivitas === 'Pinjam' ? COLOR_PINJAM : COLOR_BACA;
                                                return (
                                                    <li key={r.id}>
                                                        <Reveal variant={variants[i % 3]} delay={0.03}>
                                                            <div className="flex items-start gap-3">
                                                                <span
                                                                    className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
                                                                    style={{ background: warna }}
                                                                />
                                                                <div className="min-w-0 flex-1">
                                                                    <div className="flex items-start justify-between gap-3">
                                                                        <div className="line-clamp-2 text-sm font-semibold text-slate-800">
                                                                            {r.judul_buku || '-'}
                                                                        </div>
                                                                        <div className="flex shrink-0 items-center gap-2 text-[11px] font-bold">
                                                                            {i === 0 && <span className="text-blue-600">Baru</span>}
                                                                            <span style={{ color: warna }}>{r.aktivitas || '-'}</span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs text-slate-500">
                                                                        <span className="flex items-center gap-1">
                                                                            <Layers className="h-3 w-3" />
                                                                            {r.kategori || '-'}
                                                                        </span>
                                                                        <span className="flex items-center gap-1">
                                                                            <Clock className="h-3 w-3" />
                                                                            {formatWaktu(r.created_at)}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </Reveal>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    )}
                                </div>
                            </div>

                            {/* TOMBOL SELESAI */}
                            <Reveal variant="pop" className="mt-20 w-full max-w-sm">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="w-full cursor-pointer rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-bold text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f7f8fa]"
                                >
                                    Selesai
                                </button>
                            </Reveal>
                        </>
                    )}
                </div>
            </RevealCtx.Provider>

            {/* ============ OVERLAY HITAM + INTRO EMBLEM ============ */}
            {showOverlay && (
                <div
                    className="fixed inset-0 z-[70]"
                    onClick={phase === 'intro' ? startMove : undefined}
                    style={{
                        background: OVERLAY_BG,
                        opacity: phase === 'moving' ? 0 : 1,
                        transition: 'opacity 1.1s ease .15s',
                        pointerEvents: phase === 'moving' ? 'none' : 'auto',
                        cursor: phase === 'intro' ? 'pointer' : 'default',
                    }}
                >
                    {phase !== 'loading' && anggota && (
                        <>
                            {/* ---- efek visual (digroup agar ikut bergetar) ---- */}
                            <div
                                className="vp-fx absolute inset-0"
                                style={!lite ? { animation: `vp-shake .5s linear ${T}s both` } : undefined}
                            >
                                {/* cahaya latar (gradient statis, tanpa blur/filter) */}
                                <div style={C(lite ? 520 : Math.min(720, vp.w * 1.3))}>
                                    <div
                                        className="h-full w-full rounded-full"
                                        style={{
                                            background:
                                                'radial-gradient(circle, rgba(59,130,246,.55) 0%, rgba(37,99,235,.18) 40%, transparent 70%)',
                                            animation: `vp-fadescale 1s ease-out ${T}s both`,
                                        }}
                                    />
                                </div>

                                {!lite && (
                                    <>
                                        {/* sinar berputar (tanpa mask, hanya rotate) */}
                                        <div style={C(raysSize)}>
                                            <div
                                                className="h-full w-full"
                                                style={{ animation: `vp-fadescale 1.2s ease-out ${T}s both` }}
                                            >
                                                <div
                                                    className="h-full w-full"
                                                    style={{
                                                        background:
                                                            'repeating-conic-gradient(rgba(96,165,250,.3) 0deg 4deg, transparent 4deg 18deg)',
                                                        animation: `vp-spin 45s linear ${T}s infinite`,
                                                    }}
                                                />
                                            </div>
                                            <div
                                                className="absolute inset-0"
                                                style={{
                                                    background: `radial-gradient(circle, transparent 0%, transparent 12%, ${OVERLAY_BG} 58%)`,
                                                }}
                                            />
                                        </div>

                                        {/* cincin HUD */}
                                        <div style={C(big * 1.55)}>
                                            <div
                                                className="h-full w-full"
                                                style={{ animation: `vp-fadescale .9s ease-out ${T + 0.1}s both` }}
                                            >
                                                <svg
                                                    viewBox="0 0 200 200"
                                                    className="h-full w-full"
                                                    style={{ animation: `vp-spin 30s linear ${T + 0.1}s infinite` }}
                                                >
                                                    <circle
                                                        cx="100"
                                                        cy="100"
                                                        r="96"
                                                        fill="none"
                                                        stroke="#60a5fa"
                                                        strokeOpacity=".6"
                                                        strokeWidth="1.5"
                                                        strokeDasharray="3 9"
                                                    />
                                                </svg>
                                            </div>
                                        </div>
                                        <div style={C(big * 1.25)}>
                                            <div
                                                className="h-full w-full"
                                                style={{ animation: `vp-fadescale .9s ease-out ${T + 0.2}s both` }}
                                            >
                                                <svg
                                                    viewBox="0 0 200 200"
                                                    className="h-full w-full"
                                                    style={{ animation: `vp-spin-rev 40s linear ${T + 0.2}s infinite` }}
                                                >
                                                    <polygon
                                                        points="100,6 181,53 181,147 100,194 19,147 19,53"
                                                        fill="none"
                                                        stroke="#93c5fd"
                                                        strokeOpacity=".55"
                                                        strokeWidth="1.5"
                                                    />
                                                </svg>
                                            </div>
                                        </div>

                                        {/* percikan */}
                                        <div style={{ position: 'absolute', left: ex, top: ey }}>
                                            {sparks.map((s, i) => (
                                                <div
                                                    key={i}
                                                    style={
                                                        {
                                                            position: 'absolute',
                                                            width: 3,
                                                            height: 14,
                                                            left: -1.5,
                                                            top: -7,
                                                            borderRadius: 2,
                                                            background: i % 2 ? '#bae6fd' : '#ffffff',
                                                            '--a': `${s.a}deg`,
                                                            '--d': `-${s.d}px`,
                                                            animation: `vp-spark 1s ease-out ${T}s both`,
                                                        } as React.CSSProperties
                                                    }
                                                />
                                            ))}
                                        </div>

                                        {/* garis cahaya menyapu */}
                                        {/* garis cahaya menyapu */}
                                        {[-34, 38].map((off, i) => (
                                            <div
                                                key={off}
                                                style={{
                                                    position: 'absolute',
                                                    left: 0,
                                                    top: ey + off,
                                                    width: '100%',
                                                    height: 2,
                                                    background:
                                                        'linear-gradient(90deg, transparent, #bfdbfe, transparent)',
                                                    animation: `vp-streak .7s ease-out ${T + i * 0.08}s both`,
                                                }}
                                            />
                                        ))}
                                    </>
                                )}

                                {/* gelombang kejut */}
                                {(lite ? [0] : [0, 0.18]).map((d) => (
                                    <div key={d} style={C(300)}>
                                        <div
                                            className="h-full w-full rounded-full"
                                            style={{
                                                border: '2px solid rgba(147,197,253,.9)',
                                                animation: `vp-ring 1.4s ease-out ${T + d}s both`,
                                            }}
                                        />
                                    </div>
                                ))}

                                {/* garis horizontal pembuka */}
                                <div
                                    style={{
                                        position: 'absolute',
                                        left: 0,
                                        top: ey,
                                        width: '100%',
                                        height: 2,
                                        background: 'linear-gradient(90deg, transparent, #60a5fa, transparent)',
                                        animation: `vp-line ${T}s ease-out .1s both`,
                                    }}
                                />

                                {/* sudut HUD */}
                                {[
                                    'left-5 top-5 border-l-2 border-t-2',
                                    'right-5 top-5 border-r-2 border-t-2',
                                    'bottom-5 left-5 border-b-2 border-l-2',
                                    'bottom-5 right-5 border-b-2 border-r-2',
                                ].map((cls, i) => (
                                    <div
                                        key={cls}
                                        className={`absolute h-7 w-7 border-blue-400 ${cls}`}
                                        style={{ animation: `vp-bracket .5s ease-out ${0.1 + i * 0.06}s both` }}
                                    />
                                ))}
                            </div>

                            {/* kilatan (tidak ikut bergetar) */}
                            <div
                                className="vp-fx absolute inset-0"
                                style={{
                                    background: '#bfdbfe',
                                    opacity: 0,
                                    pointerEvents: 'none',
                                    animation: `vp-flash .7s ease-out ${T}s both`,
                                }}
                            />

                            {/* teks rank ala game */}
                            <div
                                className="pointer-events-none absolute left-0 right-0 text-center"
                                style={{ top: textTop }}
                            >
                                <div
                                    className="vp-anim text-[11px] font-bold uppercase tracking-[0.5em] text-blue-300 sm:text-xs"
                                    style={{ animation: `vp-labelin .6s ease-out ${T + 0.2}s both` }}
                                >
                                    Peringkat
                                </div>
                                <div
                                    className="vp-anim mt-2 px-4 text-4xl font-black uppercase italic tracking-[0.1em] text-white sm:text-6xl"
                                    style={{
                                        textShadow: '0 0 28px rgba(59,130,246,.9)',
                                        animation: lite
                                            ? `vp-labelin .6s ease-out ${T + 0.25}s both`
                                            : `vp-textin .7s cubic-bezier(.2,.9,.3,1) ${T + 0.3}s both`,
                                    }}
                                >
                                    {rankName}
                                </div>
                                <div
                                    className="vp-anim mx-auto mt-3 h-[3px] w-40 rounded-full"
                                    style={{
                                        background: 'linear-gradient(90deg, transparent, #60a5fa, transparent)',
                                        animation: `vp-bar .8s ease-out ${T + 0.5}s both`,
                                    }}
                                />
                            </div>

                            {/* petunjuk lewati */}
                            {phase === 'intro' && (
                                <div
                                    className="vp-anim absolute bottom-6 left-0 right-0 text-center text-[11px] tracking-widest text-white/30"
                                    style={{ animation: 'vp-labelin .6s ease-out 1.8s both' }}
                                >
                                    KETUK UNTUK MELEWATI
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* EMBLEM YANG BERGERAK (layer di atas overlay) */}
            {showFixedEmblem && anggota && (
                <div
                    className="pointer-events-none fixed left-0 top-0 z-[80]"
                    style={{
                        width: big,
                        height: big,
                        transformOrigin: '0 0',
                        transform: emblemTransform,
                        transition:
                            phase === 'moving' ? 'transform 1.2s cubic-bezier(.65,0,.2,1)' : 'none',
                        willChange: 'transform',
                    }}
                >
                    <div
                        className="h-full w-full"
                        style={!lite ? { animation: `vp-shake .5s linear ${T}s both` } : undefined}
                    >
                        <div
                            className="vp-anim h-full w-full"
                            style={{
                                animation: lite
                                    ? 'vp-lite-in .7s ease-out .1s both'
                                    : `vp-drop 1s linear ${T - 0.55}s both`,
                            }}
                        >
                            <Emblem src={emblemSrc} alt={`Rank ${anggota.rank || ''}`} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}