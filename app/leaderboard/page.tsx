'use client';

import React, { useEffect, useState, useRef } from 'react';
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
  Flame, 
  Zap,
  Building,
  CheckCircle2,
  SearchX,
  Medal,
  X
} from 'lucide-react';

import ProfileDetailView from '@/components/ProfileDetailView';

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

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchInput);
    }, 300);

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

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading && !isLastPage && debouncedQuery === '') {
          fetchRankings(page);
        }
      },
      { rootMargin: '200px', threshold: 0.1 }
    );
    if (loadMoreRef.current) observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [page, loading, isLastPage, debouncedQuery]);

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

  // Handler untuk menutup modal saat menekan tombol ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedUser(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const getRankBadge = (avatarUrl: string, sizeClass = "w-14 h-14 md:w-16 md:h-16") => {
    const defaultBadge = '/image/profile/default-badge.png';
    return (
      <div className="relative shrink-0 flex items-center justify-center group/badge">
        <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-md group-hover/badge:blur-xl group-hover/badge:bg-cyan-400/50 transition-all duration-300 animate-pulse" />
        <img 
          src={avatarUrl || defaultBadge} 
          className={`${sizeClass} relative z-10 object-contain drop-shadow-[0_10px_25px_rgba(0,0,0,0.8)] transition-all duration-300 group-hover/badge:scale-110 group-hover/badge:-translate-y-1`} 
          alt="Rank Badge" 
          loading="lazy" 
        />
      </div>
    );
  };

  const filteredRankings = rankings.filter((item) => {
    const query = debouncedQuery.toLowerCase();
    return (
      item.nama?.toLowerCase().includes(query) ||
      item.nis?.toLowerCase().includes(query)
    );
  });

  const topThree = rankings.slice(0, 3);

  return (
    <div className="bg-[#0b0c10] min-h-screen w-full p-4 md:p-8 transition-all duration-300 text-slate-100 flex flex-col justify-between overflow-x-hidden relative">
      
      {/* GLOW AMBIENT BACKGROUND */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[140px] pointer-events-none animate-pulse" />
      <div className="absolute top-40 right-1/4 w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[140px] pointer-events-none animate-pulse" style={{ animationDelay: '2s' }} />

      <div className="max-w-7xl w-full mx-auto space-y-6 md:space-y-8 relative z-10">
        
        {/* HEADER BAR */}
        <div className="relative overflow-hidden bg-gradient-to-r from-slate-900/90 via-slate-900/80 to-slate-950/90 border border-blue-500/30 p-5 md:p-8 rounded-3xl shadow-[0_0_30px_rgba(37,99,235,0.15)] backdrop-blur-xl group">
          <div className="absolute -top-[100%] left-[-100%] w-[300%] h-[300%] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-500/15 via-transparent to-transparent opacity-60 pointer-events-none animate-pulse" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="relative flex items-center justify-center p-3.5 bg-gradient-to-br from-blue-600/30 via-cyan-500/20 to-blue-900/40 border border-cyan-400/50 rounded-2xl shadow-[0_0_20px_rgba(6,182,212,0.4)] group-hover:scale-105 transition-transform duration-300">
                <Trophy className="h-7 w-7 text-cyan-300 animate-bounce" />
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
                </span>
              </div>

              <div>
                <h1 className="text-xl md:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-200 to-blue-400 tracking-wider uppercase flex items-center gap-2 drop-shadow-md">
                  Papan Peringkat
                  <Sparkles className="w-5 h-5 text-amber-400 fill-amber-400/40 animate-spin" style={{ animationDuration: '6s' }} />
                </h1>
                <p className="text-xs text-slate-400 font-medium flex items-center gap-1.5 mt-0.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  Pembaca & Pengunjung Teraktif Perpustakaan
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative flex-1 md:w-80 group/search">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within/search:text-cyan-400 transition-colors" />
                <input
                  type="text"
                  placeholder="Cari nama atau NIS santri..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/90 border border-slate-800 rounded-xl text-xs font-medium focus:outline-none focus:border-cyan-500/80 focus:ring-1 focus:ring-cyan-500/50 transition-all text-slate-100 placeholder:text-slate-500 shadow-inner"
                />
              </div>

              <Link
                href="/"
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-300 bg-slate-800/80 hover:bg-slate-700 hover:text-white border border-slate-700/60 transition-all active:scale-95 shadow-md shrink-0 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Kembali</span>
              </Link>
            </div>
          </div>
        </div>

        {/* TOP 3 PODIUM ARENA */}
        {debouncedQuery === '' && topThree.length >= 3 && (
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-4 md:p-8 shadow-2xl backdrop-blur-md relative overflow-hidden">
            
            <div className="text-center mb-8">
              <span className="inline-flex items-center gap-1.5 text-[10px] md:text-xs font-black uppercase tracking-widest px-4 py-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-full shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400 animate-pulse" />
                Top Performers Arena
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 md:gap-8 items-end max-w-4xl mx-auto">
              
              {/* RANK 2 - SILVER */}
              <div 
                onClick={() => setSelectedUser(topThree[1])}
                className="group relative bg-gradient-to-b from-slate-900/90 via-slate-900/80 to-slate-950 border border-slate-500/40 hover:border-cyan-400/80 rounded-2xl p-3.5 md:p-6 text-center cursor-pointer transition-all duration-300 hover:scale-[1.03] shadow-[0_10px_30px_rgba(0,0,0,0.5)] hover:shadow-[0_0_35px_rgba(6,182,212,0.35)] flex flex-col items-center justify-between overflow-hidden animate-float-slow"
              >
                <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:12px_12px] opacity-10 pointer-events-none" />
                <div className="absolute -inset-full top-0 block w-1/2 h-full z-10 -skew-x-12 bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent group-hover:animate-shine" />

                <div className="relative z-10 w-full flex flex-col items-center">
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-slate-900 border-2 border-slate-400 text-slate-200 text-[10px] md:text-xs font-black px-3 py-0.5 rounded-full shadow-[0_0_10px_rgba(148,163,184,0.4)] group-hover:scale-110 group-hover:border-cyan-400 group-hover:text-cyan-300 transition-all duration-300 whitespace-nowrap flex items-center gap-1">
                    <Medal className="w-3 h-3 text-slate-300" />
                    <span>#2</span>
                  </div>
                  <div className="flex justify-center mb-3 mt-4">
                    {getRankBadge(topThree[1].avatar_rank, "w-16 h-16 md:w-24 md:h-24")}
                  </div>
                  <div className="w-full">
                    <h4 className="text-xs md:text-sm font-black text-slate-100 truncate uppercase group-hover:text-cyan-300 transition-colors drop-shadow">{topThree[1].nama}</h4>
                    <p className="text-[9px] md:text-[10px] text-slate-400 truncate uppercase font-bold mt-0.5">{topThree[1].organisasi || '-'}</p>
                  </div>
                </div>

                <div className="relative z-10 mt-4 pt-3 border-t border-slate-800/80 w-full group-hover:border-cyan-500/30 transition-colors">
                  <span className="text-sm md:text-lg font-black text-slate-200 italic group-hover:text-cyan-300 transition-colors">{topThree[1].total_poin}</span>
                  <span className="text-[9px] text-slate-500 font-bold uppercase ml-1">Pts</span>
                </div>
              </div>

              {/* RANK 1 - GOLD */}
              <div 
                onClick={() => setSelectedUser(topThree[0])}
                className="group relative bg-gradient-to-b from-amber-950/70 via-slate-900/95 to-slate-950 border-2 border-amber-500/80 hover:border-amber-300 rounded-2xl p-4 md:p-7 text-center cursor-pointer transition-all duration-300 hover:scale-[1.04] shadow-[0_0_35px_rgba(245,158,11,0.25)] hover:shadow-[0_0_55px_rgba(245,158,11,0.5)] flex flex-col items-center justify-between overflow-hidden animate-float-fast"
              >
                <div className="absolute inset-0 bg-[radial-gradient(#f59e0b_1px,transparent_1px)] [background-size:12px_12px] opacity-15 pointer-events-none" />
                <div className="absolute -inset-full top-0 block w-1/2 h-full z-10 -skew-x-12 bg-gradient-to-r from-transparent via-amber-300/30 to-transparent group-hover:animate-shine" />

                <div className="relative z-10 w-full flex flex-col items-center">
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 text-[10px] md:text-xs font-black px-2.5 md:px-4 py-1 rounded-full shadow-[0_0_20px_rgba(245,158,11,0.6)] flex items-center gap-1 md:gap-1.5 group-hover:scale-105 transition-transform duration-300 whitespace-nowrap w-max">
                    <Crown className="w-3.5 h-3.5 fill-slate-950 shrink-0" /> 
                    <span className="tracking-wider">JUARA 1</span>
                  </div>

                  <div className="flex justify-center mb-3 mt-5">
                    <div className="relative">
                      {getRankBadge(topThree[0].avatar_rank, "w-20 h-20 md:w-32 md:h-32")}
                      <div className="absolute -inset-4 rounded-full bg-amber-500/25 blur-2xl -z-10 animate-pulse" />
                    </div>
                  </div>

                  <div className="w-full">
                    <h4 className="text-xs md:text-base font-black text-amber-200 truncate uppercase group-hover:text-yellow-100 transition-colors drop-shadow-[0_2px_10px_rgba(245,158,11,0.5)]">
                      {topThree[0].nama}
                    </h4>
                    <p className="text-[9px] md:text-[10px] text-amber-500/90 truncate uppercase font-bold mt-0.5 tracking-wide">
                      {topThree[0].organisasi || '-'}
                    </p>
                  </div>
                </div>

                <div className="relative z-10 mt-4 pt-3 border-t border-amber-800/60 w-full group-hover:border-amber-400/50 transition-colors">
                  <span className="text-base md:text-2xl font-black text-amber-400 italic drop-shadow-[0_0_12px_rgba(245,158,11,0.8)] group-hover:scale-110 inline-block transition-transform">
                    {topThree[0].total_poin}
                  </span>
                  <span className="text-[10px] text-amber-500 font-bold uppercase ml-1">Pts</span>
                </div>
              </div>

              {/* RANK 3 - BRONZE */}
              <div 
                onClick={() => setSelectedUser(topThree[2])}
                className="group relative bg-gradient-to-b from-slate-900/90 via-slate-900/80 to-slate-950 border border-amber-900/50 hover:border-amber-600/80 rounded-2xl p-3.5 md:p-6 text-center cursor-pointer transition-all duration-300 hover:scale-[1.03] shadow-[0_10px_30px_rgba(0,0,0,0.5)] hover:shadow-[0_0_35px_rgba(217,119,6,0.3)] flex flex-col items-center justify-between overflow-hidden animate-float-medium"
              >
                <div className="absolute inset-0 bg-[radial-gradient(#d97706_1px,transparent_1px)] [background-size:12px_12px] opacity-10 pointer-events-none" />
                <div className="absolute -inset-full top-0 block w-1/2 h-full z-10 -skew-x-12 bg-gradient-to-r from-transparent via-amber-600/20 to-transparent group-hover:animate-shine" />

                <div className="relative z-10 w-full flex flex-col items-center">
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-amber-950 border-2 border-amber-700 text-amber-300 text-[10px] md:text-xs font-black px-3 py-0.5 rounded-full shadow-[0_0_10px_rgba(217,119,6,0.3)] group-hover:scale-110 group-hover:border-amber-500 group-hover:text-amber-200 transition-all duration-300 whitespace-nowrap flex items-center gap-1">
                    <Medal className="w-3 h-3 text-amber-400" />
                    <span>#3</span>
                  </div>
                  <div className="flex justify-center mb-3 mt-4">
                    {getRankBadge(topThree[2].avatar_rank, "w-16 h-16 md:w-24 md:h-24")}
                  </div>
                  <div className="w-full">
                    <h4 className="text-xs md:text-sm font-black text-slate-100 truncate uppercase group-hover:text-amber-300 transition-colors drop-shadow">{topThree[2].nama}</h4>
                    <p className="text-[9px] md:text-[10px] text-slate-400 truncate uppercase font-bold mt-0.5">{topThree[2].organisasi || '-'}</p>
                  </div>
                </div>

                <div className="relative z-10 mt-4 pt-3 border-t border-slate-800/80 w-full group-hover:border-amber-700/40 transition-colors">
                  <span className="text-sm md:text-lg font-black text-slate-200 italic group-hover:text-amber-400 transition-colors">{topThree[2].total_poin}</span>
                  <span className="text-[9px] text-slate-500 font-bold uppercase ml-1">Pts</span>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* LIST PERINGKAT */}
        {filteredRankings.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 w-full">
            {filteredRankings.map((item) => {
              const actualRank = rankings.findIndex((r) => r.id === item.id) + 1;

              return (
                <div 
                  key={item.id} 
                  onClick={() => setSelectedUser(item)}
                  className={`flex items-center justify-between p-3.5 md:p-4 rounded-2xl border cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-md ${
                    actualRank === 1 
                      ? 'border-amber-500/50 bg-gradient-to-r from-amber-950/40 via-slate-900/80 to-slate-900/60 hover:border-amber-400 hover:shadow-[0_0_20px_rgba(245,158,11,0.2)]' 
                      : actualRank === 2
                      ? 'border-slate-600/50 bg-slate-900/80 hover:border-slate-400'
                      : actualRank === 3
                      ? 'border-amber-900/50 bg-slate-900/70 hover:border-amber-700/80'
                      : 'border-slate-800/80 bg-slate-900/40 hover:bg-slate-900/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                      actualRank === 1 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' :
                      actualRank === 2 ? 'bg-slate-700/30 text-slate-300 border border-slate-600/40' :
                      actualRank === 3 ? 'bg-amber-900/30 text-amber-500 border border-amber-800/40' : 
                      'bg-slate-800/40 text-slate-500 border border-slate-800'
                    }`}>
                      #{actualRank}
                    </div>

                    {getRankBadge(item.avatar_rank, "w-14 h-14 md:w-16 md:h-16")}
                    
                    <div className="min-w-0 flex-1">
                      <p className="text-xs md:text-sm font-black text-slate-200 uppercase truncate">{item.nama}</p>
                      
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold uppercase truncate mt-0.5">
                        <Building className="w-3 h-3 text-slate-500 shrink-0" />
                        <span className="truncate">{item.organisasi || '-'}</span>
                        <span className="text-slate-600">•</span>
                        <span className="truncate">{item.kamar || '-'}</span>
                      </div>

                      {(item.total_baca !== undefined || item.total_pinjam !== undefined) && (
                        <div className="hidden lg:flex items-center gap-3 mt-1.5 text-[9px] text-slate-500 font-semibold">
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

                  <div className="flex items-center gap-3 shrink-0 pl-2">
                    <div className="text-right">
                      <span className="text-xs md:text-sm font-black text-cyan-400 italic">{item.total_poin}</span>
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
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-12 text-center text-xs font-bold text-slate-500 uppercase tracking-wider shadow-sm flex flex-col items-center justify-center gap-3">
              <SearchX className="w-8 h-8 text-slate-600" />
              <span>Santri tidak ditemukan</span>
            </div>
          )
        )}

        {/* INFINITE SCROLL LOADER */}
        {debouncedQuery === '' && (
          <div ref={loadMoreRef} className="h-16 flex items-center justify-center w-full mt-4">
            {loading && (
              <div className="text-slate-400 bg-slate-900/90 border border-cyan-500/30 px-5 py-2.5 rounded-full shadow-lg flex items-center gap-2.5 text-xs font-medium backdrop-blur-md">
                <Loader2 className="h-4 w-4 animate-spin text-cyan-400" /> Memuat peringkat selanjutnya...
              </div>
            )}
            {isLastPage && rankings.length > 0 && (
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest opacity-70 bg-slate-900/40 border border-slate-800/60 px-4 py-1.5 rounded-full">
                Semua peringkat telah dimuat
              </div>
            )}
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div className="max-w-7xl w-full mx-auto text-[10px] md:text-xs font-medium text-center text-slate-500 pt-6 border-t border-slate-800/60 mt-8 relative z-10 flex items-center justify-center gap-1.5">
        <span>Peringkat diperbarui secara otomatis secara</span>
        <span className="text-cyan-400 font-bold flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5" /> realtime
        </span>
      </div>

      {/* MODAL OVERLAY DETAIL PROFILE */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 animate-fade-in">
          {/* Backdrop Click Handler */}
          <div 
            className="absolute inset-0" 
            onClick={() => setSelectedUser(null)} 
          />

          {/* Modal Container */}
          <div className="relative z-10 w-full max-w-4xl max-h-[90vh] bg-[#0F0F0F] border border-slate-800 rounded-3xl shadow-2xl overflow-y-auto p-6 md:p-8 animate-scale-up">
            {/* Tombol Close Modal */}
            <button
              onClick={() => setSelectedUser(null)}
              className="absolute top-4 right-4 z-20 p-2 text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-700 rounded-full transition-colors"
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

      {/* STYLES & ANIMATION KEYFRAMES */}
      <style jsx global>{`
        /* CUSTOM SCROLLBAR BARU */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        ::-webkit-scrollbar-track {
          background: #0b0c10;
          border-radius: 9999px;
        }

        ::-webkit-scrollbar-thumb {
          background: #1e293b;
          border-radius: 9999px;
          border: 2px solid #0b0c10;
          transition: background-color 0.2s ease;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: #06b6d4;
          box-shadow: 0 0 10px rgba(6, 182, 212, 0.5);
        }

        * {
          scrollbar-width: thin;
          scrollbar-color: #1e293b #0b0c10;
        }

        /* ANIMATION KEYFRAMES */
        @keyframes shine {
          0% { left: -100%; }
          100% { left: 200%; }
        }

        @keyframes floatSlow {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-7px); }
        }

        @keyframes floatFast {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-11px); }
        }

        @keyframes floatMedium {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes scaleUp {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }

        .animate-shine {
          animation: shine 1.4s ease-in-out infinite;
        }

        .animate-float-fast {
          animation: floatFast 3.5s ease-in-out infinite;
          will-change: transform;
        }

        .animate-float-slow {
          animation: floatSlow 4.8s ease-in-out infinite;
          animation-delay: 0.5s;
          will-change: transform;
        }

        .animate-float-medium {
          animation: floatMedium 4.2s ease-in-out infinite;
          animation-delay: 1s;
          will-change: transform;
        }

        .animate-fade-in {
          animation: fadeIn 0.2s ease-out forwards;
        }

        .animate-scale-up {
          animation: scaleUp 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
}