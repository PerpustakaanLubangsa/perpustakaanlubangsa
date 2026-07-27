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
    <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12 md:p-16 md:pl-20 bg-[#0b0c10] text-slate-100 md:rounded-l-[32px] border-l border-slate-800/80 z-20 relative overflow-hidden md:-ml-16 shadow-2xl">
      
      <div className="max-w-sm w-full space-y-8 relative z-10">
        
        {/* HEADER FORM */}
        <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-2">
          <div className="md:hidden w-12 h-12 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center mb-2">
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
          <div className="p-3.5 bg-red-500/10 border border-red-500/30 text-red-400 text-[11px] font-bold uppercase tracking-wider rounded-xl text-center">
            {error}
          </div>
        )}

        {/* FORM LOGIN */}
        <form onSubmit={handleLogin} className="space-y-4" autoComplete="off">
          {/* INPUT USERNAME (Label atas telah dihapus) */}
          <div className="relative group flex items-center">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
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
              className="w-full pl-10 pr-28 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-medium focus:outline-none focus:border-cyan-500/80 focus:ring-1 focus:ring-cyan-500/50 transition-colors text-slate-100 placeholder:text-slate-600"
            />
            <span className="absolute right-3 text-[10px] font-bold text-slate-500 select-none pointer-events-none tracking-tight bg-slate-900 border border-slate-800 px-2 py-1 rounded-md">
              @lubangsa.com
            </span>
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
                className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-medium focus:outline-none focus:border-cyan-500/80 focus:ring-1 focus:ring-cyan-500/50 transition-colors text-slate-100 placeholder:text-slate-600"
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
            className="w-full flex items-center justify-center gap-2.5 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:opacity-50 text-white border border-cyan-400/30 rounded-xl text-xs font-black uppercase tracking-wider transition-colors"
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

      </div>
    </div>
  );
}