'use client';

import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  Search,
  Loader2,
  Tags,
  Plus,
  Edit3,
  Trash2,
  ArrowUp,
  FileSpreadsheet,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Kategori, KategoriFormData } from './components/kategori-form-modal';

// Modal dimuat hanya saat dibutuhkan, bundle awal lebih kecil
const KategoriFormModal = dynamic(() => import('./components/kategori-form-modal'), {
  ssr: false,
});

/* ───────────────────────── Konstanta ───────────────────────── */

const TABLE = 'kategori';
const ITEMS_PER_PAGE = 40;
const EXPORT_BATCH_SIZE = 1000; // batas baris per permintaan Supabase
const KATEGORI_COLUMNS = 'id, nama_kategori, kode_awal, kode_akhir, created_at';
const SHOW_SCROLL_TOP_AFTER = 400; // px

const PAGE_CSS = `
  @keyframes dots { from { width: 0; } to { width: 1.1em; } }
  .dots { display: inline-block; overflow: hidden; vertical-align: bottom; width: 0; animation: dots 1.2s steps(4, end) infinite; }
  @media (prefers-reduced-motion: reduce) { .dots { animation: none; width: 1.1em; } }
`;

// Tombol timbul: hover/sentuh = turun seperti ditekan
const RAISED_BASE =
  'transition-[transform,box-shadow,background-color,color,border-color] duration-100 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0';

const BTN_PRIMARY = `${RAISED_BASE} text-white bg-blue-600 border border-blue-700 shadow-[0_4px_0_0_#1e40af] hover:translate-y-[3px] hover:shadow-[0_1px_0_0_#1e40af] active:translate-y-1 active:shadow-none disabled:hover:shadow-[0_4px_0_0_#1e40af]`;

const BTN_EXPORT = `${RAISED_BASE} text-white bg-emerald-600 border border-emerald-700 shadow-[0_4px_0_0_#047857] hover:translate-y-[3px] hover:shadow-[0_1px_0_0_#047857] active:translate-y-1 active:shadow-none focus-visible:ring-emerald-400 disabled:hover:shadow-[0_4px_0_0_#047857]`;

const BTN_EDIT = `${RAISED_BASE} text-blue-600 bg-white border border-blue-200 shadow-[0_2px_0_0_#bfdbfe] hover:translate-y-0.5 hover:shadow-none hover:bg-blue-600 hover:text-white hover:border-blue-700 active:translate-y-0.5 active:shadow-none`;

const BTN_DELETE = `${RAISED_BASE} text-red-500 bg-white border border-red-200 shadow-[0_2px_0_0_#fecaca] hover:translate-y-0.5 hover:shadow-none hover:bg-red-500 hover:text-white hover:border-red-600 active:translate-y-0.5 active:shadow-none`;

const dateFormatter = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

/* ───────────────────────── Helper ───────────────────────── */

// Buang karakter yang merusak sintaks filter .or() / .ilike() PostgREST
const sanitizeSearch = (value: string) =>
  value.replace(/[,()%*\\"]/g, ' ').replace(/\s+/g, ' ').trim();

function formatDate(value: string | null): string {
  if (!value) return '-';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '-' : dateFormatter.format(d);
}

// Kode Dewey ditampilkan 3 digit: 0 -> "000", 97 -> "097"
const pad3 = (n: number) => String(n).padStart(3, '0');

// Teks rentang kode: "200 – 299", atau "" jika belum diatur
function formatRange(k: Pick<Kategori, 'kode_awal' | 'kode_akhir'>, sep = '–'): string {
  if (k.kode_awal === null || k.kode_akhir === null) return '';
  return `${pad3(k.kode_awal)} ${sep} ${pad3(k.kode_akhir)}`;
}

/**
 * Jika kata kunci berupa kode klasifikasi (mis. "297" atau "297.1"),
 * ambil 3 digit utamanya untuk dicocokkan ke rentang kategori.
 */
function parseKodeSearch(term: string): number | null {
  const m = term.match(/^(\d{1,3})(?:\.\d+)?$/);
  return m ? parseInt(m[1], 10) : null;
}

/**
 * Urutan tunggal untuk daftar di layar dan ekspor Excel:
 * kode klasifikasi dari kecil ke besar, kategori tanpa rentang paling akhir.
 * Nama dan id menjaga urutan tetap stabil antar halaman.
 */
function applyOrder(query: any) {
  return query
    .order('kode_awal', { ascending: true, nullsFirst: false })
    .order('kode_akhir', { ascending: true, nullsFirst: false })
    .order('nama_kategori', { ascending: true })
    .order('id', { ascending: true });
}

/* ───────────────────────── Komponen kecil ───────────────────────── */

interface KategoriRowProps {
  kategori: Kategori;
  nomor: number;
  onEdit: (kategori: Kategori) => void;
  onDelete: (kategori: Kategori) => void;
}

const KategoriRow = memo(function KategoriRow({
  kategori,
  nomor,
  onEdit,
  onDelete,
}: KategoriRowProps) {
  const range = formatRange(kategori);

  return (
    <div
      tabIndex={0}
      role="button"
      aria-label={`Edit ${kategori.nama_kategori}`}
      onClick={() => onEdit(kategori)}
      onKeyDown={(e) => {
        // Hanya saat baris sendiri yang fokus, bukan tombol di dalamnya
        if (e.target !== e.currentTarget) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onEdit(kategori);
        }
      }}
      // content-visibility: baris di luar layar tidak dirender, scroll lebih ringan
      className="group grid grid-cols-12 gap-3 items-center px-3 py-1.5 min-h-9 cursor-pointer hover:bg-blue-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 [content-visibility:auto] [contain-intrinsic-size:auto_36px]"
    >
      <div className="col-span-1">
        <span className="inline-flex min-w-6 h-5 px-1 items-center justify-center rounded bg-blue-600 text-white text-[10px] font-bold tabular-nums leading-none">
          {nomor}
        </span>
      </div>

      <div className="col-span-5 min-w-0">
        <span className="block text-xs font-semibold text-slate-800 truncate group-hover:text-blue-700 transition-colors">
          {kategori.nama_kategori}
        </span>
      </div>

      <div className="col-span-2 min-w-0">
        {range ? (
          <span className="inline-block max-w-full px-1.5 text-[10px] leading-4 font-bold bg-blue-50 text-blue-700 border border-blue-100 rounded truncate tabular-nums align-middle">
            {range}
          </span>
        ) : (
          <span className="inline-block px-1.5 text-[10px] leading-4 font-bold bg-amber-50 text-amber-700 border border-amber-200 rounded align-middle">
            Belum diatur
          </span>
        )}
      </div>

      <div className="col-span-2 text-[11px] text-slate-500 tabular-nums">
        {formatDate(kategori.created_at)}
      </div>

      <div className="col-span-2 flex justify-end gap-2 pr-0.5">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(kategori);
          }}
          title="Edit Kategori"
          aria-label={`Edit ${kategori.nama_kategori}`}
          className={`p-1.5 rounded-md ${BTN_EDIT}`}
        >
          <Edit3 className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(kategori);
          }}
          title="Hapus Kategori"
          aria-label={`Hapus ${kategori.nama_kategori}`}
          className={`p-1.5 rounded-md ${BTN_DELETE}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
});

function SkeletonRow() {
  return (
    <div className="grid grid-cols-12 gap-3 items-center px-3 py-1.5 min-h-9 animate-pulse">
      <div className="col-span-1">
        <div className="w-7 h-5 rounded bg-blue-100" />
      </div>
      <div className="col-span-5">
        <div className="h-3 w-1/2 rounded bg-blue-100" />
      </div>
      <div className="col-span-2">
        <div className="h-4 w-20 rounded bg-blue-50" />
      </div>
      <div className="col-span-2">
        <div className="h-3 w-16 rounded bg-blue-50" />
      </div>
      <div className="col-span-2 flex justify-end gap-2">
        <div className="w-6 h-6 rounded bg-blue-50" />
        <div className="w-6 h-6 rounded bg-blue-50" />
      </div>
    </div>
  );
}

/* Tombol kembali ke atas: state hanya berubah saat melewati ambang */
const ScrollTopButton = memo(function ScrollTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let ticking = false;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setVisible(window.scrollY > SHOW_SCROLL_TOP_AFTER);
        ticking = false;
      });
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleClick = () => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Kembali ke atas"
      tabIndex={visible ? 0 : -1}
      className={`fixed bottom-6 right-6 z-40 w-10 h-10 flex items-center justify-center rounded-full ${BTN_PRIMARY} ${
        visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      <ArrowUp className="w-4 h-4 stroke-[2.5]" />
    </button>
  );
});

/* ───────────────────────── Halaman ───────────────────────── */

export default function ManajemenKategoriPage() {
  const [kategoris, setKategoris] = useState<Kategori[]>([]);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [kategoriToEdit, setKategoriToEdit] = useState<Kategori | null>(null);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef(0);
  const loadingRef = useRef(false);
  const requestIdRef = useRef(0);
  const searchRef = useRef('');
  const exportingRef = useRef(false);

  // Status "mencari" diturunkan dari state, tidak perlu state terpisah
  const isSearchingUI = searchQuery.trim() !== debouncedSearchQuery;
  const isSearching = debouncedSearchQuery !== '';

  /* Debounce pencarian */
  useEffect(() => {
    const value = searchQuery.trim();
    if (value === debouncedSearchQuery) return;

    const delay = value === '' ? 0 : 400;
    const handler = setTimeout(() => setDebouncedSearchQuery(value), delay);
    return () => clearTimeout(handler);
  }, [searchQuery, debouncedSearchQuery]);

  /* Ambil data kategori. requestId mencegah respons lama menimpa respons baru */
  const fetchKategoris = useCallback(
    async (pageNum: number, search: string, reset: boolean) => {
      const reqId = ++requestIdRef.current;
      loadingRef.current = true;
      setLoading(true);

      try {
        const from = pageNum * ITEMS_PER_PAGE;
        const to = from + ITEMS_PER_PAGE - 1;
        const term = sanitizeSearch(search);

        // Jumlah total hanya dihitung pada halaman pertama
        let query: any = applyOrder(
          supabase
            .from(TABLE)
            .select(KATEGORI_COLUMNS, pageNum === 0 ? { count: 'exact' } : undefined)
        ).range(from, to);

        if (term) {
          const filters = [`nama_kategori.ilike.%${term}%`];

          // Kata kunci berupa kode (mis. 297 atau 297.1): cocokkan ke rentang kategori
          const kode = parseKodeSearch(term);
          if (kode !== null) {
            filters.push(`and(kode_awal.lte.${kode},kode_akhir.gte.${kode})`);
          }

          query = query.or(filters.join(','));
        }

        const { data, error, count } = await query;
        if (error) throw error;
        if (reqId !== requestIdRef.current) return;

        const mapped = (data ?? []) as Kategori[];

        pageRef.current = pageNum;
        setKategoris((prev) => (reset ? mapped : [...prev, ...mapped]));
        if (pageNum === 0) setTotalCount(count ?? mapped.length);
        setHasMore(mapped.length === ITEMS_PER_PAGE);
      } catch (err) {
        console.error('Gagal mengambil data kategori:', err);
        if (reqId === requestIdRef.current) setHasMore(false);
      } finally {
        if (reqId === requestIdRef.current) {
          loadingRef.current = false;
          setLoading(false);
        }
      }
    },
    []
  );

  /* Muat ulang saat pencarian berubah */
  useEffect(() => {
    searchRef.current = debouncedSearchQuery;
    pageRef.current = 0;
    setHasMore(true);
    fetchKategoris(0, debouncedSearchQuery, true);
  }, [debouncedSearchQuery, fetchKategoris]);

  /* Infinite scroll: satu observer pada elemen sentinel di bawah daftar */
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !loadingRef.current) {
          fetchKategoris(pageRef.current + 1, searchRef.current, false);
        }
      },
      { rootMargin: '400px' }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, kategoris.length, fetchKategoris]);

  /* ───────────── Ekspor Excel ───────────── */

  // Ambil SEMUA kategori (bukan hanya yang sudah termuat di layar), per batch
  const fetchAllForExport = useCallback(async (): Promise<Kategori[]> => {
    const all: Kategori[] = [];

    for (let from = 0; ; from += EXPORT_BATCH_SIZE) {
      const { data, error } = await applyOrder(
        supabase.from(TABLE).select(KATEGORI_COLUMNS)
      ).range(from, from + EXPORT_BATCH_SIZE - 1);

      if (error) throw error;

      const rows = (data ?? []) as Kategori[];
      all.push(...rows);
      if (rows.length < EXPORT_BATCH_SIZE) break;
    }

    return all;
  }, []);

  const handleExport = useCallback(async () => {
    if (exportingRef.current) return;
    exportingRef.current = true;
    setExporting(true);

    try {
      const [rows, excelModule] = await Promise.all([
        fetchAllForExport(),
        import('exceljs'),
      ]);
      const ExcelJS: any = (excelModule as any).default ?? excelModule;

      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Perpustakaan';
      workbook.created = new Date();

      const sheet = workbook.addWorksheet('Kategori', {
        views: [{ state: 'frozen', ySplit: 1 }],
      });

      sheet.columns = [
        { header: 'No', key: 'no', width: 6 },
        { header: 'Nama Kategori', key: 'nama', width: 42 },
        { header: 'Kode Klasifikasi', key: 'kode', width: 20 },
      ];

      rows.forEach((k, i) => {
        sheet.addRow({
          no: i + 1,
          nama: k.nama_kategori,
          kode: formatRange(k, '-') || '-',
        });
      });

      // Gaya: judul kolom biru tebal, semua sel berbingkai tipis
      const border = {
        top: { style: 'thin', color: { argb: 'FFBFDBFE' } },
        left: { style: 'thin', color: { argb: 'FFBFDBFE' } },
        bottom: { style: 'thin', color: { argb: 'FFBFDBFE' } },
        right: { style: 'thin', color: { argb: 'FFBFDBFE' } },
      };

      sheet.eachRow((row: any, rowNumber: number) => {
        row.eachCell((cell: any, colNumber: number) => {
          cell.border = border;
          cell.alignment = {
            vertical: 'middle',
            horizontal: rowNumber === 1 || colNumber !== 2 ? 'center' : 'left',
          };
          if (rowNumber === 1) {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FF2563EB' },
            };
          }
        });
      });
      sheet.getRow(1).height = 22;
      sheet.autoFilter = 'A1:C1';

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const today = new Date();
      const stamp = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kategori-perpustakaan-${stamp}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error('Gagal mengekspor kategori:', err);
      alert('Gagal mengekspor data kategori ke Excel.');
    } finally {
      exportingRef.current = false;
      setExporting(false);
    }
  }, [fetchAllForExport]);

  /* ───────────── Handler (stabil agar KategoriRow tidak render ulang) ───────────── */

  const handleAdd = useCallback(() => {
    setKategoriToEdit(null);
    setIsFormOpen(true);
  }, []);

  const handleEdit = useCallback((kategori: Kategori) => {
    setKategoriToEdit(kategori);
    setIsFormOpen(true);
  }, []);

  const handleCloseForm = useCallback(() => setIsFormOpen(false), []);

  const handleDelete = useCallback(async (kategori: Kategori) => {
    if (
      !confirm(
        `Hapus kategori "${kategori.nama_kategori}"? Tindakan ini tidak dapat dibatalkan.`
      )
    ) {
      return;
    }

    try {
      const { error } = await supabase.from(TABLE).delete().eq('id', kategori.id);
      if (error) throw error;

      setKategoris((prev) => prev.filter((k) => k.id !== kategori.id));
      setTotalCount((c) => (c === null ? c : Math.max(0, c - 1)));
    } catch (err: any) {
      console.error('Gagal menghapus kategori:', err);
      alert(
        err?.code === '23503'
          ? 'Kategori ini masih terhubung dengan data lain sehingga tidak bisa dihapus.'
          : 'Gagal menghapus data kategori dari database.'
      );
    }
  }, []);

  // Error dilempar kembali agar modal menampilkannya di dalam form
  const handleFormSubmit = async (formData: KategoriFormData) => {
    try {
      if (kategoriToEdit) {
        const { error } = await supabase
          .from(TABLE)
          .update(formData)
          .eq('id', kategoriToEdit.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(TABLE).insert([formData]);
        if (error) throw error;
      }
    } catch (err: any) {
      console.error('Gagal menyimpan data kategori:', err);
      throw new Error(
        err?.code === '23505'
          ? 'Nama kategori sudah dipakai kategori lain.'
          : err?.code === '23P01'
            ? 'Rentang kode klasifikasi bertabrakan dengan kategori lain.'
            : err?.code === '23514'
              ? 'Rentang kode klasifikasi tidak valid (harus 000 sampai 999, "Dari" tidak lebih besar dari "Sampai").'
              : 'Terjadi kesalahan saat menyimpan data kategori.'
      );
    }

    // Muat ulang dari awal: nama atau kode yang berubah memengaruhi posisi di daftar
    pageRef.current = 0;
    setHasMore(true);
    fetchKategoris(0, searchRef.current, true);
  };

  const showSkeleton = loading && kategoris.length === 0;
  const showEmpty = !loading && kategoris.length === 0;

  return (
    // Tanpa background: bg.png dari layout.tsx langsung terlihat
    <main className="min-h-screen text-slate-800">
      <style>{PAGE_CSS}</style>

      <div className="px-12 pt-5 pb-24">
        <div className="w-full max-w-6xl mx-auto space-y-3">
          {/* Header: panel putih solid agar teks terbaca di atas gambar */}
          <div className="bg-white border border-blue-100 rounded-xl px-4 py-3 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base font-black uppercase tracking-tight text-slate-900">
                  Manajemen Kategori
                </h1>
                {totalCount !== null && (
                  <span className="px-1.5 py-0.5 text-[10px] font-black text-blue-600 bg-blue-50 border border-blue-200 rounded tabular-nums">
                    {totalCount.toLocaleString('id-ID')} kategori
                  </span>
                )}
              </div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">
                Kelola kategori buku beserta rentang kode klasifikasinya.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={handleExport}
                disabled={exporting || totalCount === 0}
                className={`inline-flex items-center justify-center gap-1.5 h-9 px-4 mb-1 text-[11px] font-extrabold uppercase tracking-wider rounded-lg ${BTN_EXPORT}`}
              >
                {exporting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                )}
                {exporting ? 'Mengekspor...' : 'Ekspor Excel'}
              </button>

              <button
                type="button"
                onClick={handleAdd}
                className={`inline-flex items-center justify-center gap-1.5 h-9 px-4 mb-1 text-[11px] font-extrabold uppercase tracking-wider rounded-lg ${BTN_PRIMARY}`}
              >
                <Plus className="h-3.5 w-3.5 stroke-[3]" />
                Tambah Kategori
              </button>
            </div>
          </div>

          {/* Pencarian: bagian dari alur halaman, ikut ter-scroll */}
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 h-4 w-4 text-blue-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari berdasarkan nama kategori atau kode klasifikasi (contoh: 297)..."
              aria-label="Cari kategori"
              className="w-full h-9 pl-10 pr-28 text-xs font-medium bg-white border border-blue-100 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-colors"
            />
            {isSearchingUI && (
              <span className="absolute right-3.5 text-[11px] font-semibold text-blue-600 select-none pointer-events-none">
                mencari<span className="dots">...</span>
              </span>
            )}
          </div>

          {showEmpty && (
            <div className="mx-auto max-w-md bg-white border border-blue-100 rounded-xl py-8 px-6 flex flex-col items-center text-center">
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-full text-blue-400 mb-3">
                <Tags className="h-8 w-8 stroke-[1.5]" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 mb-1">
                {isSearching ? 'Kategori Tidak Ditemukan' : 'Belum Ada Kategori'}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                {isSearching
                  ? 'Tidak ditemukan kategori yang cocok dengan nama atau kode klasifikasi tersebut.'
                  : 'Klik "Tambah Kategori" untuk menambahkan kategori pertama.'}
              </p>
            </div>
          )}

          {(kategoris.length > 0 || showSkeleton) && (
            <div className="bg-white border border-blue-100 rounded-xl overflow-hidden">
              {/* Judul kolom */}
              <div className="grid grid-cols-12 gap-3 px-3 py-1.5 bg-slate-50 border-b border-blue-100 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                <span className="col-span-1">No</span>
                <span className="col-span-5">Nama Kategori</span>
                <span className="col-span-2">Kode Klasifikasi</span>
                <span className="col-span-2">Dibuat</span>
                <span className="col-span-2 text-right">Aksi</span>
              </div>

              <div className="divide-y divide-blue-50" aria-busy={loading}>
                {showSkeleton
                  ? Array.from({ length: 10 }, (_, i) => <SkeletonRow key={i} />)
                  : kategoris.map((kategori, i) => (
                      <KategoriRow
                        key={kategori.id}
                        kategori={kategori}
                        nomor={i + 1}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                      />
                    ))}
              </div>
            </div>
          )}

          {/* Sentinel infinite scroll */}
          <div ref={sentinelRef} className="h-px" aria-hidden="true" />

          {loading && kategoris.length > 0 && (
            <div className="w-full flex justify-center py-1">
              <div className="bg-white border border-blue-100 rounded-full p-1.5">
                <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
              </div>
            </div>
          )}
        </div>
      </div>

      <ScrollTopButton />

      {isFormOpen && (
        <KategoriFormModal
          isOpen
          kategoriToEdit={kategoriToEdit}
          onClose={handleCloseForm}
          onSubmit={handleFormSubmit}
        />
      )}
    </main>
  );
}