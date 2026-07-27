'use client';

import React from 'react';
import Link from 'next/link';

export default function LeftPanel() {
  return (
    /* PERUBAHAN:
       1. Menghapus `border-r border-slate-900` agar garis batas tidak membentur lengkungan RightForm.
       2. Mengubah `p-12` menjadi `p-12 md:pr-16` agar konten kiri tetap proporsional dan tidak terpotong oleh form kanan.
    */
    <div className="hidden md:flex md:w-1/2 lg:w-3/5 bg-slate-950 p-12 md:pr-16 flex-col justify-between relative overflow-hidden select-none">
      
      {/* ============================================================ */}
      {/* BACKGROUND IMAGE                                             */}
      {/* ============================================================ */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <img
          src="/bg.png"
          alt="Background"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Grid Garis Tipis Halus di atas gambar */}
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
      {/* FOOTER                                                       */}
      {/* ============================================================ */}
      <div className="relative z-10 flex items-center justify-between border-t border-white/[0.04] pt-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">
        <span>PERPUSTAKAAN LUBANGSA</span>
        <span className="opacity-60 font-medium">EST. 2026</span>
      </div>

    </div>
  );
}