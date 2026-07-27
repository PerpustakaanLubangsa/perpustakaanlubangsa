'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { User, Calendar, Tag, Loader2, Search, X, Share2, Heart, Feather, ChevronLeft } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface KaryaTulisItem {
  id: string;
  anggota_id: string;
  kategori: string;
  judul: string;
  isi: string;
  dibuat_pada: string;
  foto_url: string | null;
  penulis: string | null;
  slug: string | null;
}

// ----------------------------------------------------
// Sub-Komponen Card dengan React.memo untuk mencegah
// re-render massal saat state lain berubah.
// ----------------------------------------------------
const KaryaCard = React.memo(({
  karya,
  isLiked,
  isBrokenImage,
  onSelect,
  onToggleLike,
  onErrorImage,
}: {
  karya: KaryaTulisItem;
  isLiked: boolean;
  isBrokenImage: boolean;
  onSelect: (karya: KaryaTulisItem) => void;
  onToggleLike: (e: React.MouseEvent, id: string) => void;
  onErrorImage: (id: string) => void;
}) => {
  const hasNoImage = !karya.foto_url || isBrokenImage;

  return (
    <div
      onClick={() => onSelect(karya)}
      className="break-inside-avoid group relative rounded-2xl sm:rounded-3xl overflow-hidden bg-zinc-900 border border-zinc-800/80 cursor-pointer transition-transform duration-150 hover:-translate-y-1 mb-4"
    >
      {!hasNoImage ? (
        <div className="w-full relative overflow-hidden bg-zinc-950">
          <img
            src={karya.foto_url!}
            alt={karya.judul}
            loading="lazy"
            decoding="async"
            onError={() => onErrorImage(karya.id)}
            className="w-full h-auto object-cover transition-transform duration-200 group-hover:scale-105"
          />

          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-150 p-3 flex flex-col justify-between">
            <div className="flex justify-between items-center">
              <span className="px-2.5 py-1 rounded-full bg-black/80 text-zinc-200 text-[10px] font-bold tracking-wide uppercase border border-white/10">
                {karya.kategori}
              </span>
              <button
                onClick={(e) => onToggleLike(e, karya.id)}
                className="p-2 rounded-full bg-black/80 hover:scale-105 transition-transform text-white"
              >
                <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-red-500 text-red-500' : 'text-white'}`} />
              </button>
            </div>

            <button className="w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded-full text-xs font-bold shadow-lg transition-colors">
              Baca Karya
            </button>
          </div>
        </div>
      ) : (
        <div className="p-5 bg-gradient-to-br from-zinc-900 to-zinc-950 min-h-[160px] flex flex-col justify-between">
          <span className="px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-300 text-[9px] font-bold uppercase tracking-wider w-fit">
            {karya.kategori}
          </span>
          <p className="text-xs font-semibold text-zinc-300 line-clamp-4 leading-relaxed my-2 italic">
            "{karya.isi}"
          </p>
          <div className="text-[10px] font-bold text-zinc-500 flex items-center gap-1 pt-2 border-t border-zinc-800/60">
            <User className="w-3 h-3 text-zinc-400" />
            <span className="truncate">{karya.penulis || 'Anonim'}</span>
          </div>
        </div>
      )}

      <div className="p-3 bg-zinc-900">
        <h3 className="text-xs font-black text-zinc-100 line-clamp-2 leading-snug group-hover:text-red-400 transition-colors">
          {karya.judul}
        </h3>
        <div className="mt-2 flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-[9px] text-zinc-300">
            {(karya.penulis || 'A').charAt(0).toUpperCase()}
          </div>
          <span className="text-[10px] font-medium text-zinc-400 truncate">
            {karya.penulis || 'Anonim'}
          </span>
        </div>
      </div>
    </div>
  );
});

KaryaCard.displayName = 'KaryaCard';

// ----------------------------------------------------
// Komponen Utama Halaman
// ----------------------------------------------------
export default function KaryaTulisPage() {
  const [karyaList, setKaryaList] = useState<KaryaTulisItem[]>([]);
  const [selectedKarya, setSelectedKarya] = useState<KaryaTulisItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});
  
  // State Input & Debounce State
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [likedCards, setLikedCards] = useState<Record<string, boolean>>({});

  // 1. Logika Debounce untuk Pencarian (Delay 300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  // 2. Fetching Data
  useEffect(() => {
    let isMounted = true;
    const fetchKarya = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('karya')
          .select('id, anggota_id, kategori, judul, isi, dibuat_pada, foto_url, penulis, slug')
          .order('dibuat_pada', { ascending: false });

        if (error) throw error;
        if (isMounted) {
          setKaryaList(data || []);
        }
      } catch (err) {
        console.error('Gagal memuat karya tulis:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchKarya();
    return () => {
      isMounted = false;
    };
  }, []);

  // Memoisasi Kategori
  const categories = useMemo(() => {
    const set = new Set(karyaList.map((k) => k.kategori).filter(Boolean));
    return ['Semua', ...Array.from(set)];
  }, [karyaList]);

  // Memoisasi Hasil Filter berdasarkan Debounced Value
  const filteredList = useMemo(() => {
    let result = karyaList;

    if (selectedCategory !== 'Semua') {
      result = result.filter((item) => item.kategori === selectedCategory);
    }

    const q = debouncedSearchQuery.trim().toLowerCase();
    if (q !== '') {
      result = result.filter(
        (item) =>
          item.judul.toLowerCase().includes(q) ||
          (item.penulis && item.penulis.toLowerCase().includes(q)) ||
          item.isi.toLowerCase().includes(q)
      );
    }

    return result;
  }, [debouncedSearchQuery, selectedCategory, karyaList]);

  // Handlers yang Dioptimasi
  const handleImageError = useCallback((id: string) => {
    setBrokenImages((prev) => (prev[id] ? prev : { ...prev, [id]: true }));
  }, []);

  const toggleLike = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setLikedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const handleSelectKarya = useCallback((karya: KaryaTulisItem) => {
    setSelectedKarya(karya);
  }, []);

  return (
    <div className="bg-zinc-950 min-h-screen w-full text-zinc-100 flex flex-col font-sans selection:bg-red-600 selection:text-white">
      {/* ================= HEADER ================= */}
      <header className="sticky top-0 z-30 bg-zinc-950/98 border-b border-zinc-800/60 px-4 sm:px-8 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors flex items-center justify-center"
              aria-label="Kembali ke Halaman Utama"
            >
              <ChevronLeft className="w-6 h-6" />
            </Link>

            <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center font-black text-white text-lg shadow-lg shadow-red-600/30">
              <Feather className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-white uppercase">Galeri Karya</h1>
              <p className="text-[11px] font-medium text-zinc-400">Inspirasi & Gagasan Anggota</p>
            </div>
          </div>

          <div className="relative w-full md:w-1/2">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari ide, judul karya, atau penulis..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-full pl-11 pr-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 focus:bg-zinc-800 transition-colors shadow-inner"
            />
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-zinc-400 bg-zinc-900 border border-zinc-800/80 px-3.5 py-1.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{karyaList.length} Karya Tulis</span>
          </div>
        </div>
      </header>

      {/* ================= MAIN CONTENT ================= */}
      <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto space-y-6">
        {/* Filter Kategori */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all duration-150 whitespace-nowrap cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-zinc-100 text-zinc-950 shadow-md font-extrabold'
                  : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 border border-zinc-800/60'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="w-full h-96 flex flex-col justify-center items-center gap-3">
            <Loader2 className="h-8 w-8 text-red-600 animate-spin" />
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Menyiapkan Pin...</span>
          </div>
        ) : filteredList.length > 0 ? (
          /* MASONRY GRID dengan optimasi render */
          <div 
            className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-4"
            style={{ contentVisibility: 'auto' }}
          >
            {filteredList.map((karya) => (
              <KaryaCard
                key={karya.id}
                karya={karya}
                isLiked={!!likedCards[karya.id]}
                isBrokenImage={!!brokenImages[karya.id]}
                onSelect={handleSelectKarya}
                onToggleLike={toggleLike}
                onErrorImage={handleImageError}
              />
            ))}
          </div>
        ) : (
          <div className="w-full h-80 flex flex-col items-center justify-center text-center p-6 gap-2">
            <Search className="w-10 h-10 text-zinc-700" />
            <p className="text-sm font-bold text-zinc-500">Tidak ada pin yang cocok dengan pencarianmu</p>
          </div>
        )}
      </main>

      {/* ================= MODAL DETAIL KARYA ================= */}
      {selectedKarya && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto"
          onClick={() => setSelectedKarya(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col md:flex-row relative"
          >
            <button
              onClick={() => setSelectedKarya(null)}
              className="absolute top-4 right-4 z-20 p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-full md:w-1/2 bg-black flex items-center justify-center p-4 min-h-[280px] max-h-[500px] md:max-h-none overflow-hidden">
              {selectedKarya.foto_url && !brokenImages[selectedKarya.id] ? (
                <img
                  src={selectedKarya.foto_url}
                  alt={selectedKarya.judul}
                  className="w-full h-full object-contain rounded-2xl max-h-[70vh]"
                />
              ) : (
                <div className="p-8 text-center space-y-3">
                  <Tag className="w-10 h-10 text-zinc-700 mx-auto" />
                  <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Karya Teks Tulis</p>
                </div>
              )}
            </div>

            <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col justify-between overflow-y-auto custom-scrollbar max-h-[60vh] md:max-h-[85vh]">
              <div className="space-y-6">
                <div className="flex items-center justify-between pr-8">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => toggleLike(e, selectedKarya.id)}
                      className="p-2.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                    >
                      <Heart className={`w-4 h-4 ${likedCards[selectedKarya.id] ? 'fill-red-500 text-red-500' : ''}`} />
                    </button>
                    <button className="p-2.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors">
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-zinc-800 text-red-400 text-[10px] font-black uppercase tracking-wider">
                    {selectedKarya.kategori}
                  </span>
                </div>

                <h2 className="text-xl md:text-2xl font-black text-white leading-snug">
                  {selectedKarya.judul}
                </h2>

                <div className="flex items-center justify-between border-y border-zinc-800 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-red-600/20 border border-red-500/30 flex items-center justify-center font-black text-red-400 text-xs">
                      {(selectedKarya.penulis || 'A').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-zinc-200">{selectedKarya.penulis || 'Anonim'}</p>
                      <p className="text-[10px] text-zinc-500">Penulis Karya</p>
                    </div>
                  </div>
                  <span className="flex items-center gap-1 text-[10px] font-bold text-zinc-500">
                    <Calendar className="w-3 h-3 text-zinc-600" />
                    {new Date(selectedKarya.dibuat_pada).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>

                <div className="text-sm text-zinc-300 leading-relaxed font-normal whitespace-pre-line">
                  {selectedKarya.isi}
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-zinc-800/80 flex items-center justify-between">
                <span className="text-[10px] font-semibold text-zinc-500">
                  ID: {selectedKarya.id.slice(0, 8)}...
                </span>
                <button
                  onClick={() => setSelectedKarya(null)}
                  className="px-5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-full text-xs font-bold transition-colors cursor-pointer"
                >
                  Tutup Pin
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}