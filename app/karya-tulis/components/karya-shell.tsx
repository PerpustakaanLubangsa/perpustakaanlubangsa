'use client';

import React, { useState, useEffect, memo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Search, PenLine, FileText, Menu, X, ArrowUp } from 'lucide-react';

const HEADER_HEIGHT = 64;
const SCROLL_TOP_THRESHOLD = 400;
// Sesuaikan dengan alamat halaman/form pengiriman karya Anda
const KIRIM_KARYA_HREF = '/kirim-karya';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
}

const Header = memo(function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 8);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Header berlatar putih hanya saat di-scroll atau menu seluler terbuka
  const isSolid = isScrolled || isMobileMenuOpen;
  // Di halaman daftar, header berada di atas hero biru sehingga teksnya putih
  const onDark = pathname === '/karya-tulis' && !isSolid;
  const ring = onDark ? 'focus-visible:ring-white' : 'focus-visible:ring-blue-500';

  const menuItems: NavItem[] = [
    { label: 'Pencarian Buku', href: '/', icon: Search, active: pathname === '/' },
    {
      label: 'Karya Tulis',
      href: '/karya-tulis',
      icon: FileText,
      active: !!pathname?.startsWith('/karya-tulis'),
    },
    {
      label: 'Kirim Karya',
      href: KIRIM_KARYA_HREF,
      icon: PenLine,
      active: !!pathname?.startsWith(KIRIM_KARYA_HREF),
    },
  ];

  const renderNavItem = (item: NavItem, isMobile = false) => {
    const Icon = item.icon;
    const isActive = item.active;

    const baseStyle = isMobile
      ? `group flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 ${ring}`
      : `group relative flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 ${ring}`;

    const tone = onDark
      ? isActive
        ? 'bg-white/15 font-semibold text-white'
        : 'text-white/90 hover:bg-white/15 hover:text-white'
      : isActive
      ? 'bg-blue-50 font-semibold text-blue-700'
      : isMobile
      ? 'text-slate-600 hover:bg-blue-50 hover:text-blue-700'
      : 'text-slate-700 hover:bg-blue-50 hover:text-blue-700';

    return (
      <Link
        key={item.label}
        href={item.href}
        title={item.label}
        aria-current={isActive ? 'page' : undefined}
        onClick={() => {
          if (isMobile) setIsMobileMenuOpen(false);
        }}
        className={`${baseStyle} ${tone}`}
      >
        <Icon
          className={`h-4 w-4 transition-transform ${!isMobile ? 'group-hover:scale-110' : ''} ${
            isMobile ? (isActive ? 'text-blue-600' : 'text-slate-500 group-hover:text-blue-600') : 'text-current'
          }`}
        />
        <span>{item.label}</span>
        {isActive && !isMobile && (
          <span className="absolute inset-x-3 bottom-0.5 h-0.5 rounded-full bg-current" />
        )}
      </Link>
    );
  };

  return (
    <header
      className={`fixed inset-x-0 top-0 z-30 border-b transition-[background-color,border-color,box-shadow] duration-200 ${
        isSolid ? 'border-blue-100 bg-white shadow-sm' : 'border-transparent bg-transparent'
      }`}
    >
      <div
        className="flex w-full items-center justify-between px-4 sm:px-6 lg:px-8"
        style={{ height: HEADER_HEIGHT }}
      >
        <Link
          href="/"
          className={`group flex shrink-0 items-center gap-2.5 rounded-lg transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 ${ring}`}
        >
          <div className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg transition-transform group-hover:scale-105">
            <Image
              src="/logo.png"
              alt="Logo Perpustakaan Lubangsa"
              width={32}
              height={32}
              className="h-full w-full object-contain"
              priority
            />
          </div>
          <span
            className={`whitespace-nowrap text-sm font-bold tracking-tight transition-colors sm:text-base lg:text-lg ${
              onDark ? 'text-white' : 'text-slate-900'
            }`}
          >
            Perpustakaan Lubangsa
          </span>
        </Link>

        <nav aria-label="Navigasi utama" className="hidden items-center gap-1.5 md:flex">
          {menuItems.map((item) => renderNavItem(item, false))}
        </nav>

        <button
          type="button"
          onClick={() => setIsMobileMenuOpen((prev) => !prev)}
          aria-label={isMobileMenuOpen ? 'Tutup menu' : 'Buka menu'}
          aria-expanded={isMobileMenuOpen}
          className={`inline-flex shrink-0 cursor-pointer items-center justify-center rounded-lg p-2 transition-colors focus:outline-none focus-visible:ring-2 md:hidden ${ring} ${
            onDark ? 'text-white hover:bg-white/15' : 'text-slate-700 hover:bg-blue-50 hover:text-blue-700'
          }`}
        >
          {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {isMobileMenuOpen && (
        <div className="border-t-2 border-blue-600 bg-white px-4 pb-4 pt-2 md:hidden">
          <nav aria-label="Navigasi seluler" className="flex flex-col space-y-1">
            {menuItems.map((item) => renderNavItem(item, true))}
          </nav>
        </div>
      )}
    </header>
  );
});

const ScrollToTopButton = memo(function ScrollToTopButton() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsVisible(window.scrollY > SCROLL_TOP_THRESHOLD);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Kembali ke atas"
      title="Kembali ke atas"
      tabIndex={isVisible ? 0 : -1}
      aria-hidden={!isVisible}
      className={`fixed bottom-5 right-5 z-40 inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-900/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 sm:bottom-8 sm:right-8 sm:h-12 sm:w-12 ${
        isVisible ? 'pointer-events-auto translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0'
      }`}
    >
      <ArrowUp className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2.2} />
    </button>
  );
});

export default function KaryaShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full flex-col bg-gradient-to-b from-blue-50 via-slate-50 to-white text-slate-900 antialiased">
      <a
        href="#konten"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-blue-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Lewati ke konten
      </a>

      <Header />

      <main id="konten" className="flex-1">
        {children}
      </main>

      <ScrollToTopButton />
    </div>
  );
}