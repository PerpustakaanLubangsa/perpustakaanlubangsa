'use client';

import Link from 'next/link';
import { Search, ClipboardSignature, FileText, LogIn, Heart } from 'lucide-react';
import { ComponentType, useState, useEffect, useRef } from 'react';

interface NavItem {
  label: string;
  href: string;
  icon?: ComponentType<{ className?: string }>;
}

// Komponen Pembantu Animasi Ketik (Akurat & Tidak Terpotong)
function TypingText({ text, start }: { text: string; start: boolean }) {
  const [displayedText, setDisplayedText] = useState('');
  const indexRef = useRef(0);

  useEffect(() => {
    if (!start) {
      setDisplayedText('');
      indexRef.current = 0;
      return;
    }

    setDisplayedText('');
    indexRef.current = 0;
    
    const timer = setInterval(() => {
      if (indexRef.current < text.length) {
        const nextChar = text.charAt(indexRef.current);
        setDisplayedText((prev) => prev + nextChar);
        indexRef.current += 1;
      } else {
        clearInterval(timer);
      }
    }, 25);

    return () => clearInterval(timer);
  }, [text, start]);

  return <>{displayedText}</>;
}

export default function Sidebar() {
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);

  // Perubahan struktur menu navigasi sesuai instruksi
  const menuItems: NavItem[] = [
    { label: 'Perpustakaan Lubangsa', href: '/' }, 
    { label: 'Pencarian Buku', href: '/' }, // Diarahkan ke halaman utama navigasi perpustakaan
    { label: 'Catat Kunjungan', href: '/kunjungan/catat', icon: ClipboardSignature },
    { label: 'Karya Tulis', href: '/karya-tulis', icon: FileText },
    { label: 'Masuk Pustakawan', href: '/login', icon: LogIn },
  ];

  return (
    <aside 
      onMouseEnter={() => setIsSidebarHovered(true)}
      onMouseLeave={() => setIsSidebarHovered(false)}
      className="group/sidebar fixed inset-y-0 left-0 z-50 flex w-16 flex-col justify-between border-r border-slate-200 bg-white p-3 text-slate-800 transition-all duration-300 ease-in-out hover:w-64"
    >
      {/* Bagian Atas: Menu Navigasi */}
      <nav className="space-y-1">
        {menuItems.map((item, index) => {
          const Icon = item.icon;
          const isFirstItem = index === 0;

          return (
            <Link
              key={index}
              href={item.href}
              className="group/item flex h-10 items-center rounded-lg px-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              {/* Efek Membesar saat menu di-hover */}
              <div className="flex h-6 w-6 shrink-0 items-center justify-center transition-transform duration-200 ease-in-out group-hover/item:scale-125 active:scale-95">
                {isFirstItem ? (
                  <img 
                    src="/logo.png" 
                    alt="Logo" 
                    className="h-5 w-5 object-contain"
                  />
                ) : (
                  index === 1 ? (
                    <Search className="h-4 w-4 text-slate-500 group-hover/item:text-slate-900" />
                  ) : (
                    Icon && <Icon className="h-4 w-4 text-slate-500 group-hover/item:text-slate-900" />
                  )
                )}
              </div>

              {/* Tempat Efek Mengetik Asli */}
              <div className={`whitespace-nowrap transition-all duration-300 ${isSidebarHovered ? 'ml-4 opacity-100' : 'ml-0 opacity-0'}`}>
                <span 
                  className={`block whitespace-nowrap min-w-[180px]
                    ${isFirstItem ? 'font-bold text-slate-950 text-base tracking-tight' : 'font-medium'}
                  `}
                >
                  <TypingText text={item.label} start={isSidebarHovered} />
                </span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Bagian Bawah: Footer */}
      <div 
        className={`w-[232px] shrink-0 transition-all duration-300 ease-in-out overflow-hidden
          ${isSidebarHovered ? 'translate-x-0 opacity-100' : '-translate-x-4 opacity-0'}`}
      >
        <div className="grid grid-cols-1 gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-center text-[10px] text-slate-500 shadow-inner">
          <p className="font-semibold text-slate-700">© 2026 Perpus Lubangsa</p>
          
          <div className="h-px bg-slate-200 w-full" />
          
          <div className="flex items-center justify-center gap-1 text-[10px] font-medium text-slate-400">
            <span>Made with</span>
            <Heart className="h-2.5 w-2.5 fill-red-400 text-red-400 animate-pulse" />
            <span>by</span>
            <span className="font-semibold text-slate-600">Adlan Madjied Ridho</span>
          </div>
        </div>
      </div>
    </aside>
  );
}