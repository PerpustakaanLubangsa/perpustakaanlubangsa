'use client';

import React, { useState, useEffect, useRef } from 'react';
// PERBAIKAN: Mengembalikan import ke 'next/navigation' agar tidak memicu build error
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

// Import FontAwesome
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { library } from '@fortawesome/fontawesome-svg-core';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { faChevronUp, faArrowLeft } from '@fortawesome/free-solid-svg-icons';

library.add(fas);

const NAVIGATION_GROUPS = [
  {
    groupName: 'Utama',
    items: [
      { id: 1, label: 'Beranda', icon: 'fa-solid fa-house-chimney', page_url: '/beranda' },
      { id: 2, label: 'Cari Buku', icon: 'fa-solid fa-magnifying-glass', page_url: '/cari-buku' },
    ]
  },
  {
    groupName: 'Operasional',
    items: [
      { id: 3, label: 'Absensi', icon: 'fa-solid fa-calendar-check', page_url: '/absensi' },
      { id: 4, label: 'Data Pengunjung', icon: 'fa-solid fa-users-viewfinder', page_url: '/data-pengunjung' },
      { id: 13, label: 'Sirkulasi', icon: 'fa-solid fa-retweet', page_url: '/sirkulasi' },
      { id: 16, label: 'Peminjam', icon: 'fa-solid fa-list-ul', page_url: '/daftar-peminjam' },
      { id: 5, label: 'Manage Absen', icon: 'fa-solid fa-user-gear', page_url: '/manajemen-absensi' },
      { id: 6, label: 'Rekapitulasi', icon: 'fa-solid fa-chart-pie', page_url: '/rekap' },
    ]
  },
  {
    groupName: 'Koleksi & Anggota',
    items: [
      { id: 10, label: 'Bibliografi', icon: 'fa-solid fa-book', page_url: '/bibliografi' },
      { id: 11, label: 'Manajemen Rak', icon: 'fa-solid fa-layer-group', page_url: '/manajemen-rak' },
      { id: 12, label: 'Kategori', icon: 'fa-solid fa-tags', page_url: '/manajemen-kategori' },
      { id: 14, label: 'Barcode', icon: 'fa-solid fa-barcode', page_url: '/barcode' },
      { id: 15, label: 'Label', icon: 'fa-solid fa-print', page_url: '/label' },
      { id: 17, label: 'Anggota', icon: 'fa-solid fa-users', page_url: '/keanggotaan' },
    ]
  },
  {
    groupName: 'Audit Buku',
    items: [
      { id: 7, label: 'Scanner', icon: 'fa-solid fa-qrcode', page_url: '/audit-scanner' },
      { id: 8, label: 'Hasil Audit', icon: 'fa-solid fa-square-poll-vertical', page_url: '/audit-hasil' },
      { id: 9, label: 'Belum Audit', icon: 'fa-solid fa-folder-minus', page_url: '/audit-belum' },
    ]
  },
  {
    groupName: 'Konten & Sistem',
    items: [
      { id: 18, label: 'Karya', icon: 'fa-solid fa-pen-nib', page_url: '/karya' },
      { id: 19, label: 'Admin Karya', icon: 'fa-solid fa-feather-pointed', page_url: '/admin-karya' },
      { id: 20, label: 'Poin Tambahan', icon: 'fa-solid fa-circle-dollar-to-slot', page_url: '/poin' },
      { id: 21, label: 'Registrasi Pustakawan', icon: 'fa-solid fa-shield-halved', page_url: '/pendaftaran-pustakawan' },
      { id: 22, label: 'Feedback', icon: 'fa-solid fa-comment-dots', page_url: '/admin-feedback' },
      { id: 23, label: 'Tentang', icon: 'fa-solid fa-circle-info', page_url: '/about' },
    ]
  }
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const [isGrabbing, setIsGrabbing] = useState(false);
  
  // State pencarian menu & indeks fokus keyboard
  const [searchQuery, setSearchQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<{[key: string]: HTMLAnchorElement | null}>({});
  const dragInfo = useRef({ isDown: false, startY: 0, scrollTop: 0 });

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

  // Logika memfilter navigasi berdasarkan input pencarian
  const filteredGroups = NAVIGATION_GROUPS.map((group) => {
    const matchingItems = group.items.filter((item) =>
      item.label.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return { ...group, items: matchingItems };
  }).filter((group) => group.items.length > 0);

  // Buat daftar flat dari semua item menu yang lolos filter pencarian untuk mempermudah indeks keyboard
  const flatFilteredItems = filteredGroups.reduce<any[]>((acc, group) => {
    return [...acc, ...group.items];
  }, []);

  // Reset activeIndex saat query pencarian berubah
  useEffect(() => {
    setActiveIndex(-1);
  }, [searchQuery]);

  // Fungsi menangani penekanan tombol ArrowUp, ArrowDown, dan Enter pada input pencarian
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
      // Jika ada item yang sedang disorot/difokuskan, arahkan ke halaman tersebut
      if (activeIndex >= 0 && activeIndex < flatFilteredItems.length) {
        const targetPage = flatFilteredItems[activeIndex].page_url;
        router.push(targetPage);
      } else if (flatFilteredItems.length > 0) {
        // Jika tidak ada yang disorot tetapi user tekan enter, pilih item pertama secara default
        router.push(flatFilteredItems[0].page_url);
      }
    }
  };

  // Fungsi pembantu untuk auto-scroll container sidebar jika item terpilih berada di luar area scroll
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

  const handleAuxClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.button === 1) {
      e.preventDefault();
    }
  };

  const handleSidebarMouseEnter = () => {
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 150);
  };

  // PERBAIKAN: Fungsi untuk mereset pencarian dan sorotan saat kursor meninggalkan sidebar
  const handleSidebarMouseLeave = () => {
    setSearchQuery('');
    setActiveIndex(-1);
    setProfileOpen(false);
    // Menghapus fokus dari elemen input agar pencarian tidak mengambang di latar belakang
    if (document.activeElement === searchInputRef.current) {
      searchInputRef.current?.blur();
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex text-slate-800 font-sans">
      
      {/* SIDEBAR ASIDE */}
      <aside 
        onMouseEnter={handleSidebarMouseEnter}
        onMouseLeave={handleSidebarMouseLeave} // Menghubungkan fungsi reset saat mouse pergi
        className="hidden md:flex md:w-20 hover:md:w-72 bg-[#F5F5F5] text-slate-600 flex-col justify-between fixed h-screen z-50 transition-all duration-300 group/sidebar overflow-hidden select-none"
        style={isGrabbing ? { cursor: 'grabbing' } : {}}
      >
        
        <div className="w-72 flex flex-col justify-between h-full">
          
          {/* IDENTITAS APLIKASI */}
          <div className="flex items-center px-5 pt-5 pb-3 w-full bg-[#F5F5F5] shrink-0">
            <div className="w-10 flex justify-center shrink-0">
              <img src="/logo3.png" alt="Logo" className="h-10 w-auto object-contain" />
            </div>
            <div className="flex flex-col ml-3 opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 whitespace-nowrap">
              <h1 className="text-sm font-black text-slate-900 tracking-tight uppercase leading-tight">Lubangsa</h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider -mt-0.5">Library</p>
            </div>
          </div>

          {/* KOTAK PENCARIAN NAVIGASI */}
          <div className="px-5 pb-3 shrink-0 h-9 relative z-10 opacity-0 pointer-events-none group-hover/sidebar:opacity-100 group-hover/sidebar:pointer-events-auto transition-all duration-200">
            <div className="relative flex items-center">
              <FontAwesomeIcon icon={['fas', 'magnifying-glass']} className="absolute left-2.5 w-3 h-3 text-slate-400 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Cari menu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="w-[232px] h-7 pl-8 pr-2.5 bg-slate-200/50 focus:bg-white text-xs font-medium rounded-lg text-slate-800 placeholder-slate-400 outline-none border border-transparent focus:border-slate-300 transition-all duration-150"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 text-[10px] text-slate-400 hover:text-slate-600 font-bold"
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
            className="flex-1 overflow-y-auto overflow-x-hidden pb-6 transition-all duration-300
              [overscroll-behavior:contain] [scrollbar-width:none] 
              group-hover/sidebar:[scrollbar-width:thin] [scrollbar-color:rgba(203,213,225,0.5)_transparent]
              [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300/0 [&::-webkit-scrollbar-thumb]:rounded-full
              group-hover/sidebar:[&::-webkit-scrollbar-thumb]:bg-slate-300/60 hover:[&::-webkit-scrollbar-thumb]:bg-slate-400/80"
            style={isGrabbing ? { cursor: 'grabbing' } : {}}
          >
            <div className={`px-3 space-y-4 ${isGrabbing ? '[&_*]:!cursor-grabbing' : ''}`}>
              {filteredGroups.length > 0 ? (
                (() => {
                  let globalItemIndex = 0;
                  return filteredGroups.map((group, groupIdx) => (
                    <div key={groupIdx} className="space-y-1">
                      
                      {/* Nama Group */}
                      <div className="h-4 flex items-center px-3">
                        <span className="text-[10px] font-extrabold tracking-widest text-slate-400 uppercase opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 whitespace-nowrap">
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
                            onClick={(e) => isGrabbing && e.preventDefault()}
                            onAuxClick={handleAuxClick}
                            onMouseEnter={() => setActiveIndex(currentGlobalIndex)}
                            className={`group flex items-center px-3 py-2.5 rounded-xl text-[13px] font-bold uppercase tracking-wider transition-all duration-150 ease-in-out w-[264px]
                              ${isActive 
                                ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/10' 
                                : isKeyboardSelected
                                ? 'bg-slate-300/70 text-slate-900 outline-none ring-2 ring-slate-300' 
                                : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900'
                              }`}
                            style={isGrabbing ? { cursor: 'grabbing' } : {}}
                          >
                            <div className="w-10 flex justify-center shrink-0">
                              <FontAwesomeIcon 
                                icon={formatFAIcon(item.icon)} 
                                className={`w-4.5 h-4.5 transition-colors duration-150
                                  ${isActive ? 'text-white' : isKeyboardSelected ? 'text-slate-700' : 'text-slate-400 group-hover:text-slate-600'}`} 
                              />
                            </div>
                            <span className="ml-3 opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                              {item.label}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  ));
                })()
              ) : (
                <div className="text-center py-4 text-xs text-slate-400 font-medium opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200">
                  Menu tidak ditemukan
                </div>
              )}
            </div>
          </div>

          {/* INFORMASI PENGGUNA */}
          <div className="p-3 bg-slate-200/30 shrink-0">
            <div className={`bg-white rounded-xl transition-all duration-300 flex flex-col justify-between overflow-hidden ${profileOpen ? 'h-28 p-2.5 w-[264px]' : 'h-14 p-2 w-[56px] group-hover/sidebar:w-[264px] group-hover/sidebar:p-2.5'}`}>
              <div 
                onClick={() => !isGrabbing && setProfileOpen(!profileOpen)} 
                className="flex items-center justify-between cursor-pointer group select-none h-10"
                style={isGrabbing ? { cursor: 'grabbing' } : {}}
              >
                <div className="flex items-center w-full">
                  <div className="w-10 h-10 shrink-0 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-700 uppercase">
                    {user?.email?.substring(0, 2)}
                  </div>
                  <div className="flex flex-col ml-3 opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                    <span className="text-[11px] font-bold text-slate-800">@{user?.email?.split('@')[0]}</span>
                    <span className="text-[9px] text-slate-400 font-medium">Pustakawan</span>
                  </div>
                </div>
                <FontAwesomeIcon icon={faChevronUp} className={`w-3.5 h-3.5 text-slate-400 transition-all duration-300 opacity-0 group-hover/sidebar:opacity-100 shrink-0 ${profileOpen ? 'rotate-180' : 'rotate-0'}`} />
              </div>

              {profileOpen && (
                <button onClick={() => router.push('/')} className="w-full flex items-center justify-start gap-2 py-1.5 px-2.5 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-lg text-[9px] font-medium tracking-wide transition-colors border border-slate-200">
                  <FontAwesomeIcon icon={faArrowLeft} className="w-3 h-3 shrink-0" /> Kembali ke halaman utama
                </button>
              )}
            </div>
          </div>

        </div>
      </aside>

      <div className="flex-1 flex flex-col md:pl-20">
        <div className="w-full">{children}</div>
      </div>

    </div>
  );
}