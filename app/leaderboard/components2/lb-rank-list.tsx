'use client';

import React from 'react';
import { RANK_LEVELS, type RankLevel } from '../components/vp-types';
import { Emblem } from './lb-atoms';

/* Gambar rank disimpan trigger di bucket rank-badges dengan nama NAMA_RANK.jpg (huruf kapital) */
const BASE_STORAGE =
    (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://heosadzwckwmbjhxydtm.supabase.co') +
    '/storage/v1/object/public/rank-badges/';

const urlRank = (nama: string) => `${BASE_STORAGE}${nama}.jpg`;

/* Rank langka: dimulai dari ASURA sampai rank tertinggi */
const idxLangka = RANK_LEVELS.findIndex((r) => r.nama === 'ASURA');
const UMUM: RankLevel[] = idxLangka === -1 ? RANK_LEVELS : RANK_LEVELS.slice(0, idxLangka);
const LANGKA: RankLevel[] = idxLangka === -1 ? [] : RANK_LEVELS.slice(idxLangka);

function Tile({ rank, langka, lebar }: { rank: RankLevel; langka: boolean; lebar: boolean }) {
    return (
        <li
            className={`flex flex-col items-center rounded-xl px-2 pb-2.5 pt-3 text-center ${
                lebar ? 'col-span-2' : ''
            } ${langka ? 'border border-white/30 bg-white/15' : 'bg-white/10'}`}
        >
            <div
                className={`shrink-0 overflow-hidden rounded-xl ${lebar ? 'h-20 w-20' : 'h-14 w-14'}`}
            >
                <Emblem src={urlRank(rank.nama)} alt={`Rank ${rank.nama}`} className="h-full w-full" />
            </div>
            <div className="mt-2 w-full truncate text-[11px] font-extrabold uppercase tracking-wider text-white">
                {rank.nama}
            </div>
            <div className="text-[11px] font-semibold tabular-nums text-blue-200">
                {rank.min.toLocaleString('id-ID')} poin
            </div>
        </li>
    );
}

/** Daftar rank dari terendah ke tertinggi beserta gambar dan poin minimumnya. */
export default function RankList({ className = '' }: { className?: string }) {
    return (
        <section aria-label="Daftar rank" className={`relative ${className}`}>
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-blue-200">Daftar Rank</div>
            <p className="mb-3 mt-1 text-[11px] text-blue-200/80">Poin minimum untuk mencapai tiap rank.</p>

            <ol className="grid grid-cols-2 gap-2">
                {UMUM.map((r) => (
                    <Tile key={r.nama} rank={r} langka={false} lebar={false} />
                ))}
            </ol>

            {LANGKA.length > 0 && (
                <>
                    <div className="my-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] text-blue-200">
                        <span aria-hidden className="h-px flex-1 bg-white/20" />
                        Rank Langka
                        <span aria-hidden className="h-px flex-1 bg-white/20" />
                    </div>
                    <ol className="grid grid-cols-2 gap-2">
                        {LANGKA.map((r, i) => (
                            <Tile
                                key={r.nama}
                                rank={r}
                                langka
                                lebar={i === LANGKA.length - 1 && LANGKA.length % 2 === 1}
                            />
                        ))}
                    </ol>
                </>
            )}
        </section>
    );
}