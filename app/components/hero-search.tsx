'use client';

import React, { useState, memo, ComponentType } from 'react';
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

// Tinggi bar header (h-16 = 64px)
const HEADER_HEIGHT = 64;

/* =========================================================
   HEADER (menimpa gambar hero, tidak sticky, tanpa background)
   ========================================================= */

interface NavItem {
  label: string;
  href?: string;
  icon?: ComponentType<{ className?: string }>;
  onClick?: () => void;
  active?: boolean;
}

interface HeaderProps {
  onToggleVisitor?: () => void;
  isVisitorOpen?: boolean;
}

const Header = memo(function Header({ onToggleVisitor, isVisitorOpen }: HeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const menuItems: NavItem[] = [
    {
      label: 'Pencarian Buku',
      href: '/',
      icon: Search,
      active: pathname === '/',
    },
    {
      label: 'Catat Kunjungan',
      icon: ClipboardSignature,
      onClick: onToggleVisitor,
      active: isVisitorOpen,
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

  const renderNavItem = (item: NavItem, isMobile = false) => {
    const Icon = item.icon;
    const isActive = item.active;

    const baseStyle = isMobile
      ? 'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors w-full text-left cursor-pointer'
      : 'group relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white cursor-pointer';

    // Desktop: teks putih di atas gambar. Mobile: drawer putih solid, teks gelap.
    const activeStyle = isMobile
      ? isActive
        ? 'text-slate-900 font-semibold bg-slate-100'
        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
      : isActive
        ? 'text-white font-semibold'
        : 'text-white hover:text-slate-900 hover:bg-white';

    const iconStyle = isMobile
      ? isActive
        ? 'text-slate-900'
        : 'text-slate-500'
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
          className={`${baseStyle} ${activeStyle}`}
          aria-expanded={isActive}
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
        onClick={() => {
          if (isMobile) setIsMobileMenuOpen(false);
        }}
        className={`${baseStyle} ${activeStyle}`}
      >
        {content}
      </Link>
    );
  };

  return (
    <header className="absolute top-0 left-0 right-0 z-30 text-white">
      <div
        className="flex w-full items-center justify-between px-4 sm:px-6 lg:px-8"
        style={{ height: HEADER_HEIGHT }}
      >
        {/* Logo & Brand Name */}
        <Link
          href="/"
          className="group flex items-center gap-2.5 transition-opacity hover:opacity-90 shrink-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
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
          <span className="text-sm font-bold tracking-tight text-white sm:text-base lg:text-lg whitespace-nowrap">
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
          className="inline-flex items-center justify-center rounded-lg p-2 text-white hover:text-slate-900 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white md:hidden shrink-0 cursor-pointer"
        >
          {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Navigation - Mobile Drawer (putih solid) */}
      {isMobileMenuOpen && (
        <div className="bg-white px-4 pt-2 pb-4 border-t border-slate-200 md:hidden">
          <nav className="flex flex-col space-y-1">
            {menuItems.map((item) => renderNavItem(item, true))}
          </nav>
        </div>
      )}
    </header>
  );
});

/* =========================================================
   HERO + PENCARIAN (statis)
   ========================================================= */

export interface HeroSearchProps {
  // Props kategori sudah tidak dipakai (dropdown dihapus); dibiarkan opsional agar pemanggil tidak error.
  categories?: string[];
  selectedCategory?: string;
  onCategoryChange?: (category: string) => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  isSearching: boolean;
  onToggleVisitor?: () => void;
  isVisitorOpen?: boolean;
}

const HeroSearch = memo(function HeroSearch({
  searchQuery,
  onSearchChange,
  isSearching,
  onToggleVisitor,
  isVisitorOpen,
}: HeroSearchProps) {
  return (
    <>
      {/* --- HERO SECTION + HEADER (header menimpa gambar) --- */}
      <div className="relative w-full">
        <Header onToggleVisitor={onToggleVisitor} isVisitorOpen={isVisitorOpen} />

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
        <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-2">
          <div className="relative flex w-full items-center">
            <input
              type="text"
              aria-label="Cari judul buku atau nama penulis"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Cari judul buku atau nama penulis..."
              className="w-full min-w-0 h-11 sm:h-12 pl-5 pr-24 bg-slate-100 border-none text-slate-900 placeholder-slate-500 font-medium tracking-tight text-sm rounded-xl sm:rounded-full focus:outline-none focus:ring-1 focus:ring-slate-400"
            />

            <div className="absolute right-3.5 pointer-events-none flex items-center gap-2">
              {isSearching ? (
                <div className="flex items-center gap-1.5">
                  <Loader2 className="h-4 w-4 text-slate-500 animate-spin" />
                  <span className="text-xs font-semibold text-slate-500 select-none">
                    Mencari
                  </span>
                </div>
              ) : (
                <Search className="h-4 w-4 sm:h-5 sm:w-5 text-slate-500" />
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
});

export default HeroSearch;