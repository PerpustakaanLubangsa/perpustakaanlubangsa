'use client';

import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { Loader2, BookX, Image as ImageIcon, BookOpenText } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import BookDetailModal from './components/book-detail-modal';
import HeroSearch from './components/hero-search';

// Inisialisasi Supabase Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

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

const ITEMS_PER_PAGE = 25;

// Memoized Lazy Image untuk menghemat resource rendering
const LazyImage = memo(function LazyImage({ src, alt }: { src: string; alt: string }) {
  const [inView, setInView] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = imgRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.unobserve(el);
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={imgRef}
      className="w-full h-full bg-blue-100 relative overflow-hidden flex items-center justify-center"
    >
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center text-blue-300 animate-pulse">
          <ImageIcon className="h-8 w-8 stroke-[1.2]" />
        </div>
      )}

      {inView && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onLoad={() => setIsLoaded(true)}
          className={`w-full h-full object-cover transition-opacity duration-300 ease-out ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}
    </div>
  );
});

// Item Kartu Buku Terisolasi
const BookCard = memo(
  React.forwardRef<HTMLDivElement, { book: Book; onClick: () => void }>(
    ({ book, onClick }, ref) => {
      return (
        <div
          ref={ref}
          onClick={onClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onClick();
            }
          }}
          aria-label={`Buka detail buku ${book.judul}`}
          className="group flex flex-col cursor-pointer rounded-2xl bg-white border border-slate-200 p-2.5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-900/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 will-change-transform"
        >
          {/* Container Cover Buku */}
          <div className="relative aspect-[3/4.2] bg-blue-100 rounded-xl overflow-hidden mb-3 ring-1 ring-slate-900/5">
            {book.sampul_url ? (
              <LazyImage src={book.sampul_url} alt={book.judul} />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-xs font-medium text-blue-400 p-4 text-center bg-gradient-to-br from-blue-50 to-blue-100">
                <ImageIcon className="h-7 w-7 stroke-[1.2]" />
                Tanpa Sampul
              </div>
            )}

            {/* Overlay Buka Detail */}
            <div className="absolute inset-0 bg-gradient-to-t from-blue-950/80 via-blue-900/50 to-blue-900/20 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-2 p-3">
              <BookOpenText className="w-8 h-8 text-white" strokeWidth={1.4} />
              <span className="text-[11px] font-semibold text-white tracking-wider uppercase bg-blue-600 px-3 py-1 rounded-full shadow-md">
                Buka Detail
              </span>
            </div>
          </div>

          {/* Informasi Buku */}
          <div className="px-1 pb-1 flex flex-col flex-grow justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-1.5 mb-2">
                <span className="inline-block px-2 py-0.5 text-[10px] font-semibold bg-blue-100 text-blue-700 rounded-md tracking-wide uppercase">
                  {book.kategori || 'Umum'}
                </span>
                {book.topik && book.topik[0] && (
                  <span className="inline-block px-2 py-0.5 text-[10px] font-medium bg-white text-slate-600 rounded-md border border-slate-200 truncate max-w-[90px]">
                    {book.topik[0]}
                  </span>
                )}
              </div>
              <h2 className="text-sm font-semibold text-slate-900 line-clamp-2 leading-snug tracking-tight transition-colors group-hover:text-blue-700">
                {book.judul}
              </h2>
            </div>
            <p className="text-xs sm:text-[13px] text-slate-600 mt-1.5 truncate font-medium">
              {book.penulis || 'Anonim'}
            </p>
          </div>
        </div>
      );
    }
  )
);
BookCard.displayName = 'BookCard';

export default function HomePage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<string[]>(['Semua']);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [currentSearchedTerm, setCurrentSearchedTerm] = useState('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [isSearchingUI, setIsSearchingUI] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [isVisitorOpen, setIsVisitorOpen] = useState(false);

  const observer = useRef<IntersectionObserver | null>(null);

  const handleToggleVisitor = useCallback(() => {
    setIsVisitorOpen((prev) => !prev);
  }, []);

  // Ambil list Kategori Unik
  useEffect(() => {
    let isMounted = true;
    const fetchCategories = async () => {
      try {
        const { data, error } = await supabase.from('biblio').select('kategori');
        if (error) throw error;

        if (data && isMounted) {
          const rawCategories = data
            .map((item) => item.kategori)
            .filter((kat): kat is string => !!kat && kat.trim() !== '');

          const uniqueCategories = Array.from(new Set(rawCategories)).sort();
          setCategories(['Semua', ...uniqueCategories]);
        }
      } catch (err) {
        console.error('Gagal memuat kategori:', err);
      }
    };

    fetchCategories();
    return () => {
      isMounted = false;
    };
  }, []);

  // Debounce Jeda Pengetikan Input
  useEffect(() => {
    if (!searchQuery.trim()) {
      setDebouncedSearchQuery('');
      setIsSearchingUI(false);
      return;
    }

    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 450);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Fungsi Fetch Data dari Supabase
  const fetchBooks = useCallback(
    async (currentPage: number, search: string, category: string, isNewSearch = false) => {
      setLoading(true);

      try {
        const from = currentPage * ITEMS_PER_PAGE;
        const to = from + ITEMS_PER_PAGE - 1;

        let query = supabase
          .from('biblio')
          .select(
            'id, judul, penulis, isbn_issn, penerbit, tahun_terbit, deskripsi_fisik, sampul_url, abstrak, kategori, topik, created_at, updated_at, jumlah_baca, jumlah_pinjam'
          )
          .order('created_at', { ascending: false })
          .range(from, to);

        if (search) {
          if (category !== 'Semua') {
            query = query.eq('kategori', category).or(`judul.ilike.%${search}%,penulis.ilike.%${search}%`);
          } else {
            query = query.or(`judul.ilike.%${search}%,penulis.ilike.%${search}%,kategori.ilike.%${search}%`);
          }
        } else if (category !== 'Semua') {
          query = query.eq('kategori', category);
        }

        const { data, error } = await query;
        if (error) throw error;

        if (data) {
          const mappedData: Book[] = data.map((b) => ({
            ...b,
            topik: Array.isArray(b.topik) ? b.topik : [],
          }));

          // Saring duplikat berdasarkan 'id' sebelum disimpan ke state
          setBooks((prev) => {
            const rawCombined = isNewSearch ? mappedData : [...prev, ...mappedData];
            const uniqueMap = new Map<string, Book>();
            rawCombined.forEach((book) => {
              if (book.id) uniqueMap.set(book.id, book);
            });
            return Array.from(uniqueMap.values());
          });

          setHasMore(data.length === ITEMS_PER_PAGE);
        }

        if (isNewSearch) {
          setCurrentSearchedTerm(search);
        }
      } catch (err) {
        console.error('Gagal mengambil data:', err);
      } finally {
        setLoading(false);
        setIsSearchingUI(false);
      }
    },
    []
  );

  // Reset & Fetch ulang saat parameter pencarian berubah
  useEffect(() => {
    setPage(0);
    setHasMore(true);
    fetchBooks(0, debouncedSearchQuery, selectedCategory, true);
  }, [debouncedSearchQuery, selectedCategory, fetchBooks]);

  // Infinite Scroll Intersection Observer
  const lastBookElementRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (loading) return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasMore) {
            setPage((prevPage) => {
              const nextPage = prevPage + 1;
              fetchBooks(nextPage, debouncedSearchQuery, selectedCategory, false);
              return nextPage;
            });
          }
        },
        { rootMargin: '300px' }
      );

      if (node) observer.current.observe(node);
    },
    [loading, hasMore, debouncedSearchQuery, selectedCategory, fetchBooks]
  );

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    if (value.trim() !== '') {
      setIsSearchingUI(true);
    }
  }, []);

  const handleSelectBook = useCallback((book: Book) => {
    setSelectedBook(book);
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 via-slate-50 to-white text-slate-900 antialiased">
      {/* --- HEADER + HERO + PENCARIAN --- */}
      <HeroSearch
        categories={categories}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        isSearching={isSearchingUI}
        onToggleVisitor={handleToggleVisitor}
        isVisitorOpen={isVisitorOpen}
      />

      {/* TODO: panel/modal "Catat Kunjungan" ditampilkan di sini saat isVisitorOpen === true */}

      {/* --- KATALOG BUKU --- */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 pt-12 pb-16">
        {/* Teks Status Pencarian */}
        {!loading && currentSearchedTerm && books.length > 0 && (
          <div className="mb-8 pb-3 border-b border-blue-100">
            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-700">
              Hasil pencarian &ldquo;
              <span className="text-blue-700">{currentSearchedTerm}</span>&rdquo;
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Ditemukan <span className="font-semibold text-blue-700">{books.length}</span> koleksi
            </p>
          </div>
        )}

        {/* Kondisi Jika Buku Tidak Ditemukan */}
        {!loading && books.length === 0 && (
          <div className="py-20 flex flex-col items-center justify-center text-center px-6 bg-white rounded-3xl border border-blue-100 shadow-sm shadow-blue-900/5">
            <div className="p-4 bg-blue-50 rounded-full text-blue-500 mb-5 ring-8 ring-blue-50/60">
              <BookX className="h-10 w-10 stroke-[1.4]" />
            </div>

            <h3 className="text-xl font-semibold text-slate-900 mb-2 tracking-tight">
              {currentSearchedTerm ? (
                <>
                  Tidak ditemukan hasil pencarian &ldquo;
                  <span className="text-blue-700">{currentSearchedTerm}</span>&rdquo;
                </>
              ) : (
                'Buku Tidak Ditemukan'
              )}
            </h3>

            <p className="text-sm text-slate-600 max-w-md leading-relaxed">
              {currentSearchedTerm
                ? 'Coba periksa kembali ejaan kata kunci Anda atau gunakan istilah yang lebih umum.'
                : 'Kami tidak dapat menemukan koleksi buku dalam kategori ini saat ini.'}
            </p>
          </div>
        )}

        {/* Grid Katalog Buku */}
        {books.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-5">
            {books.map((book, index) => {
              const isLastElement = books.length === index + 1;
              return (
                <BookCard
                  key={`${book.id}-${index}`}
                  ref={isLastElement ? lastBookElementRef : null}
                  book={book}
                  onClick={() => handleSelectBook(book)}
                />
              );
            })}
          </div>
        )}

        {/* Indikator Loading Bawah */}
        {loading && (
          <div className="w-full flex flex-col items-center gap-2 py-12">
            <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
            <span className="text-sm font-medium text-slate-600">Memuat koleksi...</span>
          </div>
        )}

        <BookDetailModal
          book={selectedBook}
          isOpen={selectedBook !== null}
          onClose={() => setSelectedBook(null)}
        />
      </div>
    </main>
  );
}