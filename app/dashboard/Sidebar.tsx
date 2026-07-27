'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { library } from '@fortawesome/fontawesome-svg-core';
import { fas, faChevronUp, faArrowLeft, faRightFromBracket } from '@fortawesome/free-solid-svg-icons';

library.add(fas, faChevronUp, faArrowLeft, faRightFromBracket);

interface MenuItem {
  id: number;
  label: string;
  icon: string;
  page_url: string;
  grup: string;
  urutan: number;
  role_akses?: string[];
  is_active?: boolean;
}

interface NavGroup {
  groupName: string;
  items: MenuItem[];
}

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [navigationGroups, setNavigationGroups] = useState<NavGroup[]>([]);
  const [menuLoading, setMenuLoading] = useState(true);

  const [profileOpen, setProfileOpen] = useState(false);
  const [isGrabbing, setIsGrabbing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<{[key: string]: HTMLAnchorElement | null}>({});
  const dragInfo = useRef({ isDown: false, startY: 0, scrollTop: 0 });

  // 1. Cek Autentikasi
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
      } else {
        setUser(session.user);
        setLoading(false);
      }
    };
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!session) {
        setUser(null);
        router.push('/login');
      } else {
        setUser(session.user);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  // 2. Fetch Data Navigasi Supabase, Hapus .html & Format ke /dashboard/...
  useEffect(() => {
    const fetchNavMenu = async () => {
      try {
        setMenuLoading(true);
        const { data, error } = await supabase
          .from('navigasi_menu')
          .select('*')
          .eq('is_active', true)
          .order('urutan', { ascending: true });

        if (error) {
          console.error('Gagal mengambil data menu:', error.message);
          return;
        }

        if (data) {
          // Format data: Bersihkan .html dan pastikan diawali dengan /dashboard/
          const cleanedData: MenuItem[] = data.map((item: MenuItem) => {
            let rawUrl = item.page_url ? item.page_url.trim() : '';

            // 1. Hapus ekstensi .html
            rawUrl = rawUrl.replace(/\.html$/i, '');

            // 2. Pastikan url memiliki format /dashboard/...
            let formattedUrl = rawUrl;
            if (!formattedUrl.startsWith('/dashboard') && !formattedUrl.startsWith('dashboard')) {
              // Jika belum ada kata dashboard, tambahkan /dashboard/ di depannya
              const cleanPath = formattedUrl.startsWith('/') ? formattedUrl : `/${formattedUrl}`;
              formattedUrl = `/dashboard${cleanPath}`;
            } else if (formattedUrl.startsWith('dashboard')) {
              // Jika diawali "dashboard" tanpa slash di depan, tambahkan slash
              formattedUrl = `/${formattedUrl}`;
            }

            // Rapikan jika ada double slash
            formattedUrl = formattedUrl.replace(/\/+/g, '/');

            return {
              ...item,
              page_url: formattedUrl,
            };
          });

          const groupedMap = new Map<string, MenuItem[]>();

          cleanedData.forEach((item: MenuItem) => {
            const groupName = item.grup || 'Lainnya';
            if (!groupedMap.has(groupName)) {
              groupedMap.set(groupName, []);
            }
            groupedMap.get(groupName)?.push(item);
          });

          const formattedGroups: NavGroup[] = Array.from(groupedMap.entries()).map(
            ([groupName, items]) => ({
              groupName,
              items: items.sort((a, b) => a.urutan - b.urutan)
            })
          );

          setNavigationGroups(formattedGroups);
        }
      } catch (err) {
        console.error('Terjadi kesalahan:', err);
      } finally {
        setMenuLoading(false);
      }
    };

    fetchNavMenu();
  }, []);

  const filteredGroups = useMemo(() => {
    return navigationGroups.map((group) => {
      const matchingItems = group.items.filter((item) =>
        item.label.toLowerCase().includes(searchQuery.toLowerCase())
      );
      return { ...group, items: matchingItems };
    }).filter((group) => group.items.length > 0);
  }, [searchQuery, navigationGroups]);

  const flatFilteredItems = useMemo(() => {
    return filteredGroups.reduce<MenuItem[]>((acc, group) => {
      return [...acc, ...group.items];
    }, []);
  }, [filteredGroups]);

  useEffect(() => {
    setActiveIndex(-1);
  }, [searchQuery]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (flatFilteredItems.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prevIndex) => {
        const nextIndex = prevIndex + 1 >= flatFilteredItems.length ? 0 : prevIndex + 1;
        ensureItemIsVisible(flatFilteredItems[nextIndex]?.id);
        return nextIndex;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prevIndex) => {
        const nextIndex = prevIndex - 1 < 0 ? flatFilteredItems.length - 1 : prevIndex - 1;
        ensureItemIsVisible(flatFilteredItems[nextIndex]?.id);
        return nextIndex;
      });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < flatFilteredItems.length) {
        const targetPage = flatFilteredItems[activeIndex].page_url;
        router.push(targetPage);
      } else if (flatFilteredItems.length > 0) {
        router.push(flatFilteredItems[0].page_url);
      }
    }
  };

  const ensureItemIsVisible = (itemId: number) => {
    const itemEl = itemRefs.current[itemId];
    const containerEl = scrollContainerRef.current;
    if (!itemEl || !containerEl) return;

    const containerTop = containerEl.scrollTop;
    const containerBottom = containerTop + containerEl.clientHeight;
    const itemTop = itemEl.offsetTop - containerEl.offsetTop;
    const itemBottom = itemTop + itemEl.clientHeight;

    if (itemTop < containerTop) {
      containerEl.scrollTop = itemTop - 10;
    } else if (itemBottom > containerBottom) {
      containerEl.scrollTop = itemBottom - containerEl.clientHeight + 10;
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.button !== 1) return;
    if (e.button === 1) e.preventDefault();

    const container = scrollContainerRef.current;
    if (!container) return;

    dragInfo.current = {
      isDown: true,
      startY: e.pageY - container.offsetTop,
      scrollTop: container.scrollTop,
    };
    setIsGrabbing(true);
  };

  const handleMouseLeaveOrUp = () => {
    dragInfo.current.isDown = false;
    setIsGrabbing(false);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dragInfo.current.isDown) return;
    const container = scrollContainerRef.current;
    if (!container) return;

    e.preventDefault();
    const y = e.pageY - container.offsetTop;
    const walk = (y - dragInfo.current.startY) * 1.5; 
    container.scrollTop = dragInfo.current.scrollTop - walk;
  };

  const formatFAIcon = (iconString: string) => {
    if (!iconString) return 'question';
    const cleanName = iconString.replace('fa-solid fa-', '').replace('fa-regular fa-', '').replace('fa-', '');
    return ['fas', cleanName] as any;
  };

  const handleSidebarMouseLeave = () => {
    setIsHovered(false);
    setSearchQuery('');
    setActiveIndex(-1);
    setProfileOpen(false);
    if (document.activeElement === searchInputRef.current) {
      searchInputRef.current?.blur();
    }
  };

  // Fungsi Logout Supabase
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading || menuLoading || !user) {
    return (
      <div className="w-20 bg-[#0b0c10] h-screen fixed flex items-center justify-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-400" />
      </div>
    );
  }

  return (
    <aside 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleSidebarMouseLeave}
      className={`hidden md:flex bg-[#0b0c10] text-slate-100 flex-col fixed h-screen top-0 left-0 z-50 transition-all duration-300 ease-in-out select-none
        ${isHovered ? 'w-72 shadow-2xl' : 'w-20'}`}
      style={isGrabbing ? { cursor: 'grabbing' } : {}}
    >
      <div className="w-full flex flex-col justify-between h-full shrink-0">
        
        {/* IDENTITAS APLIKASI */}
        <div className="flex items-center h-16 w-full bg-[#0b0c10] shrink-0 relative overflow-hidden">
          <div className="w-20 h-16 flex items-center justify-center shrink-0 absolute left-0 top-0">
            <img src="/logo3.png" alt="Logo" className="h-9 w-auto object-contain" />
          </div>
          <div className={`flex flex-col ml-20 transition-all duration-200 whitespace-nowrap ${isHovered ? 'opacity-100 delay-100' : 'opacity-0 pointer-events-none'}`}>
            <h1 className="text-sm font-black text-slate-100 tracking-tight uppercase leading-tight">Lubangsa</h1>
            <p className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider -mt-0.5">Library</p>
          </div>
        </div>

        {/* KOTAK PENCARIAN NAVIGASI */}
        <div className="px-3 py-2 shrink-0 h-12 relative z-10 w-full overflow-hidden">
          <div className={`relative flex items-center w-full transition-all duration-200 ${isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <FontAwesomeIcon icon={['fas', 'magnifying-glass']} className="absolute left-3 w-3 h-3 text-slate-500 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Cari menu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="w-full h-8 pl-8 pr-7 bg-slate-950 focus:bg-slate-900 text-xs font-medium rounded-lg text-slate-100 placeholder-slate-500 outline-none"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 text-[10px] text-slate-500 hover:text-slate-300 font-bold"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* AREA NAVIGASI GRUP */}
        <div 
          ref={scrollContainerRef}
          onMouseDown={handleMouseDown}
          onMouseLeave={handleMouseLeaveOrUp}
          onMouseUp={handleMouseLeaveOrUp}
          onMouseMove={handleMouseMove}
          className="flex-1 overflow-y-auto overflow-x-hidden py-2 [overscroll-behavior:contain] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={isGrabbing ? { cursor: 'grabbing' } : {}}
        >
          <div className="px-2 space-y-4">
            {filteredGroups.length > 0 ? (
              (() => {
                let globalItemIndex = 0;
                return filteredGroups.map((group, groupIdx) => (
                  <div key={groupIdx} className="space-y-1">
                    
                    {/* Nama Group */}
                    <div className="h-4 flex items-center overflow-hidden">
                      <span className={`text-[10px] font-extrabold tracking-widest text-slate-500 uppercase whitespace-nowrap pl-4 transition-all duration-200 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
                        {group.groupName}
                      </span>
                    </div>

                    {/* Daftar Item Menu */}
                    {group.items.map((item) => {
                      const isActive = pathname === item.page_url;
                      const isKeyboardSelected = activeIndex === globalItemIndex;
                      const currentGlobalIndex = globalItemIndex;
                      globalItemIndex++;

                      return (
                        <Link
                          key={item.id}
                          ref={(el) => { itemRefs.current[item.id] = el; }}
                          href={item.page_url}
                          title={!isHovered ? item.label : undefined}
                          onClick={(e) => isGrabbing && e.preventDefault()}
                          onMouseEnter={() => setActiveIndex(currentGlobalIndex)}
                          className={`group relative flex items-center h-10 rounded-xl text-[13px] font-bold uppercase tracking-wider w-full overflow-hidden transition-colors duration-150
                            ${isActive 
                              ? 'bg-cyan-500/10 text-cyan-400' 
                              : isKeyboardSelected
                              ? 'bg-slate-900 text-slate-100 outline-none' 
                              : 'text-slate-400 hover:bg-slate-900 hover:text-slate-100'
                            }`}
                        >
                          {/* Sumbu Ikon Terkunci Presisi */}
                          <div className="w-16 h-10 flex items-center justify-center shrink-0 absolute left-0 top-0">
                            <FontAwesomeIcon 
                              icon={formatFAIcon(item.icon)} 
                              className={`w-4 h-4 transition-colors duration-150 ${isActive ? 'text-cyan-400' : isKeyboardSelected ? 'text-slate-200' : 'text-slate-500 group-hover:text-slate-300'}`} 
                            />
                          </div>

                          {/* Teks Label Menu */}
                          <span className={`ml-16 whitespace-nowrap transition-all duration-200 ${isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 pointer-events-none'}`}>
                            {item.label}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                ));
              })()
            ) : (
              <div className={`text-center py-4 text-xs text-slate-500 font-medium transition-opacity duration-200 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
                Menu tidak ditemukan
              </div>
            )}
          </div>
        </div>

        {/* INFORMASI PENGGUNA & TOMBOL AKSI */}
        <div className="p-2 bg-[#0b0c10] shrink-0">
          <div className={`bg-slate-900/50 rounded-xl flex flex-col justify-between overflow-hidden transition-all duration-200 w-full ${profileOpen && isHovered ? 'h-36 p-2 space-y-2' : 'h-12 p-1'}`}>
            
            {/* Kartu Profil Pengguna */}
            <div 
              onClick={() => !isGrabbing && isHovered && setProfileOpen(!profileOpen)} 
              className={`relative flex items-center h-10 w-full rounded-lg transition-colors ${isHovered ? 'cursor-pointer hover:bg-slate-800/60' : 'cursor-default'}`}
            >
              {/* Avatar Profil */}
              <div className="w-16 h-10 flex items-center justify-center shrink-0 absolute left-0 top-0">
                <div className="w-8 h-8 rounded-full bg-slate-950 flex items-center justify-center text-[11px] font-black text-cyan-300 uppercase">
                  {user?.email?.substring(0, 2)}
                </div>
              </div>

              {/* Teks Profil Pengguna */}
              <div className={`flex flex-col ml-16 whitespace-nowrap transition-all duration-200 ${isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <span className="text-[11px] font-bold text-slate-200 leading-tight">@{user?.email?.split('@')[0]}</span>
                <span className="text-[9px] text-cyan-400 font-semibold uppercase tracking-wider">Pustakawan</span>
              </div>

              {/* Ikon Dropdown Chevron */}
              <FontAwesomeIcon 
                icon={faChevronUp} 
                className={`absolute right-3 w-3 h-3 text-slate-500 transition-all duration-200 ${isHovered ? 'opacity-100' : 'opacity-0'} ${profileOpen ? 'rotate-180' : 'rotate-0'}`} 
              />
            </div>

            {/* Tombol Aksi saat Profil Terbuka */}
            {profileOpen && isHovered && (
              <div className="flex flex-col gap-1.5 pt-1 border-t border-slate-800/80">
                {/* 1. Tombol Kembali ke Halaman Utama */}
                <button 
                  onClick={() => router.push('/')} 
                  className="w-full flex items-center justify-start gap-2.5 py-2 px-3 bg-slate-950 hover:bg-slate-800 text-slate-200 hover:text-white rounded-lg text-xs font-semibold tracking-wide transition-colors border border-slate-800/60"
                >
                  <FontAwesomeIcon icon={faArrowLeft} className="w-3.5 h-3.5 shrink-0 text-cyan-400" /> 
                  <span>Halaman Utama</span>
                </button>

                {/* 2. Tombol Logout */}
                <button 
                  onClick={handleLogout} 
                  className="w-full flex items-center justify-start gap-2.5 py-2 px-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-lg text-xs font-semibold tracking-wide transition-colors border border-red-500/20"
                >
                  <FontAwesomeIcon icon={faRightFromBracket} className="w-3.5 h-3.5 shrink-0 text-red-400" /> 
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