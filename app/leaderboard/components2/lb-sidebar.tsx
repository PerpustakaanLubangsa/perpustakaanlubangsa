'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Trophy, Search, X, Info } from 'lucide-react';
import { CountUp } from './lb-atoms';
import RankList from './lb-rank-list';
import { FILTERS, type JenjangKey } from './lb-types';

export default function Sidebar({
  input,
  onInput,
  jenjang,
  onJenjang,
  stats,
  lite,
}: {
  input: string;
  onInput: (v: string) => void;
  jenjang: JenjangKey;
  onJenjang: (k: JenjangKey) => void;
  stats: { total: number; maxPoin: number } | null;
  lite: boolean;
}) {
  const activeIdx = Math.max(
    0,
    FILTERS.findIndex((f) => f.key === jenjang)
  );

  return (
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
          className="lb-slide relative inline-flex w-fit shrink-0 items-center gap-2 rounded-xl border border-white/25 px-3.5 py-2 text-sm font-bold text-white transition-[transform,background-color] duration-200 hover:-translate-x-1 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Beranda
        </Link>

        <div className="lb-rise relative shrink-0" style={{ ['--d' as string]: '0.05s' } as React.CSSProperties}>
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-blue-700">
            <Trophy className="h-8 w-8" />
          </div>
          <h1 className="mt-4 text-4xl font-black leading-none tracking-tight">Leaderboard</h1>
          <p className="mt-2 text-sm leading-relaxed text-blue-100">
            Peringkat pengunjung perpustakaan berdasarkan total poin.
          </p>
        </div>

        {/* pencarian */}
        <div className="lb-rise relative shrink-0" style={{ ['--d' as string]: '0.12s' } as React.CSSProperties}>
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
              onChange={(e) => onInput(e.target.value)}
              placeholder="Nama atau NIS..."
              autoComplete="off"
              className="block w-full rounded-xl border border-white/20 bg-white/10 py-3 pl-10 pr-10 text-sm text-white placeholder-blue-200 transition-colors focus:border-white focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/40"
            />
            {input && (
              <button
                type="button"
                onClick={() => onInput('')}
                aria-label="Hapus pencarian"
                className="absolute inset-y-0 right-0 flex cursor-pointer items-center pr-3.5 text-blue-200 transition-colors hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* filter jenjang dengan pil yang meluncur */}
        <div className="lb-rise relative shrink-0" style={{ ['--d' as string]: '0.19s' } as React.CSSProperties}>
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
                  onClick={() => onJenjang(f.key)}
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
        <div
          className="lb-rise relative grid shrink-0 grid-cols-2 gap-3"
          style={{ ['--d' as string]: '0.26s' } as React.CSSProperties}
        >
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

        <p className="relative flex shrink-0 items-start gap-2 text-xs leading-relaxed text-blue-200">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Klik pengunjung mana pun untuk melihat profil lengkapnya.
        </p>

        {/* daftar rank: paling bawah */}
        <RankList className="mt-auto shrink-0" />
      </div>
    </aside>
  );
}