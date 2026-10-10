'use client';

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';

const JARAK_AMAN = 2; // px, sisa kecil supaya halaman pasti tidak ikut tergulung
const TINGGI_MIN = 320; // px, supaya panel tidak terlalu pendek di layar rendah

/** Elemen yang menggulung halaman: induk terdekat ber-overflow auto/scroll, atau dokumen itu sendiri. */
function cariPenggulung(el: HTMLElement): HTMLElement {
  for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
    const o = getComputedStyle(p).overflowY;
    if (o === 'auto' || o === 'scroll' || o === 'overlay') return p;
  }
  return (document.scrollingElement as HTMLElement) ?? document.documentElement;
}

/**
 * Dua kolom berdampingan di layar lebar (lg ke atas), bertumpuk di layar sempit.
 *
 * Di layar lebar, tinggi container dihitung dari posisinya sampai dasar layar, lalu dikoreksi
 * dengan mengukur sisa overflow sebenarnya (margin, footer, atau padding layout apa pun yang
 * tidak terhitung), sehingga halaman tidak ikut tergulung dan hanya kolom yang punya scroll sendiri.
 * Setiap kolom (anak langsung) memenuhi tinggi itu dan menentukan sendiri bagian yang digulung.
 * Di layar sempit tidak ada batas tinggi; semuanya mengalir seperti biasa.
 */
export default function DuaKolom({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [tinggi, setTinggi] = useState<number | null>(null);
  const koreksi = useRef(0); // selisih overflow yang sudah terukur, dipertahankan antar-hitung

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const lebar = window.matchMedia('(min-width: 1024px)');

    function hitung(ulangKoreksi: boolean) {
      if (!el) return;
      if (ulangKoreksi) koreksi.current = 0;
      if (!lebar.matches) {
        setTinggi(null);
        return;
      }
      // Sedang disembunyikan (tab tidak aktif): ukurannya belum bermakna
      if (el.offsetParent === null) return;

      const penggulung = cariPenggulung(el);
      const dokumen = penggulung === document.scrollingElement || penggulung === document.documentElement;
      const bawah = dokumen ? window.innerHeight : penggulung.getBoundingClientRect().bottom;
      const gulir = dokumen ? window.scrollY : penggulung.scrollTop;

      // Padding/border bawah semua induk sampai penggulung ikut memanjangkan halaman
      let sisa = JARAK_AMAN;
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        const gaya = getComputedStyle(p);
        sisa += (parseFloat(gaya.paddingBottom) || 0) + (parseFloat(gaya.borderBottomWidth) || 0);
        if (p === penggulung) break;
      }

      const atas = el.getBoundingClientRect().top + gulir;
      setTinggi(Math.max(Math.round(bawah - atas - sisa - koreksi.current), TINGGI_MIN));
    }

    const sesudahUkuran = () => hitung(false);
    const sesudahJendela = () => hitung(true);

    hitung(true);
    // ResizeObserver juga terpanggil saat tab yang tadinya tersembunyi ditampilkan
    const pengamat = new ResizeObserver(sesudahUkuran);
    pengamat.observe(el);
    window.addEventListener('resize', sesudahJendela);
    lebar.addEventListener('change', sesudahJendela);
    return () => {
      pengamat.disconnect();
      window.removeEventListener('resize', sesudahJendela);
      lebar.removeEventListener('change', sesudahJendela);
    };
  }, []);

  // Setelah tinggi dipasang, ukur sisa overflow nyata pada penggulung dan kurangkan
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || tinggi === null || el.offsetParent === null) return;
    const penggulung = cariPenggulung(el);
    const lebih = penggulung.scrollHeight - penggulung.clientHeight;
    if (lebih > 0 && tinggi - lebih >= TINGGI_MIN) {
      koreksi.current += lebih;
      setTinggi(tinggi - lebih);
    }
  }, [tinggi]);

  return (
    <div
      ref={ref}
      style={tinggi ? { height: tinggi } : undefined}
      className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:grid-rows-[minmax(0,1fr)] lg:[&>*]:min-h-0 lg:[&>*]:min-w-0"
    >
      {children}
    </div>
  );
}