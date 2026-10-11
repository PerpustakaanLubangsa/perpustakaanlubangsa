'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
    ShieldCheck,
} from 'lucide-react';
import type { ProfileTarget } from '@/app/leaderboard/components/vp-types';
import { REVEAL_CSS, Reveal, RevealCtx } from '@/app/leaderboard/components/vp-reveal';
import { useProfileData } from '@/app/leaderboard/components/vp-data';
import { DonutBacaPinjam, KategoriChart } from '@/app/leaderboard/components/vp-charts';
import { InfoItem, Kartu, RankProgress, StatItem, tombolBiru } from '@/app/leaderboard/components/vp-ui';
import RiwayatKunjungan from '@/app/leaderboard/components/vp-riwayat';
import MutasiPoinBox from '@/app/leaderboard/components/vp-mutasi-poin';

export type { ProfileTarget };

interface VisitorProfileModalProps {
    isOpen: boolean;
    target: ProfileTarget | null;
    onClose: () => void;
}

/* Fase tampilan: data profil dari useProfileData (loading/done/error), lalu intro -> moving -> done */
type Phase = 'loading' | 'intro' | 'moving' | 'done' | 'error';
/* full  : semua efek
   lite  : perangkat low-end / hemat data -> efek inti saja (slam, slash, kilap), tanpa efek berat
   calm  : prefers-reduced-motion -> tanpa kedip/getar/slash, hanya fade + kilap lembut */
type Tier = 'full' | 'lite' | 'calm';
type ShineMode = 'none' | 'once' | 'loop';

const OVERLAY_BG = '#02030a';

/* durasi emblem meluncur ke halaman (cepat, berhenti mendadak = "menancap") */
const MOVE_MS = 400;

/* latar halaman detail: public/bg.png dilapisi overlay hitam (0 = tanpa overlay, 1 = hitam penuh) */
const PAGE_OVERLAY = 0.65;
const PAGE_BG = `linear-gradient(rgba(0,0,0,${PAGE_OVERLAY}), rgba(0,0,0,${PAGE_OVERLAY})), url('/bg.png')`;

/* bentuk perisai (mask kilap) saat gambar emblem tidak tersedia */
const SHIELD_MASK =
    `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cpath d='M50 6 L88 20 V50 C88 74 70 90 50 96 C30 90 12 74 12 50 V20 Z'/%3E%3C/svg%3E")`;


/* Muat + decode gambar emblem sebelum intro dimulai (supaya frame pertama tidak patah).
   Coba mode CORS dulu: kalau berhasil, kilapan bermask bentuk emblem bisa dipakai. */
async function loadEmblem(
    url: string,
    timeoutMs = 3000
): Promise<{ ok: boolean; cors: boolean }> {
    const tryLoad = (cors: boolean) =>
        new Promise<boolean>((resolve) => {
            const img = new Image();
            if (cors) img.crossOrigin = 'anonymous';
            const timer = setTimeout(() => resolve(false), timeoutMs);
            img.onload = async () => {
                clearTimeout(timer);
                try {
                    await img.decode?.();
                } catch {
                    /* abaikan */
                }
                resolve(true);
            };
            img.onerror = () => {
                clearTimeout(timer);
                resolve(false);
            };
            img.src = url;
        });

    if (await tryLoad(true)) return { ok: true, cors: true };
    if (await tryLoad(false)) return { ok: true, cors: false };
    return { ok: false, cors: false };
}

/* Tentukan tingkat efek. Low-end TIDAK mematikan animasi, hanya menyederhanakannya. */
function detectTier(): Tier {
    if (typeof window === 'undefined') return 'full';
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return 'calm';
    const nav = navigator as Navigator & {
        deviceMemory?: number;
        connection?: { saveData?: boolean };
    };
    const mem = nav.deviceMemory;
    const cores = nav.hardwareConcurrency;
    const low =
        !!nav.connection?.saveData ||
        (mem !== undefined && mem <= 2) ||
        (cores !== undefined && cores <= 4);
    return low ? 'lite' : 'full';
}

/* ------------------------------------------------------------------ */
/* EMBLEM INTRO (+ kilapan bermask bentuk emblem)                      */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* EMBLEM (+ kilapan bermask bentuk emblem)                            */
/* ------------------------------------------------------------------ */
function IntroEmblem({
    src,
    alt,
    cors = false,
    shine = 'none',
    shineDelay = 0,
    glint = false,
    blend = false,
}: {
    src: string | null;
    alt: string;
    cors?: boolean;
    shine?: ShineMode;
    shineDelay?: number;
    glint?: boolean;
    blend?: boolean;
}) {
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        setFailed(false);
    }, [src]);

    const useFallback = !src || failed;
    /* kilapan butuh mask dari gambar; untuk gambar eksternal wajib lolos CORS */
    const canShine = shine !== 'none' && (useFallback || cors);
    const maskUrl = useFallback ? SHIELD_MASK : `url("${(src as string).replace(/"/g, '%22')}")`;

    return (
        <div className="relative h-full w-full">
            {useFallback ? (
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
            ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={src as string}
                    alt={alt}
                    crossOrigin={cors ? 'anonymous' : undefined}
                    onError={() => setFailed(true)}
                    draggable={false}
                    className="h-full w-full object-contain"
                />
            )}

            {canShine && (
                <>
                    <div
                        className="vp-shine-mask"
                        style={{
                            WebkitMaskImage: maskUrl,
                            maskImage: maskUrl,
                            mixBlendMode: blend ? 'plus-lighter' : 'normal',
                        }}
                    >
                        <div
                            className="vp-shine-bar"
                            style={{
                                animation:
                                    shine === 'loop'
                                        ? `vp-shine-loop 5.5s ease-in-out ${shineDelay}s infinite`
                                        : `vp-shine-once .85s ease-in-out ${shineDelay}s both`,
                            }}
                        />
                    </div>
                    {glint && shine === 'once' && (
                        <svg
                            viewBox="0 0 100 100"
                            className="vp-glint"
                            style={{ animation: `vp-glint .7s ease-out ${shineDelay + 0.3}s both` }}
                            aria-hidden
                        >
                            <path
                                d="M50 0 C54 32 68 46 100 50 C68 54 54 68 50 100 C46 68 32 54 0 50 C32 46 46 32 50 0Z"
                                fill="#ffffff"
                            />
                        </svg>
                    )}
                </>
            )}
        </div>
    );
}

/* Keyframe khusus intro (scroll reveal memakai REVEAL_CSS dari vp-reveal) */
const INTRO_CSS = `
        /* TANCAP: emblem menumbuk halaman -> membal kecil, cahaya meledak di belakangnya */
        @keyframes vp-plant{
          0%{transform:scale(1.16) translate3d(0,-8px,0)}
          28%{transform:scale(.92) translate3d(0,3px,0)}
          55%{transform:scale(1.04) translate3d(0,-1px,0)}
          100%{transform:scale(1) translate3d(0,0,0)}
        }
        @keyframes vp-burst{
          0%{opacity:0;transform:scale(.35)}
          14%{opacity:1}
          100%{opacity:0;transform:scale(1.6)}
        }
        /* ===== intro emblem: semua animasi hanya transform + opacity ===== */
        @keyframes vp-appear{from{opacity:0}to{opacity:1}}

        /* emblem menghantam dari dekat kamera: akselerasi -> tumbukan -> pantul kecil */
        @keyframes vp-drop{
          0%{transform:scale(2.6) rotate(-8deg);animation-timing-function:cubic-bezier(.55,0,.9,.45)}
          58%{transform:scale(.9) rotate(0deg);animation-timing-function:cubic-bezier(.2,.8,.3,1)}
          74%{transform:scale(1.08) rotate(0deg);animation-timing-function:ease-in-out}
          88%{transform:scale(.98) rotate(0deg);animation-timing-function:ease-out}
          100%{transform:scale(1) rotate(0deg)}
        }
        @keyframes vp-lite-in{
          0%{opacity:0;transform:scale(.8)}
          100%{opacity:1;transform:scale(1)}
        }
        @keyframes vp-shake{
          0%,100%{transform:translate3d(0,0,0)}
          12%{transform:translate3d(-9px,5px,0)}
          28%{transform:translate3d(8px,-6px,0)}
          44%{transform:translate3d(-6px,-3px,0)}
          60%{transform:translate3d(4px,4px,0)}
          80%{transform:translate3d(-2px,1px,0)}
        }
        @keyframes vp-flash{0%{opacity:0}8%{opacity:.75}100%{opacity:0}}
        @keyframes vp-ring{
          0%{transform:scale(.3);opacity:.9}
          100%{transform:scale(3.2);opacity:0}
        }
        @keyframes vp-fadescale{
          0%{opacity:0;transform:scale(.4)}
          100%{opacity:1;transform:scale(1)}
        }
        @keyframes vp-spin{to{transform:rotate(360deg)}}
        @keyframes vp-rays{
          0%{opacity:0;transform:scale(.3) rotate(0deg)}
          25%{opacity:1}
          100%{opacity:.55;transform:scale(1.05) rotate(35deg)}
        }
        @keyframes vp-hud{
          0%{opacity:0;transform:scale(.5) rotate(0deg)}
          100%{opacity:1;transform:scale(1) rotate(60deg)}
        }
        @keyframes vp-hud-rev{
          0%{opacity:0;transform:scale(.5) rotate(0deg)}
          100%{opacity:1;transform:scale(1) rotate(-60deg)}
        }
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
          35%{opacity:1}
          80%{opacity:1;transform:scaleX(1)}
          100%{opacity:0;transform:scaleX(1)}
        }
        @keyframes vp-bracket{
          0%{opacity:0;transform:scale(1.8)}
          100%{opacity:.85;transform:scale(1)}
        }

        /* SLASH: garis tebasan menyapu layar, lalu menipis & hilang */
        @keyframes vp-slash{
          0%{opacity:1;transform:scaleX(0) scaleY(2.2)}
          30%{opacity:1;transform:scaleX(1) scaleY(1.5)}
          100%{opacity:0;transform:scaleX(1) scaleY(.15)}
        }
        @keyframes vp-slashglow{
          0%{opacity:0;transform:scaleY(.1)}
          18%{opacity:.9;transform:scaleY(1)}
          100%{opacity:0;transform:scaleY(1.7)}
        }

        @keyframes vp-textin{
          0%{opacity:0;transform:translate3d(-60px,0,0) skewX(-16deg)}
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

        /* KILAPAN pada emblem (bermask bentuk emblem, jadi transparansi PNG tetap rapi) */
        .vp-shine-mask{
          position:absolute;inset:0;overflow:hidden;pointer-events:none;
          -webkit-mask-size:contain;mask-size:contain;
          -webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;
          -webkit-mask-position:center;mask-position:center;
        }
        .vp-shine-bar{
          position:absolute;top:-10%;left:-45%;width:38%;height:120%;opacity:0;
          background:linear-gradient(100deg,transparent 0%,rgba(186,230,253,0) 8%,rgba(255,255,255,.95) 50%,rgba(186,230,253,0) 92%,transparent 100%);
          transform:translate3d(0,0,0) skewX(-18deg);
          will-change:transform,opacity;
        }
        @keyframes vp-shine-once{
          0%{opacity:0;transform:translate3d(0,0,0) skewX(-18deg)}
          12%{opacity:1}
          88%{opacity:1}
          100%{opacity:0;transform:translate3d(420%,0,0) skewX(-18deg)}
        }
        @keyframes vp-shine-loop{
          0%{opacity:0;transform:translate3d(0,0,0) skewX(-18deg)}
          2%{opacity:1}
          16%{opacity:1}
          18%{opacity:0;transform:translate3d(420%,0,0) skewX(-18deg)}
          100%{opacity:0;transform:translate3d(420%,0,0) skewX(-18deg)}
        }
        .vp-glint{position:absolute;right:12%;top:8%;width:24%;aspect-ratio:1/1;opacity:0;pointer-events:none}
        @keyframes vp-glint{
          0%{opacity:0;transform:scale(0) rotate(0deg)}
          45%{opacity:1;transform:scale(1) rotate(45deg)}
          100%{opacity:0;transform:scale(0) rotate(90deg)}
        }

`;

/* ------------------------------------------------------------------ */
/* MAIN                                                                */
/* ------------------------------------------------------------------ */
export default function VisitorProfileModal({
    isOpen,
    target,
    onClose,
}: VisitorProfileModalProps) {
    /* data profil + statistik (sama persis dengan VisitorProfileModal) */
    const { phase: dataPhase, errorMsg, anggota, stats, terbaru } = useProfileData(isOpen, target);

    const [stage, setStage] = useState<Exclude<Phase, 'error'>>('loading');
    const [emblemSrc, setEmblemSrc] = useState<string | null>(null);
    const [emblemCors, setEmblemCors] = useState(false);
    const [dest, setDest] = useState<{ x: number; y: number } | null>(null);
    const [vp, setVp] = useState({ w: 1024, h: 768 });
    const [tier, setTier] = useState<Tier>('full');
    /* go = intro baru benar-benar dimulai setelah layout stabil (2 frame),
       supaya timeline animasi tidak "termakan" oleh jank saat render awal */
    const [go, setGo] = useState(false);

    const placeholderRef = useRef<HTMLDivElement | null>(null);
    const scrollRef = useRef<HTMLDivElement | null>(null);

    const phase: Phase =
        dataPhase === 'error' ? 'error' : dataPhase === 'loading' ? 'loading' : stage;

    const lite = tier !== 'full';
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
        setTier(detectTier());
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

    /* data siap -> preload emblem -> mulai intro; selain itu reset state intro */
    useEffect(() => {
        if (!isOpen || dataPhase !== 'done' || !anggota) {
            setStage('loading');
            setGo(false);
            setDest(null);
            setEmblemSrc(null);
            setEmblemCors(false);
            return;
        }

        let cancelled = false;
        (async () => {
            let src: string | null = null;
            let cors = false;
            if (anggota.avatar_rank) {
                const res = await loadEmblem(anggota.avatar_rank);
                src = res.ok ? anggota.avatar_rank : null;
                cors = res.ok && res.cors;
            }
            if (cancelled) return;
            setEmblemSrc(src);
            setEmblemCors(cors);
            setStage('intro');
        })();

        return () => {
            cancelled = true;
        };
    }, [isOpen, dataPhase, anggota]);

    /* mulai intro setelah 2 frame (layout & decode sudah settle) */
    useEffect(() => {
        if (phase !== 'intro') return;
        let r2 = 0;
        const r1 = requestAnimationFrame(() => {
            r2 = requestAnimationFrame(() => setGo(true));
        });
        return () => {
            cancelAnimationFrame(r1);
            cancelAnimationFrame(r2);
        };
    }, [phase]);

    /* pindahkan emblem ke posisi akhir */
    const startMove = useCallback(() => {
        const el = placeholderRef.current;
        if (el) {
            const r = el.getBoundingClientRect();
            setDest({ x: r.left, y: r.top });
        }
        setStage((p) => (p === 'intro' ? 'moving' : p));
    }, []);

    /* auto lanjut (ketuk untuk melewati tetap bisa) */
    useEffect(() => {
        if (phase !== 'intro' || !go) return;
        const ms = tier === 'calm' ? 1600 : tier === 'lite' ? 2300 : 2500;
        const t = setTimeout(startMove, ms);
        return () => clearTimeout(t);
    }, [phase, go, startMove, tier]);

    useEffect(() => {
        if (phase !== 'moving') return;
        const t = setTimeout(() => setStage('done'), MOVE_MS + 30);
        return () => clearTimeout(t);
    }, [phase]);

    if (!isOpen || !target) return null;

    const nama = anggota?.nama || target.nama;
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

    /* timeline: T = detik saat emblem menghantam layar (tegas & cepat) */
    const T = tier === 'calm' ? 0.1 : 0.4;
    const dropDelay = Math.max(0, T - 0.37); // vp-drop 0.64s, tumbukan di 58% = 0.37s

    const C = (s: number): React.CSSProperties => ({
        position: 'absolute',
        left: ex - s / 2,
        top: ey - s / 2,
        width: s,
        height: s,
        pointerEvents: 'none',
    });

    const sparks = Array.from({ length: 12 }, (_, i) => ({
        a: 30 * i + 12,
        d: 170 + ((i * 53) % 120),
    }));

    const raysSize = Math.min(760, Math.max(vp.w, vp.h) * 0.95);

    /* slash menyilang layar */
    const diag = Math.ceil(Math.hypot(vp.w, vp.h));
    const slashes = [
        { rot: -24, delay: 0, origin: 'left' },
        { rot: 19, delay: 0.08, origin: 'right' },
    ];

    return (
        <div
            ref={scrollRef}
            className="fixed inset-0 z-[60] text-slate-100"
            style={{
                overflowX: 'hidden',
                overflowY: phase === 'done' || phase === 'error' ? 'auto' : 'hidden',
                backgroundColor: OVERLAY_BG,
                backgroundImage: PAGE_BG,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Profil Pengunjung"
        >
            <style>{REVEAL_CSS}</style>
            <style>{INTRO_CSS}</style>

            {/* TOMBOL TUTUP */}
            <button
                type="button"
                onClick={onClose}
                aria-label="Tutup profil"
                className={`fixed right-4 top-4 z-[90] h-11 w-11 sm:right-6 sm:top-6 ${tombolBiru}`}
            >
                <X className="h-5 w-5" aria-hidden="true" />
            </button>

            {/* ============ HALAMAN PROFIL (isi sama dengan VisitorProfileModal) ============ */}
            <RevealCtx.Provider value={ctxValue}>
                <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col items-center px-5 pb-20 pt-16 sm:px-10 sm:pt-20">
                    {phase === 'error' && (
                        <div role="alert" className="mt-24 max-w-md text-center text-sm font-medium text-red-300">
                            {errorMsg}
                        </div>
                    )}

                    {anggota && stats && (
                        <>
                            {/* EMBLEM (posisi akhir; emblem intro mendarat di sini) */}
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
                                    <>
                                        {/* cahaya meledak tepat saat emblem tertancap */}
                                        <div
                                            className="pointer-events-none absolute rounded-full"
                                            style={{
                                                inset: -90,
                                                background:
                                                    'radial-gradient(circle, rgba(191,219,254,.95) 0%, rgba(59,130,246,.55) 35%, transparent 68%)',
                                                animation: 'vp-burst .8s ease-out both',
                                            }}
                                        />
                                        {tier !== 'calm' && (
                                            <div
                                                className="pointer-events-none absolute inset-0 rounded-full"
                                                style={{
                                                    border: '2px solid rgba(147,197,253,.9)',
                                                    animation: 'vp-ring .7s ease-out both',
                                                }}
                                            />
                                        )}
                                    </>
                                )}
                                {phase === 'done' && (
                                    <div
                                        className="relative h-full w-full"
                                        style={tier !== 'calm' ? { animation: 'vp-plant .4s ease-out both' } : undefined}
                                    >
                                        <IntroEmblem
                                            src={emblemSrc}
                                            alt={`Rank ${anggota.rank || ''}`}
                                            cors={emblemCors}
                                            shine={tier === 'full' ? 'loop' : 'once'}
                                            shineDelay={0.25}
                                            glint={tier !== 'full'}
                                            blend={tier === 'full'}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Konten dimount setelah intro (kurangi beban render saat animasi intro berjalan) */}
                            {revealed && (
                                <>
                                    {/* NAMA, NIS, RANK */}
                                    <div className="mt-6 text-center">
                                        <Reveal variant="up" delay={0.5}>
                                            <h2 className="text-3xl font-extrabold leading-tight text-white sm:text-4xl">
                                                {nama}
                                            </h2>
                                        </Reveal>
                                        <Reveal variant="up" delay={0.6}>
                                            <p className="mt-1.5 text-sm font-medium tracking-wide text-slate-300">
                                                NIS {anggota.nis || '-'}
                                            </p>
                                        </Reveal>
                                        <Reveal variant="pop" delay={0.75}>
                                            <p
                                                className="mt-3 text-lg font-extrabold uppercase tracking-[0.3em] sm:text-xl"
                                                style={{
                                                    background: 'linear-gradient(90deg,#60a5fa,#93c5fd,#22d3ee)',
                                                    WebkitBackgroundClip: 'text',
                                                    backgroundClip: 'text',
                                                    color: 'transparent',
                                                }}
                                            >
                                                {rankName}
                                            </p>
                                        </Reveal>
                                        <Reveal variant="fade" delay={0.85}>
                                            <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold capitalize text-slate-300">
                                                <ShieldCheck className="h-3.5 w-3.5" />
                                                {anggota.role}
                                            </p>
                                        </Reveal>
                                    </div>

                                    {/* INDIKATOR POIN MENUJU RANK BERIKUTNYA */}
                                    <RankProgress poin={anggota.total_poin ?? 0} className="mt-8" />

                                    {/* KUNJUNGAN KE-N */}
                                    <Reveal variant="up" delay={0.9} className="mt-6 max-w-xl">
                                        <p className="text-center text-sm leading-relaxed text-slate-200">
                                            Terima kasih, <span className="font-bold text-white">{anggota.nama}</span>!
                                            Kunjungan Anda tercatat sebagai kunjungan ke-
                                            <span className="font-extrabold text-blue-400">{stats.totalKunjungan}</span>
                                            {terbaru?.judul_buku ? (
                                                <>
                                                    {' '}
                                                    dengan {terbaru.aktivitas === 'Pinjam' ? 'meminjam' : 'membaca'}{' '}
                                                    <span className="font-bold text-white">
                                                        &ldquo;{terbaru.judul_buku}&rdquo;
                                                    </span>
                                                </>
                                            ) : null}
                                            .
                                        </p>
                                    </Reveal>

                                    {/* STATISTIK */}
                                    <div className="mt-12 grid w-full grid-cols-2 gap-4 sm:grid-cols-4">
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

                                    {/* DONAT + INFORMASI (tinggi sama, tanpa ruang kosong) */}
                                    <div className="mt-5 grid w-full gap-5 lg:grid-cols-2">
                                        <Reveal variant="left" className="h-full">
                                            <Kartu judul="Perbandingan Baca & Pinjam" className="h-full">
                                                <div className="flex flex-1 items-center justify-center">
                                                    <DonutBacaPinjam baca={stats.totalBaca} pinjam={stats.totalPinjam} />
                                                </div>
                                            </Kartu>
                                        </Reveal>
                                        <Reveal variant="right" className="h-full">
                                            <Kartu judul="Informasi Anggota" className="h-full">
                                                <div className="flex flex-1 flex-col justify-between gap-4">
                                                    <InfoItem
                                                        icon={<Home className="h-4 w-4" />}
                                                        label="Kamar"
                                                        value={anggota.kamar || '-'}
                                                    />
                                                    <InfoItem
                                                        icon={<GraduationCap className="h-4 w-4" />}
                                                        label="Jenjang"
                                                        value={anggota.jenjang || '-'}
                                                    />
                                                    <InfoItem
                                                        icon={<Building2 className="h-4 w-4" />}
                                                        label="Organisasi"
                                                        value={anggota.organisasi || '-'}
                                                    />
                                                    <InfoItem
                                                        icon={<Layers className="h-4 w-4" />}
                                                        label="Kategori Favorit"
                                                        value={stats.kategoriFavorit || '-'}
                                                    />
                                                    <InfoItem
                                                        icon={<Trophy className="h-4 w-4" />}
                                                        label="Poin Tambahan"
                                                        value={String(anggota.poin_tambahan ?? 0)}
                                                    />
                                                </div>
                                            </Kartu>
                                        </Reveal>
                                    </div>

                                    {/* KATEGORI BUKU + RIWAYAT KUNJUNGAN (tinggi tetap, scroll di dalam kartu) */}
                                    <div className="mt-5 grid w-full gap-5 lg:grid-cols-2">
                                        <Reveal variant="left" className="h-[420px]">
                                            <Kartu judul="Kategori Buku" className="h-full">
                                                <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                                                    <KategoriChart data={stats.kategori} />
                                                </div>
                                            </Kartu>
                                        </Reveal>
                                        <Reveal variant="right" className="h-[420px]">
                                            <RiwayatKunjungan anggotaId={anggota.id} className="h-full" />
                                        </Reveal>
                                    </div>

                                    {/* MUTASI POIN (folder kategori) */}
                                    <Reveal variant="up" className="mt-5 h-[480px] w-full">
                                        <MutasiPoinBox anggotaId={anggota.id} className="h-full" />
                                    </Reveal>

                                    {/* TOMBOL SELESAI */}
                                    <Reveal variant="pop" className="mt-12 w-full max-w-sm">
                                        <button type="button" onClick={onClose} className={`w-full px-4 py-3.5 ${tombolBiru}`}>
                                            Selesai
                                        </button>
                                    </Reveal>
                                </>
                            )}
                        </>
                    )}
                </div>
            </RevealCtx.Provider>

            {/* ============ OVERLAY HITAM + INTRO EMBLEM ============ */}
            {showOverlay && (
                <div
                    className="fixed inset-0 z-[70]"
                    onClick={phase === 'intro' && go ? startMove : undefined}
                    style={{
                        background: OVERLAY_BG,
                        opacity: phase === 'moving' ? 0 : 1,
                        transition: 'opacity .35s ease',
                        pointerEvents: phase === 'moving' ? 'none' : 'auto',
                        cursor: phase === 'intro' ? 'pointer' : 'default',
                    }}
                >
                    {/* indikator memuat */}
                    {phase === 'loading' && (
                        <div
                            role="status"
                            aria-label="Memuat profil"
                            className="absolute left-1/2 top-1/2 -ml-[18px] -mt-[18px] h-9 w-9 rounded-full border-2 border-blue-400/25 border-t-blue-400"
                            style={{ animation: 'vp-spin .8s linear infinite' }}
                        />
                    )}

                    {phase !== 'loading' && anggota && go && (
                        <>
                            {tier === 'calm' ? (
                                /* mode kurangi-gerak: hanya cahaya lembut */
                                <div style={C(Math.min(560, vp.w * 1.2))}>
                                    <div
                                        className="h-full w-full rounded-full"
                                        style={{
                                            background:
                                                'radial-gradient(circle, rgba(59,130,246,.45) 0%, rgba(37,99,235,.15) 40%, transparent 70%)',
                                            animation: `vp-fadescale .6s ease-out ${T}s both`,
                                        }}
                                    />
                                </div>
                            ) : (
                                <>
                                    {/* ---- efek visual (digroup agar ikut bergetar) ---- */}
                                    <div
                                        className="absolute inset-0"
                                        style={{ animation: `vp-shake .4s linear ${T}s both` }}
                                    >
                                        {/* cahaya latar */}
                                        <div style={C(tier === 'lite' ? 520 : Math.min(720, vp.w * 1.3))}>
                                            <div
                                                className="h-full w-full rounded-full"
                                                style={{
                                                    background:
                                                        'radial-gradient(circle, rgba(59,130,246,.6) 0%, rgba(37,99,235,.2) 40%, transparent 70%)',
                                                    animation: `vp-fadescale .5s ease-out ${T}s both`,
                                                }}
                                            />
                                        </div>

                                        {tier === 'full' && (
                                            <>
                                                {/* sinar: satu kali meledak (bukan berputar terus) */}
                                                <div style={C(raysSize)}>
                                                    <div
                                                        className="h-full w-full"
                                                        style={{
                                                            background:
                                                                'repeating-conic-gradient(rgba(96,165,250,.3) 0deg 4deg, transparent 4deg 18deg)',
                                                            animation: `vp-rays 1.8s ease-out ${T}s both`,
                                                            willChange: 'transform, opacity',
                                                        }}
                                                    />
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
                                                        style={{ animation: `vp-hud 1.4s ease-out ${T + 0.05}s both` }}
                                                    >
                                                        <svg viewBox="0 0 200 200" className="h-full w-full">
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
                                                        style={{ animation: `vp-hud-rev 1.4s ease-out ${T + 0.1}s both` }}
                                                    >
                                                        <svg viewBox="0 0 200 200" className="h-full w-full">
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
                                                                    animation: `vp-spark .7s ease-out ${T}s both`,
                                                                } as React.CSSProperties
                                                            }
                                                        />
                                                    ))}
                                                </div>

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
                                                            animation: `vp-streak .5s ease-out ${T + i * 0.06}s both`,
                                                        }}
                                                    />
                                                ))}
                                            </>
                                        )}

                                        {/* gelombang kejut */}
                                        {(tier === 'lite' ? [0] : [0, 0.12]).map((d) => (
                                            <div key={d} style={C(300)}>
                                                <div
                                                    className="h-full w-full rounded-full"
                                                    style={{
                                                        border: '2px solid rgba(147,197,253,.9)',
                                                        animation: `vp-ring .9s ease-out ${T + d}s both`,
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
                                                background:
                                                    'linear-gradient(90deg, transparent, #60a5fa, transparent)',
                                                animation: `vp-line ${T}s ease-out .05s both`,
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
                                                style={{ animation: `vp-bracket .35s ease-out ${0.05 + i * 0.04}s both` }}
                                            />
                                        ))}
                                    </div>

                                    {/* kilatan (tidak ikut bergetar) */}
                                    <div
                                        className="absolute inset-0"
                                        style={{
                                            background: '#dbeafe',
                                            opacity: 0,
                                            pointerEvents: 'none',
                                            animation: `vp-flash .35s ease-out ${T}s both`,
                                        }}
                                    />
                                </>
                            )}

                            {/* teks rank ala game */}
                            <div
                                className="pointer-events-none absolute left-0 right-0 text-center"
                                style={{ top: textTop }}
                            >
                                <div
                                    className="text-[11px] font-bold uppercase tracking-[0.5em] text-blue-300 sm:text-xs"
                                    style={{ animation: `vp-labelin .35s ease-out ${T + 0.12}s both` }}
                                >
                                    Peringkat
                                </div>
                                <div
                                    className="mt-2 px-4 text-4xl font-black uppercase italic tracking-[0.1em] text-white sm:text-6xl"
                                    style={{
                                        textShadow: '0 0 28px rgba(59,130,246,.9)',
                                        animation:
                                            tier === 'calm'
                                                ? `vp-labelin .4s ease-out ${T + 0.15}s both`
                                                : `vp-textin .4s cubic-bezier(.2,.9,.3,1) ${T + 0.18}s both`,
                                    }}
                                >
                                    {rankName}
                                </div>
                                <div
                                    className="mx-auto mt-3 h-[3px] w-40 rounded-full"
                                    style={{
                                        background: 'linear-gradient(90deg, transparent, #60a5fa, transparent)',
                                        animation: `vp-bar .5s ease-out ${T + 0.3}s both`,
                                    }}
                                />
                            </div>

                            {/* petunjuk lewati */}
                            {phase === 'intro' && (
                                <div
                                    className="absolute bottom-6 left-0 right-0 text-center text-[11px] tracking-widest text-white/30"
                                    style={{ animation: 'vp-labelin .4s ease-out 1s both' }}
                                >
                                    KETUK UNTUK MELEWATI
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* EMBLEM YANG BERGERAK (layer di atas overlay) */}
            {showFixedEmblem && anggota && go && (
                <div
                    className="pointer-events-none fixed left-0 top-0 z-[80]"
                    style={{
                        width: big,
                        height: big,
                        transformOrigin: '0 0',
                        transform: emblemTransform,
                        transition:
                            phase === 'moving' ? `transform ${MOVE_MS}ms cubic-bezier(.55,0,1,.45)` : 'none',
                        willChange: 'transform',
                    }}
                >
                    <div
                        className="h-full w-full"
                        style={tier !== 'calm' ? { animation: `vp-shake .4s linear ${T}s both` } : undefined}
                    >
                        {/* opacity muncul instan di awal jatuh */}
                        <div
                            className="h-full w-full"
                            style={{
                                animation:
                                    tier === 'calm'
                                        ? `vp-lite-in .45s ease-out ${T}s both`
                                        : `vp-appear .06s linear ${dropDelay}s both`,
                            }}
                        >
                            <div
                                className="h-full w-full"
                                style={
                                    tier !== 'calm'
                                        ? { animation: `vp-drop .64s linear ${dropDelay}s both` }
                                        : undefined
                                }
                            >
                                <IntroEmblem
                                    src={emblemSrc}
                                    alt={`Rank ${anggota.rank || ''}`}
                                    cors={emblemCors}
                                    shine={phase === 'intro' ? 'once' : 'none'}
                                    shineDelay={T + 0.3}
                                    glint
                                    blend={tier === 'full'}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* SLASH: tebasan menyilang layar tepat saat emblem menghantam (di atas emblem) */}
            {showFixedEmblem && anggota && go && tier !== 'calm' && (
                <div
                    className="pointer-events-none fixed inset-0 z-[85] overflow-hidden"
                    aria-hidden
                >
                    {/* pendar di sepanjang tebasan pertama */}
                    <div
                        style={{
                            position: 'absolute',
                            left: ex - diag,
                            top: ey - 70,
                            width: diag * 2,
                            height: 140,
                            transform: `rotate(${slashes[0].rot}deg)`,
                        }}
                    >
                        <div
                            className="h-full w-full"
                            style={{
                                background:
                                    'linear-gradient(180deg, transparent, rgba(147,197,253,.55), transparent)',
                                animation: `vp-slashglow .5s ease-out ${T}s both`,
                            }}
                        />
                    </div>

                    {slashes.map((s) => (
                        <div
                            key={s.rot}
                            style={{
                                position: 'absolute',
                                left: ex - diag,
                                top: ey - 2,
                                width: diag * 2,
                                height: 4,
                                transform: `rotate(${s.rot}deg)`,
                            }}
                        >
                            <div
                                className="h-full w-full"
                                style={{
                                    transformOrigin: s.origin,
                                    background:
                                        'linear-gradient(90deg, transparent 0%, #ffffff 12%, #ffffff 88%, transparent 100%)',
                                    boxShadow:
                                        '0 0 14px 3px rgba(147,197,253,.95), 0 0 40px 10px rgba(59,130,246,.5)',
                                    animation: `vp-slash .42s cubic-bezier(.1,.9,.2,1) ${T + s.delay}s both`,
                                    willChange: 'transform, opacity',
                                }}
                            />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}