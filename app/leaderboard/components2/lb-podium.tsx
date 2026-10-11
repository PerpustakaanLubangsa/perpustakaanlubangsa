'use client';

import React from 'react';
import { Crown, Footprints, BookOpen, BookMarked } from 'lucide-react';
import { CountUp, Emblem } from './lb-atoms';
import { fmt, type Item } from './lb-types';

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

export function Podium({
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