'use client';

import React, { useState, useEffect, useCallback, memo, ComponentType } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  Search,
  Loader2,
  ClipboardSignature,
  FileText,
  LogIn,
  Menu,
  X,
} from 'lucide-react';
import VisitorModal from './visitor-modal';

// Tinggi bar header (h-16 = 64px)
const HEADER_HEIGHT = 64;

// Jarak scroll (px) sebelum header berubah menjadi putih
const SCROLL_THRESHOLD = 16;

/* =========================================================
   HEADER (fixed: transparan di atas hero, putih saat di-scroll)
   ========================================================= */

interface NavItem {
  label: string;
  href?: string;
  icon?: ComponentType<{ className?: string }>;
  onClick?: () => void;
  active?: boolean;
  opensDialog?: boolean;
}

interface HeaderProps {
  onOpenVisitor: () => void;
  isVisitorOpen: boolean;
}

const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const Header = memo(function Header({ onOpenVisitor, isVisitorOpen }: HeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();

  // Deteksi scroll (passive, state hanya berubah saat melewati ambang batas)
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > SCROLL_THRESHOLD);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Header solid (putih) jika sudah di-scroll atau menu mobile terbuka
  const isSolid = isScrolled || isMobileMenuOpen;

  const menuItems: NavItem[] = [
    {
      label: 'Pencarian Buku',
      href: '/',
      icon: Search,
      active: pathname === '/' && !isVisitorOpen,
    },
    {
      label: 'Catat Kunjungan',
      icon: ClipboardSignature,
      onClick: onOpenVisitor, // membuka VisitorModal
      active: isVisitorOpen,
      opensDialog: true,
    },
    {
      label: 'Karya Tulis',
      href: '/karya-tulis',
      icon: FileText,
      active: pathname === '/karya-tulis' || pathname?.startsWith('/karya-tulis/'),
    },
    {
      label: 'Masuk Pustakawan',
      href: '/dashboard',
      icon: LogIn,
      active: pathname === '/dashboard' || pathname?.startsWith('/dashboard/'),
    },
  ];

  // Jika sedang di beranda dan menekan link "/", scroll ke atas (bukan reload/navigasi)
  const handleHomeClick = (e: React.MouseEvent<HTMLAnchorElement>, href?: string) => {
    if (href === '/' && pathname === '/') {
      e.preventDefault();
      scrollToTop();
    }
  };

  const renderNavItem = (item: NavItem, isMobile = false) => {
    const Icon = item.icon;
    const isActive = item.active;

    const focusRing = isSolid
      ? 'focus-visible:ring-blue-500'
      : 'focus-visible:ring-white';

    const baseStyle = isMobile
      ? 'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors w-full text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500'
      : `group relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 ${focusRing} cursor-pointer`;

    let activeStyle: string;
    if (isMobile) {
      activeStyle = isActive
        ? 'text-blue-700 font-semibold bg-blue-50'
        : 'text-slate-600 hover:text-blue-700 hover:bg-blue-50';
    } else if (isSolid) {
      // Desktop, header putih: teks gelap, aksen biru
      activeStyle = isActive
        ? 'text-blue-700 font-semibold bg-blue-50'
        : 'text-slate-700 hover:text-blue-700 hover:bg-blue-50';
    } else {
      // Desktop, di atas gambar hero: teks putih
      activeStyle = isActive
        ? 'text-white font-semibold'
        : 'text-white hover:text-blue-700 hover:bg-white';
    }

    const iconStyle = isMobile
      ? isActive
        ? 'text-blue-600'
        : 'text-slate-500 group-hover:text-blue-600'
      : 'text-current';

    const content = (
      <>
        {Icon && (
          <Icon
            className={`h-4 w-4 transition-transform ${
              !isMobile ? 'group-hover:scale-110' : ''
            } ${iconStyle}`}
          />
        )}
        <span>{item.label}</span>
        {isActive && !isMobile && (
          <span className="absolute inset-x-3 bottom-0.5 h-0.5 rounded-full bg-current" />
        )}
      </>
    );

    // Item berupa tombol: membuka modal
    if (item.onClick) {
      return (
        <button
          key={item.label}
          type="button"
          title={item.label}
          onClick={() => {
            item.onClick?.();
            if (isMobile) setIsMobileMenuOpen(false);
          }}
          className={`group ${baseStyle} ${activeStyle}`}
          aria-haspopup={item.opensDialog ? 'dialog' : undefined}
          aria-expanded={item.opensDialog ? !!isActive : undefined}
        >
          {content}
        </button>
      );
    }

    return (
      <Link
        key={item.label}
        href={item.href || '#'}
        title={item.label}
        onClick={(e) => {
          handleHomeClick(e, item.href);
          if (isMobile) setIsMobileMenuOpen(false);
        }}
        className={`group ${baseStyle} ${activeStyle}`}
      >
        {content}
      </Link>
    );
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-30 border-b transition-colors duration-200 ${
        isSolid
          ? 'bg-white border-blue-100 shadow-sm text-slate-900'
          : 'bg-transparent border-transparent text-white'
      }`}
    >
      <div
        className="flex w-full items-center justify-between px-4 sm:px-6 lg:px-8"
        style={{ height: HEADER_HEIGHT }}
      >
        {/* Logo & Brand Name */}
        <Link
          href="/"
          onClick={(e) => handleHomeClick(e, '/')}
          className={`group flex items-center gap-2.5 transition-opacity hover:opacity-90 shrink-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 ${
            isSolid ? 'focus-visible:ring-blue-500' : 'focus-visible:ring-white'
          }`}
        >
          <div className="relative flex h-8 w-8 items-center justify-center rounded-lg transition-transform group-hover:scale-105 shrink-0 overflow-hidden">
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
            className={`text-sm font-bold tracking-tight sm:text-base lg:text-lg whitespace-nowrap transition-colors duration-200 ${
              isSolid ? 'text-slate-900' : 'text-white'
            }`}
          >
            Perpustakaan Lubangsa
          </span>
        </Link>

        {/* Navigation - Desktop */}
        <nav className="hidden items-center gap-1.5 md:flex">
          {menuItems.map((item) => renderNavItem(item, false))}
        </nav>

        {/* Mobile Menu Button */}
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen((prev) => !prev)}
          aria-label={isMobileMenuOpen ? 'Tutup menu' : 'Buka menu'}
          aria-expanded={isMobileMenuOpen}
          className={`inline-flex items-center justify-center rounded-lg p-2 transition-colors focus:outline-none focus-visible:ring-2 md:hidden shrink-0 cursor-pointer ${
            isSolid
              ? 'text-slate-700 hover:text-blue-700 hover:bg-blue-50 focus-visible:ring-blue-500'
              : 'text-white hover:text-blue-700 hover:bg-white focus-visible:ring-white'
          }`}
        >
          {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Navigation - Mobile Drawer (putih solid, aksen biru) */}
      {isMobileMenuOpen && (
        <div className="bg-white px-4 pt-2 pb-4 border-t-2 border-blue-600 md:hidden">
          <nav className="flex flex-col space-y-1">
            {menuItems.map((item) => renderNavItem(item, true))}
          </nav>
        </div>
      )}
    </header>
  );
});

/* =========================================================
   HERO + PENCARIAN (statis) + MODAL CATAT KUNJUNGAN
   ========================================================= */

export interface HeroSearchProps {
  // Props lama dibiarkan opsional agar pemanggil (page.tsx) tidak error.
  categories?: string[];
  selectedCategory?: string;
  onCategoryChange?: (category: string) => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  isSearching: boolean;
  /** @deprecated Modal kini dikelola langsung oleh HeroSearch. Prop ini diabaikan. */
  onOpenVisitor?: () => void;
  /** @deprecated Modal kini dikelola langsung oleh HeroSearch. Prop ini diabaikan. */
  onToggleVisitor?: () => void;
  /** @deprecated Modal kini dikelola langsung oleh HeroSearch. Prop ini diabaikan. */
  isVisitorOpen?: boolean;
}

const HeroSearch = memo(function HeroSearch({
  searchQuery,
  onSearchChange,
  isSearching,
}: HeroSearchProps) {
  // State modal dikelola di sini, jadi page.tsx tidak perlu mengurusnya
  const [isVisitorOpen, setIsVisitorOpen] = useState(false);

  const openVisitor = useCallback(() => setIsVisitorOpen(true), []);
  const closeVisitor = useCallback(() => setIsVisitorOpen(false), []);

  return (
    <>
      {/* --- HERO SECTION + HEADER (header fixed, menimpa gambar) --- */}
      <div className="relative w-full">
        <Header onOpenVisitor={openVisitor} isVisitorOpen={isVisitorOpen} />

        <section className="relative w-full h-[60vh] sm:h-[80vh] flex flex-col items-center justify-center text-center overflow-hidden">
          <img
            src="/bg.png"
            alt="Hero Background"
            className="absolute inset-0 w-full h-full object-cover"
          />
        </section>
      </div>

      {/* --- SEARCH BAR DI PERBATASAN HERO (statis, tidak sticky) --- */}
      <div className="w-full max-w-5xl mx-auto px-4 relative z-20 -mt-7">
        <div className="bg-white border border-blue-100 rounded-2xl sm:rounded-3xl p-2 shadow-lg shadow-blue-900/5 transition-colors focus-within:border-blue-300">
          <div className="relative flex w-full items-center">
            <input
              type="text"
              aria-label="Cari judul buku atau nama penulis"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Cari judul buku atau nama penulis..."
              className="w-full min-w-0 h-11 sm:h-12 pl-5 pr-24 bg-blue-50 border-none text-slate-900 placeholder-slate-500 font-medium tracking-tight text-sm rounded-xl sm:rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
            />

            <div className="absolute right-3.5 pointer-events-none flex items-center gap-2">
              {isSearching ? (
                <div className="flex items-center gap-1.5">
                  <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                  <span className="text-xs font-semibold text-blue-600 select-none">
                    Mencari
                  </span>
                </div>
              ) : (
                <Search className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* --- MODAL CATAT KUNJUNGAN (file terpisah) --- */}
      <VisitorModal isOpen={isVisitorOpen} onClose={closeVisitor} />
    </>
  );
});

export default HeroSearch;