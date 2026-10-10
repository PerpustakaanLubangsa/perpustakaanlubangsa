'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
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
    Loader2,
} from 'lucide-react';
import { detectLite, type ProfileTarget } from './vp-types';
import { REVEAL_CSS, Reveal, RevealCtx } from './vp-reveal';
import { useProfileData } from './vp-data';
import Emblem from './vp-emblem';
import { DonutBacaPinjam, KategoriChart } from './vp-charts';
import { InfoItem, Kartu, StatItem, tombolBiru } from './vp-ui';
import RiwayatKunjungan from './vp-riwayat';
import MutasiPoinBox from './vp-mutasi-poin';

// Dipakai oleh page.tsx: import VisitorProfileModal, { ProfileTarget } from './components/VisitorProfileModal'
export type { ProfileTarget };

interface VisitorProfileModalProps {
    isOpen: boolean;
    target: ProfileTarget | null;
    onClose: () => void;
}

export default function VisitorProfileModal({ isOpen, target, onClose }: VisitorProfileModalProps) {
    const [lite, setLite] = useState(false);
    const scrollRef = useRef<HTMLDivElement | null>(null);

    const { phase, errorMsg, anggota, stats, terbaru } = useProfileData(isOpen, target);

    const ctxValue = useMemo(
        () => ({ root: scrollRef, enabled: phase === 'done', lite }),
        [phase, lite]
    );

    /* deteksi perangkat */
    useEffect(() => {
        if (!isOpen) return;
        setLite(detectLite());
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

    if (!isOpen || !target) return null;

    const nama = anggota?.nama || target.nama;
    const rankName = anggota?.rank || 'Warrior';

    return (
        <div
            ref={scrollRef}
            className="fixed inset-0 z-[60] overflow-y-auto bg-[#f7f8fa] text-slate-800"
            role="dialog"
            aria-modal="true"
            aria-label="Profil Pengunjung"
        >
            <style>{REVEAL_CSS}</style>

            {/* TOMBOL TUTUP */}
            <button
                type="button"
                onClick={onClose}
                aria-label="Tutup profil"
                className={`fixed right-4 top-4 z-[90] h-11 w-11 sm:right-6 sm:top-6 ${tombolBiru}`}
            >
                <X className="h-5 w-5" aria-hidden="true" />
            </button>

            {/* ============ HALAMAN PROFIL ============ */}
            <RevealCtx.Provider value={ctxValue}>
                <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col items-center px-5 pb-20 pt-16 sm:px-10 sm:pt-20">
                    {phase === 'loading' && (
                        <div
                            role="status"
                            className="mt-32 flex flex-col items-center gap-3 text-sm font-medium text-slate-500"
                        >
                            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                            Memuat profil...
                        </div>
                    )}

                    {phase === 'error' && (
                        <div role="alert" className="mt-24 max-w-md text-center text-sm font-medium text-red-700">
                            {errorMsg}
                        </div>
                    )}

                    {phase === 'done' && anggota && stats && (
                        <>
                            {/* EMBLEM */}
                            <Reveal variant="zoom" delay={0} className="shrink-0">
                                <div className="relative h-32 w-32 sm:h-40 sm:w-40">
                                    <div
                                        className="absolute rounded-full"
                                        style={{
                                            inset: -36,
                                            background:
                                                'radial-gradient(circle, rgba(59,130,246,.16) 0%, transparent 68%)',
                                        }}
                                    />
                                    <div className="relative h-full w-full">
                                        <Emblem src={anggota.avatar_rank} alt={`Rank ${anggota.rank || ''}`} />
                                    </div>
                                </div>
                            </Reveal>

                            {/* NAMA, NIS, RANK */}
                            <div className="mt-6 text-center">
                                <Reveal variant="up" delay={0.05}>
                                    <h2 className="text-3xl font-extrabold leading-tight text-slate-800 sm:text-4xl">
                                        {nama}
                                    </h2>
                                </Reveal>
                                <Reveal variant="up" delay={0.1}>
                                    <p className="mt-1.5 text-sm font-medium tracking-wide text-slate-500">
                                        NIS {anggota.nis || '-'}
                                    </p>
                                </Reveal>
                                <Reveal variant="pop" delay={0.15}>
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
                                <Reveal variant="fade" delay={0.2}>
                                    <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold capitalize text-slate-400">
                                        <ShieldCheck className="h-3.5 w-3.5" />
                                        {anggota.role}
                                    </p>
                                </Reveal>
                            </div>

                            {/* KUNJUNGAN KE-N */}
                            <Reveal variant="up" delay={0.25} className="mt-8 max-w-xl">
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
                </div>
            </RevealCtx.Provider>
        </div>
    );
}