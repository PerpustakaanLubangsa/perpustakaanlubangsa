'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Loader2, BookX, Image as ImageIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import BookDetailModal from '@/app/components/book-detail-modal'; 

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

function LazyImage({ src, alt }: { src: string; alt: string }) {
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
      { rootMargin: '100px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={imgRef} className="w-full h-full bg-slate-950/80 relative overflow-hidden flex items-center justify-center">
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center text-slate-700">
          <ImageIcon className="h-8 w-8 stroke-[1.2]" />
        </div>
      )}
      
      {inView && (
        <img
          src={src}
          alt={alt}
          onLoad={() => setIsLoaded(true)}
          className={`w-full h-full object-cover transition-opacity duration-300 ease-out ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}
    </div>
  );
}

export default function HomePage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<string[]>(['Semua']);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [isSearchingUI, setIsSearchingUI] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [loadingText, setLoadingText] = useState('mencari.');
  const [isScrolledDown, setIsScrolledDown] = useState(false);

  const observer = useRef<IntersectionObserver | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Ambil list Kategori Unik dari data Buku di Supabase saat komponen dipasang
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data, error } = await supabase
          .from('biblio')
          .select('kategori');
        
        if (error) throw error;
        
        if (data) {
          const rawCategories = data
            .map((item) => item.kategori)
            .filter((kat): kat is string => !!kat && kat.trim() !== '');
            
          const uniqueCategories = Array.from(new Set(rawCategories)).sort();
          setCategories(['Semua', ...uniqueCategories]);
        }
      } catch (err) {
        console.error('Gagal memuat kategori dari database:', err);
      }
    };

    fetchCategories();
  }, []);

  // Efek menyembunyikan tag kategori saat scroll down
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 40) {
        setIsScrolledDown(true);
      } else {
        setIsScrolledDown(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Animasi Teks Titik-Titik Berjalan
  useEffect(() => {
    if (!isSearchingUI) return;

    const texts = ['mencari.', 'mencari..', 'mencari...'];
    let count = 0;

    const interval = setInterval(() => {
      count = (count + 1) % texts.length;
      setLoadingText(texts[count]);
    }, 400);

    return () => clearInterval(interval);
  }, [isSearchingUI]);

  // Efek Debounce Jeda Pengetikan
  useEffect(() => {
    if (!searchQuery.trim()) {
      setDebouncedSearchQuery('');
      setIsSearchingUI(false);
      return;
    }

    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);

    return () => clearTimeout(handler);
  }, [searchQuery]);
  
  // Fungsi fetch data dari Supabase
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

        setBooks((prev) => (isNewSearch ? mappedData : [...prev, ...mappedData]));
        setHasMore(data.length === ITEMS_PER_PAGE);
      }
    } catch (err) {
      console.error('Gagal mengambil data biblio:', err);
    } finally {
      setLoading(false);
      setIsSearchingUI(false);
    }
  }, []);

  // Trigger Pencarian Baru saat Query atau Tag Kategori Berubah
  useEffect(() => {
    setPage(0);
    setHasMore(true);
    fetchBooks(0, debouncedSearchQuery, selectedCategory, true);
  }, [debouncedSearchQuery, selectedCategory, fetchBooks]);

  // Infinite scroll
  const lastBookElementRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (loading) return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          const nextPage = page + 1;
          setPage(nextPage);
          fetchBooks(nextPage, debouncedSearchQuery, selectedCategory, false);
        }
      });

      if (node) observer.current.observe(node);
    },
    [loading, hasMore, page, debouncedSearchQuery, selectedCategory, fetchBooks]
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    if (e.target.value.trim() !== '') {
      setIsSearchingUI(true);
    }
  };

  // Fungsi menggeser menu tag kategori ke kiri/kanan menggunakan tombol panah
  const handleScrollCategories = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 200;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  return (
    <main className="min-h-screen bg-[#0b0c10] text-slate-100 p-2 sm:p-4">
      {/* CSS internal untuk menyembunyikan scrollbar bawaan browser */}
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />

      <div className="w-full max-w-full mx-auto flex flex-col">
        
        {/* Header Kunci/Beku (Fixed Top) */}
        <header className="fixed top-0 left-20 right-0 z-40 bg-[#0b0c10]/95 backdrop-blur-md px-2 sm:px-4 pt-4 border-b border-slate-800/40">
          <div className="relative w-full flex items-center">
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Cari buku berdasarkan judul, penulis, atau kategori..."
              className="w-full h-11 pl-4 pr-32 text-sm bg-slate-900/90 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500/80 focus:ring-1 focus:ring-cyan-500/30 transition-all duration-200"
            />
            
            <div className="absolute right-4 pointer-events-none flex items-center gap-2 overflow-hidden h-full">
              <div 
                className={`flex items-center gap-1.5 transition-all duration-300 ease-in-out ${
                  isSearchingUI ? 'transform translate-x-0 opacity-100' : 'transform translate-x-4 opacity-0'
                }`}
              >
                {isSearchingUI && (
                  <>
                    <Search className="h-4 w-4 text-cyan-400" />
                    <span className="text-xs font-medium text-cyan-400 select-none w-16 tabular-nums">
                      {loadingText}
                    </span>
                  </>
                )}
              </div>
              {!isSearchingUI && <Search className="h-4 w-4 text-slate-500" />}
            </div>
          </div>

          {/* Bar Wrapper Tag Kategori Buku dengan Tombol Navigasi Panah */}
          <div 
            className={`relative flex items-center transition-all duration-300 ease-in-out ${
              isScrolledDown 
                ? 'max-h-0 opacity-0 pointer-events-none transform -translate-y-2' 
                : 'max-h-16 opacity-100'
            }`}
          >
            {/* Tombol Geser Kiri */}
            <button 
              onClick={() => handleScrollCategories('left')}
              className="absolute left-0 z-10 p-1 bg-slate-900/90 backdrop-blur-sm rounded-full shadow-md border border-slate-800 text-slate-400 hover:text-slate-100 hover:border-slate-700 transition-colors"
              aria-label="Scroll kiri"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {/* Container Item Tag Kategori */}
            <div 
              ref={scrollContainerRef}
              className="flex items-center gap-2 overflow-x-auto py-3 px-7 w-full hide-scrollbar scroll-smooth"
            >
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-all duration-150 ${
                    selectedCategory === cat
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.15)] font-semibold'
                      : 'bg-slate-900 text-slate-400 border border-slate-800 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Tombol Geser Kanan */}
            <button 
              onClick={() => handleScrollCategories('right')}
              className="absolute right-0 z-10 p-1 bg-slate-900/90 backdrop-blur-sm rounded-full shadow-md border border-slate-800 text-slate-400 hover:text-slate-100 hover:border-slate-700 transition-colors"
              aria-label="Scroll kanan"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Kondisi Jika Buku Tidak Ditemukan */}
        {!loading && books.length === 0 && (
          <div className="pt-36 pb-12 flex flex-col items-center justify-center text-center px-4">
            <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-full text-slate-500 mb-4">
              <BookX className="h-10 w-10 stroke-[1.5]" />
            </div>
            <h3 className="text-base font-semibold text-slate-200 mb-1">
              Buku Tidak Ditemukan
            </h3>
            <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
              Kami tidak dapat menemukan hasil untuk kata kunci atau kategori terpilih.
            </p>
          </div>
        )}

        {/* Grid Katalog Buku */}
        {books.length > 0 && (
          <div className="pt-32 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
            {books.map((book, index) => {
              const isLastElement = books.length === index + 1;

              return (
                <div
                  key={book.id}
                  ref={isLastElement ? lastBookElementRef : null}
                  onClick={() => setSelectedBook(book)}
                  className="bg-[#0b0c10] rounded-xl overflow-hidden flex flex-col cursor-pointer group transition-all duration-200 hover:-translate-y-1"
                >
                  {/* Container Cover Buku */}
                  <div className="relative aspect-[3/4] bg-slate-900 border border-slate-800/80 overflow-hidden rounded-xl group-hover:border-slate-700/80 transition-colors">
                    {book.sampul_url ? (
                      <LazyImage src={book.sampul_url} alt={book.judul} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-slate-600">
                        Tanpa Sampul
                      </div>
                    )}
                  </div>

                  {/* Informasi Buku */}
                  <div className="pt-3 pb-1 px-1 flex flex-col flex-grow justify-between">
                    <div>
                      <div className="flex flex-wrap gap-1 mb-1.5">
                        <span className="inline-block px-1.5 py-0.5 text-[10px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded">
                          {book.kategori || 'Umum'}
                        </span>
                        {book.topik && book.topik.slice(0, 2).map((t, idx) => (
                          <span key={idx} className="inline-block px-1.5 py-0.5 text-[10px] font-normal bg-slate-900 text-slate-400 rounded border border-slate-800">
                            {t}
                          </span>
                        ))}
                      </div>
                      <h2 className="text-sm font-semibold text-slate-100 line-clamp-2 leading-snug group-hover:text-cyan-400 transition-colors">
                        {book.judul}
                      </h2>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 truncate">
                      {book.penulis || 'Anonim'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Indikator Loading Bawah */}
        {loading && (
          <div className="w-full flex justify-center py-8">
            <Loader2 className="h-6 w-6 text-cyan-400 animate-spin" />
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