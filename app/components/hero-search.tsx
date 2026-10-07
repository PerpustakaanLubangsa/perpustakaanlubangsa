'use client';

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useId,
  memo,
  ComponentType,
} from 'react';
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
import { supabase } from '@/lib/supabase';

// Tinggi bar header (h-16 = 64px)
const HEADER_HEIGHT = 64;

// Jarak scroll (px) sebelum header berubah menjadi putih
const SCROLL_THRESHOLD = 16;

// Pengaturan saran pencarian
const SUGGEST_MIN_CHARS = 2;
const SUGGEST_DEBOUNCE_MS = 250;
const SUGGEST_PER_TYPE = 3;
const SKELETON_WIDTHS = ['w-3/4', 'w-1/2', 'w-2/3', 'w-5/12'];

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
   KOTAK PENCARIAN + SARAN (judul, penulis, topik)
   ========================================================= */

type SuggestionType = 'judul' | 'penulis' | 'topik';

interface Suggestion {
  teks: string;
  tipe: SuggestionType;
}

const TYPE_LABEL: Record<SuggestionType, string> = {
  judul: 'Judul',
  penulis: 'Penulis',
  topik: 'Topik',
};

interface SearchBoxProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onSearch: (query: string) => void;
  isSearching: boolean;
}

const SearchBox = memo(function SearchBox({
  searchQuery,
  onSearchChange,
  onSearch,
  isSearching,
}: SearchBoxProps) {
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const requestIdRef = useRef(0);

  const [isOpen, setIsOpen] = useState(false);
  const [isLoadingSuggest, setIsLoadingSuggest] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);

  const trimmed = searchQuery.trim();
  const canSuggest = trimmed.length >= SUGGEST_MIN_CHARS;

  // Ambil saran (debounce). Skeleton muncul langsung saat user mengetik.
  useEffect(() => {
    if (!canSuggest) {
      requestIdRef.current += 1; // batalkan respons yang masih berjalan
      setSuggestions([]);
      setIsLoadingSuggest(false);
      return;
    }

    const currentId = ++requestIdRef.current;
    setIsLoadingSuggest(true);

    const timer = setTimeout(async () => {
      try {
        const { data, error } = await supabase.rpc('suggest_biblio', {
          q: trimmed,
          lim: SUGGEST_PER_TYPE,
        });
        if (currentId !== requestIdRef.current) return; // sudah usang
        if (error) throw error;
        setSuggestions((data ?? []) as Suggestion[]);
      } catch {
        if (currentId !== requestIdRef.current) return;
        setSuggestions([]);
      } finally {
        if (currentId === requestIdRef.current) setIsLoadingSuggest(false);
      }
    }, SUGGEST_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [trimmed, canSuggest]);

  // Tutup saran saat klik di luar kotak pencarian
  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  const runSearch = useCallback(
    (value: string) => {
      requestIdRef.current += 1; // hentikan pembaruan saran
      setIsLoadingSuggest(false);
      setIsOpen(false);
      setActiveIndex(-1);
      onSearch(value.trim());
    },
    [onSearch]
  );

  const pickSuggestion = useCallback(
    (s: Suggestion) => {
      onSearchChange(s.teks);
      runSearch(s.teks);
    },
    [onSearchChange, runSearch]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runSearch(searchQuery);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const hasList = isOpen && canSuggest && !isLoadingSuggest && suggestions.length > 0;

    if (e.key === 'ArrowDown') {
      if (!canSuggest) return;
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      if (hasList) setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      if (!hasList) return;
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === 'Enter') {
      // Enter pada saran yang disorot: pakai saran itu. Selain itu: biarkan form submit.
      if (hasList && activeIndex >= 0 && suggestions[activeIndex]) {
        e.preventDefault();
        pickSuggestion(suggestions[activeIndex]);
      }
    } else if (e.key === 'Escape') {
      if (isOpen) {
        e.preventDefault();
        setIsOpen(false);
        setActiveIndex(-1);
      }
    }
  };

  const showPanel = isOpen && canSuggest;
  const showSkeleton = showPanel && isLoadingSuggest;
  const showList = showPanel && !isLoadingSuggest && suggestions.length > 0;
  const showEmpty = showPanel && !isLoadingSuggest && suggestions.length === 0;

  return (
    <div ref={containerRef} className="relative">
      <form
        onSubmit={handleSubmit}
        role="search"
        className="bg-white border border-blue-100 rounded-2xl sm:rounded-3xl p-2 shadow-lg shadow-blue-900/5 transition-colors focus-within:border-blue-300"
      >
        <div className="relative flex w-full items-center">
          <input
            type="text"
            role="combobox"
            aria-label="Cari judul buku, penulis, atau topik"
            aria-expanded={showPanel}
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={
              showList && activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined
            }
            autoComplete="off"
            enterKeyHint="search"
            value={searchQuery}
            onChange={(e) => {
              onSearchChange(e.target.value);
              setIsOpen(true);
              setActiveIndex(-1);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="Cari judul, penulis, atau topik..."
            className="w-full min-w-0 h-11 sm:h-12 pl-5 pr-28 sm:pr-32 bg-blue-50 border-none text-slate-900 placeholder-slate-500 font-medium tracking-tight text-sm rounded-xl sm:rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
          />

          <button
            type="submit"
            disabled={isSearching}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex h-8 sm:h-9 items-center justify-center gap-1.5 rounded-lg sm:rounded-full bg-blue-600 px-3.5 sm:px-4 text-xs sm:text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-80 cursor-pointer"
          >
            {isSearching ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Mencari</span>
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                <span>Cari</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* --- PANEL SARAN --- */}
      {showPanel && (
        <div
          id={listboxId}
          role="listbox"
          aria-label="Saran pencarian"
          aria-busy={showSkeleton}
          className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-blue-100 bg-white py-1.5 shadow-lg shadow-blue-900/10"
        >
          {showSkeleton && (
            <div className="px-2" aria-hidden="true">
              {SKELETON_WIDTHS.map((width, i) => (
                <div key={i} className="flex items-center justify-between gap-4 rounded-lg px-3 py-2.5">
                  <div className={`h-3.5 animate-pulse rounded bg-blue-100 ${width}`} />
                  <div className="h-3 w-12 animate-pulse rounded bg-blue-50" />
                </div>
              ))}
            </div>
          )}

          {showList && (
            <ul className="px-2">
              {suggestions.map((s, i) => {
                const isActive = i === activeIndex;
                return (
                  <li
                    key={`${s.tipe}-${s.teks}`}
                    id={`${listboxId}-opt-${i}`}
                    role="option"
                    aria-selected={isActive}
                    // onMouseDown agar klik terjadi sebelum input kehilangan fokus
                    onMouseDown={(e) => {
                      e.preventDefault();
                      pickSuggestion(s);
                    }}
                    onMouseEnter={() => setActiveIndex(i)}
                    className={`flex cursor-pointer items-center justify-between gap-4 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                      isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-blue-50'
                    }`}
                  >
                    <span className="min-w-0 truncate font-medium">{s.teks}</span>
                    <span className="shrink-0 text-xs font-semibold text-slate-400">
                      {TYPE_LABEL[s.tipe]}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}

          {showEmpty && (
            <p className="px-5 py-3 text-sm text-slate-500">
              Tidak ada saran. Tekan Enter atau klik Cari untuk mencari.
            </p>
          )}
        </div>
      )}
    </div>
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
  /** Teks di input (berubah setiap ketikan, TIDAK memicu pencarian). */
  searchQuery: string;
  onSearchChange: (value: string) => void;
  /** Dipanggil hanya saat klik tombol Cari, tekan Enter, atau memilih saran. */
  onSearch: (query: string) => void;
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
  onSearch,
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
        <SearchBox
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          onSearch={onSearch}
          isSearching={isSearching}
        />
      </div>

      {/* --- MODAL CATAT KUNJUNGAN (file terpisah) --- */}
      <VisitorModal isOpen={isVisitorOpen} onClose={closeVisitor} />
    </>
  );
});

export default HeroSearch;