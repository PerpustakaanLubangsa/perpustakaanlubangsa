'use client';

import React, { useState, useEffect, useRef } from 'react';
import { LogIn, Lock, User, Loader2, Eye, EyeOff, LayoutDashboard, LogOut, UserCheck, Sparkles } from 'lucide-react';
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
      dashboardBtnRef.current?.focus();
    } else {
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
    <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12 md:p-16 bg-[#0b0c10] text-slate-100 md:rounded-l-[32px] transition-all duration-300 border-l border-slate-800/80 shadow-[-20px_0_30px_-10px_rgba(0,0,0,0.8)] z-10 relative overflow-hidden">
      
      {/* Glow Ambient Light Background */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-blue-600/10 rounded-full blur-[100px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none animate-pulse" style={{ animationDelay: '2s' }} />

      <div className="max-w-sm w-full space-y-8 relative z-10">
        
        {/* ============================================================ */}
        {/* KONDISI A: JIKA BERHASIL LOGIN (TAMPILAN PROFIL BULATAN)      */}
        {/* ============================================================ */}
        {user ? (
          <div className="flex flex-col items-center text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
            {/* Bulatan Avatar Profil Modern */}
            <div className="relative group">
              <div className="absolute inset-0 bg-cyan-500/30 rounded-full blur-xl group-hover:blur-2xl transition-all duration-300 animate-pulse" />
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-blue-700 via-cyan-600 to-blue-500 flex items-center justify-center text-white border-2 border-cyan-400/50 shadow-[0_0_25px_rgba(6,182,212,0.4)] relative z-10">
                {user.email ? (
                  <span className="text-3xl font-black uppercase tracking-wider text-cyan-100 drop-shadow">
                    {user.email.split('@')[0].substring(0, 2)}
                  </span>
                ) : (
                  <UserCheck className="w-10 h-10 text-cyan-200" />
                )}
              </div>
              <div className="absolute bottom-1 right-1 w-5 h-5 bg-emerald-500 border-2 border-slate-950 rounded-full z-20 shadow-[0_0_10px_rgba(16,185,129,0.8)] animate-pulse" />
            </div>

            {/* Informasi Identitas Pustakawan */}
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1 text-[10px] bg-cyan-500/10 text-cyan-400 px-3 py-1 rounded-full font-black tracking-widest uppercase border border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.2)]">
                <Sparkles className="w-3 h-3" /> Akses Diberikan
              </span>
              <h2 className="text-xl font-black text-slate-100 tracking-tight pt-2">Sesi Aktif Ditemukan</h2>
              <p className="text-xs text-slate-400 font-semibold break-all">
                @{user.email?.split('@')[0]}
              </p>
            </div>

            {/* Navigasi / Kontrol Menu */}
            <div className="w-full space-y-3 pt-2">
              <button
                ref={dashboardBtnRef}
                onClick={() => router.push('/dashboard')}
                className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white border border-cyan-400/40 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 active:scale-[0.98] shadow-[0_0_20px_rgba(37,99,235,0.3)] focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-950"
              >
                Masuk Dasbor <LayoutDashboard className="w-4 h-4" />
              </button>

              <button
                onClick={handleLogout}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-900/80 hover:bg-red-500/10 text-slate-400 hover:text-red-400 border border-slate-800 hover:border-red-500/40 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 disabled:opacity-50"
              >
                {isLoading ? 'Memutus Sesi...' : 'Keluar Akun'} <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          /* ============================================================ */
          /* KONDISI B: JIKA BELUM LOGIN (TAMPILAN FORM AUTH)             */
          /* ============================================================ */
          <>
            {/* HEADER FORM */}
            <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-2">
              <div className="md:hidden w-12 h-12 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center shadow-lg mb-2">
                <img src="/logo.png" alt="Logo" className="h-6 w-6 object-contain" />
              </div>
              <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-400 tracking-tighter uppercase">
                Masuk Dasbor
              </h2>
              <p className="text-xs text-slate-400 font-medium max-w-[280px] md:max-w-none">
                Gunakan akun pustakawan resmi Anda untuk mengakses panel kontrol perpustakaan.
              </p>
            </div>

            {/* NOTIFIKASI ERROR */}
            {error && (
              <div className="p-3.5 bg-red-500/10 border border-red-500/30 text-red-400 text-[11px] font-bold uppercase tracking-wider rounded-xl text-center backdrop-blur-md">
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
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                  <input
                    ref={usernameInputRef}
                    id="username"
                    type="text"
                    required
                    autoComplete="off"
                    placeholder="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-10 pr-28 py-2.5 bg-slate-950/90 border border-slate-800 rounded-xl text-xs font-medium focus:outline-none focus:border-cyan-500/80 focus:ring-1 focus:ring-cyan-500/50 transition-all text-slate-100 placeholder:text-slate-600 shadow-inner"
                  />
                  <span className="absolute right-3 text-[10px] font-bold text-slate-500 select-none pointer-events-none tracking-tight bg-slate-900 border border-slate-800 px-2 py-1 rounded-md">
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
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    placeholder="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-950/90 border border-slate-800 rounded-xl text-xs font-medium focus:outline-none focus:border-cyan-500/80 focus:ring-1 focus:ring-cyan-500/50 transition-all text-slate-100 placeholder:text-slate-600 shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors rounded-md p-0.5"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* TOMBOL SUBMIT */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2.5 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:opacity-50 text-white border border-cyan-400/30 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 active:scale-[0.98] shadow-[0_0_20px_rgba(37,99,235,0.25)] hover:shadow-[0_0_25px_rgba(6,182,212,0.4)]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-cyan-200" /> Memvalidasi Akun...
                  </>
                ) : (
                  <>
                    Verifikasi & Masuk <LogIn className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>

            {/* Footer Form (Mobile Only) */}
            <div className="md:hidden text-center pt-6 border-t border-slate-800/80">
              <p className="text-[10px] font-medium text-slate-500">
                Sistem Informasi <span className="text-cyan-400 font-bold">Snowy Library</span> © 2026
              </p>
              <p className="text-[9px] text-slate-600 opacity-80 mt-1">PP. Latee Lubangsa</p>
            </div>
          </>
        )}

      </div>
    </div>
  );
}