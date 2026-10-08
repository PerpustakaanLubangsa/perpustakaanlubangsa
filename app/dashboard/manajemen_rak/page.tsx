'use client';

import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Search, Loader2, Library, Plus, Edit3, Trash2, ArrowUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Rak, RakFormData } from './components/rak-form-modal';
import { BTN_DELETE, BTN_EDIT, BTN_PRIMARY } from '@/app/dashboard/bibliografi/components/raised-buttons'; // ← sesuaikan path

// Modal dimuat hanya saat dibutuhkan, bundle awal lebih kecil
const RakFormModal = dynamic(() => import('./components/rak-form-modal'), {
  ssr: false,
});

/* ───────────────────────── Konstanta ───────────────────────── */

const TABLE = 'data_rak';
const ITEMS_PER_PAGE = 40;
const RAK_COLUMNS =
  'id, nama_rak, kategori_id, kode_awal, huruf_awal, kode_akhir, huruf_akhir, created_at, kategori:kategori_id ( nama_kategori )';
const SHOW_SCROLL_TOP_AFTER = 400; // px

const PAGE_CSS = `
  @keyframes dots { from { width: 0; } to { width: 1.1em; } }
  .dots { display: inline-block; overflow: hidden; vertical-align: bottom; width: 0; animation: dots 1.2s steps(4, end) infinite; }
  @media (prefers-reduced-motion: reduce) { .dots { animation: none; width: 1.1em; } }
`;

const dateFormatter = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

/* ───────────────────────── Helper ───────────────────────── */

// Buang karakter yang merusak sintaks filter .or() PostgREST
const sanitizeSearch = (value: string) =>
  value.replace(/[,()%*\\"]/g, ' ').replace(/\s+/g, ' ').trim();

function formatDate(value: string | null): string {
  if (!value) return '-';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '-' : dateFormatter.format(d);
}

const kategoriNama = (rak: Rak): string => {
  const k = Array.isArray(rak.kategori) ? rak.kategori[0] : rak.kategori;
  return k?.nama_kategori ?? '';
};

const gabung = (kode: string | null, huruf: string | null) =>
  [kode, huruf].filter(Boolean).join(' ');

// Contoh hasil: "001 – 005.1092", "813 A – 813 F", "813 A"
function formatKlasifikasi(rak: Rak): string {
  const awal = gabung(rak.kode_awal, rak.huruf_awal);
  const akhir = gabung(rak.kode_akhir, rak.huruf_akhir);
  if (!awal && !akhir) return '';
  if (!akhir || awal === akhir) return awal;
  if (!awal) return akhir;
  return `${awal} – ${akhir}`;
}

/* ───────────────────────── Komponen kecil ───────────────────────── */

interface RakRowProps {
  rak: Rak;
  onEdit: (rak: Rak) => void;
  onDelete: (rak: Rak) => void;
}

const RakRow = memo(function RakRow({ rak, onEdit, onDelete }: RakRowProps) {
  const kategori = kategoriNama(rak);
  const klasifikasi = formatKlasifikasi(rak);

  return (
    <div
      tabIndex={0}
      role="button"
      aria-label={`Edit ${rak.nama_rak}`}
      onClick={() => onEdit(rak)}
      onKeyDown={(e) => {
        // Hanya saat baris sendiri yang fokus, bukan tombol di dalamnya
        if (e.target !== e.currentTarget) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onEdit(rak);
        }
      }}
      // content-visibility: baris di luar layar tidak dirender, scroll lebih ringan
      className="group grid grid-cols-12 gap-3 items-center px-3 py-1.5 min-h-9 cursor-pointer hover:bg-blue-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 [content-visibility:auto] [contain-intrinsic-size:auto_36px]"
    >
      <div className="col-span-2 min-w-0">
        <span className="block text-xs font-bold text-slate-800 truncate group-hover:text-blue-700 transition-colors">
          {rak.nama_rak}
        </span>
      </div>

      <div className="col-span-3 min-w-0">
        {kategori ? (
          <span className="block text-xs font-medium text-slate-600 truncate" title={kategori}>
            {kategori}
          </span>
        ) : (
          <span className="text-[11px] text-slate-400">-</span>
        )}
      </div>

      <div className="col-span-4 min-w-0">
        {klasifikasi ? (
          <span
            title={klasifikasi}
            className="inline-block max-w-full px-1.5 text-[10px] leading-4 font-bold bg-blue-50 text-blue-700 border border-blue-100 rounded truncate tabular-nums align-middle"
          >
            {klasifikasi}
          </span>
        ) : (
          <span className="text-[11px] text-slate-400">-</span>
        )}
      </div>

      <div className="col-span-2 text-[11px] text-slate-500 tabular-nums">
        {formatDate(rak.created_at)}
      </div>

      <div className="col-span-1 flex justify-end gap-1.5">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(rak);
          }}
          title="Edit Rak"
          aria-label={`Edit ${rak.nama_rak}`}
          className={`p-1.5 rounded-md ${BTN_EDIT}`}
        >
          <Edit3 className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(rak);
          }}
          title="Hapus Rak"
          aria-label={`Hapus ${rak.nama_rak}`}
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
      <div className="col-span-2">
        <div className="h-3 w-12 rounded bg-blue-100" />
      </div>
      <div className="col-span-3">
        <div className="h-3 w-2/3 rounded bg-blue-100" />
      </div>
      <div className="col-span-4">
        <div className="h-4 w-24 rounded bg-blue-50" />
      </div>
      <div className="col-span-2">
        <div className="h-3 w-16 rounded bg-blue-50" />
      </div>
      <div className="col-span-1 flex justify-end gap-1.5">
        <div className="w-6 h-6 rounded-md bg-blue-50" />
        <div className="w-6 h-6 rounded-md bg-blue-50" />
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

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Kembali ke atas"
      className={`fixed bottom-6 right-6 z-40 w-10 h-10 flex items-center justify-center rounded-full ${BTN_PRIMARY}`}
    >
      <ArrowUp className="w-4 h-4 stroke-[2.5]" />
    </button>
  );
});

/* ───────────────────────── Halaman ───────────────────────── */

export default function ManajemenRakPage() {
  const [raks, setRaks] = useState<Rak[]>([]);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [rakToEdit, setRakToEdit] = useState<Rak | null>(null);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef(0);
  const loadingRef = useRef(false);
  const requestIdRef = useRef(0);
  const searchRef = useRef('');

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

  /* Ambil data rak. requestId mencegah respons lama menimpa respons baru */
  const fetchRaks = useCallback(async (pageNum: number, search: string, reset: boolean) => {
    const reqId = ++requestIdRef.current;
    loadingRef.current = true;
    setLoading(true);

    try {
      const from = pageNum * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      const term = sanitizeSearch(search);

      // Jumlah total hanya dihitung pada halaman pertama.
      // Urutan: nama rak (A 01, A 02, B 05, ...), lalu id agar urutan stabil.
      let query: any = supabase
        .from(TABLE)
        .select(RAK_COLUMNS, pageNum === 0 ? { count: 'exact' } : undefined)
        .order('nama_rak', { ascending: true })
        .order('id', { ascending: true })
        .range(from, to);

      if (term) {
        const filters = [
          `nama_rak.ilike.%${term}%`,
          `kode_awal.ilike.%${term}%`,
          `huruf_awal.ilike.%${term}%`,
          `kode_akhir.ilike.%${term}%`,
          `huruf_akhir.ilike.%${term}%`,
        ];

        // Nama kategori ada di tabel lain: cari id kategori yang cocok, lalu cocokkan kategori_id
        const { data: kat } = await supabase
          .from('kategori')
          .select('id')
          .ilike('nama_kategori', `%${term}%`);
        const ids = (kat ?? []).map((k: { id: number }) => k.id);
        if (ids.length > 0) filters.push(`kategori_id.in.(${ids.join(',')})`);

        query = query.or(filters.join(','));
      }

      const { data, error, count } = await query;
      if (error) throw error;
      if (reqId !== requestIdRef.current) return;

      const mapped = (data ?? []) as Rak[];

      pageRef.current = pageNum;
      setRaks((prev) => (reset ? mapped : [...prev, ...mapped]));
      if (pageNum === 0) setTotalCount(count ?? mapped.length);
      setHasMore(mapped.length === ITEMS_PER_PAGE);
    } catch (err) {
      console.error('Gagal mengambil data rak:', err);
      if (reqId === requestIdRef.current) setHasMore(false);
    } finally {
      if (reqId === requestIdRef.current) {
        loadingRef.current = false;
        setLoading(false);
      }
    }
  }, []);

  /* Muat ulang saat pencarian berubah */
  useEffect(() => {
    searchRef.current = debouncedSearchQuery;
    pageRef.current = 0;
    setHasMore(true);
    fetchRaks(0, debouncedSearchQuery, true);
  }, [debouncedSearchQuery, fetchRaks]);

  /* Infinite scroll: satu observer pada elemen sentinel di bawah daftar */
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !loadingRef.current) {
          fetchRaks(pageRef.current + 1, searchRef.current, false);
        }
      },
      { rootMargin: '400px' }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, raks.length, fetchRaks]);

  /* ───────────── Handler (stabil agar RakRow tidak render ulang) ───────────── */

  const handleAddRak = useCallback(() => {
    setRakToEdit(null);
    setIsFormOpen(true);
  }, []);

  const handleEditRak = useCallback((rak: Rak) => {
    setRakToEdit(rak);
    setIsFormOpen(true);
  }, []);

  const handleCloseForm = useCallback(() => setIsFormOpen(false), []);

  const handleDeleteRak = useCallback(async (rak: Rak) => {
    // Cek berapa eksemplar yang tercatat di rak ini agar penghapusan tidak membuta
    let usage = 0;
    const { count, error: usageError } = await supabase
      .from('eksemplar')
      .select('id', { count: 'exact', head: true })
      .eq('lokasi_rak', rak.nama_rak);
    if (!usageError) usage = count ?? 0;

    const warning =
      usage > 0
        ? `\n\nPerhatian: ${usage.toLocaleString('id-ID')} eksemplar masih tercatat di rak ini. Data eksemplar tidak ikut diubah.`
        : '';

    if (!confirm(`Hapus rak "${rak.nama_rak}"? Tindakan ini tidak dapat dibatalkan.${warning}`)) return;

    try {
      const { error } = await supabase.from(TABLE).delete().eq('id', rak.id);
      if (error) throw error;

      setRaks((prev) => prev.filter((r) => r.id !== rak.id));
      setTotalCount((c) => (c === null ? c : Math.max(0, c - 1)));
    } catch (err: any) {
      console.error('Gagal menghapus rak:', err);
      alert(
        err?.code === '23503'
          ? 'Rak ini masih terhubung dengan data lain sehingga tidak bisa dihapus.'
          : 'Gagal menghapus data rak dari database.'
      );
    }
  }, []);

  // Error dilempar kembali agar modal menampilkannya di dalam form
  const handleFormSubmit = async (formData: RakFormData) => {
    try {
      if (rakToEdit) {
        const { error } = await supabase.from(TABLE).update(formData).eq('id', rakToEdit.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(TABLE).insert([formData]);
        if (error) throw error;
      }
    } catch (err: any) {
      console.error('Gagal menyimpan data rak:', err);
      throw new Error(
        err?.code === '23505'
          ? 'Nama rak sudah dipakai rak lain.'
          : err?.code === '23514'
            ? 'Kode dan huruf klasifikasi harus diisi berpasangan (awal dan akhir).'
            : err?.code === '23503'
              ? 'Kategori yang dipilih tidak ditemukan.'
              : 'Terjadi kesalahan saat menyimpan data rak.'
      );
    }

    // Muat ulang dari awal: perubahan nama rak memengaruhi posisi rak di daftar
    pageRef.current = 0;
    setHasMore(true);
    fetchRaks(0, searchRef.current, true);
  };

  const showSkeleton = loading && raks.length === 0;
  const showEmpty = !loading && raks.length === 0;

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
                  Manajemen Rak
                </h1>
                {totalCount !== null && (
                  <span className="px-1.5 py-0.5 text-[10px] font-black text-blue-600 bg-blue-50 border border-blue-200 rounded tabular-nums">
                    {totalCount.toLocaleString('id-ID')} rak
                  </span>
                )}
              </div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">
                Kelola daftar rak, kategori, dan rentang klasifikasi buku perpustakaan.
              </p>
            </div>

            <button
              type="button"
              onClick={handleAddRak}
              className={`inline-flex items-center justify-center gap-1.5 h-9 px-4 shrink-0 text-[11px] font-extrabold uppercase tracking-wider rounded-lg ${BTN_PRIMARY}`}
            >
              <Plus className="h-3.5 w-3.5 stroke-[3]" />
              Tambah Rak
            </button>
          </div>

          {/* Pencarian: bagian dari alur halaman, ikut ter-scroll */}
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 h-4 w-4 text-blue-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari rak berdasarkan nama, kategori, atau kode klasifikasi..."
              aria-label="Cari rak"
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
                <Library className="h-8 w-8 stroke-[1.5]" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 mb-1">
                {isSearching ? 'Rak Tidak Ditemukan' : 'Belum Ada Rak'}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                {isSearching
                  ? 'Tidak ditemukan rak yang cocok dengan pencarian Anda.'
                  : 'Klik "Tambah Rak" untuk menambahkan rak pertama.'}
              </p>
            </div>
          )}

          {(raks.length > 0 || showSkeleton) && (
            <div className="bg-white border border-blue-100 rounded-xl overflow-hidden">
              {/* Judul kolom */}
              <div className="grid grid-cols-12 gap-3 px-3 py-1.5 bg-slate-50 border-b border-blue-100 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                <span className="col-span-2">Nama Rak</span>
                <span className="col-span-3">Kategori</span>
                <span className="col-span-4">Klasifikasi (Dari – Hingga)</span>
                <span className="col-span-2">Dibuat</span>
                <span className="col-span-1 text-right">Aksi</span>
              </div>

              <div className="divide-y divide-blue-50" aria-busy={loading}>
                {showSkeleton
                  ? Array.from({ length: 10 }, (_, i) => <SkeletonRow key={i} />)
                  : raks.map((rak) => (
                      <RakRow key={rak.id} rak={rak} onEdit={handleEditRak} onDelete={handleDeleteRak} />
                    ))}
              </div>
            </div>
          )}

          {/* Sentinel infinite scroll */}
          <div ref={sentinelRef} className="h-px" aria-hidden="true" />

          {loading && raks.length > 0 && (
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
        <RakFormModal
          isOpen
          rakToEdit={rakToEdit}
          onClose={handleCloseForm}
          onSubmit={handleFormSubmit}
        />
      )}
    </main>
  );
}