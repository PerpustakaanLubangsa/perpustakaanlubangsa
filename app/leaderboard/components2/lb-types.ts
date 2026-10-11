import type React from 'react';
import { Users, GraduationCap } from 'lucide-react';

export const VIEW = 'leaderboard_anggota';
export const COLUMNS =
  'id, nis, nama, jenjang, kamar, rank_nama, total_kunjungan, total_baca, total_pinjam, total_poin, avatar_rank, peringkat, peringkat_jenjang';
export const PAGE_SIZE = 24;

export type JenjangKey = 'Semua' | 'SLTP' | 'SLTA' | 'PT';

export const FILTERS: {
  key: JenjangKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { key: 'Semua', label: 'Semua Jenjang', icon: Users },
  { key: 'SLTP', label: 'SLTP', icon: GraduationCap },
  { key: 'SLTA', label: 'SLTA', icon: GraduationCap },
  { key: 'PT', label: 'Perguruan Tinggi', icon: GraduationCap },
];

/* Satu definisi kolom agar header & baris selalu sejajar */
export const GRID =
  'grid-cols-[56px_minmax(0,2.2fr)_minmax(0,1fr)_84px_84px_84px_minmax(0,1.5fr)]';

export interface Row {
  id: string;
  nis: string | null;
  nama: string;
  jenjang: string | null;
  kamar: string | null;
  rank_nama: string | null;
  total_kunjungan: number | null;
  total_baca: number | null;
  total_pinjam: number | null;
  total_poin: number | null;
  avatar_rank: string | null;
  peringkat: number;
  peringkat_jenjang: number | null;
}

export interface Item extends Row {
  posisi: number;
  delay: number;
}

export const fmt = (n: number | null | undefined) => (n ?? 0).toLocaleString('id-ID');

export const sanitize = (s: string) => s.replace(/[,()%*"\\]/g, ' ').trim();