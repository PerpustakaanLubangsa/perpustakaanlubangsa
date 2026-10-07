'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  BookMarked,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  X,
  RefreshCw,
  ChevronDown,
  Inbox,
  Copy,
  FileSpreadsheet,
  Check,
} from 'lucide-react';

/* =========================================================
   ATURAN & KONFIGURASI
   ========================================================= */

const TABLE = 'sirkulasi';
const COLUMNS = 'id, tgl_pinjam, nis, nama_anggota, kode_eksemplar, judul_buku, kamar, penulis';

// Jumlah data per "Muat Lebih Banyak"
const PAGE_SIZE = 20;
// Batas baris per request (default maksimum Supabase = 1000). Hanya dipakai saat salin/ekspor
const EXPORT_BATCH = 1000;

// Masa pinjam 5 hari: pinjam tgl 1 -> batas tgl 5 -> tgl 6 sudah terlambat
const LOAN_DAYS = 5;
// Denda per hari keterlambatan
const FINE_PER_DAY = 1000;

/* =========================================================
   TIPE & HELPER
   ========================================================= */

type Scope = 'all' | 'late';
type Action = 'copy' | 'excel';

interface Loan {
  id: number;
  nama: string;
  nis: string;
  kamar: string;
  judul: string;
  penulis: string;
  kode: string;
  tglPinjam: Date;
  jatuhTempo: Date;
  hariTerlambat: number; // 0 jika belum terlambat
  sisaHari: number; // 0 jika sudah lewat / hari terakhir
  denda: number;
}

interface Counts {
  borrowed: number | null;
  late: number | null;
  terlamaHari: number | null;
}

const DAY_MS = 86_400_000;

const dateFormatter = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const rupiahFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

const rupiah = (n: number) => rupiahFormatter.format(n);

function toDate(value: unknown): Date | null {
  if (!value) return null;
  const s = String(value);
  // "YYYY-MM-DD" dibaca sebagai tanggal lokal agar tidak bergeser zona waktu
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  const d = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toISODate(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function diffDays(a: Date, b: Date): number {
  return Math.round((startOfDay(a).getTime() - startOfDay(b).getTime()) / DAY_MS);
}

/** Tanggal terlambat jika tgl_pinjam <= hari ini - LOAN_DAYS */
function lateCutoff(today: Date): string {
  return toISODate(addDays(today, -LOAN_DAYS));
}

/** Ubah satu baris sirkulasi menjadi data peminjam */
function mapRow(row: any, today: Date): Loan | null {
  const tglPinjam = toDate(row.tgl_pinjam);
  if (!tglPinjam) return null;

  // Batas kembali = hari ke-5 (tgl pinjam + 4 hari)
  const jatuhTempo = addDays(tglPinjam, LOAN_DAYS - 1);
  const selisih = diffDays(today, jatuhTempo);
  const hariTerlambat = Math.max(0, selisih);

  return {
    id: row.id,
    nama: row.nama_anggota ?? '-',
    nis: row.nis ?? '-',
    kamar: row.kamar ?? '-',
    judul: row.judul_buku ?? '-',
    penulis: row.penulis ?? '',
    kode: row.kode_eksemplar ?? '-',
    tglPinjam,
    jatuhTempo,
    hariTerlambat,
    sisaHari: Math.max(0, -selisih),
    denda: hariTerlambat * FINE_PER_DAY,
  };
}

function statusText(l: Loan): string {
  if (l.hariTerlambat > 0) return `Terlambat ${l.hariTerlambat} hari`;
  if (l.sisaHari === 0) return 'Batas hari ini';
  return `Sisa ${l.sisaHari} hari`;
}

function initials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0] ?? '')
      .join('')
      .toUpperCase() || '?'
  );
}

/** Query dasar: buku yang belum kembali (+ filter terlambat jika scope = 'late') */
function buildQuery(
  scope: Scope,
  today: Date,
  columns: string,
  opts?: { count?: 'exact'; head?: boolean }
) {
  let q: any = supabase
    .from(TABLE)
    .select(columns, opts)
    .is('tgl_kembali', null)
    .not('tgl_pinjam', 'is', null);
  if (scope === 'late') q = q.lte('tgl_pinjam', lateCutoff(today));
  return q;
}

/** Ambil SEMUA data sesuai scope secara bertahap. Hanya dipanggil saat salin/ekspor. */
async function fetchAllLoans(scope: Scope): Promise<Loan[]> {
  const today = new Date();
  const out: Loan[] = [];

  for (let from = 0; ; from += EXPORT_BATCH) {
    const { data, error } = await buildQuery(scope, today, COLUMNS)
      .order('tgl_pinjam', { ascending: true })
      .order('id', { ascending: true })
      .range(from, from + EXPORT_BATCH - 1);

    if (error) throw error;
    const rows: any[] = data ?? [];
    for (const row of rows) {
      const item = mapRow(row, today);
      if (item) out.push(item);
    }
    if (rows.length < EXPORT_BATCH) break;
  }
  return out;
}

/* ---------- Tabel untuk salin & Excel (kolom & urutan sama) ---------- */

const TABLE_HEADERS = ['No', 'Nama', 'Kamar', 'Judul Buku', 'Penulis', 'Telat (Hari)', 'Denda (Rp)'];
// Kolom angka (rata kanan di tabel HTML)
const NUMERIC_COLS = new Set([0, 5, 6]);

function loanToCells(l: Loan, i: number): (string | number)[] {
  return [i + 1, l.nama, l.kamar, l.judul, l.penulis, l.hariTerlambat, l.denda];
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Hasil salin: TSV (otomatis jadi sel saat ditempel ke Excel/Sheets) + HTML (tabel di Word/Docs) */
function buildCopyTable(data: Loan[]): { tsv: string; html: string } {
  const body = data.map(loanToCells);

  const clean = (v: string | number) => String(v).replace(/[\t\r\n]+/g, ' ').trim();
  const tsv = [TABLE_HEADERS, ...body].map((r) => r.map(clean).join('\t')).join('\n');

  const cell = 'border:1px solid #94a3b8;padding:4px 8px;';
  const th = TABLE_HEADERS.map(
    (h, c) =>
      `<th style="${cell}background:#dbeafe;font-weight:bold;text-align:${
        NUMERIC_COLS.has(c) ? 'right' : 'left'
      };">${escapeHtml(h)}</th>`
  ).join('');
  const tr = body
    .map(
      (r) =>
        `<tr>${r
          .map(
            (v, c) =>
              `<td style="${cell}text-align:${NUMERIC_COLS.has(c) ? 'right' : 'left'};">${escapeHtml(
                clean(v)
              )}</td>`
          )
          .join('')}</tr>`
    )
    .join('');
  const html = `<table style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:12px;"><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table>`;

  return { tsv, html };
}

async function copyText(text: string): Promise<void> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
  } catch {
    // lanjut ke cadangan di bawah (mis. Safari menolak setelah proses async)
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  const ok = document.execCommand('copy');
  document.body.removeChild(ta);
  if (!ok) throw new Error('Browser menolak menyalin ke clipboard.');
}

async function copyTable(data: Loan[]): Promise<void> {
  const { tsv, html } = buildCopyTable(data);

  try {
    if (navigator.clipboard?.write && typeof ClipboardItem !== 'undefined') {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/plain': new Blob([tsv], { type: 'text/plain' }),
          'text/html': new Blob([html], { type: 'text/html' }),
        }),
      ]);
      return;
    }
  } catch {
    // jatuh ke salinan teks biasa (tab-separated)
  }
  await copyText(tsv);
}

async function exportExcel(data: Loan[], scope: Scope): Promise<void> {
  // Dimuat hanya saat dibutuhkan agar bundle halaman tetap ringan
  const XLSX = await import('xlsx');

  const ws = XLSX.utils.aoa_to_sheet([TABLE_HEADERS, ...data.map(loanToCells)]);
  ws['!cols'] = [{ wch: 5 }, { wch: 26 }, { wch: 10 }, { wch: 40 }, { wch: 26 }, { wch: 13 }, { wch: 13 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, scope === 'late' ? 'Terlambat' : 'Semua Peminjam');
  XLSX.writeFile(
    wb,
    `peminjam-${scope === 'late' ? 'terlambat' : 'semua'}-${toISODate(new Date())}.xlsx`
  );
}

/* =========================================================
   GAYA (mengikuti halaman dashboard)
   ========================================================= */

// Kartu solid: tanpa transparansi dan tanpa blur agar ringan di perangkat low-end
const CARD = 'bg-white border border-slate-200 shadow-sm';
const BADGE = 'bg-blue-50 text-blue-600 border border-blue-200';

const TITLE = 'Daftar Peminjam';
const SUBTITLE = `Buku yang sedang dipinjam. Terlambat setelah batas ${LOAN_DAYS} hari, denda ${rupiah(
  FINE_PER_DAY
)} per hari.`;

// Kata muncul satu per satu. Hanya opacity + transform (dipercepat GPU, murah)
function AnimatedWords({
  text,
  startDelay = 0,
  step = 60,
}: {
  text: string;
  startDelay?: number;
  step?: number;
}) {
  return (
    <>
      {text.split(' ').map((word, i) => (
        <React.Fragment key={i}>
          <span
            className="word-in inline-block"
            style={{ animationDelay: `${startDelay + i * step}ms` }}
          >
            {word}
          </span>{' '}
        </React.Fragment>
      ))}
    </>
  );
}

function SkeletonRow() {
  return (
    <div className="animate-pulse px-5 py-3.5 grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 md:items-center">
      <div className="md:col-span-5 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-100 shrink-0" />
        <div className="space-y-2 flex-1">
          <div className="h-3 w-2/3 rounded bg-blue-100" />
          <div className="h-2.5 w-1/3 rounded bg-blue-50" />
        </div>
      </div>
      <div className="md:col-span-4 h-3 w-3/4 rounded bg-blue-100" />
      <div className="md:col-span-3 md:flex md:justify-end">
        <div className="h-6 w-28 rounded-md bg-blue-100" />
      </div>
    </div>
  );
}

/* =========================================================
   BADGE STATUS
   ========================================================= */

function StatusBadge({ loan }: { loan: Loan }) {
  const late = loan.hariTerlambat > 0;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md border text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${
        late
          ? 'border-blue-600 bg-blue-600 text-white'
          : 'border-blue-200 bg-blue-50 text-blue-700'
      }`}
    >
      {late ? <AlertTriangle className="w-3 h-3" /> : <Check className="w-3 h-3" />}
      {statusText(loan)}
    </span>
  );
}

/* =========================================================
   MODAL DETAIL PEMINJAM
   ========================================================= */

function DetailItem({
  label,
  children,
  full = false,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={full ? 'col-span-2' : ''}>
      <dt className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{label}</dt>
      <dd className="mt-0.5 text-xs font-bold text-slate-900 break-words">{children}</dd>
    </div>
  );
}

function LoanDetailModal({ loan, onClose }: { loan: Loan; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const late = loan.hariTerlambat > 0;

  useEffect(() => {
    closeRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);

    // Kunci scroll halaman selama modal terbuka
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Detail peminjam ${loan.nama}`}
        className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center gap-3 p-5 border-b border-slate-200">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white text-xs font-black flex items-center justify-center shrink-0">
            {initials(loan.nama)}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-black text-slate-900 truncate">{loan.nama}</h3>
            <p className="text-[11px] text-slate-500 font-medium truncate">
              {loan.nis} • Kamar {loan.kamar}
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Isi */}
        <div className="p-5 space-y-4">
          <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-100 rounded-xl">
            <BookMarked className="w-4 h-4 mt-0.5 text-blue-600 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-black text-slate-900 break-words">{loan.judul}</p>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                {loan.penulis || 'Penulis tidak tercatat'}
              </p>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
            <DetailItem label="Kode Eksemplar">{loan.kode}</DetailItem>
            <DetailItem label="Kamar">{loan.kamar}</DetailItem>
            <DetailItem label="Tanggal Pinjam">{dateFormatter.format(loan.tglPinjam)}</DetailItem>
            <DetailItem label="Batas Kembali">{dateFormatter.format(loan.jatuhTempo)}</DetailItem>
            <DetailItem label="Status">
              <StatusBadge loan={loan} />
            </DetailItem>
            <DetailItem label="Denda">{late ? rupiah(loan.denda) : 'Belum ada denda'}</DetailItem>
          </dl>

          {late && (
            <p className="text-[11px] text-slate-500 font-medium">
              {loan.hariTerlambat} hari × {rupiah(FINE_PER_DAY)} = {rupiah(loan.denda)}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider transition-colors active:scale-95 cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   TOMBOL AKSI DENGAN PILIHAN (Semua / Terlambat saja)
   ========================================================= */

interface ActionMenuProps {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  variant: 'light' | 'solid';
  busy: boolean;
  disabled: boolean;
  borrowedCount: number | null;
  lateCount: number | null;
  onSelect: (scope: Scope) => void;
}

function ActionMenu({
  label,
  icon: Icon,
  variant,
  busy,
  disabled,
  borrowedCount,
  lateCount,
  onSelect,
}: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const options: { scope: Scope; text: string; count: number | null }[] = [
    { scope: 'all', text: 'Semua peminjam', count: borrowedCount },
    { scope: 'late', text: 'Hanya yang terlambat', count: lateCount },
  ];

  const buttonStyle =
    variant === 'solid'
      ? 'bg-blue-600 hover:bg-blue-700 text-white border border-blue-600'
      : 'bg-white hover:bg-blue-50 text-blue-700 border border-blue-200';

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled || busy}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`flex items-center gap-1.5 px-3 py-2 ${buttonStyle} font-extrabold rounded-xl text-xs uppercase tracking-wider transition-colors active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer`}
      >
        {busy ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Icon className="w-3.5 h-3.5" />}
        {busy ? 'Memproses...' : label}
        {!busy && <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-64 z-30 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden"
        >
          {options.map((opt) => (
            <button
              key={opt.scope}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onSelect(opt.scope);
              }}
              className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors cursor-pointer"
            >
              <span>{opt.text}</span>
              <span className="text-[10px] font-black text-blue-600 bg-blue-50 border border-blue-200 rounded-md px-1.5 py-0.5">
                {opt.count === null ? '–' : opt.count.toLocaleString('id-ID')}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   HALAMAN
   ========================================================= */

export default function DaftarPeminjamPage() {
  const router = useRouter();

  const [authReady, setAuthReady] = useState(false);

  // Daftar yang tampil (dimuat bertahap)
  const [rows, setRows] = useState<Loan[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [moreError, setMoreError] = useState<string | null>(null);

  // Angka ringkasan (hanya hitungan, tidak memuat baris)
  const [counts, setCounts] = useState<Counts>({ borrowed: null, late: null, terlamaHari: null });

  // Filter
  const [scope, setScope] = useState<Scope>('all');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Modal detail
  const [selected, setSelected] = useState<Loan | null>(null);
  const closeDetail = useCallback(() => setSelected(null), []);

  // Salin / ekspor
  const [busyAction, setBusyAction] = useState<Action | null>(null);
  const [notice, setNotice] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const mounted = useRef(true);
  const reqId = useRef(0);
  const fetchedRaw = useRef(0); // jumlah baris mentah yang sudah diambil (offset berikutnya)
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    };
  }, []);

  // Proteksi halaman
  useEffect(() => {
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!mounted.current) return;

      if (!session) router.replace('/login');
      else setAuthReady(true);
    })();
  }, [router]);

  // Tunda pencarian agar tidak query di setiap ketikan
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 350);
    return () => clearTimeout(t);
  }, [query]);

  /* ---------- Ringkasan (hanya count) ---------- */
  const loadCounts = useCallback(async () => {
    try {
      const today = new Date();
      const [all, late, oldest] = await Promise.all([
        buildQuery('all', today, 'id', { count: 'exact', head: true }),
        buildQuery('late', today, 'id', { count: 'exact', head: true }),
        buildQuery('late', today, 'tgl_pinjam')
          .order('tgl_pinjam', { ascending: true })
          .limit(1),
      ]);

      if (!mounted.current) return;
      if (all.error) throw all.error;
      if (late.error) throw late.error;
      if (oldest.error) throw oldest.error;

      const oldestDate = toDate(oldest.data?.[0]?.tgl_pinjam);
      const terlamaHari = oldestDate
        ? Math.max(0, diffDays(today, addDays(oldestDate, LOAN_DAYS - 1)))
        : 0;

      setCounts({
        borrowed: all.count ?? 0,
        late: late.count ?? 0,
        terlamaHari,
      });
    } catch {
      // Kegagalan ringkasan tidak boleh memblokir daftar
      if (mounted.current) setCounts({ borrowed: null, late: null, terlamaHari: null });
    }
  }, []);

  /* ---------- Daftar (per halaman, "Muat Lebih Banyak") ---------- */
  const loadPage = useCallback(
    async (offset: number) => {
      const id = ++reqId.current;
      const isFirst = offset === 0;

      if (isFirst) {
        setLoading(true);
        setError(null);
        setMoreError(null);
      } else {
        setLoadingMore(true);
        setMoreError(null);
      }

      try {
        const today = new Date();
        let q = buildQuery(scope, today, COLUMNS, isFirst ? { count: 'exact' } : undefined);

        // Hilangkan karakter yang merusak sintaks filter .or()
        const term = debouncedQuery.replace(/[%,()*\\]/g, ' ').replace(/\s+/g, ' ').trim();
        if (term) {
          q = q.or(
            [
              `nama_anggota.ilike.%${term}%`,
              `nis.ilike.%${term}%`,
              `kamar.ilike.%${term}%`,
              `judul_buku.ilike.%${term}%`,
              `kode_eksemplar.ilike.%${term}%`,
            ].join(',')
          );
        }

        // Urutan stabil (tgl_pinjam, id) supaya halaman berikutnya tidak tumpang tindih
        const { data, error: fetchError, count } = await q
          .order('tgl_pinjam', { ascending: true })
          .order('id', { ascending: true })
          .range(offset, offset + PAGE_SIZE - 1);

        if (!mounted.current || id !== reqId.current) return;
        if (fetchError) throw fetchError;

        const raw: any[] = data ?? [];
        const items: Loan[] = [];
        for (const row of raw) {
          const item = mapRow(row, today);
          if (item) items.push(item);
        }

        fetchedRaw.current = offset + raw.length;
        const totalMatch = isFirst ? count ?? raw.length : undefined;

        setRows((prev) => (isFirst ? items : [...prev, ...items]));
        if (totalMatch !== undefined) setTotal(totalMatch);
        setHasMore(
          raw.length === PAGE_SIZE &&
            fetchedRaw.current < (totalMatch ?? Number.POSITIVE_INFINITY)
        );
      } catch (err: any) {
        if (!mounted.current || id !== reqId.current) return;
        const msg = err?.message || 'Gagal memuat data peminjam.';
        if (isFirst) setError(msg);
        else setMoreError(msg);
      } finally {
        if (mounted.current && id === reqId.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [scope, debouncedQuery]
  );

  // Muat ulang daftar saat scope / pencarian berubah
  useEffect(() => {
    if (authReady) loadPage(0);
  }, [authReady, loadPage]);

  useEffect(() => {
    if (authReady) loadCounts();
  }, [authReady, loadCounts]);

  const refresh = () => {
    loadCounts();
    loadPage(0);
  };

  /* ---------- Salin & ekspor (mengambil semua data sesuai pilihan) ---------- */
  const showNotice = (type: 'ok' | 'err', text: string) => {
    setNotice({ type, text });
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 3500);
  };

  const runAction = async (action: Action, target: Scope) => {
    if (busyAction) return;
    setBusyAction(action);
    setNotice(null);
    try {
      const data = await fetchAllLoans(target);
      if (!mounted.current) return;

      if (data.length === 0) {
        showNotice(
          'err',
          target === 'late' ? 'Tidak ada peminjam terlambat.' : 'Tidak ada data peminjam.'
        );
        return;
      }

      if (action === 'copy') {
        await copyTable(data);
        if (mounted.current)
          showNotice('ok', `${data.length.toLocaleString('id-ID')} data berhasil disalin sebagai tabel`);
      } else {
        await exportExcel(data, target);
        if (mounted.current)
          showNotice('ok', `${data.length.toLocaleString('id-ID')} data diekspor ke Excel`);
      }
    } catch (err: any) {
      if (mounted.current) {
        showNotice('err', err?.message || 'Gagal memproses data.');
      }
    } finally {
      if (mounted.current) setBusyAction(null);
    }
  };

  /* ---------- Kartu statistik ---------- */
  const stats = useMemo(() => {
    const fmt = (n: number | null) => (n === null ? '–' : n.toLocaleString('id-ID'));
    const onTime =
      counts.borrowed !== null && counts.late !== null
        ? Math.max(0, counts.borrowed - counts.late)
        : null;

    return [
      {
        title: 'Sedang Dipinjam',
        value: fmt(counts.borrowed),
        info: 'Buku yang belum kembali',
        icon: BookMarked,
      },
      {
        title: 'Buku Terlambat',
        value: fmt(counts.late),
        info: `Melewati batas ${LOAN_DAYS} hari`,
        icon: AlertTriangle,
      },
      {
        title: 'Masih Dalam Batas',
        value: fmt(onTime),
        info: 'Belum jatuh tempo',
        icon: CheckCircle2,
      },
      {
        title: 'Terlama Terlambat',
        value: counts.terlamaHari === null ? '–' : `${counts.terlamaHari} hari`,
        info: 'Keterlambatan paling lama',
        icon: Clock,
      },
    ];
  }, [counts]);

  const hasSearch = debouncedQuery.trim() !== '';

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-slate-800 flex flex-col font-sans">
      <style>{`
        @keyframes word-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .word-in {
          opacity: 0;
          animation: word-in 0.25s ease-out forwards;
        }
        @media (prefers-reduced-motion: reduce) {
          .word-in { opacity: 1; animation: none; }
        }
      `}</style>

      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        {/* Judul halaman */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-white tracking-tight [text-shadow:0_1px_3px_rgba(0,0,0,0.35)]">
              <AnimatedWords text={TITLE} step={70} />
            </h2>
            <p className="text-xs text-white font-medium [text-shadow:0_1px_2px_rgba(0,0,0,0.35)]">
              <AnimatedWords text={SUBTITLE} startDelay={200} step={35} />
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ActionMenu
              label="Salin"
              icon={Copy}
              variant="light"
              busy={busyAction === 'copy'}
              disabled={busyAction !== null}
              borrowedCount={counts.borrowed}
              lateCount={counts.late}
              onSelect={(s) => runAction('copy', s)}
            />
            <ActionMenu
              label="Ekspor Excel"
              icon={FileSpreadsheet}
              variant="solid"
              busy={busyAction === 'excel'}
              disabled={busyAction !== null}
              borrowedCount={counts.borrowed}
              lateCount={counts.late}
              onSelect={(s) => runAction('excel', s)}
            />
          </div>
        </div>

        {/* Kartu statistik */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div
              key={stat.title}
              className={`${CARD} p-5 rounded-2xl flex items-start justify-between`}
            >
              <div className="space-y-1 min-w-0">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                  {stat.title}
                </span>
                <span className="text-2xl font-black text-slate-900 tracking-tight block truncate">
                  {stat.value}
                </span>
                <span className="text-[10px] text-slate-500 font-medium block">{stat.info}</span>
              </div>
              <div
                className={`w-10 h-10 ${BADGE} rounded-xl flex items-center justify-center shrink-0`}
              >
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
          ))}
        </div>

        {/* Daftar peminjam */}
        <div className={`${CARD} rounded-2xl overflow-hidden`}>
          {/* Header: judul, filter, pencarian, muat ulang */}
          <div className="p-5 space-y-4 border-b border-slate-200">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                  {scope === 'late' ? 'Peminjam Terlambat' : 'Semua Peminjam'}
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  Klik nama peminjam untuk melihat detail lengkap
                </p>
              </div>
              <button
                type="button"
                onClick={refresh}
                disabled={loading}
                aria-label="Muat ulang data"
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md uppercase tracking-wider transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                Muat Ulang
              </button>
            </div>

            {/* Filter: semua / terlambat saja */}
            <div
              role="group"
              aria-label="Filter peminjam"
              className="inline-flex p-1 bg-blue-50 border border-blue-100 rounded-xl"
            >
              {(
                [
                  { value: 'all', label: 'Semua', count: counts.borrowed },
                  { value: 'late', label: 'Terlambat', count: counts.late },
                ] as { value: Scope; label: string; count: number | null }[]
              ).map((opt) => {
                const active = scope === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setScope(opt.value)}
                    aria-pressed={active}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[11px] font-extrabold uppercase tracking-wider transition-colors cursor-pointer ${
                      active
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-blue-700 hover:bg-white'
                    }`}
                  >
                    {opt.label}
                    <span
                      className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${
                        active ? 'bg-blue-500 text-white' : 'bg-white text-blue-600'
                      }`}
                    >
                      {opt.count === null ? '–' : opt.count.toLocaleString('id-ID')}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Kotak pencarian */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-600 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari nama, NIS, kamar, judul, atau kode buku..."
                aria-label="Cari peminjam"
                className="block w-full pl-9 pr-9 py-2.5 text-base sm:text-sm bg-blue-50 border border-blue-100 rounded-xl text-slate-900 placeholder-slate-500 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition-colors"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Hapus pencarian"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-700 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Judul kolom (desktop) */}
          <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-2.5 bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-wider">
            <span className="col-span-5">Peminjam</span>
            <span className="col-span-4">Buku</span>
            <span className="col-span-3 text-right">Status</span>
          </div>

          {/* Isi daftar */}
          <div className="divide-y divide-slate-200" aria-busy={loading}>
            {loading ? (
              <>
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
              </>
            ) : error ? (
              <div role="alert" className="px-5 py-12 flex flex-col items-center text-center gap-3">
                <div className={`w-12 h-12 ${BADGE} rounded-xl flex items-center justify-center`}>
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900">Gagal memuat data</p>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">{error}</p>
                </div>
                <button
                  type="button"
                  onClick={refresh}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider transition-colors active:scale-95 cursor-pointer"
                >
                  Coba Lagi
                </button>
              </div>
            ) : rows.length === 0 ? (
              <div className="px-5 py-12 flex flex-col items-center text-center gap-3">
                <div className={`w-12 h-12 ${BADGE} rounded-xl flex items-center justify-center`}>
                  {hasSearch ? <Inbox className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900">
                    {hasSearch
                      ? 'Tidak ada data yang cocok'
                      : scope === 'late'
                      ? 'Tidak ada keterlambatan'
                      : 'Tidak ada peminjam aktif'}
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    {hasSearch
                      ? 'Coba ubah kata kunci pencarian.'
                      : scope === 'late'
                      ? 'Semua buku yang dipinjam masih dalam batas waktu atau sudah dikembalikan.'
                      : 'Semua buku sudah dikembalikan.'}
                  </p>
                </div>
              </div>
            ) : (
              rows.map((loan) => (
                <div
                  key={loan.id}
                  className="px-5 py-3 grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 md:items-center hover:bg-blue-50 transition-colors"
                >
                  {/* Peminjam: klik nama untuk detail */}
                  <div className="md:col-span-5 flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 text-white text-[11px] font-black flex items-center justify-center shrink-0">
                      {initials(loan.nama)}
                    </div>
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => setSelected(loan)}
                        title="Lihat detail"
                        className="block max-w-full text-left text-xs font-black text-slate-900 hover:text-blue-700 hover:underline underline-offset-2 truncate cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
                      >
                        {loan.nama}
                      </button>
                      <span className="text-[11px] text-slate-500 font-medium block truncate">
                        Kamar {loan.kamar}
                      </span>
                    </div>
                  </div>

                  {/* Buku */}
                  <div className="md:col-span-4 flex items-center gap-2 min-w-0">
                    <BookMarked className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span className="text-[11px] font-bold text-slate-800 truncate">
                      {loan.judul}
                    </span>
                  </div>

                  {/* Status */}
                  <div className="md:col-span-3 flex md:justify-end">
                    <StatusBadge loan={loan} />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Muat lebih banyak */}
          {!loading && !error && rows.length > 0 && (
            <div className="px-5 py-4 flex flex-col items-center gap-2.5 border-t border-slate-200 bg-slate-50">
              <span className="text-[11px] text-slate-500 font-medium">
                Menampilkan {rows.length.toLocaleString('id-ID')} dari {total.toLocaleString('id-ID')}
              </span>

              {moreError && (
                <span role="alert" className="text-[11px] text-red-600 font-medium">
                  {moreError}
                </span>
              )}

              {hasMore && (
                <button
                  type="button"
                  onClick={() => loadPage(fetchedRaw.current)}
                  disabled={loadingMore}
                  className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 hover:border-blue-400 font-extrabold rounded-xl text-xs uppercase tracking-wider transition-colors active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loadingMore ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                  {loadingMore
                    ? 'Memuat...'
                    : `Muat Lebih Banyak (${Math.max(0, total - rows.length).toLocaleString('id-ID')} lagi)`}
                </button>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Modal detail peminjam */}
      {selected && <LoanDetailModal loan={selected} onClose={closeDetail} />}

      {/* Notifikasi salin / ekspor */}
      {notice && (
        <div
          role="status"
          className={`fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl text-xs font-bold shadow-lg border bg-white ${
            notice.type === 'ok'
              ? 'text-blue-700 border-blue-200'
              : 'text-red-600 border-red-200'
          }`}
        >
          {notice.text}
        </div>
      )}
    </div>
  );
}