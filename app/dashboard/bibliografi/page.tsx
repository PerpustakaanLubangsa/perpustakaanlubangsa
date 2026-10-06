'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Loader2, BookX, Image as ImageIcon, Plus, Edit3, Trash2 } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import BookDetailModal from '@/app/components/book-detail-modal'; 
import BookFormModal from './components/book-form-modal';

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
    <div ref={imgRef} className="w-full h-full bg-slate-900 relative overflow-hidden flex items-center justify-center">
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center text-slate-600">
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

export default function BibliografiEditPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [bookToEdit, setBookToEdit] = useState<Book | null>(null);
  
  // State baru untuk menampung data eksemplar dari buku yang sedang aktif diedit
  const [eksemplarList, setEksemplarList] = useState<Eksemplar[]>([]);

  const observer = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setDebouncedSearchQuery('');
      return;
    }
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);

    return () => clearTimeout(handler);
  }, [searchQuery]);
  
  const fetchBooks = useCallback(async (currentPage: number, search: string, isNewSearch = false) => {
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
        query = query.or(`judul.ilike.%${search}%,penulis.ilike.%${search}%,kategori.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      if (data) {
        const mappedData: Book[] = data.map((b) => ({
          ...b,
          topik: Array.isArray(b.topik) ? b.topik : [],
          created_at: b.created_at || '',
          updated_at: b.updated_at || '',
          jumlah_baca: b.jumlah_baca ?? 0,
          jumlah_pinjam: b.jumlah_pinjam ?? 0
        }));

        setBooks((prev) => (isNewSearch ? mappedData : [...prev, ...mappedData]));
        setHasMore(data.length === ITEMS_PER_PAGE);
      }
    } catch (err) {
      console.error('Gagal mengambil data biblio:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setPage(0);
    setHasMore(true);
    fetchBooks(0, debouncedSearchQuery, true);
  }, [debouncedSearchQuery, fetchBooks]);

  const lastBookElementRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (loading) return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          const nextPage = page + 1;
          setPage(nextPage);
          fetchBooks(nextPage, debouncedSearchQuery, false);
        }
      });

      if (node) observer.current.observe(node);
    },
    [loading, hasMore, page, debouncedSearchQuery, fetchBooks]
  );

  // Ambil data eksemplar terikat dari Supabase berdasarkan id buku (biblio_id)
  const fetchEksemplars = async (biblioId: string) => {
    try {
      const { data, error } = await supabase
        .from('eksemplar')
        .select('*')
        .eq('biblio_id', biblioId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setEksemplarList(data || []);
    } catch (err) {
      console.error('Gagal mengambil data eksemplar:', err);
    }
  };

  const handleAddBook = () => {
    setBookToEdit(null);
    setEksemplarList([]); // Reset daftar karena buku baru belum tersimpan
    setIsFormOpen(true);
  };

  const handleEditBook = async (e: React.MouseEvent, book: Book) => {
    e.stopPropagation();
    setBookToEdit(book);
    setIsFormOpen(true);
    // Jalankan fetching data eksemplar real-time saat klik edit
    await fetchEksemplars(book.id);
  };

  const handleFormSubmit = async (
    formData: Omit<Book, 'id' | 'created_at' | 'updated_at' | 'jumlah_baca' | 'jumlah_pinjam'> & { 
      id?: string;
      created_at?: string;
      updated_at?: string;
      jumlah_baca?: number;
      jumlah_pinjam?: number;
    }
  ) => {
    try {
      if (bookToEdit) {
        const { error } = await supabase
          .from('biblio')
          .update(formData)
          .eq('id', bookToEdit.id);

        if (error) throw error;

        setBooks((prev) =>
          prev.map((b) => (b.id === bookToEdit.id ? { ...b, ...formData } as Book : b))
        );
      } else {
        const { data, error } = await supabase
          .from('biblio')
          .insert([formData])
          .select();

        if (error) throw error;

        if (data && data[0]) {
          const insertedBook: Book = {
            ...data[0],
            topik: Array.isArray(data[0].topik) ? data[0].topik : [],
            created_at: data[0].created_at || '',
            updated_at: data[0].updated_at || '',
            jumlah_baca: data[0].jumlah_baca ?? 0,
            jumlah_pinjam: data[0].jumlah_pinjam ?? 0
          };
          setBooks((prev) => [insertedBook, ...prev]);
        }
      }
    } catch (err) {
      console.error('Gagal memproses form bibliografi:', err);
      alert('Terjadi kesalahan saat menyimpan data.');
      throw err;
    }
  };

  const handleDeleteBook = async (e: React.MouseEvent, bookId: string) => {
    e.stopPropagation();
    if (confirm('Apakah Anda yakin ingin menghapus buku ini? Semua data eksemplar terikat juga akan terhapus jika diatur cascade.')) {
      try {
        const { error } = await supabase.from('biblio').delete().eq('id', bookId);
        if (error) throw error;
        setBooks((prev) => prev.filter((b) => b.id !== bookId));
      } catch (err) {
        console.error('Gagal menghapus buku:', err);
        alert('Gagal menghapus data dari database.');
      }
    }
  };

  // Handler Aksi Menyimpan / Mengedit Data Eksemplar ke Supabase
  const handleSaveEksemplar = async (dataEksemplar: Eksemplar) => {
    if (!bookToEdit?.id) return;
    
    try {
      if (dataEksemplar.id) {
        // Aksi UPDATE eksemplar
        const { error } = await supabase
          .from('eksemplar')
          .update({
            nomor_panggil: dataEksemplar.nomor_panggil,
            lokasi_rak: dataEksemplar.lokasi_rak,
            status: dataEksemplar.status,
            status_audit: dataEksemplar.status_audit,
            kode: dataEksemplar.kode
          })
          .eq('id', dataEksemplar.id);

        if (error) throw error;
      } else {
        // Aksi INSERT eksemplar baru
        const { error } = await supabase
          .from('eksemplar')
          .insert([{ ...dataEksemplar, biblio_id: bookToEdit.id }]);

        if (error) throw error;
      }
      // Re-fetch data eksemplar terbaru agar state UI tersinkronisasi sempurna
      await fetchEksemplars(bookToEdit.id);
    } catch (err) {
      console.error('Gagal menyimpan data eksemplar:', err);
      alert('Terjadi kesalahan database saat menyimpan eksemplar.');
      throw err;
    }
  };

  // Handler Aksi Menghapus Item Eksemplar dari Supabase
  const handleDeleteEksemplar = async (eksemplarId: string) => {
    if (!bookToEdit?.id) return;
    if (!confirm('Apakah Anda yakin ingin menghapus kode eksemplar ini?')) return;

    try {
      const { error } = await supabase
        .from('eksemplar')
        .delete()
        .eq('id', eksemplarId);

      if (error) throw error;
      // Re-fetch data setelah proses hapus berhasil dilakukan
      await fetchEksemplars(bookToEdit.id);
    } catch (err) {
      console.error('Gagal menghapus eksemplar:', err);
      alert('Terjadi kesalahan database saat menghapus eksemplar.');
    }
  };

  return (
    <main className="min-h-screen bg-[#0b0c10] text-slate-100 p-4 sm:p-6 pb-24">
      <div className="w-full max-w-7xl mx-auto flex flex-col">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight text-slate-100">Manajemen Bibliografi</h1>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1">Kelola, edit, dan perbarui katalog buku perpustakaan.</p>
          </div>
          
          {/* TOMBOL TAMBAH BUKU (TIMBUL + CURSOR POINTER) */}
          <button 
            onClick={handleAddBook}
            className="inline-flex items-center justify-center gap-2 h-11 px-5 text-xs font-extrabold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 rounded-xl transition-all duration-200 border border-cyan-500/30 shadow-lg shadow-cyan-500/10 hover:shadow-cyan-500/20 cursor-pointer active:translate-y-0.5"
          >
            <Plus className="h-4 w-4" />
            Tambah Buku
          </button>
        </div>

        {/* SEARCH BAR (TIMBUL) */}
        <div className="relative w-full mb-8">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari bibliografi berdasarkan judul, penulis, atau ISBN..."
            className="w-full h-11 pl-11 pr-4 text-xs font-medium bg-slate-950 text-slate-100 placeholder-slate-500 rounded-xl outline-none border border-slate-800/80 shadow-lg shadow-black/40 focus:bg-slate-900 focus:border-cyan-500/50 focus:shadow-cyan-500/10 transition-all duration-200"
          />
          <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-500 pointer-events-none" />
        </div>

        {/* STATE KOSONG */}
        {!loading && books.length === 0 && (
          <div className="py-20 flex flex-col items-center justify-center text-center px-4">
            <div className="p-4 bg-slate-950 rounded-full text-slate-500 mb-4 border border-slate-800 shadow-md">
              <BookX className="h-10 w-10 stroke-[1.5]" />
            </div>
            <h3 className="text-sm font-bold text-slate-200 mb-1">Tidak Ada Koleksi</h3>
            <p className="text-xs text-slate-500 max-w-sm">
              Tidak ditemukan data bibliografi yang cocok dengan pencarian Anda.
            </p>
          </div>
        )}

        {/* GRID KATALOG BUKU */}
        {books.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {books.map((book, index) => {
              const isLastElement = books.length === index + 1;

              return (
                <div
                  key={book.id}
                  ref={isLastElement ? lastBookElementRef : null}
                  onClick={() => setSelectedBook(book)}
                  className="bg-transparent flex flex-col transition-all duration-200 group relative cursor-pointer"
                >
                  {/* KOTAK SAMPUL DENGAN SUDUT BULAT */}
                  <div className="relative aspect-[3/4] bg-slate-900 overflow-hidden rounded-2xl border border-slate-800/80 shadow-md group-hover:border-slate-700 transition-all">
                    {book.sampul_url ? (
                      <LazyImage src={book.sampul_url} alt={book.judul} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs font-semibold text-slate-600">
                        Tanpa Sampul
                      </div>
                    )}

                    {/* OVERLAY ACTION BUTTONS */}
                    <div className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-3 transition-opacity duration-200">
                      <button
                        onClick={(e) => handleEditBook(e, book)}
                        className="p-2.5 bg-slate-900 text-cyan-400 rounded-xl hover:bg-cyan-500/20 hover:scale-105 transition-all shadow-md cursor-pointer"
                        title="Edit Data"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteBook(e, book.id)}
                        className="p-2.5 bg-slate-900 text-rose-400 rounded-xl hover:bg-rose-500/20 hover:scale-105 transition-all shadow-md cursor-pointer"
                        title="Hapus Buku"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* DETAIL INFORMASI BUKU */}
                  <div className="pt-3.5 pb-1 flex flex-col flex-grow justify-between bg-transparent">
                    <div>
                      <span className="inline-block px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-cyan-500/10 text-cyan-400 rounded mb-2">
                        {book.kategori || 'Umum'}
                      </span>
                      <h2 className="text-xs font-bold text-slate-100 line-clamp-2 leading-snug group-hover:text-cyan-400 transition-colors">
                        {book.judul}
                      </h2>
                    </div>
                    
                    <div className="mt-2.5 flex items-center justify-between">
                      <p className="text-[11px] font-semibold text-slate-400 truncate max-w-[70%]">
                        {book.penulis || 'Anonim'}
                      </p>
                      <p className="text-[10px] text-slate-500 font-bold tabular-nums">
                        {book.tahun_terbit || '-'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

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

        {/* MODAL FORM EDIT / TAMBAH */}
        <BookFormModal
          isOpen={isFormOpen}
          bookToEdit={bookToEdit}
          eksemplarList={eksemplarList}
          onSubmitEksemplar={handleSaveEksemplar}
          onDeleteEksemplar={handleDeleteEksemplar}
          onClose={() => {
            setIsFormOpen(false);
            setEksemplarList([]);
          }}
          onSubmit={handleFormSubmit}
        />
        
      </div>
    </main>
  );
}