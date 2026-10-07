'use client';

import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  Search,
  Loader2,
  BookX,
  Image as ImageIcon,
  Plus,
  Edit3,
  Trash2,
  ArrowUp,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

// Modal dimuat hanya saat dibutuhkan, bundle awal lebih kecil
const BookDetailModal = dynamic(() => import('@/app/components/book-detail-modal'), {
  ssr: false,
});
const BookFormModal = dynamic(() => import('./components/book-form-modal'), {
  ssr: false,
});

/* ───────────────────────── Types & konstanta ───────────────────────── */

interface Book {
  id: string;
  judul: string;
  penulis: string;
  isbn_issn: string;
  penerbit: string;
  tahun_terbit: string;
  deskripsi_fisik: string;
  sampul_url: string;
  abstrak: string;
  kategori: string;
  topik: string[];
  created_at: string;
  updated_at: string;
  jumlah_baca: number;
  jumlah_pinjam: number;
}

interface Eksemplar {
  id?: string;
  biblio_id?: string;
  nomor_panggil: string;
  lokasi_rak: string;
  status: string;
  status_audit: string;
  kode: string;
  created_at?: string;
}

type BookFormData = Omit<Book, 'id' | 'created_at' | 'updated_at' | 'jumlah_baca' | 'jumlah_pinjam'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
  jumlah_baca?: number;
  jumlah_pinjam?: number;
};

const ITEMS_PER_PAGE = 24; // kelipatan 4 agar baris terakhir selalu penuh
const BOOK_COLUMNS =
  'id, judul, penulis, isbn_issn, penerbit, tahun_terbit, deskripsi_fisik, sampul_url, abstrak, kategori, topik, created_at, updated_at, jumlah_baca, jumlah_pinjam';
const SHOW_SCROLL_TOP_AFTER = 400; // px

const PAGE_CSS = `
  @keyframes dots { from { width: 0; } to { width: 1.1em; } }
  .dots { display: inline-block; overflow: hidden; vertical-align: bottom; width: 0; animation: dots 1.2s steps(4, end) infinite; }
  @media (prefers-reduced-motion: reduce) { .dots { animation: none; width: 1.1em; } }
`;

/* ───────────────────────── Helper ───────────────────────── */

// Buang karakter yang merusak sintaks filter .or() PostgREST
const sanitizeSearch = (value: string) =>
  value.replace(/[,()%*\\"]/g, ' ').replace(/\s+/g, ' ').trim();

const normalizeBook = (b: any): Book => ({
  ...b,
  topik: Array.isArray(b.topik) ? b.topik : [],
  created_at: b.created_at || '',
  updated_at: b.updated_at || '',
  jumlah_baca: b.jumlah_baca ?? 0,
  jumlah_pinjam: b.jumlah_pinjam ?? 0,
});

/* ───────────────────────── Komponen kecil ───────────────────────── */

const CoverImage = memo(function CoverImage({ src, alt }: { src: string; alt: string }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  // Tangani gambar yang sudah ada di cache sebelum onLoad terpasang
  const setRef = useCallback((img: HTMLImageElement | null) => {
    if (img && img.complete && img.naturalWidth > 0) setLoaded(true);
  }, []);

  return (
    <div className="w-full h-full bg-blue-50 relative overflow-hidden flex items-center justify-center">
      {(!loaded || failed) && (
        <div className="absolute inset-0 flex items-center justify-center text-blue-200">
          <ImageIcon className="h-8 w-8 stroke-[1.2]" />
        </div>
      )}
      {!failed && (
        <img
          ref={setRef}
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            loaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}
    </div>
  );
});

interface BookCardProps {
  book: Book;
  onSelect: (book: Book) => void;
  onEdit: (book: Book) => void;
  onDelete: (id: string) => void;
}

const BookCard = memo(function BookCard({ book, onSelect, onEdit, onDelete }: BookCardProps) {
  return (
    <div
      tabIndex={0}
      onClick={() => onSelect(book)}
      onKeyDown={(e) => {
        // Hanya saat kartu sendiri yang fokus, bukan tombol di dalamnya
        if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onSelect(book);
        }
      }}
      // content-visibility: kartu di luar layar tidak dirender, scroll lebih ringan
      className="group flex flex-col cursor-pointer bg-white border border-blue-100 rounded-2xl p-2 transition-[transform,border-color] duration-200 hover:-translate-y-1 hover:border-blue-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 [content-visibility:auto] [contain-intrinsic-size:auto_400px]"
    >
      <div className="relative aspect-[3/4] overflow-hidden rounded-xl border border-blue-100">
        {book.sampul_url ? (
          <CoverImage src={book.sampul_url} alt={book.judul} />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-blue-300 bg-blue-50">
            Tanpa Sampul
          </div>
        )}

        {/* Tombol aksi: solid, muncul saat hover atau fokus keyboard */}
        <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(book);
            }}
            title="Edit Data"
            aria-label={`Edit ${book.judul}`}
            className="p-2 bg-white text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <Edit3 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(book.id);
            }}
            title="Hapus Buku"
            aria-label={`Hapus ${book.judul}`}
            className="p-2 bg-white text-red-500 border border-red-200 rounded-lg hover:bg-red-500 hover:text-white hover:border-red-500 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="pt-3 pb-1 px-1 flex flex-col flex-grow justify-between">
        <div>
          <span className="inline-block px-1.5 py-0.5 mb-1.5 text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100 rounded">
            {book.kategori || 'Umum'}
          </span>
          <h2 className="text-sm font-bold text-slate-800 line-clamp-2 leading-snug group-hover:text-blue-700 transition-colors">
            {book.judul}
          </h2>
        </div>
        <div className="mt-1 flex items-center justify-between gap-2">
          <p className="text-xs text-slate-500 truncate">{book.penulis || 'Anonim'}</p>
          <p className="text-[10px] text-slate-400 font-bold tabular-nums shrink-0">
            {book.tahun_terbit || '-'}
          </p>
        </div>
      </div>
    </div>
  );
});

function SkeletonCard() {
  return (
    <div className="flex flex-col bg-white border border-blue-100 rounded-2xl p-2 animate-pulse">
      <div className="aspect-[3/4] rounded-xl bg-blue-100" />
      <div className="pt-3 pb-1 space-y-2 px-1">
        <div className="h-3 w-16 rounded bg-blue-100" />
        <div className="h-4 w-full rounded bg-blue-100" />
        <div className="h-3 w-24 rounded bg-blue-100" />
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
      className={`fixed bottom-6 right-6 z-40 w-11 h-11 flex items-center justify-center rounded-full bg-blue-600 hover:bg-blue-700 text-white border border-blue-700 transition-[opacity,transform,background-color] duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 pointer-events-none'
      }`}
    >
      <ArrowUp className="w-5 h-5 stroke-[2.5]" />
    </button>
  );
});

/* ───────────────────────── Halaman ───────────────────────── */

export default function BibliografiEditPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);

  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [bookToEdit, setBookToEdit] = useState<Book | null>(null);
  const [eksemplarList, setEksemplarList] = useState<Eksemplar[]>([]);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef(0);
  const loadingRef = useRef(false);
  const requestIdRef = useRef(0);
  const eksemplarReqRef = useRef(0);
  const searchRef = useRef('');

  // Status "mencari" diturunkan dari state, tidak perlu state terpisah
  const isSearchingUI = searchQuery.trim() !== debouncedSearchQuery;

  /* Debounce pencarian */
  useEffect(() => {
    const value = searchQuery.trim();
    if (value === debouncedSearchQuery) return;

    const delay = value === '' ? 0 : 400;
    const handler = setTimeout(() => setDebouncedSearchQuery(value), delay);
    return () => clearTimeout(handler);
  }, [searchQuery, debouncedSearchQuery]);

  /* Ambil data buku. requestId mencegah respons lama menimpa respons baru */
  const fetchBooks = useCallback(async (pageNum: number, search: string, reset: boolean) => {
    const reqId = ++requestIdRef.current;
    loadingRef.current = true;
    setLoading(true);

    try {
      const from = pageNum * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      const term = sanitizeSearch(search);

      let query = supabase
        .from('biblio')
        .select(BOOK_COLUMNS)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (term) {
        query = query.or(
          `judul.ilike.%${term}%,penulis.ilike.%${term}%,kategori.ilike.%${term}%,isbn_issn.ilike.%${term}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      if (reqId !== requestIdRef.current) return;

      const mapped = (data ?? []).map(normalizeBook);

      pageRef.current = pageNum;
      setBooks((prev) => (reset ? mapped : [...prev, ...mapped]));
      setHasMore(mapped.length === ITEMS_PER_PAGE);
    } catch (err) {
      console.error('Gagal mengambil data biblio:', err);
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
    fetchBooks(0, debouncedSearchQuery, true);
  }, [debouncedSearchQuery, fetchBooks]);

  /* Infinite scroll: satu observer pada elemen sentinel di bawah grid */
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !loadingRef.current) {
          fetchBooks(pageRef.current + 1, searchRef.current, false);
        }
      },
      { rootMargin: '400px' }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, books.length, fetchBooks]);

  /* ───────────── Eksemplar ───────────── */

  const fetchEksemplars = useCallback(async (biblioId: string) => {
    const reqId = ++eksemplarReqRef.current;
    try {
      const { data, error } = await supabase
        .from('eksemplar')
        .select('*')
        .eq('biblio_id', biblioId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (reqId !== eksemplarReqRef.current) return; // respons usang
      setEksemplarList(data || []);
    } catch (err) {
      console.error('Gagal mengambil data eksemplar:', err);
    }
  }, []);

  const handleSaveEksemplar = async (dataEksemplar: Eksemplar) => {
    if (!bookToEdit?.id) return;

    try {
      if (dataEksemplar.id) {
        const { error } = await supabase
          .from('eksemplar')
          .update({
            nomor_panggil: dataEksemplar.nomor_panggil,
            lokasi_rak: dataEksemplar.lokasi_rak,
            status: dataEksemplar.status,
            status_audit: dataEksemplar.status_audit,
            kode: dataEksemplar.kode,
          })
          .eq('id', dataEksemplar.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('eksemplar')
          .insert([{ ...dataEksemplar, biblio_id: bookToEdit.id }]);
        if (error) throw error;
      }
      await fetchEksemplars(bookToEdit.id);
    } catch (err) {
      console.error('Gagal menyimpan data eksemplar:', err);
      alert('Terjadi kesalahan database saat menyimpan eksemplar.');
      throw err;
    }
  };

  const handleDeleteEksemplar = async (eksemplarId: string) => {
    if (!bookToEdit?.id) return;
    if (!confirm('Apakah Anda yakin ingin menghapus kode eksemplar ini?')) return;

    try {
      const { error } = await supabase.from('eksemplar').delete().eq('id', eksemplarId);
      if (error) throw error;
      await fetchEksemplars(bookToEdit.id);
    } catch (err) {
      console.error('Gagal menghapus eksemplar:', err);
      alert('Terjadi kesalahan database saat menghapus eksemplar.');
    }
  };

  /* ───────────── Buku (handler stabil agar BookCard tidak render ulang) ───────────── */

  const handleSelect = useCallback((book: Book) => setSelectedBook(book), []);

  const handleAddBook = useCallback(() => {
    eksemplarReqRef.current++; // batalkan fetch eksemplar yang masih berjalan
    setBookToEdit(null);
    setEksemplarList([]);
    setIsFormOpen(true);
  }, []);

  const handleEditBook = useCallback(
    (book: Book) => {
      setBookToEdit(book);
      setEksemplarList([]);
      setIsFormOpen(true);
      fetchEksemplars(book.id);
    },
    [fetchEksemplars]
  );

  const handleDeleteBook = useCallback(async (bookId: string) => {
    if (
      !confirm(
        'Apakah Anda yakin ingin menghapus buku ini? Semua data eksemplar terikat juga akan terhapus jika diatur cascade.'
      )
    )
      return;

    try {
      const { error } = await supabase.from('biblio').delete().eq('id', bookId);
      if (error) throw error;
      setBooks((prev) => prev.filter((b) => b.id !== bookId));
    } catch (err) {
      console.error('Gagal menghapus buku:', err);
      alert('Gagal menghapus data dari database.');
    }
  }, []);

  const handleFormSubmit = async (formData: BookFormData) => {
    try {
      if (bookToEdit) {
        const { error } = await supabase.from('biblio').update(formData).eq('id', bookToEdit.id);
        if (error) throw error;

        setBooks((prev) =>
          prev.map((b) => (b.id === bookToEdit.id ? ({ ...b, ...formData } as Book) : b))
        );
      } else {
        const { data, error } = await supabase.from('biblio').insert([formData]).select();
        if (error) throw error;

        if (data && data[0]) {
          setBooks((prev) => [normalizeBook(data[0]), ...prev]);
        }
      }
    } catch (err) {
      console.error('Gagal memproses form bibliografi:', err);
      alert('Terjadi kesalahan saat menyimpan data.');
      throw err;
    }
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEksemplarList([]);
  };

  const showSkeleton = loading && books.length === 0;
  const showEmpty = !loading && books.length === 0;

  return (
    // Tanpa background: bg.png dari layout.tsx langsung terlihat
    <main className="min-h-screen text-slate-800">
      <style>{PAGE_CSS}</style>

      <div className="px-12 pt-6 pb-24">
        <div className="w-full max-w-6xl mx-auto space-y-6">
          {/* Header: panel putih solid agar teks terbaca di atas gambar */}
          <div className="bg-white border border-blue-100 rounded-2xl px-5 py-4 flex items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-black uppercase tracking-tight text-slate-900">
                Manajemen Bibliografi
              </h1>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mt-1">
                Kelola, edit, dan perbarui katalog buku perpustakaan.
              </p>
            </div>

            <button
              type="button"
              onClick={handleAddBook}
              className="inline-flex items-center justify-center gap-2 h-11 px-5 shrink-0 text-xs font-extrabold uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
            >
              <Plus className="h-4 w-4 stroke-[3]" />
              Tambah Buku
            </button>
          </div>

          {/* Pencarian: bagian dari alur halaman, ikut ter-scroll */}
          <div className="relative flex items-center">
            <Search className="absolute left-4 h-4 w-4 text-blue-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari bibliografi berdasarkan judul, penulis, kategori, atau ISBN..."
              aria-label="Cari bibliografi"
              className="w-full h-11 pl-11 pr-32 text-sm font-medium bg-white border border-blue-100 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-colors"
            />
            {isSearchingUI && (
              <span className="absolute right-4 text-xs font-semibold text-blue-600 select-none pointer-events-none">
                mencari<span className="dots">...</span>
              </span>
            )}
          </div>

          {showEmpty && (
            <div className="mx-auto max-w-md bg-white border border-blue-100 rounded-2xl py-10 px-6 flex flex-col items-center text-center">
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-full text-blue-400 mb-4">
                <BookX className="h-10 w-10 stroke-[1.5]" />
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-1">Tidak Ada Koleksi</h3>
              <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                Tidak ditemukan data bibliografi yang cocok dengan pencarian Anda.
              </p>
            </div>
          )}

          {(books.length > 0 || showSkeleton) && (
            <div className="grid grid-cols-4 gap-5">
              {showSkeleton
                ? Array.from({ length: 4 }, (_, i) => <SkeletonCard key={i} />)
                : books.map((book) => (
                    <BookCard
                      key={book.id}
                      book={book}
                      onSelect={handleSelect}
                      onEdit={handleEditBook}
                      onDelete={handleDeleteBook}
                    />
                  ))}
            </div>
          )}

          {/* Sentinel infinite scroll */}
          <div ref={sentinelRef} className="h-px" aria-hidden="true" />

          {loading && books.length > 0 && (
            <div className="w-full flex justify-center py-2">
              <div className="bg-white border border-blue-100 rounded-full p-2">
                <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
              </div>
            </div>
          )}
        </div>
      </div>

      <ScrollTopButton />

      {selectedBook && (
        <BookDetailModal book={selectedBook} isOpen onClose={() => setSelectedBook(null)} />
      )}

      {isFormOpen && (
        <BookFormModal
          isOpen
          bookToEdit={bookToEdit}
          eksemplarList={eksemplarList}
          onSubmitEksemplar={handleSaveEksemplar}
          onDeleteEksemplar={handleDeleteEksemplar}
          onClose={handleCloseForm}
          onSubmit={handleFormSubmit}
        />
      )}
    </main>
  );
}