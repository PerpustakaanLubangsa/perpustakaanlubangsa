'use client';

import React from 'react';
import { Emblem } from './lb-atoms';
import { GRID, fmt, type Item } from './lb-types';

/* ---------- Baris peringkat ---------- */
export function RankRow({
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

/* ---------- Skeleton ---------- */
export function RowSkeleton() {
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

export function PageSkeleton() {
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