'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  BookOpen, 
  Users, 
  FileText, 
  AlertTriangle, 
  LogOut, 
  LayoutDashboard,
  Menu,
  X,
  ChevronRight
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Proteksi Halaman Global di level Layout
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

  // Daftar Menu Navigasi Sidebar
  const navigation = [
    { name: 'Ringkasan', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Sirkulasi Buku', href: '/dashboard/sirkulasi', icon: BookOpen },
    { name: 'Kunjungan Santri', href: '/dashboard/kunjungan', icon: Users },
    { name: 'Karya Tulis', href: '/dashboard/karya-tulis', icon: FileText },
    { name: 'Poin Sanksi', href: '/dashboard/sanksi', icon: AlertTriangle },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      
      {/* ============================================================ */}
      {/* SIDEBAR FOR DESKTOP                                          */}
      {/* ============================================================ */}
      <aside className="hidden md:flex md:w-64 bg-slate-900 text-slate-400 flex-col justify-between fixed h-screen z-30 border-r border-slate-800">
        <div className="flex flex-col flex-1 pt-5 pb-4 overflow-y-auto">
          {/* Identitas Aplikasi */}
          <div className="flex items-center gap-3 px-6 pb-6 border-b border-slate-800/60">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-sm shadow-md shadow-blue-500/20">
              L
            </div>
            <div>
              <h1 className="text-xs font-black text-white tracking-wider uppercase">Lubangsa</h1>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest -mt-0.5">Snowy Library</p>
            </div>
          </div>

          {/* Menu Navigasi */}
          <nav className="mt-6 flex-1 px-4 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10'
                      : 'hover:bg-slate-800/60 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className={`w-4 h-4 transition-colors ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}`} />
                    {item.name}
                  </div>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-80" />}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Informasi Pengguna & Logout di kaki Sidebar */}
        <div className="p-4 border-t border-slate-800/60 bg-slate-950/40">
          <div className="flex items-center gap-3 px-2 py-1.5 mb-3">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-300 uppercase">
              {user?.email?.substring(0, 2)}
            </div>
            <div className="flex flex-col truncate">
              <span className="text-[11px] font-bold text-slate-300 truncate">@{user?.email?.split('@')[0]}</span>
              <span className="text-[9px] text-slate-500 font-medium">Pustakawan</span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-800/50 hover:bg-red-950/30 text-slate-400 hover:text-red-400 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors border border-slate-800/80"
          >
            Keluar Sistem <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </aside>

      {/* ============================================================ */}
      {/* MOBILE SIDEBAR DRAWERS (Overlay saat menu dibuka di ponsel)  */}
      {/* ============================================================ */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/60 z-50 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      <aside className={`fixed inset-y-0 left-0 max-w-xs w-full bg-slate-900 text-slate-400 flex flex-col justify-between z-50 md:hidden transform transition-transform duration-300 ease-in-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="pt-5 pb-4 h-full flex flex-col justify-between overflow-y-auto">
          <div>
            <div className="flex items-center justify-between px-6 pb-6 border-b border-slate-800/60">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-sm">L</div>
                <h1 className="text-xs font-black text-white tracking-wider uppercase">Lubangsa</h1>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="p-1 text-slate-500 hover:text-white rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="mt-6 px-4 space-y-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                      isActive ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="p-4 border-t border-slate-800 bg-slate-950/20">
            <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-800 text-slate-400 hover:text-red-400 rounded-xl text-[10px] font-black uppercase tracking-wider">
              Keluar Sistem <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* ============================================================ */}
      {/* AREA KONTEN UTAMA (Sisi Kanan Sidebar)                       */}
      {/* ============================================================ */}
      <div className="flex-1 flex flex-col md:pl-64">
        {/* Mobile Header Bar */}
        <div className="sticky top-0 z-40 md:hidden bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">L</div>
            <span className="text-xs font-black text-slate-900 uppercase tracking-tight">Lubangsa Library</span>
          </div>
          <button 
            onClick={() => setSidebarOpen(true)}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {/* Suntikan Halaman Konten (`page.tsx`) */}
        <div className="w-full">
          {children}
        </div>
      </div>

    </div>
  );
}