'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Loader2, ArrowLeft, BookOpen, Book } from 'lucide-react';
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

  const doughnutData = {
    labels: ['Baca', 'Pinjam'],
    datasets: [{
      data: [user.total_baca || 0, user.total_pinjam || 0],
      backgroundColor: ['#2563eb', '#60a5fa'],
      borderWidth: 0,
    }]
  };

  const barData = {
    labels: kategoriData.map(k => (k.kategori || 'UMUM').toUpperCase()),
    datasets: [{
      data: kategoriData.map(k => k.total_kategori),
      backgroundColor: '#2563eb',
      borderRadius: 4,
      barThickness: 8,
    }]
  };

  // Kustomisasi Scrollbar dengan utility Tailwind
  const scrollbarClass = `
    [&::-webkit-scrollbar]:w-1.5 
    [&::-webkit-scrollbar-track]:bg-slate-50
    [&::-webkit-scrollbar-thumb]:bg-slate-200 
    [&::-webkit-scrollbar-thumb]:rounded-full 
    hover:[&::-webkit-scrollbar-thumb]:bg-slate-300
  `;

  if (detailLoading) {
    return (
      <div className="h-96 bg-white border border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 text-slate-400 text-xs font-black uppercase tracking-wider shadow-sm">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        Menyinkronkan Profil Santri...
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-200 text-slate-800">
      {/* Tombol Navigasi Kembali */}
      <button 
        onClick={onBack}
        className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 shadow-sm hover:bg-slate-50 transition-all active:scale-95"
      >
        <ArrowLeft className="w-4 h-4" /> Kembali ke Peringkat
      </button>

      {/* Ringkasan Akun */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col items-center text-center gap-3 shadow-sm">
        <img src={user.avatar_rank} className="w-36 h-36 object-contain" alt="Rank Badge" />
        <div className="px-3 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-600 text-[10px] font-black tracking-widest uppercase">
          {(user.rank || 'WARRIOR').toUpperCase()}
        </div>
        <div className="flex flex-row items-center justify-center gap-3 mt-1">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 font-black text-sm border border-blue-200">
            {user.nama?.charAt(0).toUpperCase()}
          </div>
          <div className="text-left">
            <h2 className="text-base font-black text-slate-900 uppercase leading-tight truncate max-w-xs">{user.nama}</h2>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mt-0.5">
              NIS: {user.nis || '-'} • {user.organisasi || '-'} / {user.kamar || '-'}
            </p>
          </div>
        </div>
      </div>

      {/* Grid Data Tiga Kolom */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        
        {/* Kolom 1: Poin & Grafik */}
        <div className="md:col-span-4 space-y-4">
          <div className="p-5 bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-2xl shadow-sm relative overflow-hidden">
            <p className="text-[9px] font-black uppercase tracking-wider mb-1 opacity-80">Total Nilai Poin</p>
            <div className="flex items-baseline gap-1">
              <h3 className="text-3xl font-black">{user.total_poin ?? 0}</h3>
              <span className="text-xs font-bold opacity-70">PTS</span>
            </div>
            <div className="grid grid-cols-2 gap-1 mt-3 pt-2 border-t border-white/20 text-[8px] font-black uppercase opacity-90">
              <div>Kunjungan: {user.total_kunjungan ?? 0}</div>
              <div>Tambahan: {user.poin_tambahan ?? 0}</div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 flex justify-between items-center px-4 py-2.5 rounded-xl shadow-sm">
            <p className="text-[9px] font-black text-slate-400 uppercase">Buku Yang Dibaca</p>
            <div className="flex items-center gap-1.5">
              <BookOpen className="text-blue-600 h-4 w-4" />
              <span className="text-sm font-black text-slate-800">{user.total_baca ?? 0} Buku</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
            <p className="text-[9px] font-black uppercase mb-3 text-slate-400 tracking-wider">Rasio Aktivitas</p>
            <div className="relative h-24 flex justify-center items-center">
              <Doughnut data={doughnutData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 8, font: { size: 9, weight: 'bold' } } } }, cutout: '75%' }} />
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
            <p className="text-[9px] font-black uppercase mb-3 text-slate-400 tracking-wider">Kategori Favorit</p>
            <div className="relative h-28">
              {kategoriData.length > 0 ? (
                <Bar data={barData} options={{ indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { font: { size: 8 } } }, y: { ticks: { font: { size: 8, weight: 'bold' } } } } }} />
              ) : (
                <p className="text-[10px] text-slate-400 opacity-60 italic text-center py-4">Belum ada kategori terekam</p>
              )}
            </div>
          </div>
        </div>

        {/* Kolom 2: Buku */}
        <div className="md:col-span-4 bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex flex-col h-[400px]">
          <p className="text-[10px] font-black text-slate-400 uppercase mb-3 tracking-wider">Riwayat Membaca</p>
          <div className={`space-y-2 overflow-y-auto flex-1 pr-0.5 ${scrollbarClass}`}>
            {bookList.length > 0 ? (
              bookList.map((b, i) => (
                <div key={i} className="flex justify-between items-center p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="text-[10px] font-bold text-slate-800 truncate uppercase">{b.judul_buku}</p>
                    <p className="text-[8px] text-slate-400 font-semibold mt-0.5">Dibaca {b.total_dibaca}x</p>
                  </div>
                  <Book className="w-3 h-3 text-slate-400 shrink-0" />
                </div>
              ))
            ) : (
              <p className="text-[10px] text-slate-400 opacity-60 italic py-12 text-center">Belum ada riwayat buku</p>
            )}
          </div>
        </div>

        {/* Kolom 3: Mutasi Poin */}
        <div className="md:col-span-4 bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex flex-col h-[400px]">
          <p className="text-[10px] font-black text-slate-400 uppercase mb-3 tracking-wider">Mutasi Log Poin</p>
          <div className={`space-y-2 overflow-y-auto flex-1 pr-0.5 ${scrollbarClass}`}>
            {mutasiList.length > 0 ? (
              mutasiList.map((m, i) => {
                const isPlus = m.poin >= 0;
                const tgl = m.created_at ? new Date(m.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '---';
                return (
                  <div key={i} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-extrabold text-slate-800 uppercase truncate leading-tight">{m.keterangan || 'Reward Poin'}</p>
                      <p className="text-[8px] text-slate-400 font-bold mt-0.5">{tgl} • LOG</p>
                    </div>
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md shrink-0 ${isPlus ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {isPlus ? '+' : ''}{m.poin}
                    </span>
                  </div>
                );
              })
            ) : (
              <p className="text-[10px] text-slate-400 opacity-60 italic py-12 text-center">Belum ada mutasi poin tambahan</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}