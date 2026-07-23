'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Loader2, ArrowLeft, BookOpen, Book, Zap, Award, Sparkles, TrendingUp, History } from 'lucide-react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

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

interface BookItem {
  judul_buku: string;
  total_dibaca: number;
}

interface MutasiItem {
  poin: number;
  keterangan: string;
  created_at: string;
}

interface KategoriItem {
  kategori: string;
  total_kategori: number;
}

interface ProfileDetailViewProps {
  user: RankingItem;
  onBack: () => void;
}

export default function ProfileDetailView({ user, onBack }: ProfileDetailViewProps) {
  const [detailLoading, setDetailLoading] = useState(true);
  const [bookList, setBookList] = useState<BookItem[]>([]);
  const [mutasiList, setMutasiList] = useState<MutasiItem[]>([]);
  const [kategoriData, setKategoriData] = useState<KategoriItem[]>([]);

  useEffect(() => {
    const fetchDetailData = async () => {
      setDetailLoading(true);
      try {
        const mutasiPromise = supabase
          .from('mutasi_poin')
          .select('poin, keterangan, created_at')
          .eq('anggota_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20);

        const bukuPromise = supabase
          .from('view_buku_dibaca_per_anggota')
          .select('judul_buku, total_dibaca')
          .eq('id_anggota', user.id)
          .order('total_dibaca', { ascending: false })
          .limit(20);

        const kategoriPromise = supabase
          .from('view_kategori_per_anggota')
          .select('kategori, total_kategori')
          .eq('id_anggota', user.id)
          .order('total_kategori', { ascending: false });

        const [mutasiRes, bukuRes, katRes] = await Promise.all([mutasiPromise, bukuPromise, kategoriPromise]);

        if (mutasiRes.data) setMutasiList(mutasiRes.data as MutasiItem[]);
        if (bukuRes.data) setBookList(bukuRes.data as BookItem[]);
        if (katRes.data) setKategoriData(katRes.data as KategoriItem[]);
      } catch (err) {
        console.error("Gagal memuat detail profil:", err);
      } finally {
        setDetailLoading(false);
      }
    };

    fetchDetailData();
  }, [user.id]);

  // Data Doughnut dengan Cyan & Blue Neon Glow
  const doughnutData = {
    labels: ['Baca', 'Pinjam'],
    datasets: [{
      data: [user.total_baca || 0, user.total_pinjam || 0],
      backgroundColor: ['#06b6d4', '#3b82f6'],
      hoverBackgroundColor: ['#22d3ee', '#60a5fa'],
      borderWidth: 0,
    }]
  };

  // Data Bar Chart Kategori dengan Gradient Style
  const barData = {
    labels: kategoriData.map(k => (k.kategori || 'UMUM').toUpperCase()),
    datasets: [{
      data: kategoriData.map(k => k.total_kategori),
      backgroundColor: '#06b6d4',
      hoverBackgroundColor: '#22d3ee',
      borderRadius: 6,
      barThickness: 10,
    }]
  };

  // Opsi Chart Mode Gelap
  const darkChartOptionsOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          boxWidth: 10,
          color: '#94a3b8', // slate-400
          font: { size: 10, weight: 'bold' as const }
        }
      },
      tooltip: {
        backgroundColor: '#0f172a',
        titleColor: '#f8fafc',
        bodyColor: '#38bdf8',
        borderColor: '#334155',
        borderWidth: 1
      }
    }
  };

  const barChartOptions = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: {
        beginAtZero: true,
        grid: { color: 'rgba(51, 65, 85, 0.3)' },
        ticks: { color: '#64748b', font: { size: 9 } }
      },
      y: {
        grid: { display: false },
        ticks: { color: '#cbd5e1', font: { size: 9, weight: 'bold' as const } }
      }
    }
  };

  // Kustomisasi Scrollbar Mode Gelap yang Tipis
  const scrollbarClass = `
    [&::-webkit-scrollbar]:w-1.5 
    [&::-webkit-scrollbar-track]:bg-slate-950/50 
    [&::-webkit-scrollbar-thumb]:bg-slate-800 
    [&::-webkit-scrollbar-thumb]:rounded-full 
    hover:[&::-webkit-scrollbar-thumb]:bg-cyan-500/50
  `;

  if (detailLoading) {
    return (
      <div className="h-96 bg-slate-950/80 border border-slate-800 rounded-3xl flex flex-col items-center justify-center gap-3 text-slate-400 text-xs font-black uppercase tracking-widest shadow-2xl backdrop-blur-xl">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-200 via-cyan-300 to-slate-400 animate-pulse">
          Menyinkronkan Profil Santri...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-slate-100 animate-in fade-in duration-300">
      
      {/* Tombol Navigasi Kembali */}
      <button 
        onClick={onBack}
        className="flex items-center gap-2 px-4 py-2 bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 hover:border-cyan-500/50 rounded-xl text-xs font-bold text-slate-300 hover:text-cyan-300 shadow-lg transition-all active:scale-95 group"
      >
        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1 text-cyan-400" /> 
        <span>Kembali ke Peringkat</span>
      </button>

      {/* Ringkasan Akun Hero Banner */}
      <div className="relative overflow-hidden bg-gradient-to-b from-slate-900/90 via-slate-900/70 to-slate-950/90 border border-slate-800/90 hover:border-cyan-500/30 rounded-3xl p-6 flex flex-col items-center text-center gap-4 shadow-[0_0_40px_rgba(0,0,0,0.6)] backdrop-blur-xl transition-all">
        {/* Glow Effects Background */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        
        {/* Rank Avatar / Badge */}
        <div className="relative group/avatar">
          <div className="absolute inset-0 bg-cyan-500/20 rounded-full blur-xl group-hover/avatar:bg-blue-500/30 transition-all duration-300" />
          <img 
            src={user.avatar_rank || '/image/profile/default-badge.png'} 
            className="w-32 h-32 md:w-36 md:h-36 object-contain relative z-10 drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)] transition-transform duration-300 hover:scale-105" 
            alt="Rank Badge" 
          />
        </div>

        <div className="relative z-10 flex flex-col items-center">
          <div className="px-4 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 text-[10px] font-black tracking-widest uppercase shadow-[0_0_15px_rgba(6,182,212,0.2)] flex items-center gap-1.5 mb-2">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span>{(user.rank || 'WARRIOR').toUpperCase()}</span>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-1">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-slate-950 font-black text-base border border-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.4)] shrink-0">
              {user.nama?.charAt(0).toUpperCase()}
            </div>
            <div className="text-center sm:text-left">
              <h2 className="text-lg md:text-xl font-black text-slate-100 uppercase leading-tight tracking-wide drop-shadow">
                {user.nama}
              </h2>
              <p className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-slate-400 mt-1 flex flex-wrap items-center justify-center sm:justify-start gap-1">
                <span className="text-cyan-400">NIS: {user.nis || '-'}</span>
                <span className="text-slate-600">•</span>
                <span>{user.organisasi || '-'}</span>
                <span className="text-slate-600">•</span>
                <span>{user.kamar || '-'}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Grid Data Tiga Kolom */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        
        {/* Kolom 1: Poin & Statistik Grafik */}
        <div className="md:col-span-4 space-y-4">
          
          {/* Card Total Poin */}
          <div className="p-5 bg-gradient-to-br from-blue-900/60 via-slate-900 to-cyan-950/60 border border-cyan-500/40 rounded-2xl shadow-[0_0_25px_rgba(6,182,212,0.15)] relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition-all" />
            
            <p className="text-[9px] font-black uppercase tracking-widest text-cyan-400 mb-1 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 fill-cyan-400" />
              Total Nilai Poin
            </p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl md:text-4xl font-black text-white italic drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                {user.total_poin ?? 0}
              </h3>
              <span className="text-xs font-bold text-cyan-300">PTS</span>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-800 text-[9px] font-bold uppercase text-slate-400">
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                Kunjungan: <span className="text-slate-200">{user.total_kunjungan ?? 0}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                Tambahan: <span className="text-slate-200">{user.poin_tambahan ?? 0}</span>
              </div>
            </div>
          </div>

          {/* Quick Stat: Total Buku */}
          <div className="bg-slate-900/60 border border-slate-800/80 flex justify-between items-center px-4 py-3 rounded-2xl shadow-md">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Buku Yang Dibaca</p>
            <div className="flex items-center gap-2">
              <BookOpen className="text-cyan-400 h-4 w-4" />
              <span className="text-sm font-black text-slate-100">{user.total_baca ?? 0} <span className="text-[10px] text-slate-400 font-medium">Buku</span></span>
            </div>
          </div>

          {/* Chart Doughnut */}
          <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-2xl shadow-md">
            <p className="text-[10px] font-black uppercase mb-3 text-slate-400 tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-cyan-400" /> Rasio Aktivitas
            </p>
            <div className="relative h-28 flex justify-center items-center">
              <Doughnut 
                data={doughnutData} 
                options={{
                  ...darkChartOptionsOptions,
                  cutout: '72%'
                }} 
              />
            </div>
          </div>

          {/* Chart Bar Kategori */}
          <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-2xl shadow-md">
            <p className="text-[10px] font-black uppercase mb-3 text-slate-400 tracking-wider flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-cyan-400" /> Kategori Favorit
            </p>
            <div className="relative h-32">
              {kategoriData.length > 0 ? (
                <Bar data={barData} options={barChartOptions} />
              ) : (
                <p className="text-[10px] text-slate-500 italic text-center py-8">Belum ada kategori terekam</p>
              )}
            </div>
          </div>

        </div>

        {/* Kolom 2: Riwayat Membaca Buku */}
        <div className="md:col-span-4 bg-slate-900/60 border border-slate-800/80 p-4 rounded-2xl shadow-md flex flex-col h-[420px]">
          <p className="text-[10px] font-black text-slate-400 uppercase mb-3 tracking-wider flex items-center gap-1.5">
            <Book className="w-3.5 h-3.5 text-cyan-400" /> Riwayat Membaca
          </p>
          
          <div className={`space-y-2 overflow-y-auto flex-1 pr-1 ${scrollbarClass}`}>
            {bookList.length > 0 ? (
              bookList.map((b, i) => (
                <div 
                  key={i} 
                  className="flex justify-between items-center p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-cyan-500/40 transition-colors group"
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="text-[10px] font-extrabold text-slate-200 group-hover:text-cyan-300 transition-colors truncate uppercase leading-tight">
                      {b.judul_buku}
                    </p>
                    <p className="text-[8px] text-slate-500 font-semibold mt-0.5">
                      Dibaca <span className="text-cyan-400 font-bold">{b.total_dibaca}x</span>
                    </p>
                  </div>
                  <Book className="w-3.5 h-3.5 text-slate-600 group-hover:text-cyan-400 transition-colors shrink-0" />
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 italic text-[10px]">
                Belum ada riwayat buku
              </div>
            )}
          </div>
        </div>

        {/* Kolom 3: Mutasi Log Poin */}
        <div className="md:col-span-4 bg-slate-900/60 border border-slate-800/80 p-4 rounded-2xl shadow-md flex flex-col h-[420px]">
          <p className="text-[10px] font-black text-slate-400 uppercase mb-3 tracking-wider flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-cyan-400" /> Mutasi Log Poin
          </p>

          <div className={`space-y-2 overflow-y-auto flex-1 pr-1 ${scrollbarClass}`}>
            {mutasiList.length > 0 ? (
              mutasiList.map((m, i) => {
                const isPlus = m.poin >= 0;
                const tgl = m.created_at ? new Date(m.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '---';
                return (
                  <div 
                    key={i} 
                    className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between gap-2 hover:border-slate-700 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-extrabold text-slate-200 uppercase truncate leading-tight">
                        {m.keterangan || 'Reward Poin'}
                      </p>
                      <p className="text-[8px] text-slate-500 font-bold mt-0.5">{tgl} • LOG</p>
                    </div>

                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg border shrink-0 ${
                      isPlus 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                    }`}>
                      {isPlus ? '+' : ''}{m.poin}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 italic text-[10px]">
                Belum ada mutasi poin tambahan
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}