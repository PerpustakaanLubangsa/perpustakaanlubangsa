'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Loader2, ShieldAlert } from 'lucide-react';
import { usePustakawanAktif } from './pustakawan-aktif';
import { bolehBukaHalaman } from './navigation';

/**
 * Membatasi halaman dashboard sesuai akses menu akun.
 * Menu yang disembunyikan di sidebar juga tidak bisa dibuka lewat alamat langsung.
 * Catatan: ini pembatas tampilan; kebijakan RLS database tidak berubah.
 */
export default function GerbangAkses({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { akses } = usePustakawanAktif();

  // Akses belum diketahui: jangan tampilkan halaman dulu agar tidak berkedip
  if (!akses) {
    return (
      <div className="flex justify-center py-24">
        <div className="bg-white border border-blue-100 rounded-full p-2">
          <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
        </div>
      </div>
    );
  }

  if (!bolehBukaHalaman(pathname, akses)) {
    return (
      <div className="px-12 pt-16">
        <div
          role="alert"
          className="mx-auto max-w-md bg-white border border-blue-100 rounded-xl py-8 px-6 flex flex-col items-center text-center"
        >
          <div className="p-3 bg-red-50 border border-red-100 rounded-full text-red-400 mb-3">
            <ShieldAlert className="h-8 w-8 stroke-[1.5]" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 mb-1">Tidak Punya Akses</h3>
          <p className="text-xs text-slate-500 max-w-sm leading-relaxed mb-4">
            Akun Anda belum diberi akses ke halaman ini. Hubungi super admin untuk meminta akses.
          </p>
          <Link
            href="/dashboard"
            className="h-9 px-4 inline-flex items-center text-[11px] font-extrabold uppercase tracking-wider rounded-lg text-white bg-blue-600 border border-blue-700 shadow-[0_3px_0_0_#1e40af] hover:translate-y-0.5 hover:shadow-[0_1px_0_0_#1e40af] active:translate-y-[3px] active:shadow-none transition-[transform,box-shadow] duration-100"
          >
            Ke Beranda
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
