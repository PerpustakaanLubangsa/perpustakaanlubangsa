'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  BookOpen, 
  Users, 
  FileText, 
  AlertTriangle, 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft,
  Clock
} from 'lucide-react';

// DIKELUARKAN DARI KOMPONEN: Mencegah alokasi memori berulang saat re-render
const STATS = [
  { title: 'Total Sirkulasi', value: '1,240', info: 'Buku dipinjam bulan ini', icon: BookOpen, color: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' },
  { title: 'Kunjungan Santri', value: '312', info: 'Santri hadir hari ini', icon: Users, color: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' },
  { title: 'Karya Tulis', value: '45', info: 'Menunggu verifikasi', icon: FileText, color: 'bg-amber-500/10 text-amber-400 border border-amber-500/20' },
  { title: 'Pelanggaran Poin', value: '12', info: 'Sanksi keterlambatan baru', icon: AlertTriangle, color: 'bg-rose-500/10 text-rose-400 border border-rose-500/20' },
];

const RECENT_ACTIVITIES = [
  { id: '1', name: 'Ahmad Fauzi', action: 'Meminjam Buku', item: 'Fathul Qarib', time: '10 menit yang lalu', type: 'in' },
  { id: '2', name: 'M. Rizky', action: 'Mengembalikan Buku', item: 'Diwan Al-Mutanabbi', time: '25 menit yang lalu', type: 'out' },
  { id: '3', name: 'Zainal Arifin', action: 'Terkena Sanksi Poin', item: 'Terlambat 3 Hari', time: '1 jam yang lalu', type: 'alert' },
];

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Proteksi Halaman
  useEffect(() => {
    let isMounted = true;
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!isMounted) return;
      
      if (!session) {
        router.push('/login');
      } else {
        setUser(session.user);
        setLoading(false);
      }
    };
    checkUser();

    return () => {
      isMounted = false;
    };
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0c10] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0c10] text-slate-100 flex flex-col font-sans">
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        
        {/* Selamat Datang & Bar Pencarian */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-100 tracking-tight">Ahlan Wa Sahlan, Pustakawan!</h2>
            <p className="text-xs text-slate-400 font-medium">Berikut adalah rangkuman aktivitas sirkulasi dan literasi hari ini.</p>
          </div>
          
          {/* Menu Akses Cepat */}
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 px-3 py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-extrabold rounded-xl text-xs uppercase tracking-wider transition-colors active:scale-95">
              <Plus className="w-3.5 h-3.5 stroke-[3]" /> Sirkulasi Baru
            </button>
          </div>
        </div>

        {/* GRID KARTU STATISTIK */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {STATS.map((stat, i) => (
            <div key={i} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">{stat.title}</span>
                <span className="text-2xl font-black text-slate-100 tracking-tight block">{stat.value}</span>
                <span className="text-[10px] text-slate-400 font-medium block">{stat.info}</span>
              </div>
              <div className={`w-10 h-10 ${stat.color} rounded-xl flex items-center justify-center shrink-0`}>
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
          ))}
        </div>

        {/* PANEL AKTIVITAS & PENCARIAN CEPAT */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Kolom Kiri & Tengah: Log Sirkulasi Terakhir */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-5 flex items-center justify-between border-b border-slate-800">
              <div>
                <h3 className="text-sm font-black text-slate-100 uppercase tracking-tight">Log Aktivitas Terakhir</h3>
                <p className="text-[11px] text-slate-400 font-medium">Pemantauan real-time sirkulasi santri</p>
              </div>
              <span className="text-[10px] font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-1 rounded-md uppercase tracking-wider">
                Live View
              </span>
            </div>

            <div className="divide-y divide-slate-800/60">
              {RECENT_ACTIVITIES.map((act) => (
                <div key={act.id} className="p-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
                      act.type === 'in' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 
                      act.type === 'out' ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                    }`}>
                      {act.type === 'in' ? <ArrowDownLeft className="w-4 h-4" /> : 
                       act.type === 'out' ? <ArrowUpRight className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                    </div>
                    <div>
                      <span className="text-xs font-black text-slate-200 block">{act.name}</span>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {act.action} <span className="font-bold text-slate-300">“{act.item}”</span>
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
                    <Clock className="w-3 h-3" /> {act.time}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Kolom Kanan: Pintasan Validasi & Sistem */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div>
              <h3 className="text-sm font-black text-slate-100 uppercase tracking-tight">Pintasan Validasi</h3>
              <p className="text-[11px] text-slate-400 font-medium">Akses cepat menu administratif</p>
            </div>

            <div className="space-y-2">
              <button className="w-full text-left p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:bg-slate-800/80 hover:border-cyan-500/30 font-bold transition-colors flex items-center justify-between group">
                <div>
                  <span className="text-xs text-slate-200 block group-hover:text-cyan-400 transition-colors">Verifikasi Karya Santri</span>
                  <span className="text-[10px] text-slate-400 font-medium">5 dokumen baru masuk</span>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 transition-colors" />
              </button>

              <button className="w-full text-left p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:bg-slate-800/80 hover:border-cyan-500/30 font-bold transition-colors flex items-center justify-between group">
                <div>
                  <span className="text-xs text-slate-200 block group-hover:text-cyan-400 transition-colors">Input Pelanggaran</span>
                  <span className="text-[10px] text-slate-400 font-medium">Otomasi poin sanksi Latee</span>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 transition-colors" />
              </button>

              <button className="w-full text-left p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:bg-slate-800/80 hover:border-cyan-500/30 font-bold transition-colors flex items-center justify-between group">
                <div>
                  <span className="text-xs text-slate-200 block group-hover:text-cyan-400 transition-colors">Katalog Buku Utama</span>
                  <span className="text-[10px] text-slate-400 font-medium">Total 4,120 Judul Terdaftar</span>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 transition-colors" />
              </button>
            </div>
          </div>

        </div>

      </main>
    </div>
  );
}