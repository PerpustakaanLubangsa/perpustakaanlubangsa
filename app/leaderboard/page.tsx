'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { 
  Loader2, 
  ChevronRight, 
  Search, 
  ArrowLeft, 
  Trophy, 
  Crown, 
  Sparkles, 
  BookOpen, 
  Bookmark, 
  Zap,
  Building,
  CheckCircle2,
  SearchX,
  Medal,
  X
} from 'lucide-react';

import ProfileDetailView from '@/components/ProfileDetailView';

// Inisialisasi Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface RankingItem {
  id: string;
  nis: string;
  nama: string;
  organisasi: string;
  kamar: string;
  total_poin: number;
  rank: string;
  avatar_rank: string;
  jenjang?: string;
  total_baca?: number;
  total_pinjam?: number;
  total_kunjungan?: number;
  poin_tambahan?: number;
}

export default function LeaderboardPage() {
  const [rankings, setRankings] = useState<RankingItem[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [searchInput, setSearchInput] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  
  const [page, setPage] = useState(0);
  const [isLastPage, setIsLastPage] = useState(false);
  const itemsPerPage = 18; 
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const [selectedUser, setSelectedUser] = useState<RankingItem | null>(null);

  // Kunci scroll saat modal profil terbuka
  useEffect(() => {
    if (selectedUser) {
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }
    return () => {
      document.body.classList.remove('overflow-hidden');
    };
  }, [selectedUser]);

  // Debounce input pencarian
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchInput);
    }, 250);

    return () => clearTimeout(handler);
  }, [searchInput]);

  const fetchRankings = async (targetPage: number, isRefresh = false) => {
    if (loading || (isLastPage && !isRefresh)) return;
    setLoading(true);
    
    try {
      const from = targetPage * itemsPerPage;
      const to = from + itemsPerPage - 1;

      const { data, error } = await supabase
        .from('view_profil_anggota')
        .select('*')
        .order('total_poin', { ascending: false })
        .range(from, to);

      if (error) throw error;

      if (data) {
        if (data.length < itemsPerPage || data.length === 0) {
          setIsLastPage(true);
        }
        
        setRankings((prev) => {
          if (isRefresh) return data as RankingItem[];
          const existingIds = new Set(prev.map(item => item.id));
          const filteredNewData = data.filter(item => !existingIds.has(item.id));
          return [...prev, ...filteredNewData] as RankingItem[];
        });
        setPage(targetPage + 1);
      }
    } catch (err) {
      console.error('Gagal memuat peringkat:', err);
    } finally {
      setLoading(false);
    }
  };

  // Intersection Observer untuk Infinite Scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading && !isLastPage && debouncedQuery === '') {
          fetchRankings(page);
        }
      },
      { rootMargin: '150px', threshold: 0.1 }
    );
    if (loadMoreRef.current) observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [page, loading, isLastPage, debouncedQuery]);

  // Initial Fetch & Realtime Subscription
  useEffect(() => {
    fetchRankings(0, true);
    const channel = supabase
      .channel('ranking-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mutasi_poin' }, () => {
        setIsLastPage(false);
        fetchRankings(0, true);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Handler Tutup Modal via Tombol ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedUser(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Render Badge Tanpa Efek Glow/Blur
  const getRankBadge = (avatarUrl: string, sizeClass = "w-14 h-14 md:w-16 md:h-16") => {
    const defaultBadge = '/image/profile/default-badge.png';
    return (
      <div className="relative shrink-0 flex items-center justify-center">
        <img 
          src={avatarUrl || defaultBadge} 
          className={`${sizeClass} relative z-10 object-contain`} 
          alt="Rank Badge" 
          loading="lazy" 
        />
      </div>
    );
  };

  // Optimized Filter dengan useMemo
  const filteredRankings = useMemo(() => {
    if (!debouncedQuery) return rankings;
    const query = debouncedQuery.toLowerCase();
    return rankings.filter((item) => 
      item.nama?.toLowerCase().includes(query) ||
      item.nis?.toLowerCase().includes(query)
    );
  }, [rankings, debouncedQuery]);

  const topThree = useMemo(() => rankings.slice(0, 3), [rankings]);

  return (
    <div className="bg-[#0b0c10] min-h-screen w-full p-3 md:p-6 text-slate-100 flex flex-col justify-between overflow-x-hidden relative">
      
      <div className="max-w-7xl w-full mx-auto space-y-4 md:space-y-6 relative z-10">
        
        {/* HEADER BAR (Solid, No Blur) */}
        <div className="bg-slate-900 border border-slate-800 p-4 md:p-6 rounded-2xl shadow-md">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="flex items-center justify-center p-3 bg-slate-800 border border-cyan-500/40 rounded-xl">
                <Trophy className="h-6 w-6 text-cyan-400" />
              </div>

              <div>
                <h1 className="text-lg md:text-xl font-black text-white tracking-wider uppercase flex items-center gap-2">
                  Papan Peringkat
                  <Sparkles className="w-4 h-4 text-amber-400 fill-amber-400" />
                </h1>
                <p className="text-xs text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                  <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
                  Pembaca & Pengunjung Teraktif Perpustakaan
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative flex-1 md:w-72">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama atau NIS santri..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-medium focus:outline-none focus:border-cyan-500 text-slate-100 placeholder:text-slate-500"
                />
              </div>

              <Link
                href="/"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white border border-slate-700 transition-colors shrink-0"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Kembali</span>
              </Link>
            </div>
          </div>
        </div>

        {/* TOP 3 PODIUM ARENA (Solid Rendering) */}
        {debouncedQuery === '' && topThree.length >= 3 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-6 shadow-lg">
            <div className="text-center mb-6">
              <span className="inline-flex items-center gap-1.5 text-[10px] md:text-xs font-black uppercase tracking-widest px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-full">
                Top Performers Arena
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2.5 md:gap-6 items-end max-w-4xl mx-auto">
              
              {/* RANK 2 - SILVER */}
              <div 
                onClick={() => setSelectedUser(topThree[1])}
                className="bg-slate-950 border border-slate-700 hover:border-cyan-400 rounded-xl p-3 md:p-5 text-center cursor-pointer transition-colors shadow-md flex flex-col items-center justify-between"
              >
                <div className="w-full flex flex-col items-center">
                  <div className="bg-slate-800 border border-slate-500 text-slate-200 text-[10px] md:text-xs font-black px-2.5 py-0.5 rounded-full mb-2 flex items-center gap-1">
                    <Medal className="w-3 h-3 text-slate-300" />
                    <span>#2</span>
                  </div>
                  <div className="my-2">
                    {getRankBadge(topThree[1].avatar_rank, "w-14 h-14 md:w-20 md:h-20")}
                  </div>
                  <div className="w-full">
                    <h4 className="text-xs md:text-sm font-black text-slate-100 truncate uppercase">{topThree[1].nama}</h4>
                    <p className="text-[9px] md:text-[10px] text-slate-400 truncate uppercase font-bold mt-0.5">{topThree[1].organisasi || '-'}</p>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-800 w-full">
                  <span className="text-sm md:text-base font-black text-slate-200">{topThree[1].total_poin}</span>
                  <span className="text-[9px] text-slate-500 font-bold uppercase ml-1">Pts</span>
                </div>
              </div>

              {/* RANK 1 - GOLD */}
              <div 
                onClick={() => setSelectedUser(topThree[0])}
                className="bg-slate-950 border-2 border-amber-500 hover:border-amber-400 rounded-xl p-3.5 md:p-6 text-center cursor-pointer transition-colors shadow-lg flex flex-col items-center justify-between"
              >
                <div className="w-full flex flex-col items-center">
                  <div className="bg-amber-500 text-slate-950 text-[10px] md:text-xs font-black px-3 py-0.5 rounded-full mb-2 flex items-center gap-1 whitespace-nowrap">
                    <Crown className="w-3.5 h-3.5 fill-slate-950 shrink-0" /> 
                    <span>JUARA 1</span>
                  </div>

                  <div className="my-2">
                    {getRankBadge(topThree[0].avatar_rank, "w-16 h-16 md:w-24 md:h-24")}
                  </div>

                  <div className="w-full">
                    <h4 className="text-xs md:text-base font-black text-amber-300 truncate uppercase">
                      {topThree[0].nama}
                    </h4>
                    <p className="text-[9px] md:text-[10px] text-amber-500/90 truncate uppercase font-bold mt-0.5">
                      {topThree[0].organisasi || '-'}
                    </p>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-amber-900/60 w-full">
                  <span className="text-base md:text-xl font-black text-amber-400">
                    {topThree[0].total_poin}
                  </span>
                  <span className="text-[9px] text-amber-500 font-bold uppercase ml-1">Pts</span>
                </div>
              </div>

              {/* RANK 3 - BRONZE */}
              <div 
                onClick={() => setSelectedUser(topThree[2])}
                className="bg-slate-950 border border-amber-900/60 hover:border-amber-600 rounded-xl p-3 md:p-5 text-center cursor-pointer transition-colors shadow-md flex flex-col items-center justify-between"
              >
                <div className="w-full flex flex-col items-center">
                  <div className="bg-amber-950 border border-amber-700 text-amber-400 text-[10px] md:text-xs font-black px-2.5 py-0.5 rounded-full mb-2 flex items-center gap-1">
                    <Medal className="w-3 h-3 text-amber-500" />
                    <span>#3</span>
                  </div>
                  <div className="my-2">
                    {getRankBadge(topThree[2].avatar_rank, "w-14 h-14 md:w-20 md:h-20")}
                  </div>
                  <div className="w-full">
                    <h4 className="text-xs md:text-sm font-black text-slate-100 truncate uppercase">{topThree[2].nama}</h4>
                    <p className="text-[9px] md:text-[10px] text-slate-400 truncate uppercase font-bold mt-0.5">{topThree[2].organisasi || '-'}</p>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-800 w-full">
                  <span className="text-sm md:text-base font-black text-slate-200">{topThree[2].total_poin}</span>
                  <span className="text-[9px] text-slate-500 font-bold uppercase ml-1">Pts</span>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* LIST PERINGKAT */}
        {filteredRankings.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5 w-full">
            {filteredRankings.map((item) => {
              const actualRank = rankings.findIndex((r) => r.id === item.id) + 1;

              return (
                <div 
                  key={item.id} 
                  onClick={() => setSelectedUser(item)}
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors shadow-sm ${
                    actualRank === 1 
                      ? 'border-amber-500/60 bg-slate-900 hover:border-amber-400' 
                      : actualRank === 2
                      ? 'border-slate-700 bg-slate-900 hover:border-slate-500'
                      : actualRank === 3
                      ? 'border-amber-900/50 bg-slate-900 hover:border-amber-700'
                      : 'border-slate-800 bg-slate-900/80 hover:bg-slate-800/80'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                      actualRank === 1 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' :
                      actualRank === 2 ? 'bg-slate-800 text-slate-300 border border-slate-700' :
                      actualRank === 3 ? 'bg-amber-950 text-amber-500 border border-amber-900' : 
                      'bg-slate-950 text-slate-500 border border-slate-800'
                    }`}>
                      #{actualRank}
                    </div>

                    {getRankBadge(item.avatar_rank, "w-12 h-12 md:w-14 md:h-14")}
                    
                    <div className="min-w-0 flex-1">
                      <p className="text-xs md:text-sm font-black text-slate-200 uppercase truncate">{item.nama}</p>
                      
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold uppercase truncate mt-0.5">
                        <Building className="w-3 h-3 text-slate-500 shrink-0" />
                        <span className="truncate">{item.organisasi || '-'}</span>
                        <span className="text-slate-600">•</span>
                        <span className="truncate">{item.kamar || '-'}</span>
                      </div>

                      {(item.total_baca !== undefined || item.total_pinjam !== undefined) && (
                        <div className="hidden lg:flex items-center gap-3 mt-1 text-[9px] text-slate-500 font-semibold">
                          {item.total_baca !== undefined && (
                            <span className="flex items-center gap-1">
                              <BookOpen className="w-3 h-3 text-slate-400" /> {item.total_baca} Baca
                            </span>
                          )}
                          {item.total_pinjam !== undefined && (
                            <span className="flex items-center gap-1">
                              <Bookmark className="w-3 h-3 text-slate-400" /> {item.total_pinjam} Pinjam
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 pl-2">
                    <div className="text-right">
                      <span className="text-xs md:text-sm font-black text-cyan-400">{item.total_poin}</span>
                      <span className="text-[9px] text-slate-500 font-bold uppercase ml-0.5">Pts</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-600" />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          debouncedQuery !== '' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-xs font-bold text-slate-500 uppercase flex flex-col items-center justify-center gap-2">
              <SearchX className="w-7 h-7 text-slate-600" />
              <span>Santri tidak ditemukan</span>
            </div>
          )
        )}

        {/* INFINITE SCROLL LOADER */}
        {debouncedQuery === '' && (
          <div ref={loadMoreRef} className="h-14 flex items-center justify-center w-full mt-2">
            {loading && (
              <div className="text-slate-400 bg-slate-900 border border-slate-800 px-4 py-2 rounded-full flex items-center gap-2 text-xs font-medium">
                <Loader2 className="h-4 w-4 animate-spin text-cyan-400" /> Memuat peringkat...
              </div>
            )}
            {isLastPage && rankings.length > 0 && (
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-900 border border-slate-800 px-4 py-1.5 rounded-full">
                Semua peringkat telah dimuat
              </div>
            )}
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div className="max-w-7xl w-full mx-auto text-[10px] md:text-xs font-medium text-center text-slate-500 pt-4 border-t border-slate-800/80 mt-6 relative z-10 flex items-center justify-center gap-1.5">
        <span>Peringkat diperbarui secara otomatis secara</span>
        <span className="text-cyan-400 font-bold flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5" /> realtime
        </span>
      </div>

      {/* MODAL OVERLAY DETAIL PROFILE (Ringan tanpa Backdrop Blur) */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-4 bg-black/85 touch-none">
          {/* Backdrop Click Handler */}
          <div 
            className="absolute inset-0" 
            onClick={() => setSelectedUser(null)} 
          />

          {/* Modal Container */}
          <div className="relative z-10 w-full max-w-4xl max-h-[90vh] bg-[#0F0F0F] border border-slate-800 rounded-2xl shadow-2xl overflow-y-auto p-4 md:p-6">
            {/* Tombol Close Modal */}
            <button
              onClick={() => setSelectedUser(null)}
              className="absolute top-3 right-3 z-20 p-2 text-slate-400 hover:text-white bg-slate-800 rounded-full transition-colors"
              aria-label="Tutup"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Render Komponen Profile Detail */}
            <ProfileDetailView 
              user={selectedUser} 
              onBack={() => setSelectedUser(null)} 
            />
          </div>
        </div>
      )}
    </div>
  );
}