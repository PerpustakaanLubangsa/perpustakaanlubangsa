'use client';

import { useState, useEffect, useCallback } from 'react';
import { Link2, Share2, Check, Download } from 'lucide-react';

export default function KaryaAksi({ judul, path }: { judul: string; path: string }) {
  const [tersalin, setTersalin] = useState(false);
  const [bisaBagikan, setBisaBagikan] = useState(false);

  useEffect(() => {
    setBisaBagikan(typeof navigator !== 'undefined' && !!navigator.share);
  }, []);

  const salin = useCallback(async () => {
    const url = `${window.location.origin}${path}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Cadangan jika akses clipboard ditolak
      const el = document.createElement('textarea');
      el.value = url;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      try {
        document.execCommand('copy');
      } catch {
        // abaikan
      }
      document.body.removeChild(el);
    }
    setTersalin(true);
    setTimeout(() => setTersalin(false), 2000);
  }, [path]);

  const bagikan = useCallback(async () => {
    try {
      await navigator.share({ title: judul, url: `${window.location.origin}${path}` });
    } catch {
      // dibatalkan pengguna
    }
  }, [judul, path]);

  const tombol =
    'inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-blue-50 px-3.5 py-2 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:text-sm';

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={salin} className={tombol}>
        {tersalin ? <Check className="h-4 w-4" aria-hidden="true" /> : <Link2 className="h-4 w-4" aria-hidden="true" />}
        <span aria-live="polite">{tersalin ? 'Tautan disalin' : 'Salin tautan'}</span>
      </button>

      {bisaBagikan && (
        <button type="button" onClick={bagikan} className={tombol}>
          <Share2 className="h-4 w-4" aria-hidden="true" />
          Bagikan
        </button>
      )}

      {/* <a> biasa, bukan <Link>, agar langsung mengunduh file */}
      <a href={`${path}/pdf`} download className={tombol}>
        <Download className="h-4 w-4" aria-hidden="true" />
        Unduh PDF
      </a>
    </div>
  );
}