'use client';

import { useState, useEffect, useCallback } from 'react';
import { Heart, Share2, Check } from 'lucide-react';

export default function KaryaAksi({ id, judul, path }: { id: string; judul: string; path: string }) {
  const [suka, setSuka] = useState(false);
  const [tersalin, setTersalin] = useState(false);
  const kunci = `karya-suka:${id}`;

  useEffect(() => {
    try {
      setSuka(localStorage.getItem(kunci) === '1');
    } catch {
      // penyimpanan tidak tersedia: abaikan
    }
  }, [kunci]);

  const toggleSuka = useCallback(() => {
    setSuka((prev) => {
      const next = !prev;
      try {
        if (next) localStorage.setItem(kunci, '1');
        else localStorage.removeItem(kunci);
      } catch {
        // abaikan
      }
      return next;
    });
  }, [kunci]);

  const bagikan = useCallback(async () => {
    const url = `${window.location.origin}${path}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: judul, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setTersalin(true);
      setTimeout(() => setTersalin(false), 2000);
    } catch {
      // dibatalkan pengguna atau akses clipboard ditolak
    }
  }, [judul, path]);

  const tombol =
    'inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-blue-50 px-3.5 py-2 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:text-sm';

  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={toggleSuka} aria-pressed={suka} className={tombol}>
        <Heart className={`h-4 w-4 ${suka ? 'fill-blue-600 text-blue-600' : ''}`} aria-hidden="true" />
        {suka ? 'Disukai' : 'Suka'}
      </button>
      <button type="button" onClick={bagikan} className={tombol}>
        {tersalin ? <Check className="h-4 w-4" aria-hidden="true" /> : <Share2 className="h-4 w-4" aria-hidden="true" />}
        <span aria-live="polite">{tersalin ? 'Tautan disalin' : 'Bagikan'}</span>
      </button>
    </div>
  );
}