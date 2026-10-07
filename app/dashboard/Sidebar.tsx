'use client';

import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { library } from '@fortawesome/fontawesome-svg-core';
import type { IconProp } from '@fortawesome/fontawesome-svg-core';
import {
  fas,
  faChevronUp,
  faArrowLeft,
  faRightFromBracket,
} from '@fortawesome/free-solid-svg-icons';

library.add(fas);

/* ───────────────────────── Types ───────────────────────── */

interface MenuItem {
  id: number;
  label: string;
  icon: string;
  page_url: string;
  grup: string;
  urutan: number;
}

interface NavGroup {
  groupName: string;
  items: MenuItem[];
}

type SelectionSource = 'mouse' | 'keyboard' | null;

/* ─────────────── Helper murni (di luar komponen) ─────────────── */

const DRAG_THRESHOLD = 5;

/** Hapus .html dan pastikan URL berformat /dashboard/... */
function normalizeUrl(rawUrl?: string | null): string {
  let path = '/' + (rawUrl ?? '').trim().replace(/\.html$/i, '').replace(/^\/+/, '');
  if (!/^\/dashboard(\/|$)/.test(path)) path = `/dashboard${path}`;
  return path.replace(/\/+/g, '/');
}

function formatFAIcon(iconString?: string | null): IconProp {
  if (!iconString) return ['fas', 'question'];
  const name = iconString
    .replace(/^fa-(solid|regular|brands)\s+/, '')
    .replace(/^fa-/, '');
  return ['fas', name as any];
}

/** Kelompokkan data (data sudah terurut dari query, urutan grup = urutan kemunculan) */
function groupMenu(items: MenuItem[]): NavGroup[] {
  const map = new Map<string, MenuItem[]>();
  for (const item of items) {
    const key = item.grup || 'Lainnya';
    const list = map.get(key);
    if (list) list.push(item);
    else map.set(key, [item]);
  }
  return Array.from(map, ([groupName, groupItems]) => ({
    groupName,
    items: groupItems,
  }));
}

function isPathActive(pathname: string, url: string): boolean {
  if (pathname === url) return true;
  // Halaman turunan aktif, kecuali root /dashboard (supaya tidak aktif di semua halaman)
  return url !== '/dashboard' && pathname.startsWith(url + '/');
}

/* ───────────────────── Item menu (memoized) ───────────────────── */

interface MenuLinkProps {
  item: MenuItem;
  index: number;
  isActive: boolean;
  isSelected: boolean;
  onHover: (index: number) => void;
  onLeave: (index: number) => void;
  registerRef: (id: number, el: HTMLAnchorElement | null) => void;
  shouldBlockClick: () => boolean;
}

const MenuLink = memo(function MenuLink({
  item,
  index,
  isActive,
  isSelected,
  onHover,
  onLeave,
  registerRef,
  shouldBlockClick,
}: MenuLinkProps) {
  return (
    <Link
      ref={(el) => registerRef(item.id, el)}
      href={item.page_url}
      onClick={(e) => {
        if (shouldBlockClick()) e.preventDefault();
      }}
      // onMouseMove (bukan onMouseEnter): hanya terpicu oleh gerakan mouse nyata,
      // jadi scroll keyboard di bawah kursor diam tidak merebut sorotan
      onMouseMove={() => onHover(index)}
      onMouseLeave={() => onLeave(index)}
      aria-current={isActive ? 'page' : undefined}
      className={`group flex items-center gap-3 h-10 px-3 rounded-xl text-[13px] font-bold uppercase tracking-wider w-full overflow-hidden transition-colors duration-150
        ${
          isActive
            ? 'bg-blue-600 text-white shadow-sm'
            : isSelected
            ? 'bg-white text-blue-700 ring-1 ring-blue-200 outline-none'
            : 'text-slate-600'
        }`}
    >
      <span className="w-5 flex items-center justify-center shrink-0">
        <FontAwesomeIcon
          icon={formatFAIcon(item.icon)}
          className={`w-4 h-4 transition-colors duration-150 ${
            isActive
              ? 'text-white'
              : isSelected
              ? 'text-blue-600'
              : 'text-blue-400'
          }`}
        />
      </span>
      <span className="whitespace-nowrap truncate">{item.label}</span>
    </Link>
  );
});

/* ───────────────────────── Sidebar ───────────────────────── */

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [navigationGroups, setNavigationGroups] = useState<NavGroup[]>([]);
  const [menuLoading, setMenuLoading] = useState(true);

  const [profileOpen, setProfileOpen] = useState(false);
  const [isGrabbing, setIsGrabbing] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<Record<number, HTMLAnchorElement | null>>({});
  const selectionSource = useRef<SelectionSource>(null);
  const keyboardNav = useRef(false);
  const dragInfo = useRef({ isDown: false, moved: false, startY: 0, scrollTop: 0 });

  /* Helper: hapus sorotan */
  const clearSelection = useCallback(() => {
    selectionSource.current = null;
    setActiveIndex(-1);
  }, []);

  /* 1. Autentikasi — onAuthStateChange sudah memicu INITIAL_SESSION */
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setUser(null);
        router.replace('/login');
      } else {
        setUser(session.user);
      }
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [router]);

  /* 2. Ambil menu navigasi (hanya kolom yang dipakai) */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data, error } = await supabase
          .from('navigasi_menu')
          .select('id, label, icon, page_url, grup, urutan')
          .eq('is_active', true)
          .order('urutan', { ascending: true });

        if (cancelled) return;
        if (error) {
          console.error('Gagal mengambil data menu:', error.message);
          return;
        }

        const cleaned = (data as MenuItem[]).map((item) => ({
          ...item,
          page_url: normalizeUrl(item.page_url),
        }));
        setNavigationGroups(groupMenu(cleaned));
      } catch (err) {
        console.error('Terjadi kesalahan:', err);
      } finally {
        if (!cancelled) setMenuLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  /* 3. Filter pencarian */
  const filteredGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return navigationGroups;
    return navigationGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => item.label.toLowerCase().includes(q)),
      }))
      .filter((group) => group.items.length > 0);
  }, [searchQuery, navigationGroups]);

  const flatItems = useMemo(
    () => filteredGroups.flatMap((group) => group.items),
    [filteredGroups]
  );

  const indexById = useMemo(() => {
    const map = new Map<number, number>();
    flatItems.forEach((item, i) => map.set(item.id, i));
    return map;
  }, [flatItems]);

  // Reset sorotan saat query berubah
  useEffect(() => {
    clearSelection();
  }, [searchQuery, clearSelection]);

  // Reset sorotan saat berpindah halaman
  useEffect(() => {
    clearSelection();
  }, [pathname, clearSelection]);

  /* 4. Scroll ke item terpilih (hanya saat navigasi keyboard) */
  useEffect(() => {
    if (!keyboardNav.current || activeIndex < 0) return;
    const id = flatItems[activeIndex]?.id;
    if (id !== undefined) {
      itemRefs.current[id]?.scrollIntoView({ block: 'nearest' });
    }
    keyboardNav.current = false;
  }, [activeIndex, flatItems]);

  /* ───────────── Handler (stabil dengan useCallback) ───────────── */

  const registerRef = useCallback((id: number, el: HTMLAnchorElement | null) => {
    itemRefs.current[id] = el;
  }, []);

  // Hover: sorotan mengikuti kursor
  const handleHover = useCallback((index: number) => {
    if (dragInfo.current.isDown) return;
    selectionSource.current = 'mouse';
    setActiveIndex(index);
  }, []);

  // Kursor meninggalkan item: hilangkan sorotan jika berasal dari mouse
  const handleItemLeave = useCallback((index: number) => {
    if (selectionSource.current !== 'mouse') return;
    setActiveIndex((prev) => (prev === index ? -1 : prev));
  }, []);

  const shouldBlockClick = useCallback(() => dragInfo.current.moved, []);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setSearchQuery('');
      clearSelection();
      searchInputRef.current?.blur();
      return;
    }

    const total = flatItems.length;
    if (total === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        keyboardNav.current = true;
        selectionSource.current = 'keyboard';
        setActiveIndex((prev) => (prev + 1 >= total ? 0 : prev + 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        keyboardNav.current = true;
        selectionSource.current = 'keyboard';
        setActiveIndex((prev) => (prev - 1 < 0 ? total - 1 : prev - 1));
        break;
      case 'Enter': {
        e.preventDefault();
        const target = flatItems[activeIndex >= 0 ? activeIndex : 0];
        if (target) router.push(target.page_url);
        break;
      }
    }
  };

  // Sorotan keyboard hilang saat kolom pencarian tidak lagi fokus
  const handleSearchBlur = () => {
    if (selectionSource.current === 'keyboard') clearSelection();
  };

  /* Drag-to-scroll dengan threshold */
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.button !== 1) return;
    if (e.button === 1) e.preventDefault();

    const container = scrollContainerRef.current;
    if (!container) return;

    dragInfo.current = {
      isDown: true,
      moved: false,
      startY: e.clientY,
      scrollTop: container.scrollTop,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const info = dragInfo.current;
    if (!info.isDown) return;

    const container = scrollContainerRef.current;
    if (!container) return;

    const dy = e.clientY - info.startY;

    if (!info.moved) {
      if (Math.abs(dy) < DRAG_THRESHOLD) return;
      info.moved = true;
      setIsGrabbing(true);
    }

    e.preventDefault();
    container.scrollTop = info.scrollTop - dy * 1.5;
  };

  const handleMouseUp = () => {
    dragInfo.current.isDown = false;
    // `moved` dibiarkan sampai mousedown berikutnya agar click setelah drag bisa diblokir
    setIsGrabbing(false);
  };

  // Kursor keluar dari area navigasi: hentikan drag & hilangkan sorotan hover
  const handleContainerLeave = () => {
    handleMouseUp();
    if (selectionSource.current === 'mouse') clearSelection();
  };

  const toggleProfile = () => {
    if (!dragInfo.current.moved) setProfileOpen((prev) => !prev);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  /* ───────────────────────── Render ───────────────────────── */

  if (authLoading || menuLoading || !user) {
    return (
      <div className="hidden md:flex w-72 bg-blue-50 border-r border-blue-100 rounded-r-[32px] h-screen fixed top-0 left-0 z-50 items-center justify-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
      </div>
    );
  }

  const email = user.email ?? '';

  return (
    <aside
      className="hidden md:flex w-72 bg-blue-50 text-slate-700 flex-col fixed h-screen top-0 left-0 z-50 select-none rounded-r-[32px] border-r border-blue-100 shadow-[4px_0_24px_-12px_rgba(30,64,175,0.25)] overflow-hidden"
      style={isGrabbing ? { cursor: 'grabbing' } : undefined}
    >
      <div className="w-full flex flex-col h-full">
        {/* IDENTITAS APLIKASI */}
        <div className="flex items-center gap-3 h-16 w-full shrink-0 px-5">
          <img
            src="/logo3.png"
            alt="Logo"
            decoding="async"
            className="h-9 w-auto object-contain shrink-0"
          />
          <div className="flex flex-col whitespace-nowrap">
            <h1 className="text-sm font-black text-slate-900 tracking-tight uppercase leading-tight">
              Lubangsa
            </h1>
            <p className="text-[10px] text-blue-600 font-bold uppercase tracking-wider -mt-0.5">
              Library
            </p>
          </div>
        </div>

        {/* KOTAK PENCARIAN */}
        <div className="px-4 py-2 shrink-0 w-full">
          <div className="relative flex items-center w-full">
            <FontAwesomeIcon
              icon={['fas', 'magnifying-glass']}
              className="absolute left-3 w-3 h-3 text-blue-400 pointer-events-none"
            />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Cari menu..."
              aria-label="Cari menu"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              onBlur={handleSearchBlur}
              className="w-full h-9 pl-8 pr-8 bg-white border border-blue-100 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 text-xs font-medium rounded-xl text-slate-800 placeholder-slate-400 outline-none transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Hapus pencarian"
                className="absolute right-3 text-[10px] text-slate-400 hover:text-blue-700 font-bold transition-colors"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* AREA NAVIGASI */}
        <div
          ref={scrollContainerRef}
          onMouseDown={handleMouseDown}
          onMouseLeave={handleContainerLeave}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
          className="flex-1 overflow-y-auto overflow-x-hidden py-2 [overscroll-behavior:contain] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={isGrabbing ? { cursor: 'grabbing' } : undefined}
        >
          <div className="px-3 space-y-4">
            {filteredGroups.length > 0 ? (
              filteredGroups.map((group) => (
                <div key={group.groupName} className="space-y-1">
                  <div className="h-4 flex items-center">
                    <span className="text-[10px] font-extrabold tracking-widest text-blue-500 uppercase whitespace-nowrap pl-3">
                      {group.groupName}
                    </span>
                  </div>

                  {group.items.map((item) => {
                    const index = indexById.get(item.id) ?? -1;
                    return (
                      <MenuLink
                        key={item.id}
                        item={item}
                        index={index}
                        isActive={isPathActive(pathname, item.page_url)}
                        isSelected={activeIndex === index}
                        onHover={handleHover}
                        onLeave={handleItemLeave}
                        registerRef={registerRef}
                        shouldBlockClick={shouldBlockClick}
                      />
                    );
                  })}
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-xs text-slate-500 font-medium">
                Menu tidak ditemukan
              </div>
            )}
          </div>
        </div>

        {/* PROFIL & AKSI */}
        <div className="p-3 shrink-0">
          <div
            className={`bg-white border border-blue-100 rounded-2xl flex flex-col justify-between overflow-hidden transition-all duration-200 w-full ${
              profileOpen ? 'h-40 p-2 space-y-2' : 'h-14 p-1.5'
            }`}
          >
            <div
              onClick={toggleProfile}
              role="button"
              tabIndex={0}
              aria-expanded={profileOpen}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setProfileOpen((prev) => !prev);
                }
              }}
              className="relative flex items-center gap-3 h-11 w-full px-2 rounded-xl cursor-pointer hover:bg-blue-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-[11px] font-black text-white uppercase shrink-0">
                {email.substring(0, 2)}
              </div>

              <div className="flex flex-col min-w-0 whitespace-nowrap">
                <span className="text-[11px] font-bold text-slate-800 leading-tight truncate">
                  @{email.split('@')[0]}
                </span>
                <span className="text-[9px] text-blue-600 font-semibold uppercase tracking-wider">
                  Pustakawan
                </span>
              </div>

              <FontAwesomeIcon
                icon={faChevronUp}
                className={`absolute right-3 w-3 h-3 text-blue-400 transition-transform duration-200 ${
                  profileOpen ? 'rotate-180' : 'rotate-0'
                }`}
              />
            </div>

            {profileOpen && (
              <div className="flex flex-col gap-1.5 pt-2 border-t border-blue-100">
                <button
                  type="button"
                  onClick={() => router.push('/')}
                  className="w-full flex items-center justify-start gap-2.5 py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-lg text-xs font-semibold tracking-wide transition-colors border border-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <FontAwesomeIcon icon={faArrowLeft} className="w-3.5 h-3.5 shrink-0 text-blue-600" />
                  <span>Halaman Utama</span>
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center justify-start gap-2.5 py-2 px-3 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 rounded-lg text-xs font-semibold tracking-wide transition-colors border border-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                >
                  <FontAwesomeIcon icon={faRightFromBracket} className="w-3.5 h-3.5 shrink-0 text-red-500" />
                  <span>Keluar / Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}