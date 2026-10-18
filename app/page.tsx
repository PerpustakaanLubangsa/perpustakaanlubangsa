'use client';

import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import {
  Loader2,
  BookX,
  Image as ImageIcon,
  BookOpenText,
  ArrowUp,
  MapPin,
  Eye,
  BookMarked,
  Flame,
} from 'lucide-react';
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
  // Data eksemplar (dihitung dari tabel `eksemplar`).
  // undefined = data eksemplar belum tersedia / gagal dimuat
  eks_total?: number;
  eks_tersedia?: number;
  eks_rak?: string[];
}

interface StockInfo {
  total: number;
  tersedia: number;
  rak: string[];
}

const ITEMS_PER_PAGE = 25;

// Batas maksimum hasil yang dikembalikan fungsi SQL search_biblio per pencarian
const SEARCH_MAX_RESULTS = 1000;

// Jarak scroll (px) sebelum tombol "ke atas" muncul
const SCROLL_TOP_THRESHOLD = 400;

// Jumlah maksimum rak yang ditampilkan di kartu (sisanya jadi "+N")
const MAX_RAK_SHOWN = 2;

// Kolom hasil penjumlahan jumlah_baca + jumlah_pinjam (kolom generated di tabel biblio).
// Dipakai untuk mengurutkan katalog dari yang paling banyak disentuh pengunjung.
const KOLOM_TOTAL = 'total_interaksi';

const BOOK_COLUMNS =
  'id, judul, penulis, isbn_issn, penerbit, tahun_terbit, deskripsi_fisik, sampul_url, abstrak, kategori, topik, created_at, updated_at, jumlah_baca, jumlah_pinjam, total_interaksi';

// Animasi api: bergoyang dan berdenyut dari pangkal ikon, seperti nyala api.
// Dimatikan otomatis bagi pengguna yang memilih "kurangi gerakan".
const API_CSS = `
  @keyframes api-menyala {
    0%, 100% { transform: scale(1, 1) rotate(-5deg); }
    20%      { transform: scale(1.1, 1.22) rotate(4deg) translateY(-0.5px); }
    40%      { transform: scale(0.93, 1.05) rotate(-3deg); }
    60%      { transform: scale(1.12, 1.26) rotate(5deg) translateY(-0.5px); }
    80%      { transform: scale(0.97, 1.1) rotate(-4deg); }
  }
  @keyframes api-cahaya {
    0%, 100% { filter: drop-shadow(0 0 1px rgba(253, 224, 71, 0.5)); }
    50%      { filter: drop-shadow(0 0 4px rgba(253, 224, 71, 0.95)); }
  }
  .api-bergerak {
    transform-origin: 50% 90%;
    animation:
      api-menyala 0.9s ease-in-out infinite,
      api-cahaya 1.3s ease-in-out infinite;
  }
  @media (prefers-reduced-motion: reduce) {
    .api-bergerak { animation: none; }
  }
`;

// Total sentuhan pengunjung = dibaca + dipinjam
const totalSentuhan = (b: { jumlah_baca?: number | null; jumlah_pinjam?: number | null }) =>
  (b.jumlah_baca ?? 0) + (b.jumlah_pinjam ?? 0);

const fmt = (n: number) => n.toLocaleString('id-ID');

// Ambil & hitung eksemplar (jumlah tersedia + daftar rak) untuk sekumpulan buku sekaligus (1 query)
async function fetchStockMap(bookIds: string[]): Promise<Map<string, StockInfo>> {
  const stockMap = new Map<string, StockInfo>();
  if (bookIds.length === 0) return stockMap;

  // Default: semua buku dianggap punya 0 eksemplar
  bookIds.forEach((id) => stockMap.set(id, { total: 0, tersedia: 0, rak: [] }));

  const { data, error } = await supabase
    .from('eksemplar')
    .select('biblio_id, status, lokasi_rak')
    .in('biblio_id', bookIds)
    .limit(10000);

  if (error) throw error;

  (data || []).forEach(
    (row: { biblio_id: string | null; status: string | null; lokasi_rak: string | null }) => {
      if (!row.biblio_id) return;
      const entry = stockMap.get(row.biblio_id);
      if (!entry) return;

      entry.total += 1;

      // Status hanya "Tersedia" atau "Dipinjam"
      if ((row.status || '').trim().toLowerCase() !== 'dipinjam') {
        entry.tersedia += 1;
      }

      // Kumpulkan rak unik (abaikan yang kosong)
      const rak = (row.lokasi_rak || '').trim();
      if (rak && !entry.rak.includes(rak)) {
        entry.rak.push(rak);
      }
    }
  );

  // Urutkan nama rak agar tampilan konsisten
  stockMap.forEach((entry) => entry.rak.sort((a, b) => a.localeCompare(b, 'id', { numeric: true })));

  return stockMap;
}

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

// Tombol kembali ke atas (muncul di pojok kanan bawah saat halaman di-scroll)
const ScrollToTopButton = memo(function ScrollToTopButton() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > SCROLL_TOP_THRESHOLD);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleClick = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Kembali ke atas"
      title="Kembali ke atas"
      tabIndex={isVisible ? 0 : -1}
      aria-hidden={!isVisible}
      className={`fixed bottom-5 right-5 sm:bottom-8 sm:right-8 z-40 inline-flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-900/20 transition-all duration-200 hover:bg-blue-700 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 cursor-pointer ${
        isVisible
          ? 'opacity-100 translate-y-0 pointer-events-auto'
          : 'opacity-0 translate-y-3 pointer-events-none'
      }`}
    >
      <ArrowUp className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2.2} />
    </button>
  );
});

// Label status di pojok kiri atas sampul:
// - "Tersedia · N" (hijau) jika masih ada eksemplar tersedia, N = jumlah tersedia
// - "Dipinjam" (kuning) jika semua eksemplar sedang dipinjam
// - "Belum ada eksemplar" (abu-abu) jika belum ada data eksemplar
const StatusBadge = memo(function StatusBadge({ book }: { book: Book }) {
  if (book.eks_total === undefined) return null;

  const tersedia = book.eks_tersedia ?? 0;

  let content: React.ReactNode;
  let style: string;

  if (book.eks_total === 0) {
    content = 'Belum ada eksemplar';
    style = 'bg-slate-600 text-white';
  } else if (tersedia === 0) {
    content = 'Dipinjam';
    style = 'bg-amber-500 text-white';
  } else {
    content = (
      <>
        Tersedia
        <span className="rounded bg-white/25 px-1 text-[10px] leading-4">{tersedia}</span>
      </>
    );
    style = 'bg-emerald-600 text-white';
  }

  return (
    <span
      className={`absolute top-2 left-2 z-10 inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide shadow-md ${style}`}
    >
      {content}
    </span>
  );
});

// Label total disentuh di pojok kanan atas sampul (api bergerak bila total > 0)
const TotalBadge = memo(function TotalBadge({ book }: { book: Book }) {
  const total = totalSentuhan(book);
  const aktif = total > 0;

  return (
    <span
      title={`Disentuh pengunjung ${fmt(total)} kali (dibaca + dipinjam)`}
      aria-label={`Disentuh pengunjung ${fmt(total)} kali`}
      className={`absolute top-2 right-2 z-10 inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wide shadow-md ${
        aktif
          ? 'bg-gradient-to-br from-orange-500 to-red-500 text-white'
          : 'bg-slate-500/90 text-white'
      }`}
    >
      <Flame
        className={`h-3.5 w-3.5 ${aktif ? 'api-bergerak text-yellow-200' : ''}`}
        strokeWidth={2.4}
        fill={aktif ? 'currentColor' : 'none'}
      />
      {fmt(total)}
    </span>
  );
});

// Statistik rinci: dibaca dan dipinjam
const StatSentuhan = memo(function StatSentuhan({ book }: { book: Book }) {
  const baca = book.jumlah_baca ?? 0;
  const pinjam = book.jumlah_pinjam ?? 0;

  return (
    <div
      className="mt-2 flex items-center gap-3 text-[11px] font-medium text-slate-500"
      title={`Dibaca ${fmt(baca)} kali, dipinjam ${fmt(pinjam)} kali`}
    >
      <span className="inline-flex items-center gap-1">
        <Eye className="h-3 w-3 shrink-0 text-blue-500" strokeWidth={2.2} />
        {fmt(baca)} dibaca
      </span>
      <span className="inline-flex items-center gap-1">
        <BookMarked className="h-3 w-3 shrink-0 text-blue-500" strokeWidth={2.2} />
        {fmt(pinjam)} dipinjam
      </span>
    </div>
  );
});

// Informasi lokasi rak buku
const RakInfo = memo(function RakInfo({ book }: { book: Book }) {
  const raks = book.eks_rak ?? [];
  if (raks.length === 0) return null;

  const shown = raks.slice(0, MAX_RAK_SHOWN);
  const extra = raks.length - shown.length;

  return (
    <div
      className="mt-2 flex items-center gap-1 text-[11px] font-medium text-slate-500"
      title={`Rak: ${raks.join(', ')}`}
    >
      <MapPin className="h-3 w-3 shrink-0 text-blue-500" strokeWidth={2.2} />
      <span className="truncate">Rak {shown.join(', ')}</span>
      {extra > 0 && (
        <span className="shrink-0 rounded bg-slate-100 px-1 text-[10px] font-semibold text-slate-600">
          +{extra}
        </span>
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

            {/* Label status ketersediaan (pojok kiri atas sampul) */}
            <StatusBadge book={book} />

            {/* Label total disentuh (pojok kanan atas sampul) */}
            <TotalBadge book={book} />
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
            <div>
              <p className="text-xs sm:text-[13px] text-slate-600 mt-1.5 truncate font-medium">
                {book.penulis || 'Anonim'}
              </p>

              {/* Statistik dibaca / dipinjam */}
              <StatSentuhan book={book} />

              {/* Informasi lokasi rak */}
              <RakInfo book={book} />
            </div>
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
  const [searchQuery, setSearchQuery] = useState(''); // teks di input (tidak memicu pencarian)
  const [activeSearch, setActiveSearch] = useState(''); // kata kunci yang benar-benar dicari
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [currentSearchedTerm, setCurrentSearchedTerm] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [isSearchingUI, setIsSearchingUI] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);

  const observer = useRef<IntersectionObserver | null>(null);
  const pageRef = useRef(0);
  const requestIdRef = useRef(0);

  // Hasil pencarian (sudah diurutkan) disimpan sementara supaya halaman berikutnya
  // tidak mengambil ulang seluruh hasil dari server.
  const searchCacheRef = useRef<{ key: string; rows: any[] } | null>(null);

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

  // Fungsi Fetch Data dari Supabase
  const fetchBooks = useCallback(
    async (currentPage: number, search: string, category: string, isNewSearch = false) => {
      const requestId = ++requestIdRef.current;
      setLoading(true);

      try {
        const from = currentPage * ITEMS_PER_PAGE;
        const to = from + ITEMS_PER_PAGE - 1;

        let data: any[] | null = null;

        if (search) {
          // Pencarian judul + penulis + topik lewat fungsi SQL search_biblio.
          // Seluruh hasil (maks. SEARCH_MAX_RESULTS) diambil sekali, diurutkan dari
          // total baca + pinjam terbanyak, lalu dipotong per halaman di sini.
          const cacheKey = `${search}||${category}`;
          let sorted: any[];

          if (!isNewSearch && searchCacheRef.current?.key === cacheKey) {
            sorted = searchCacheRef.current.rows;
          } else {
            let query: any = supabase.rpc('search_biblio', { q: search, lim: SEARCH_MAX_RESULTS });

            if (category !== 'Semua') {
              query = query.eq('kategori', category);
            }

            const res = await query;
            if (res.error) throw res.error;

            // Sort bawaan JavaScript stabil: yang totalnya sama tetap dalam urutan relevansi
            sorted = [...((res.data as any[] | null) ?? [])].sort(
              (a, b) => totalSentuhan(b) - totalSentuhan(a)
            );

            if (requestId === requestIdRef.current) {
              searchCacheRef.current = { key: cacheKey, rows: sorted };
            }
          }

          data = sorted.slice(from, to + 1);
        } else {
          // Tanpa kata kunci: paling banyak disentuh pengunjung di atas.
          // created_at dan id sebagai pembanding agar urutan stabil saat paginasi.
          let query = supabase
            .from('biblio')
            .select(BOOK_COLUMNS)
            .order(KOLOM_TOTAL, { ascending: false, nullsFirst: false })
            .order('created_at', { ascending: false })
            .order('id', { ascending: false })
            .range(from, to);

          if (category !== 'Semua') {
            query = query.eq('kategori', category);
          }

          const res = await query;
          if (res.error) throw res.error;
          data = res.data as any[] | null;
        }

        // Abaikan respons usang (user sudah mencari hal lain)
        if (requestId !== requestIdRef.current) return;

        if (data) {
          // Ambil data eksemplar untuk buku di halaman ini.
          // Jika gagal, buku tetap tampil tanpa label status & rak.
          let stockMap = new Map<string, StockInfo>();
          try {
            stockMap = await fetchStockMap(data.map((b) => b.id).filter(Boolean));
          } catch (stockErr) {
            console.error('Gagal memuat data eksemplar:', stockErr);
          }

          // Cek ulang: respons bisa usang selama menunggu data eksemplar
          if (requestId !== requestIdRef.current) return;

          const mappedData: Book[] = data.map((b) => {
            const stock = stockMap.get(b.id);
            return {
              ...b,
              jumlah_baca: b.jumlah_baca ?? 0,
              jumlah_pinjam: b.jumlah_pinjam ?? 0,
              topik: Array.isArray(b.topik) ? b.topik : [],
              eks_total: stock?.total,
              eks_tersedia: stock?.tersedia,
              eks_rak: stock?.rak,
            };
          });

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
        if (requestId === requestIdRef.current && isNewSearch) {
          setBooks([]);
          setHasMore(false);
          setCurrentSearchedTerm(search);
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
          setIsSearchingUI(false);
        }
      }
    },
    []
  );

  // Reset & Fetch ulang saat kata kunci yang dicari atau kategori berubah
  useEffect(() => {
    pageRef.current = 0;
    setHasMore(true);
    fetchBooks(0, activeSearch, selectedCategory, true);
  }, [activeSearch, selectedCategory, fetchBooks]);

  // Infinite Scroll Intersection Observer
  const lastBookElementRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (loading) return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasMore) {
            const nextPage = pageRef.current + 1;
            pageRef.current = nextPage;
            fetchBooks(nextPage, activeSearch, selectedCategory, false);
          }
        },
        { rootMargin: '300px' }
      );

      if (node) observer.current.observe(node);
    },
    [loading, hasMore, activeSearch, selectedCategory, fetchBooks]
  );

  // Mengetik hanya memperbarui teks input, tidak mencari
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
  }, []);

  // Pencarian berjalan hanya saat klik Cari, Enter, atau memilih saran
  const handleSearch = useCallback(
    (query: string) => {
      const term = query.trim();
      if (term === activeSearch) return; // kata kunci sama: tidak perlu mencari ulang
      setIsSearchingUI(true);
      setActiveSearch(term);
    },
    [activeSearch]
  );

  const handleSelectBook = useCallback((book: Book) => {
    setSelectedBook(book);
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 via-slate-50 to-white text-slate-900 antialiased">
      <style>{API_CSS}</style>

      {/* --- HEADER + HERO + PENCARIAN --- */}
      <HeroSearch
        categories={categories}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        onSearch={handleSearch}
        isSearching={isSearchingUI}
      />

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
              {hasMore ? '+' : ''}
            </p>
          </div>
        )}

        {/* Keterangan urutan */}
        {books.length > 0 && (
          <p className="mb-4 flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <Flame className="api-bergerak h-3.5 w-3.5 text-orange-500" strokeWidth={2.2} />
            Diurutkan dari yang paling banyak disentuh pengunjung (dibaca + dipinjam)
          </p>
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

      {/* --- TOMBOL KEMBALI KE ATAS --- */}
      <ScrollToTopButton />
    </main>
  );
}