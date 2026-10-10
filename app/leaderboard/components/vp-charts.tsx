'use client';

import React from 'react';
import { COLOR_BACA, COLOR_PINJAM, type KategoriStat } from './vp-types';
import { CountUp, stag, useReveal } from './vp-reveal';

/* Chart SVG/CSS ringan, animasi hanya transform + opacity */

export function DonutBacaPinjam({ baca, pinjam }: { baca: number; pinjam: number }) {
    const { ref, inView: on, lite } = useReveal<HTMLDivElement>();
    const total = baca + pinjam;
    const r = 54;
    const C = 2 * Math.PI * r;
    const bacaLen = total ? (C * baca) / total : 0;
    const pinjamLen = total ? (C * pinjam) / total : 0;
    const offTransform = lite ? 'rotate(-90deg)' : 'rotate(-200deg) scale(.7)';

    return (
        <div ref={ref} className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-8">
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

/** Menampilkan SEMUA kategori dari tabel kategori, termasuk yang belum pernah dibaca/dipinjam (kosong). */
export function KategoriChart({ data }: { data: KategoriStat[] }) {
    const { ref, inView: on, lite } = useReveal<HTMLDivElement>();

    if (data.length === 0) {
        return (
            <div ref={ref}>
                <p className="text-sm text-slate-500">Belum ada data kategori buku.</p>
            </div>
        );
    }
    const max = Math.max(...data.map((d) => d.total), 1);
    const terpakai = data.filter((d) => d.total > 0).length;

    const seg = (pct: number, color: string, delay: number): React.CSSProperties => ({
        width: `${pct}%`,
        background: color,
        transformOrigin: 'left',
        transform: on || lite ? 'scaleX(1)' : 'scaleX(0)',
        transition: lite ? 'none' : `transform .9s cubic-bezier(.2,.8,.2,1) ${delay}s`,
    });

    return (
        <div ref={ref}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-x-5 gap-y-2 text-xs font-medium text-slate-500">
                <div className="flex items-center gap-5">
                    <span className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLOR_BACA }} />
                        Baca
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLOR_PINJAM }} />
                        Pinjam
                    </span>
                </div>
                <span>
                    {terpakai} dari {data.length} kategori pernah dibaca/dipinjam
                </span>
            </div>

            <div className="space-y-4">
                {data.map((d, i) => {
                    const kosong = d.total === 0;
                    return (
                        <div
                            key={d.nama}
                            style={stag(on, lite, Math.min(0.1 + i * 0.05, 0.9), 28)}
                            className={kosong ? 'opacity-70' : ''}
                        >
                            <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                                <span className="min-w-0 truncate">
                                    <span className={`font-semibold ${kosong ? 'text-slate-500' : 'text-slate-700'}`}>
                                        {d.nama}
                                    </span>
                                    {d.kode && (
                                        <span className="ml-2 text-[11px] font-medium tabular-nums text-slate-400">
                                            {d.kode}
                                        </span>
                                    )}
                                </span>
                                <span className="shrink-0 text-xs text-slate-500">
                                    {kosong ? (
                                        <span className="italic text-slate-400">Belum ada</span>
                                    ) : (
                                        <>
                                            <span style={{ color: COLOR_BACA }} className="font-bold">
                                                {d.baca}
                                            </span>
                                            {' · '}
                                            <span style={{ color: COLOR_PINJAM }} className="font-bold">
                                                {d.pinjam}
                                            </span>
                                        </>
                                    )}
                                </span>
                            </div>
                            <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-200/60">
                                <div style={seg((d.baca / max) * 100, COLOR_BACA, 0.25 + i * 0.03)} />
                                <div style={seg((d.pinjam / max) * 100, COLOR_PINJAM, 0.4 + i * 0.03)} />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}