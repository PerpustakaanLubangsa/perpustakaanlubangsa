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
  Clock,
} from 'lucide-react';

// Di luar komponen: tidak dialokasikan ulang setiap render
const STATS = [
  { title: 'Total Sirkulasi', value: '1,240', info: 'Buku dipinjam bulan ini', icon: BookOpen, color: 'bg-cyan-50 text-cyan-600 border border-cyan-200' },
  { title: 'Kunjungan Santri', value: '312', info: 'Santri hadir hari ini', icon: Users, color: 'bg-emerald-50 text-emerald-600 border border-emerald-200' },
  { title: 'Karya Tulis', value: '45', info: 'Menunggu verifikasi', icon: FileText, color: 'bg-amber-50 text-amber-600 border border-amber-200' },
  { title: 'Pelanggaran Poin', value: '12', info: 'Sanksi keterlambatan baru', icon: AlertTriangle, color: 'bg-rose-50 text-rose-600 border border-rose-200' },
];

const RECENT_ACTIVITIES = [
  { id: '1', name: 'Ahmad Fauzi', action: 'Meminjam Buku', item: 'Fathul Qarib', time: '10 menit yang lalu', type: 'in' },
  { id: '2', name: 'M. Rizky', action: 'Mengembalikan Buku', item: 'Diwan Al-Mutanabbi', time: '25 menit yang lalu', type: 'out' },
  { id: '3', name: 'Zainal Arifin', action: 'Terkena Sanksi Poin', item: 'Terlambat 3 Hari', time: '1 jam yang lalu', type: 'alert' },
];

const ACTIVITY_STYLE: Record<string, string> = {
  in: 'bg-emerald-50 border-emerald-200 text-emerald-600',
  out: 'bg-cyan-50 border-cyan-200 text-cyan-600',
  alert: 'bg-rose-50 border-rose-200 text-rose-600',
};

// Kelas kartu dipakai berulang: putih semi-transparan agar bg layout tetap terlihat
const CARD = 'bg-white/80 backdrop-blur-sm border border-slate-200/80 shadow-sm';

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  // Proteksi halaman
  useEffect(() => {
    let isMounted = true;

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!isMounted) return;

      if (!session) {
        router.replace('/login');
      } else {
        setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-slate-800 flex flex-col font-sans">
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">

        {/* Selamat Datang */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Ahlan Wa Sahlan, Pustakawan!</h2>
            <p className="text-xs text-slate-600 font-medium">Berikut adalah rangkuman aktivitas sirkulasi dan literasi hari ini.</p>
          </div>

          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 px-3 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider transition-colors active:scale-95 shadow-sm">
              <Plus className="w-3.5 h-3.5 stroke-[3]" /> Sirkulasi Baru
            </button>
          </div>
        </div>

        {/* Kartu Statistik */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {STATS.map((stat) => (
            <div key={stat.title} className={`${CARD} p-5 rounded-2xl flex items-start justify-between`}>
              <div className="space-y-1">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">{stat.title}</span>
                <span className="text-2xl font-black text-slate-900 tracking-tight block">{stat.value}</span>
                <span className="text-[10px] text-slate-500 font-medium block">{stat.info}</span>
              </div>
              <div className={`w-10 h-10 ${stat.color} rounded-xl flex items-center justify-center shrink-0`}>
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
          ))}
        </div>

        {/* Panel Aktivitas & Pintasan */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Log Aktivitas */}
          <div className={`lg:col-span-2 ${CARD} rounded-2xl overflow-hidden`}>
            <div className="p-5 flex items-center justify-between border-b border-slate-200">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Log Aktivitas Terakhir</h3>
                <p className="text-[11px] text-slate-500 font-medium">Pemantauan real-time sirkulasi santri</p>
              </div>
              <span className="text-[10px] font-bold text-cyan-700 bg-cyan-50 border border-cyan-200 px-2.5 py-1 rounded-md uppercase tracking-wider">
                Live View
              </span>
            </div>

            <div className="divide-y divide-slate-200/70">
              {RECENT_ACTIVITIES.map((act) => (
                <div key={act.id} className="p-4 flex items-center justify-between hover:bg-white/70 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${ACTIVITY_STYLE[act.type]}`}>
                      {act.type === 'in' ? <ArrowDownLeft className="w-4 h-4" /> :
                       act.type === 'out' ? <ArrowUpRight className="w-4 h-4" /> :
                       <AlertTriangle className="w-4 h-4" />}
                    </div>
                    <div>
                      <span className="text-xs font-black text-slate-900 block">{act.name}</span>
                      <span className="text-[11px] text-slate-600 font-medium">
                        {act.action} <span className="font-bold text-slate-800">“{act.item}”</span>
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

          {/* Pintasan Validasi */}
          <div className={`${CARD} rounded-2xl p-5 space-y-4`}>
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Pintasan Validasi</h3>
              <p className="text-[11px] text-slate-500 font-medium">Akses cepat menu administratif</p>
            </div>

            <div className="space-y-2">
              {[
                { title: 'Verifikasi Karya Santri', desc: '5 dokumen baru masuk' },
                { title: 'Input Pelanggaran', desc: 'Otomasi poin sanksi Latee' },
                { title: 'Katalog Buku Utama', desc: 'Total 4,120 Judul Terdaftar' },
              ].map((item) => (
                <button
                  key={item.title}
                  className="w-full text-left p-3 rounded-xl bg-white/70 border border-slate-200 hover:bg-white hover:border-cyan-400/60 font-bold transition-colors flex items-center justify-between group"
                >
                  <div>
                    <span className="text-xs text-slate-800 block group-hover:text-cyan-700 transition-colors">{item.title}</span>
                    <span className="text-[10px] text-slate-500 font-medium">{item.desc}</span>
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-600 transition-colors" />
                </button>
              ))}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}