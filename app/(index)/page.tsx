'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import BookDetailModal from '@/components/book-detail-modal'; 

// Inisialisasi Supabase Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface Book {
  id: string; // Diperbarui: menggunakan string untuk tipe UUID
  judul: string;
  penulis: string;
  isbn_issn: string; // Ditambahkan agar data modal lengkap
  penerbit: string;   // Ditambahkan agar data modal lengkap
  tahun_terbit: string; // Ditambahkan agar data modal lengkap
  deskripsi_fisik: string; // Ditambahkan agar data modal lengkap
  sampul_url: string;
  abstrak: string;    // Ditambahkan agar data modal lengkap
  kategori: string;
  topik: string[];    // jsonb array
  created_at: string;
  updated_at: string; // Ditambahkan
  jumlah_baca: number; // Ditambahkan
  jumlah_pinjam: number; // Ditambahkan
}

const ITEMS_PER_PAGE = 25;

export default function HomePage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  
  // State untuk melacak buku yang dipilih dan mengontrol Modal Detail
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);

  // Ref untuk mendeteksi elemen terakhir (Infinite Scroll)
  const observer = useRef<IntersectionObserver | null>(null);
  
  // Fungsi fetch data dari Supabase
  const fetchBooks = useCallback(async (currentPage: number, search: string, isNewSearch = false) => {
    if (loading) return;
    setLoading(true);

    try {
      const from = currentPage * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      // Mengambil seluruh kolom sesuai struktur skema tabel biblio terbaru
      let query = supabase
        .from('biblio')
        .select('id, judul, penulis, isbn_issn, penerbit, tahun_terbit, deskripsi_fisik, sampul_url, abstrak, kategori, topik, created_at, updated_at, jumlah_baca, jumlah_pinjam')
        .order('created_at', { ascending: false })
        .range(from, to);

      // Fitur pencarian server-side jika query diisi
      if (search) {
        query = query.or(`judul.ilike.%${search}%,penulis.ilike.%${search}%,kategori.ilike.%${search}%`);
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
    }
  }, [loading]);

  // Trigger pencarian baru saat input diketik
  useEffect(() => {
    setPage(0);
    setHasMore(true);
    fetchBooks(0, searchQuery, true);
  }, [searchQuery]);

  // Infinite scroll: callback untuk me-mount observer ke elemen paling bawah
  const lastBookElementRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (loading) return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          const nextPage = page + 1;
          setPage(nextPage);
          fetchBooks(nextPage, searchQuery, false);
        }
      });

      if (node) observer.current.observe(node);
    },
    [loading, hasMore, page, searchQuery, fetchBooks]
  );

  return (
    <main className="min-h-screen bg-white text-slate-800 p-2 sm:p-4">
      <div className="w-full max-w-full mx-auto flex flex-col">
        
        {/* Header Kunci/Beku (Fixed) */}
        <header className="fixed top-0 left-16 right-0 z-40 bg-white px-2 sm:px-4 py-4">
          <div className="relative w-full flex items-center">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari buku berdasarkan judul, penulis, atau kategori..."
              style={{ backgroundColor: '#E5E5E0' }}
              className="w-full h-11 pl-4 pr-12 text-sm border border-transparent rounded-xl text-slate-800 placeholder-slate-500 focus:outline-none focus:border-transparent transition-all duration-200"
            />
            <div className="absolute right-4 pointer-events-none flex items-center justify-center">
              <Search className="h-4 w-4 text-slate-500" />
            </div>
          </div>
        </header>

        {/* Grid Katalog Buku Supabase */}
        <div className="pt-20 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
          {books.map((book, index) => {
            const isLastElement = books.length === index + 1;
            return (
              <div
                key={book.id}
                ref={isLastElement ? lastBookElementRef : null}
                onClick={() => setSelectedBook(book)} // Menyetel buku yang diklik untuk membuka modal
                className="bg-white rounded-xl overflow-hidden flex flex-col cursor-pointer"
              >
                {/* Cover Buku dengan Lazy Loading */}
                <div className="relative aspect-[3/4] bg-slate-50 overflow-hidden rounded-xl">
                  {book.sampul_url ? (
                    <img
                      src={book.sampul_url}
                      alt={book.judul}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                      Tanpa Sampul
                    </div>
                  )}
                </div>

                {/* Informasi Buku */}
                <div className="pt-3 pb-1 px-1 flex flex-col flex-grow justify-between">
                  <div>
                    <div className="flex flex-wrap gap-1 mb-1.5">
                      <span className="inline-block px-1.5 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-600 rounded">
                        {book.kategori || 'Umum'}
                      </span>
                      {book.topik && book.topik.slice(0, 2).map((t, idx) => (
                        <span key={idx} className="inline-block px-1.5 py-0.5 text-[10px] font-normal bg-slate-50 text-slate-500 rounded border border-slate-100">
                          {t}
                        </span>
                      ))}
                    </div>
                    <h2 className="text-sm font-semibold text-slate-900 line-clamp-2 leading-snug">
                      {book.judul}
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 truncate">
                    {book.penulis || 'Anonim'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Indikator Loading di bagian bawah */}
        {loading && (
          <div className="w-full flex justify-center py-8">
            <Loader2 className="h-6 w-6 text-slate-400 animate-spin" />
          </div>
        )}
        
        {/* Komponen Modal Detail Buku */}
        <BookDetailModal 
          book={selectedBook}
          isOpen={selectedBook !== null}
          onClose={() => setSelectedBook(null)}
        />
        
      </div>
    </main>
  );
}