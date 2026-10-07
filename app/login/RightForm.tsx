'use client';

import React, { useState, useEffect, useRef } from 'react';
import { LogIn, Lock, User, Loader2, Eye, EyeOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function RightForm() {
  const router = useRouter();

  // Ref untuk Auto Focus pada input username
  const usernameInputRef = useRef<HTMLInputElement>(null);

  // State Input & UI
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // 1. Cek sesi saat komponen dimuat, jika sudah login langsung lempar ke dashboard
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        router.replace('/dashboard');
      } else {
        // Jika belum login, beri fokus otomatis ke input username
        usernameInputRef.current?.focus();
      }
    };
    checkSession();
  }, [router]);

  // 2. Handler Proses Login Supabase
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

      // Jika berhasil login, langsung arahkan ke dashboard
      if (data?.user) {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Gagal masuk. Periksa kembali ID atau kata sandi Anda.');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12 md:p-16 md:pl-20 bg-white text-slate-900 md:rounded-l-[32px] border-l border-slate-200 z-20 relative overflow-hidden md:-ml-16 shadow-2xl">

      <div className="max-w-sm w-full space-y-8 relative z-10">

        {/* HEADER FORM */}
        <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-2">
          <div className="md:hidden w-12 h-12 bg-slate-100 border border-slate-200 rounded-2xl flex items-center justify-center mb-2">
            <img src="/logo.png" alt="Logo" className="h-6 w-6 object-contain" />
          </div>
          <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-slate-800 to-slate-600 tracking-tighter uppercase">
            Masuk Dasbor
          </h2>
          <p className="text-xs text-slate-500 font-medium max-w-[280px] md:max-w-none">
            Gunakan akun pustakawan resmi Anda untuk mengakses panel kontrol perpustakaan.
          </p>
        </div>

        {/* NOTIFIKASI ERROR */}
        {error && (
          <div
            role="alert"
            className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-[11px] font-bold uppercase tracking-wider rounded-xl text-center"
          >
            {error}
          </div>
        )}

        {/* FORM LOGIN */}
        <form onSubmit={handleLogin} className="space-y-4" autoComplete="off">
          {/* INPUT USERNAME */}
          <div className="relative group flex items-center">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
            <input
              ref={usernameInputRef}
              id="username"
              type="text"
              required
              autoComplete="off"
              placeholder="username"
              aria-label="Username Pustakawan"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full pl-10 pr-28 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition-colors text-slate-900 placeholder:text-slate-400"
            />
            <span className="absolute right-3 text-[10px] font-bold text-slate-500 select-none pointer-events-none tracking-tight bg-slate-100 border border-slate-200 px-2 py-1 rounded-md">
              @lubangsa.com
            </span>
          </div>

          {/* INPUT PASSWORD */}
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-[10px] font-black text-slate-600 uppercase tracking-wider block ml-1">
              Kata Sandi
            </label>
            <div className="relative group">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="new-password"
                placeholder="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition-colors text-slate-900 placeholder:text-slate-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors rounded-md p-0.5"
                tabIndex={-1}
                aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* TOMBOL SUBMIT */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2.5 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 text-white border border-blue-700/20 rounded-xl text-xs font-black uppercase tracking-wider transition-colors"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" /> Memvalidasi Akun...
              </>
            ) : (
              <>
                Verifikasi & Masuk <LogIn className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Footer Form (Mobile Only) */}
        <div className="md:hidden text-center pt-6 border-t border-slate-200">
          <p className="text-[10px] font-medium text-slate-500">
            Sistem Informasi <span className="text-blue-600 font-bold">Snowy Library</span> © 2026
          </p>
          <p className="text-[9px] text-slate-400 mt-1">PP. Latee Lubangsa</p>
        </div>

      </div>
    </div>
  );
}