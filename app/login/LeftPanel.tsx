'use client';

import React from 'react';
import Link from 'next/link';

export default function LeftPanel() {
  return (
    <div className="hidden md:flex md:w-1/2 lg:w-3/5 bg-slate-950 p-12 flex-col justify-between relative overflow-hidden select-none border-r border-slate-900">
      
      {/* ============================================================ */}
      {/* BACKGROUND VIDEO (Overlay sudah dikurangi agar lebih terang) */}
      {/* ============================================================ */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-40 mix-blend-lighten">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover"
        >
          <source src="/login-bg.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        {/* Lapisan gradasi disamarkan agar video di belakangnya lebih terekspos */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-slate-950/80" />
      </div>

      {/* Grid Garis Tipis Halus di atas video */}
      <div className="absolute inset-0 z-0 opacity-[0.02] bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:32px_32px]" />

      {/* ============================================================ */}
      {/* HEADER LOGO                                                  */}
      {/* ============================================================ */}
      <Link href="/" className="flex items-center gap-3 relative z-10 group w-fit">
        <div className="w-10 h-10 bg-white/[0.03] rounded-xl flex items-center justify-center border border-white/10 group-hover:border-blue-500/50 group-hover:bg-blue-500/10 transition-all duration-300 shadow-inner">
          <img src="/logo.png" alt="Logo" className="h-5 w-5 object-contain group-hover:scale-110 transition-transform duration-300" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-black text-slate-200 tracking-wider uppercase group-hover:text-white transition-colors duration-300">
            Lubangsa
          </span>
          <span className="text-[10px] text-slate-500 font-bold tracking-tight -mt-0.5 uppercase">
            Snowy Library
          </span>
        </div>
      </Link>

      {/* ============================================================ */}
      {/* KONTEN TENGAH                                                */}
      {/* ============================================================ */}
      <div className="relative z-10 flex flex-col items-center text-center space-y-3 my-auto max-w-sm mx-auto">
        <h1 className="text-2xl font-black text-white leading-tight tracking-tight uppercase drop-shadow-md">
          Otorisasi Akses <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">Pustakawan</span>
        </h1>
        <p className="text-[11px] text-slate-300 font-medium leading-relaxed max-w-[320px] mx-auto opacity-90 drop-shadow-sm">
          Silakan masuk untuk mengelola pencatatan sirkulasi buku, validasi poin sanksi kunjungan, serta verifikasi karya tulis santri secara aman.
        </p>
      </div>

      {/* ============================================================ */}
      {/* FOOTER                                                       */}
      {/* ============================================================ */}
      <div className="relative z-10 flex items-center justify-between border-t border-white/[0.04] pt-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">
        <span>PERPUSTAKAAN LUBANGSA</span>
        <span className="opacity-60 font-medium">EST. 2026</span>
      </div>

    </div>
  );
}