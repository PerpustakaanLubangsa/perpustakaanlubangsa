'use client';

import React, { useState, useEffect, useRef } from 'react';
import { LogIn, Lock, User, Loader2, Eye, EyeOff, LayoutDashboard, LogOut, UserCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function RightForm() {
  const router = useRouter();
  
  // Ref untuk Auto Focus
  const usernameInputRef = useRef<HTMLInputElement>(null);
  const dashboardBtnRef = useRef<HTMLButtonElement>(null);
  
  // State Input & UI
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // State Pengguna Supabase
  const [user, setUser] = useState<any>(null);

  // Cek status sesi login saat komponen pertama kali dimuat
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
      }
    };
    checkUser();
  }, []);

  // Efek untuk menangani Auto Focus dinamis
  useEffect(() => {
    if (user) {
      // Fokus ke tombol masuk dashboard jika user sudah login
      dashboardBtnRef.current?.focus();
    } else {
      // Fokus ke input username jika user belum login
      usernameInputRef.current?.focus();
    }
  }, [user]);

  // Handler Proses Login Supabase
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const fullEmail = `${username.trim()}@lubangsa.com`;

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: fullEmail,
        password,
      });

      if (authError) throw authError;
      
      if (data?.user) {
        setUser(data.user);
      }
    } catch (err: any) {
      setError(err.message || 'Gagal masuk. Periksa kembali ID atau kata sandi Anda.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handler Keluar Sesi (Logout)
  const handleLogout = async () => {
    setIsLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setUsername('');
    setPassword('');
    setIsLoading(false);
  };

  return (
    <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12 md:p-16 bg-white md:rounded-l-[32px] transition-all duration-300 shadow-[-20px_0_30px_-10px_rgba(0,0,0,0.3)] z-10">
      <div className="max-w-sm w-full space-y-8">
        
        {/* ============================================================ */}
        {/* KONDISI A: JIKA BERHASIL LOGIN (TAMPILAN PROFIL BULATAN)      */}
        {/* ============================================================ */}
        {user ? (
          <div className="flex flex-col items-center text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
            {/* Bulatan Avatar Profil Modern */}
            <div className="relative group">
              <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-md group-hover:blur-lg transition-all" />
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white border-4 border-white shadow-xl relative z-10">
                {user.email ? (
                  <span className="text-3xl font-black uppercase tracking-wider">
                    {user.email.split('@')[0].substring(0, 2)}
                  </span>
                ) : (
                  <UserCheck className="w-10 h-10" />
                )}
              </div>
              <div className="absolute bottom-1 right-1 w-5 h-5 bg-emerald-500 border-4 border-white rounded-full z-20 animate-pulse" />
            </div>

            {/* Informasi Identitas Pustakawan */}
            <div className="space-y-1">
              <span className="text-[10px] bg-blue-50 text-blue-600 px-3 py-1 rounded-full font-black tracking-widest uppercase border border-blue-100">
                Akses Diberikan
              </span>
              <h2 className="text-xl font-black text-slate-950 tracking-tight pt-2">Sesi Aktif Ditemukan</h2>
              <p className="text-xs text-slate-500 font-semibold break-all">
                @{user.email?.split('@')[0]}
              </p>
            </div>

            {/* Navigasi / Kontrol Menu */}
            <div className="w-full space-y-3 pt-2">
              <button
                ref={dashboardBtnRef}
                onClick={() => router.push('/dashboard')}
                className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white border border-blue-600 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-150 active:scale-[0.98] shadow-md shadow-blue-500/10 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
              >
                Masuk Dasbor <LayoutDashboard className="w-4 h-4" />
              </button>

              <button
                onClick={handleLogout}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-red-600 border border-slate-200 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-150 disabled:opacity-50"
              >
                {isLoading ? 'Memutus Sesi...' : 'Keluar Akun'} <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          /* ============================================================ */
          /* KONDISI B: JIKA BELUM LOGIN (TAMPILAN FORM AUTH)            */
          /* ============================================================ */
          <>
            {/* HEADER FORM */}
            <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-2">
              <div className="md:hidden w-12 h-12 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-center text-blue-600 shadow-sm mb-2">
                <img src="/logo.png" alt="Logo" className="h-6 w-6 object-contain" />
              </div>
              <h2 className="text-2xl font-black text-slate-950 tracking-tighter uppercase">Masuk Dasbor</h2>
              <p className="text-xs text-slate-500 font-medium max-w-[280px] md:max-w-none">
                Gunakan akun pustakawan resmi Anda untuk mengakses panel kontrol perpustakaan.
              </p>
            </div>

            {/* NOTIFIKASI ERROR */}
            {error && (
              <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-[11px] font-bold uppercase tracking-wider rounded-xl text-center">
                {error}
              </div>
            )}

            {/* FORM LOGIN */}
            <form onSubmit={handleLogin} className="space-y-4" autoComplete="off">
              {/* INPUT USERNAME */}
              <div className="space-y-1.5">
                <label htmlFor="username" className="text-[10px] font-black text-slate-400 uppercase tracking-wider block ml-1">
                  ID Username Pustakawan
                </label>
                <div className="relative group flex items-center">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                  <input
                    ref={usernameInputRef}
                    id="username"
                    type="text"
                    required
                    autoComplete="off"
                    placeholder="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-10 pr-28 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all text-slate-800 placeholder:text-slate-400"
                  />
                  <span className="absolute right-3 text-[10px] font-bold text-slate-400 select-none pointer-events-none tracking-tight bg-slate-200/50 px-2 py-1 rounded-md">
                    @lubangsa.com
                  </span>
                </div>
              </div>

              {/* INPUT PASSWORD */}
              <div className="space-y-1.5">
                <label htmlFor="password" className="text-[10px] font-black text-slate-400 uppercase tracking-wider block ml-1">
                  Kata Sandi
                </label>
                <div className="relative group">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    placeholder="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all text-slate-800 placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors rounded-md p-0.5"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2.5 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white border border-blue-600 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-150 active:scale-[0.98] shadow-md shadow-blue-500/10 pt-3"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Memvalidasi Akun...
                  </>
                ) : (
                  <>
                    Verifikasi & Masuk <LogIn className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>

            {/* Footer Form (Mobile Only) */}
            <div className="md:hidden text-center pt-6 border-t border-slate-100">
              <p className="text-[10px] font-medium text-slate-400">
                Sistem Informasi <span className="text-blue-500 font-bold">Snowy Library</span> © 2026
              </p>
              <p className="text-[9px] text-slate-400 opacity-80 mt-1">PP. Latee Lubangsa</p>
            </div>
          </>
        )}

      </div>
    </div>
  );
}