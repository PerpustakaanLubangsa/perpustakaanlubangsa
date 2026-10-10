'use client';

import React from 'react';
import { Loader2, Search, X } from 'lucide-react';
import type { Variant } from './vp-types';
import { CountUp, rvProps, useReveal } from './vp-reveal';

/* ---------- Tombol: satu-satunya elemen yang timbul. Sudut bulat; turun saat disentuh/diklik ---------- */
const tombolDasar =
    'inline-flex cursor-pointer touch-manipulation select-none items-center justify-center gap-2 rounded-lg border text-sm font-bold transition-[transform,box-shadow] duration-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f7f8fa] disabled:pointer-events-none disabled:opacity-70 [@media(hover:hover)]:hover:translate-y-1 [@media(hover:hover)]:hover:shadow-none active:translate-y-1 active:shadow-none';

export const tombolBiru = `${tombolDasar} border-blue-800 bg-blue-600 text-white shadow-[0_4px_0_0_#1e40af]`;
export const tombolPutih = `${tombolDasar} border-slate-300 bg-white text-slate-700 shadow-[0_4px_0_0_#cbd5e1]`;

/* ---------- Kartu ---------- */
export function Kartu({
    judul,
    kanan,
    className = '',
    children,
}: {
    judul: string;
    kanan?: React.ReactNode;
    className?: string;
    children: React.ReactNode;
}) {
    return (
        <section className={`flex min-h-0 flex-col rounded-2xl border border-slate-200 bg-white p-5 ${className}`}>
            <div className="mb-4 flex shrink-0 items-center justify-between gap-3">
                <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{judul}</h3>
                {kanan && <div className="shrink-0 text-xs font-semibold text-slate-500">{kanan}</div>}
            </div>
            {children}
        </section>
    );
}

export function KotakCari({
    id,
    label,
    placeholder,
    value,
    onChange,
}: {
    id: string;
    label: string;
    placeholder: string;
    value: string;
    onChange: (v: string) => void;
}) {
    return (
        <div className="relative min-w-0 flex-1">
            <label htmlFor={id} className="sr-only">
                {label}
            </label>
            <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
            />
            <input
                id={id}
                type="text"
                autoComplete="off"
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-9 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {value && (
                <button
                    type="button"
                    onClick={() => onChange('')}
                    aria-label="Hapus pencarian"
                    className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-slate-500 hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                    <X className="h-4 w-4" aria-hidden="true" />
                </button>
            )}
        </div>
    );
}

/** Bagian bawah daftar yang dimuat bertahap: tombol muat lebih banyak / pesan selesai / galat. */
export function BawahDaftar({
    galat,
    adaLagi,
    memuatLagi,
    onMuatLagi,
    selesai,
}: {
    galat: 'awal' | 'lagi' | null;
    adaLagi: boolean;
    memuatLagi: boolean;
    onMuatLagi: () => void;
    selesai: string;
}) {
    return (
        <div className="mt-4 flex flex-col items-center gap-2 pb-2">
            {galat === 'lagi' && (
                <p role="alert" className="text-xs text-red-600">
                    Gagal memuat data berikutnya. Coba lagi.
                </p>
            )}
            {adaLagi ? (
                <button type="button" onClick={onMuatLagi} disabled={memuatLagi} className={`${tombolPutih} px-5 py-2 text-xs`}>
                    {memuatLagi && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
                    {memuatLagi ? 'Memuat' : 'Muat lebih banyak'}
                </button>
            ) : (
                <p className="text-xs text-slate-400">{selesai}</p>
            )}
        </div>
    );
}

/* ---------- Potongan kartu ---------- */
export function StatItem({
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
            className={`${p.className} flex flex-col items-center rounded-2xl border border-slate-200 bg-white px-4 py-6 text-center`}
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

export function InfoItem({
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
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-500">
                {icon}
            </div>
            <div className="min-w-0">
                <div className="text-[11px] font-semibold text-slate-400">{label}</div>
                <div className="truncate text-sm font-bold text-slate-800">{value}</div>
            </div>
        </div>
    );
}