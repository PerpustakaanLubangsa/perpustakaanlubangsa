'use client';

import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { Search, Loader2, BookX, Image as ImageIcon, ChevronDown, BookOpenText } from 'lucide-react'; 
import { createClient } from '@supabase/supabase-js';
import BookDetailModal from '@/components/book-detail-modal'; 

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
    <div ref={imgRef} className="w-full h-full bg-slate-800 relative overflow-hidden flex items-center justify-center">
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center text-slate-600">
          <ImageIcon className="h-8 w-8 stroke-[1.2]" />
        </div>
      )}
      
      {inView && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onLoad={() => setIsLoaded(true)}
          className={`w-full h-full object-cover transition-opacity duration-200 ease-out ${
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
          className="flex flex-col cursor-pointer transition-transform duration-200 hover:-translate-y-1 group bg-transparent border-none shadow-none will-change-transform"
        >
          {/* Container Cover Buku */}
          <div className="relative aspect-[3/4.2] bg-slate-800 rounded-xl overflow-hidden mb-3 shadow-md transition-shadow duration-200">
            {book.sampul_url ? (
              <LazyImage src={book.sampul_url} alt={book.judul} />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-slate-500 p-4 text-center">
                Tanpa Sampul
              </div>
            )}
            
            {/* Overlay Buka Detail */}
            <div className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-2 p-3">
              <BookOpenText className="w-8 h-8 text-white/90" strokeWidth={1.2} />
              <span className="text-[11px] font-semibold text-white tracking-wider uppercase bg-black/80 px-2.5 py-1 rounded-full border border-white/20">
                Buka Detail
              </span>
            </div>
          </div>

          {/* Informasi Buku */}
          <div className="px-1 flex flex-col flex-grow justify-between">
            <div>
              <div className="flex flex-wrap gap-1 mb-2">
                <span className="inline-block px-1.5 py-0.5 text-[9px] font-semibold bg-slate-700 text-slate-200 rounded tracking-wider uppercase">
                  {book.kategori || 'Umum'}
                </span>
                {book.topik && book.topik[0] && (
                  <span className="inline-block px-1.5 py-0.5 text-[9px] font-normal bg-slate-950 text-slate-400 rounded border border-slate-800 truncate max-w-[90px]">
                    {book.topik[0]}
                  </span>
                )}
              </div>
              <h2 className="text-xs sm:text-sm font-semibold text-slate-100 line-clamp-2 leading-snug group-hover:text-white">
                {book.judul}
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1.5 truncate font-medium">
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

  const observer = useRef<IntersectionObserver | null>(null);

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
    return () => { isMounted = false; };
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
  const fetchBooks = useCallback(async (currentPage: number, search: string, category: string, isNewSearch = false) => {
    setLoading(true);

    try {
      const from = currentPage * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      let query = supabase
        .from('biblio')
        .select('id, judul, penulis, isbn_issn, penerbit, tahun_terbit, deskripsi_fisik, sampul_url, abstrak, kategori, topik, created_at, updated_at, jumlah_baca, jumlah_pinjam')
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

        // PERBAIKAN: Saring duplikat berdasarkan 'id' sebelum disimpan ke state
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
  }, []);

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

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setPage((prevPage) => {
            const nextPage = prevPage + 1;
            fetchBooks(nextPage, debouncedSearchQuery, selectedCategory, false);
            return nextPage;
          });
        }
      }, { rootMargin: '300px' });

      if (node) observer.current.observe(node);
    },
    [loading, hasMore, debouncedSearchQuery, selectedCategory, fetchBooks]
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    if (e.target.value.trim() !== '') {
      setIsSearchingUI(true);
    }
  };

  const handleSelectBook = useCallback((book: Book) => {
    setSelectedBook(book);
  }, []);

  return (
    <main className="min-h-screen bg-black text-slate-100 antialiased">
      {/* --- HERO SECTION --- */}
      <section className="relative w-full h-[60vh] sm:h-[80vh] flex flex-col items-center justify-center text-center overflow-hidden">
        <img
          src="/bg.png"
          alt="Hero Background"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/80 to-transparent pointer-events-none z-10" />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black to-transparent pointer-events-none z-10" />
      </section>

      {/* --- SEARCH BAR DI PERBATASAN --- */}
      <div className="w-full max-w-5xl mx-auto px-4 relative z-20 -mt-7">
        <div className="bg-slate-900 border-none rounded-2xl sm:rounded-3xl shadow-xl shadow-black/80 p-2 flex flex-col sm:flex-row items-center gap-2">
          
          {/* Dropdown Kategori */}
          <div className="relative w-full sm:w-56 flex-shrink-0">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full h-11 sm:h-12 pl-4 pr-9 text-xs sm:text-sm font-semibold bg-slate-800 border-none rounded-xl sm:rounded-full text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-500 appearance-none cursor-pointer tracking-tight"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat} className="bg-slate-900 text-slate-200">
                  {cat === 'Semua' ? 'Semua Kategori' : cat}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          </div>

          {/* Input Pencarian */}
          <div className="relative w-full flex items-center flex-grow">
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Cari judul buku atau nama penulis..."
              className="w-full h-11 sm:h-12 pl-5 pr-24 text-sm font-medium bg-slate-800 border-none rounded-xl sm:rounded-full text-slate-50 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-500 tracking-tight"
            />
            
            <div className="absolute right-4 pointer-events-none flex items-center gap-2">
              {isSearchingUI ? (
                <div className="flex items-center gap-1.5">
                  <Loader2 className="h-4 w-4 text-slate-400 animate-spin" />
                  <span className="text-xs font-semibold text-slate-400 select-none">Mencari</span>
                </div>
              ) : (
                <Search className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400" />
              )}
            </div>
          </div>

        </div>
      </div>

      {/* --- KATALOG BUKU --- */}
      <div className="w-full max-w-7xl mx-auto px-4 pt-10 pb-12">
        
        {/* Teks Status Pencarian */}
        {!loading && currentSearchedTerm && books.length > 0 && (
          <div className="mb-6 pb-2 border-b border-slate-800">
            <h2 className="text-lg font-medium text-slate-300">
              Hasil pencarian &ldquo;<span className="text-white font-semibold">{currentSearchedTerm}</span>&rdquo;
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Ditemukan {books.length} koleksi</p>
          </div>
        )}

        {/* Kondisi Jika Buku Tidak Ditemukan */}
        {!loading && books.length === 0 && (
          <div className="py-16 flex flex-col items-center justify-center text-center px-4 bg-[#111111] rounded-2xl border border-slate-800">
            <div className="p-3 bg-slate-800/60 rounded-full text-slate-500 mb-4">
              <BookX className="h-10 w-10 stroke-[1.2]" />
            </div>
            
            <h3 className="text-lg font-semibold text-white mb-1.5 tracking-tight">
              {currentSearchedTerm ? (
                <>Tidak ditemukan hasil pencarian &ldquo;<span className="text-slate-300">{currentSearchedTerm}</span>&rdquo;</>
              ) : (
                'Buku Tidak Ditemukan'
              )}
            </h3>
            
            <p className="text-xs text-slate-400 max-w-md leading-relaxed">
              {currentSearchedTerm 
                ? 'Coba periksa kembali ejaan kata kunci Anda atau gunakan istilah yang lebih umum.'
                : 'Kami tidak dapat menemukan koleksi buku dalam kategori ini saat ini.'
              }
            </p>
          </div>
        )}

        {/* Grid Katalog Buku */}
        {books.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-8 sm:gap-x-6 sm:gap-y-10">
            {books.map((book, index) => {
              const isLastElement = books.length === index + 1;
              return (
                <BookCard
                  key={`${book.id}-${index}`} // PERBAIKAN: Menggabungkan id dan index sebagai pelapis ganda
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
          <div className="w-full flex justify-center py-12">
            <Loader2 className="h-8 w-8 text-slate-500 animate-spin" />
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