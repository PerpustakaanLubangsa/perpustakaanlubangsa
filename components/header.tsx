'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Search, ClipboardSignature, FileText, LogIn, Menu, X } from 'lucide-react';
import { ComponentType, useState } from 'react';

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

export default function Header({ onToggleVisitor, isVisitorOpen }: HeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  // Menu Navigasi dengan penentuan state active otomatis berdasarkan route
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
      href: '/login',
      icon: LogIn,
      active: pathname === '/login',
    },
  ];

  return (
    <header
      // DISESUAIKAN: Padding kiri diubah ke 320px / 350px agar presisi dengan sidebar baru
      className={`absolute top-0 left-0 right-0 z-50 h-16 bg-transparent text-slate-100 transition-all duration-300 ${
        isVisitorOpen ? 'md:pl-[320px] lg:pl-[350px]' : 'pl-0'
      }`}
    >
      <div className="flex h-full w-full items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo & Brand Name */}
        <Link
          href="/"
          className="group flex items-center gap-2.5 transition-all duration-300 hover:opacity-90 shrink-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
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
        <nav className="hidden items-center gap-1.5 md:flex shrink-0">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = item.active;

            const baseStyle =
              'group flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500';

            const activeStyle = isActive
              ? 'bg-blue-600 text-white shadow-md shadow-blue-900/50 font-semibold'
              : 'text-slate-200 hover:text-white hover:bg-slate-800/60';

            if (item.onClick) {
              return (
                <button
                  key={index}
                  type="button"
                  onClick={item.onClick}
                  className={`${baseStyle} ${activeStyle}`}
                  aria-expanded={isActive}
                >
                  {Icon && (
                    <Icon
                      className={`h-4 w-4 transition-transform group-hover:scale-110 ${
                        isActive ? 'text-white' : 'text-slate-300 group-hover:text-white'
                      }`}
                    />
                  )}
                  <span>{item.label}</span>
                </button>
              );
            }

            return (
              <Link
                key={index}
                href={item.href || '#'}
                className={`${baseStyle} ${activeStyle}`}
              >
                {Icon && (
                  <Icon
                    className={`h-4 w-4 transition-transform group-hover:scale-110 ${
                      isActive ? 'text-white' : 'text-slate-300 group-hover:text-white'
                    }`}
                  />
                )}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Mobile Menu Button */}
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label={isMobileMenuOpen ? 'Tutup menu' : 'Buka menu'}
          aria-expanded={isMobileMenuOpen}
          className="inline-flex items-center justify-center rounded-lg p-2 text-slate-300 hover:text-white hover:bg-slate-800/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 md:hidden shrink-0"
        >
          {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Navigation - Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="bg-slate-950/95 backdrop-blur-md px-4 pt-2 pb-4 border-b border-slate-800 md:hidden shadow-xl">
          <nav className="flex flex-col space-y-1">
            {menuItems.map((item, index) => {
              const Icon = item.icon;
              const isActive = item.active;

              const mobileBaseStyle =
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all w-full text-left';
              const mobileActiveStyle = isActive
                ? 'bg-blue-600 text-white font-semibold'
                : 'text-slate-200 hover:text-white hover:bg-slate-800/60';

              if (item.onClick) {
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => {
                      item.onClick!();
                      setIsMobileMenuOpen(false);
                    }}
                    className={`${mobileBaseStyle} ${mobileActiveStyle}`}
                  >
                    {Icon && (
                      <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    )}
                    <span>{item.label}</span>
                  </button>
                );
              }

              return (
                <Link
                  key={index}
                  href={item.href || '#'}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`${mobileBaseStyle} ${mobileActiveStyle}`}
                >
                  {Icon && (
                    <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  )}
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}