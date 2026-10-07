'use client';

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Loader2,
  AlertTriangle,
  User,
  Receipt,
  CalendarDays,
  RotateCw,
  Archive,
  Check,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

/* ───────────────────────── Types (dipakai bersama page.tsx) ───────────────────────── */

export interface MemberResult {
  id: string;
  nis: string;
  nama: string;
  jenjang: string;
  organisasi?: string;
  kamar?: string;
  role: string;
  rank?: string;
  isBorrowing?: boolean; // anggota masih punya pinjaman aktif
}

export interface BookSearchResult {
  id: string; // ID eksemplar
  biblio_id: string;
  barcode: string; // eksemplar.kode
  title: string; // biblio.judul
  author: string; // biblio.penulis
  status: string; // eksemplar.status
  lokasi_rak?: string;
}

/* ───────────────────────── Aturan peminjaman, keterlambatan & denda ───────────────────────── */

/** Lama peminjaman (hari) sejak tgl_pinjam. Perpanjang = tgl_pinjam di-reset ke hari ini. */
export const LAMA_PINJAM_HARI = 5;

/** Denda per hari keterlambatan (rupiah) */
export const DENDA_PER_HARI = 1000;

/** Ubah Date / string ("YYYY-MM-DD" atau ISO) menjadi tanggal lokal jam 00:00 */
function keTanggalLokal(value: Date | string): Date {
  if (value instanceof Date) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (m) {
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }
  const d = new Date(value);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Tanggal hari ini (lokal) dalam format "YYYY-MM-DD", untuk reset tgl_pinjam saat perpanjang */
export function tanggalHariIni(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/**
 * Hitung tanggal jatuh tempo = tgl_pinjam + lama pinjam.
 * (Jangan pakai tgl_kembali: nilainya null selama buku masih dipinjam.)
 */
export function hitungJatuhTempo(
  tglPinjam: Date | string,
  lamaPinjamHari: number = LAMA_PINJAM_HARI
): Date {
  const pinjam = keTanggalLokal(tglPinjam);
  return new Date(pinjam.getFullYear(), pinjam.getMonth(), pinjam.getDate() + lamaPinjamHari);
}

/**
 * Hitung hari keterlambatan.
 * - Pada tanggal jatuh tempo itu sendiri => 0 (belum terlambat).
 * - Sehari setelah jatuh tempo => 1 hari, dst.
 * Hanya tanggal yang dibandingkan (jam diabaikan).
 */
export function hitungKeterlambatan(
  jatuhTempo: Date | string,
  hariIni: Date = new Date()
): number {
  const tempo = keTanggalLokal(jatuhTempo);
  const today = keTanggalLokal(hariIni);
  const selisih = Math.round((today.getTime() - tempo.getTime()) / 86_400_000);
  return Math.max(0, selisih);
}

/** Hitung total denda (rupiah) dari jumlah hari terlambat */
export function hitungDenda(overdueDays: number): number {
  return Math.max(0, overdueDays) * DENDA_PER_HARI;
}

export function formatRupiah(nominal: number): string {
  return `Rp ${nominal.toLocaleString('id-ID')}`;
}

export function formatTanggal(tanggal: Date): string {
  return tanggal.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/* ───────────────────────── Tombol aksi ───────────────────────── */

type Variant = 'primary' | 'soft' | 'outline';

interface ActionDef {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  variant: Variant;
}

const VARIANT_CLASS: Record<Variant, string> = {
  primary: 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600',
  soft: 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200',
  outline: 'bg-white hover:bg-blue-50 text-blue-700 border-blue-200',
};

const DEFAULT_FOCUS_INDEX = 2; // tombol "Selesai"

/* ───────────────────────── Result card ───────────────────────── */

interface ResultCardProps {
  member: MemberResult;
  book: BookSearchResult;
  /** sirkulasi.tgl_pinjam ("YYYY-MM-DD"). Jatuh tempo dihitung dari sini. */
  tglPinjam: string;
  onRenew: () => void;
  onReturn: () => void;
  onReset: () => void;
  isLoading?: boolean;
}

function ResultCard({
  member,
  book,
  tglPinjam,
  onRenew,
  onReturn,
  onReset,
  isLoading = false,
}: ResultCardProps) {
  const { dueDateLabel, overdueDays } = useMemo(() => {
    const jatuhTempo = hitungJatuhTempo(tglPinjam);
    return {
      dueDateLabel: formatTanggal(jatuhTempo),
      overdueDays: hitungKeterlambatan(jatuhTempo),
    };
  }, [tglPinjam]);

  const isOverdue = overdueDays > 0;
  const denda = hitungDenda(overdueDays);

  // Catatan: terlambat TIDAK menonaktifkan tombol. Perpanjang & Kembalikan tetap bisa.
  const actions: ActionDef[] = [
    { label: 'Perpanjang', icon: RotateCw, onClick: onRenew, variant: 'primary' },
    { label: 'Kembalikan', icon: Archive, onClick: onReturn, variant: 'soft' },
    { label: 'Selesai', icon: Check, onClick: onReset, variant: 'outline' },
  ];

  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const lastFocusRef = useRef(DEFAULT_FOCUS_INDEX);
  const wasLoadingRef = useRef(false);
  const [focused, setFocused] = useState<number | null>(null);

  /* Fokus awal: tombol Selesai */
  useEffect(() => {
    btnRefs.current[DEFAULT_FOCUS_INDEX]?.focus();
  }, []);

  /* Setelah proses selesai (tombol sempat nonaktif), kembalikan fokus ke tombol terakhir */
  useEffect(() => {
    if (wasLoadingRef.current && !isLoading) {
      btnRefs.current[lastFocusRef.current]?.focus();
    }
    wasLoadingRef.current = isLoading;
  }, [isLoading]);

  /* Pindah fokus dengan tombol panah */
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    const dir =
      e.key === 'ArrowRight' || e.key === 'ArrowDown'
        ? 1
        : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
        ? -1
        : 0;
    if (dir === 0) return;

    e.preventDefault();
    const total = btnRefs.current.length;
    const next = (lastFocusRef.current + dir + total) % total;
    btnRefs.current[next]?.focus();
  }, []);

  return (
    <div className="bg-white border border-blue-100 rounded-2xl p-4 shadow-md space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-blue-50 pb-3">
        <div className="flex items-center gap-2 text-blue-700 font-extrabold text-xs uppercase tracking-wider">
          <Receipt className="h-4 w-4" />
          <span>Detail Transaksi Sirkulasi</span>
        </div>
        <span
          className={`text-[10px] px-2 py-0.5 rounded border font-bold ${
            isOverdue
              ? 'bg-red-50 text-red-700 border-red-200'
              : 'bg-blue-50 text-blue-700 border-blue-200'
          }`}
        >
          Status: Dipinjam{isOverdue ? ' • Terlambat' : ''}
        </span>
      </div>

      {/* Ringkasan peminjam & buku */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        {/* Peminjam */}
        <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-500 shrink-0 mt-0.5">
            <User className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-0.5">Peminjam</p>
            <p className="font-bold text-slate-900 truncate">{member.nama}</p>
            <p className="text-[10px] text-blue-600 font-mono font-semibold">
              NIS: {member.nis} {member.jenjang ? `• ${member.jenjang}` : ''}
            </p>
            {(member.organisasi || member.kamar) && (
              <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                {[
                  member.organisasi ? `Org: ${member.organisasi}` : '',
                  member.kamar ? `Kamar: ${member.kamar}` : '',
                ]
                  .filter(Boolean)
                  .join(' • ')}
              </p>
            )}
          </div>
        </div>

        {/* Buku */}
        <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 flex flex-col justify-between min-w-0">
          <div>
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-0.5">
              Buku / Eksemplar
            </p>
            <p className="font-bold text-slate-900 line-clamp-1">{book.title}</p>
            <p className="text-[10px] text-blue-600 font-mono font-semibold truncate">
              Kode: {book.barcode} • {book.author || 'Penulis Tidak Diketahui'}
            </p>
          </div>
          {book.lokasi_rak && (
            <p className="text-[10px] text-slate-500 mt-1">
              Lokasi Rak: <span className="text-slate-800 font-semibold">{book.lokasi_rak}</span>
            </p>
          )}
        </div>
      </div>

      {/* Jatuh tempo */}
      <div
        className={`rounded-xl p-3 flex items-center justify-between border ${
          isOverdue ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-100'
        }`}
      >
        <div className="flex items-center gap-2 text-slate-700 text-xs font-medium">
          {isOverdue ? (
            <AlertTriangle className="h-4 w-4 text-red-500" />
          ) : (
            <CalendarDays className="h-4 w-4 text-blue-600" />
          )}
          <span>Jatuh Tempo:</span>
        </div>
        <div className="flex items-center gap-2">
          {isOverdue && (
            <span className="text-[10px] font-bold text-red-600">Terlambat {overdueDays} hari</span>
          )}
          <span
            className={`text-xs font-black font-mono px-2.5 py-1 rounded-lg border bg-white ${
              isOverdue ? 'text-red-600 border-red-200' : 'text-blue-700 border-blue-200'
            }`}
          >
            {dueDateLabel}
          </span>
        </div>
      </div>

      {/* Denda keterlambatan */}
      {isOverdue && (
        <div className="rounded-xl p-3 border border-red-200 bg-red-50/60 space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-700 text-xs font-medium">
              <Wallet className="h-4 w-4 text-red-500" />
              <span>Denda Keterlambatan:</span>
            </div>
            <span className="text-xs font-black font-mono px-2.5 py-1 rounded-lg border bg-white text-red-600 border-red-200">
              {formatRupiah(denda)}
            </span>
          </div>
          <p className="text-[10px] text-slate-500">
            {overdueDays} hari × {formatRupiah(DENDA_PER_HARI)}/hari. Buku tetap dapat dikembalikan
            atau diperpanjang.
          </p>
        </div>
      )}

      {/* Tombol aksi: fokus dengan panah, Enter untuk menjalankan */}
      <div role="group" aria-label="Aksi transaksi" onKeyDown={handleKeyDown} className="flex items-center gap-2 pt-1">
        {actions.map((action, i) => {
          const Icon = action.icon;
          const showEnterHint = focused === i && !isLoading;

          return (
            <button
              key={action.label}
              ref={(el) => {
                btnRefs.current[i] = el;
              }}
              type="button"
              onClick={action.onClick}
              onFocus={() => {
                lastFocusRef.current = i;
                setFocused(i);
              }}
              onBlur={() => setFocused((prev) => (prev === i ? null : prev))}
              disabled={isLoading}
              className={`flex-1 min-w-0 border font-bold text-xs py-2 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${VARIANT_CLASS[action.variant]}`}
            >
              {isLoading && action.variant !== 'outline' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Icon className="h-3.5 w-3.5" />
              )}
              <span>{action.label}</span>
              {showEnterHint && (
                <kbd
                  className={`text-[9px] px-1.5 py-0.5 rounded border font-mono font-bold ${
                    action.variant === 'primary'
                      ? 'bg-blue-700 text-blue-50 border-blue-400'
                      : 'bg-white text-blue-600 border-blue-200'
                  }`}
                >
                  Enter
                </kbd>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default memo(ResultCard);