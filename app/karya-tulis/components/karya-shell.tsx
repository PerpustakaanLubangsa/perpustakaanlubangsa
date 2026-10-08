'use client';

import React, { useState, useEffect, useCallback, memo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Search, ClipboardSignature, FileText, LogIn, Menu, X, ArrowUp } from 'lucide-react';
// Sesuaikan path jika letak modal berbeda
import VisitorModal from '../../components/visitor-modal';

const HEADER_HEIGHT = 64;
const SCROLL_TOP_THRESHOLD = 400;

interface NavItem {
  label: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
  active?: boolean;
}

const Header = memo(function Header({
  onOpenVisitor,
  isVisitorOpen,
}: {
  onOpenVisitor: () => void;
  isVisitorOpen: boolean;
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 8);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const menuItems: NavItem[] = [
    { label: 'Pencarian Buku', href: '/', icon: Search, active: pathname === '/' && !isVisitorOpen },
    { label: 'Catat Kunjungan', icon: ClipboardSignature, onClick: onOpenVisitor, active: isVisitorOpen },
    {
      label: 'Karya Tulis',
      href: '/karya-tulis',
      icon: FileText,
      active: !isVisitorOpen && !!pathname?.startsWith('/karya-tulis'),
    },
    {
      label: 'Masuk Pustakawan',
      href: '/dashboard',
      icon: LogIn,
      active: !!pathname?.startsWith('/dashboard'),
    },
  ];

  const renderNavItem = (item: NavItem, isMobile = false) => {
    const Icon = item.icon;
    const isActive = item.active;

    const baseStyle = isMobile
      ? 'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors w-full text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500'
      : 'group relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer';

    const activeStyle = isActive
      ? 'text-blue-700 font-semibold bg-blue-50'
      : isMobile
      ? 'text-slate-600 hover:text-blue-700 hover:bg-blue-50'
      : 'text-slate-700 hover:text-blue-700 hover:bg-blue-50';

    const content = (
      <>
        <Icon
          className={`h-4 w-4 transition-transform ${!isMobile ? 'group-hover:scale-110' : ''} ${
            isMobile ? (isActive ? 'text-blue-600' : 'text-slate-500 group-hover:text-blue-600') : 'text-current'
          }`}
        />
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
          aria-haspopup="dialog"
          aria-expanded={!!isActive}
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
        aria-current={isActive ? 'page' : undefined}
        onClick={() => {
          if (isMobile) setIsMobileMenuOpen(false);
        }}
        className={`${baseStyle} ${activeStyle}`}
      >
        {content}
      </Link>
    );
  };

  const isSolid = isScrolled || isMobileMenuOpen;

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-30 border-b bg-white transition-shadow duration-200 ${
        isSolid ? 'border-blue-100 shadow-sm' : 'border-blue-50'
      }`}
    >
      <div
        className="flex w-full items-center justify-between px-4 sm:px-6 lg:px-8"
        style={{ height: HEADER_HEIGHT }}
      >
        <Link
          href="/"
          className="group flex shrink-0 items-center gap-2.5 rounded-lg transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
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
          <span className="whitespace-nowrap text-sm font-bold tracking-tight text-slate-900 sm:text-base lg:text-lg">
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
          className="inline-flex shrink-0 cursor-pointer items-center justify-center rounded-lg p-2 text-slate-700 transition-colors hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 md:hidden"
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
  const [isVisitorOpen, setIsVisitorOpen] = useState(false);
  const openVisitor = useCallback(() => setIsVisitorOpen(true), []);
  const closeVisitor = useCallback(() => setIsVisitorOpen(false), []);

  return (
    <div className="flex min-h-screen w-full flex-col bg-gradient-to-b from-blue-50 via-slate-50 to-white text-slate-900 antialiased">
      <a
        href="#konten"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-blue-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Lewati ke konten
      </a>

      <Header onOpenVisitor={openVisitor} isVisitorOpen={isVisitorOpen} />
      <div aria-hidden="true" style={{ height: HEADER_HEIGHT }} />

      <main id="konten" className="flex-1">
        {children}
      </main>

      <VisitorModal isOpen={isVisitorOpen} onClose={closeVisitor} />
      <ScrollToTopButton />
    </div>
  );
}