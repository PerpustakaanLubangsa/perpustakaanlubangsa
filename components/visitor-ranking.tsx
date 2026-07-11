'use client';

import React, { useEffect, useState, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Loader2, Award, ChevronRight, Search } from 'lucide-react';
import ProfileDetailView from './ProfileDetailView';

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

export default function VisitorRanking() {
  const [rankings, setRankings] = useState<RankingItem[]>([]);
  const [loading, setLoading] = useState(false);
  
  // State Pencarian (Debounced)
  const [searchInput, setSearchInput] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  
  // State Infinite Scroll
  const [page, setPage] = useState(0);
  const [isLastPage, setIsLastPage] = useState(false);
  const itemsPerPage = 15;
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // State Pengendali Data Detail
  const [selectedUser, setSelectedUser] = useState<RankingItem | null>(null);

  // Efek Debounce Pencarian
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchInput);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
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
        if (entries[0].isIntersecting && !loading && !isLastPage && !selectedUser && debouncedQuery === '') {
          fetchRankings(page);
        }
      },
      { rootMargin: '150px', threshold: 0.1 }
    );
    if (loadMoreRef.current) observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [page, loading, isLastPage, selectedUser, debouncedQuery]);

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

  // Hanya menampilkan Badge Gambar Rank bawaan tanpa nomor urut
  const getRankBadge = (avatarUrl: string) => {
    const defaultBadge = '/image/profile/default-badge.png';
    return (
      <div className="relative shrink-0 flex items-center justify-center">
        <img 
          src={avatarUrl || defaultBadge} 
          className="w-9 h-9 object-contain" 
          alt="Rank Badge" 
          loading="lazy" 
        />
      </div>
    );
  };

  // Filter pencarian data klien
  const filteredRankings = rankings.filter((item) => {
    const query = debouncedQuery.toLowerCase();
    return (
      item.nama?.toLowerCase().includes(query) ||
      item.nis?.toLowerCase().includes(query)
    );
  });

  // KONDISI 1: TAMPILAN DETAIL SANTRI
  if (selectedUser) {
    return (
      <div className="bg-slate-50 min-h-screen w-full p-4 md:p-6 transition-all duration-300">
        <div className="max-w-4xl mx-auto">
          <ProfileDetailView 
            user={selectedUser} 
            onBack={() => setSelectedUser(null)} 
          />
        </div>
      </div>
    );
  }

  // KONDISI 2: DEFAULT VIEW (FRAMELESS LIST & NO RANK NUMBER)
  return (
    <div className="bg-slate-50 min-h-screen w-full p-4 md:p-6 transition-all duration-300 text-slate-800 flex flex-col justify-between">
      <div className="max-w-4xl w-full mx-auto space-y-4">
        
        {/* HEADER & BAR PENCARIAN */}
        <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-blue-600" />
            <div>
              <h3 className="text-sm font-black text-slate-900 tracking-tight uppercase">Daftar Peringkat</h3>
              <p className="text-[11px] text-slate-400 font-medium">Urutan pembaca teraktif Snowy Library</p>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama atau NIS santri..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500 focus:bg-white transition-all text-slate-800 placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* LIST PERINGKAT */}
        {filteredRankings.length > 0 ? (
          <div className="space-y-2 w-full">
            {filteredRankings.map((item, index) => (
              <div 
                key={`${item.id}-${index}`} 
                onClick={() => setSelectedUser(item)}
                className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer hover:scale-[1.002] active:scale-[0.998] transition-all duration-150 w-full bg-white shadow-sm ${
                  index === 0 && debouncedQuery === '' ? 'border-amber-300 bg-gradient-to-r from-amber-50/30 to-white' : 'border-slate-200/70'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {/* Hanya panggil gambar badge tanpa angka rank */}
                  {getRankBadge(item.avatar_rank)}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black text-slate-800 uppercase truncate">{item.nama}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase truncate">
                      {item.organisasi || '-'} • {item.kamar || '-'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0 pl-4">
                  <div className="text-right">
                    <span className="text-xs font-black text-blue-600 italic">{item.total_poin}</span>
                    <span className="text-[9px] text-slate-400 font-bold uppercase ml-0.5">Pts</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          debouncedQuery !== '' && (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-xs font-bold text-slate-400 uppercase tracking-wider shadow-sm">
              Santri tidak ditemukan
            </div>
          )
        )}

        {/* TRIGGER INFINITE SCROLL */}
        {debouncedQuery === '' && (
          <div ref={loadMoreRef} className="h-16 flex items-center justify-center w-full mt-2">
            {loading && (
              <div className="text-slate-400 bg-white border border-slate-200 px-4 py-2 rounded-full shadow-sm flex items-center gap-2 text-xs font-medium">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" /> Memuat peringkat...
              </div>
            )}
            {isLastPage && rankings.length > 0 && (
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest opacity-70">Semua peringkat telah dimuat</div>
            )}
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div className="max-w-4xl w-full mx-auto text-[10px] font-medium text-center text-slate-400 pt-4 border-t border-slate-200/60 mt-6">
        Peringkat diperbarui secara otomatis secara <span className="text-blue-500 font-bold">realtime</span>.
      </div>
    </div>
  );
}