'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  BookOpen, 
  Users, 
  FileText, 
  AlertTriangle, 
  LogOut, 
  Search, 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft,
  Clock
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Proteksi Halaman: Cek apakah user sudah login
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
      } else {
        setUser(session.user);
      }
      setLoading(false);
    };
    checkUser();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  // Data Statistik Dummy untuk Pustakawan
  const stats = [
    { title: 'Total Sirkulasi', value: '1,240', info: 'Buku dipinjam bulan ini', icon: BookOpen, color: 'bg-blue-500' },
    { title: 'Kunjungan Santri', value: '312', info: 'Santri hadir hari ini', icon: Users, color: 'bg-emerald-500' },
    { title: 'Karya Tulis', value: '45', info: 'Menunggu verifikasi', icon: FileText, color: 'bg-amber-500' },
    { title: 'Pelanggaran Poin', value: '12', info: 'Sanksi keterlambatan baru', icon: AlertTriangle, color: 'bg-rose-500' },
  ];

  // Data Transaksi Terakhir Dummy
  const recentActivities = [
    { id: '1', name: 'Ahmad Fauzi', action: 'Meminjam Buku', item: 'Fathul Qarib', time: '10 menit yang lalu', type: 'in' },
    { id: '2', name: 'M. Rizky', action: 'Mengembalikan Buku', item: 'Diwan Al-Mutanabbi', time: '25 menit yang lalu', type: 'out' },
    { id: '3', name: 'Zainal Arifin', action: 'Terkena Sanksi Poin', item: 'Terlambat 3 Hari', time: '1 jam yang lalu', type: 'alert' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* ============================================================ */}
      {/* NAVBAR UTAMA                                                 */}
      {/* ============================================================ */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
            L
          </div>
          <div>
            <h1 className="text-sm font-black text-slate-900 tracking-tight uppercase">Perpustakaan Lubangsa</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider -mt-0.5">Snowy Library Panel</p>
          </div>
        </div>

        {/* Informasi Akun Pustakawan & Logout */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs font-bold text-slate-800">Pustakawan Aktif</span>
            <span className="text-[10px] text-slate-500 font-medium break-all max-w-[150px] truncate">
              {user?.email?.split('@')[0]}
            </span>
          </div>
          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-700 uppercase">
            {user?.email?.substring(0, 2)}
          </div>
          <button 
            onClick={handleLogout}
            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
            title="Keluar Aplikasi"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ============================================================ */}
      {/* KONTEN UTAMA DASHBOARD                                       */}
      {/* ============================================================ */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        
        {/* Selamat Datang & Bar Pencarian */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Ahlan Wa Sahlan, Pustakawan!</h2>
            <p className="text-xs text-slate-500 font-medium">Berikut adalah rangkuman aktivitas sirkulasi dan literasi hari ini.</p>
          </div>
          
          {/* Menu Akses Cepat */}
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm transition-all active:scale-95">
              <Plus className="w-3.5 h-3.5" /> Sirkulasi Baru
            </button>
          </div>
        </div>

        {/* GRIB KARTU STATISTIK */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">{stat.title}</span>
                <span className="text-2xl font-black text-slate-900 tracking-tight block">{stat.value}</span>
                <span className="text-[10px] text-slate-500 font-medium block">{stat.info}</span>
              </div>
              <div className={`w-10 h-10 ${stat.color} text-white rounded-xl flex items-center justify-center shadow-inner`}>
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
          ))}
        </div>

        {/* PANEL AKTIVITAS & PENCARIAN CEPAT */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Kolom Kiri & Tengah: Log Sirkulasi Terakhir */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Log Aktivitas Terakhir</h3>
                <p className="text-[11px] text-slate-400 font-medium">Pemantauan real-time sirkulasi santri</p>
              </div>
              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md uppercase tracking-wider">
                Live View
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {recentActivities.map((act) => (
                <div key={act.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      act.type === 'in' ? 'bg-emerald-50 text-emerald-600' : 
                      act.type === 'out' ? 'bg-blue-50 text-blue-600' : 'bg-rose-50 text-rose-600'
                    }`}>
                      {act.type === 'in' ? <ArrowDownLeft className="w-4 h-4" /> : 
                       act.type === 'out' ? <ArrowUpRight className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                    </div>
                    <div>
                      <span className="text-xs font-black text-slate-800 block">{act.name}</span>
                      <span className="text-[11px] text-slate-500 font-medium">
                        {act.action} <span className="font-bold text-slate-700">“{act.item}”</span>
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                    <Clock className="w-3 h-3" /> {act.time}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Kolom Kanan: Pintasan Validasi & Sistem */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Pintasan Validasi</h3>
              <p className="text-[11px] text-slate-400 font-medium">Akses cepat menu administratif</p>
            </div>

            <div className="space-y-2">
              <button className="w-full text-left p-3 rounded-xl border border-slate-100 hover:border-blue-500/30 hover:bg-blue-50/20 font-bold transition-all flex items-center justify-between group">
                <div>
                  <span className="text-xs text-slate-800 block group-hover:text-blue-600">Verifikasi Karya Santri</span>
                  <span className="text-[10px] text-slate-400 font-medium">5 dokumen baru masuk</span>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600" />
              </button>

              <button className="w-full text-left p-3 rounded-xl border border-slate-100 hover:border-blue-500/30 hover:bg-blue-50/20 font-bold transition-all flex items-center justify-between group">
                <div>
                  <span className="text-xs text-slate-800 block group-hover:text-blue-600">Input Pelanggaran</span>
                  <span className="text-[10px] text-slate-400 font-medium">Otomasi poin sanksi Latee</span>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600" />
              </button>

              <button className="w-full text-left p-3 rounded-xl border border-slate-100 hover:border-blue-500/30 hover:bg-blue-50/20 font-bold transition-all flex items-center justify-between group">
                <div>
                  <span className="text-xs text-slate-800 block group-hover:text-blue-600">Katalog Buku Utama</span>
                  <span className="text-[10px] text-slate-400 font-medium">Total 4,120 Judul Terdaftar</span>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600" />
              </button>
            </div>
          </div>

        </div>

      </main>

    </div>
  );
}