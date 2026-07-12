'use client';

import React, { useState, useEffect, useRef } from 'react';
import { User, Calendar, Tag, Loader2, BookOpen } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// Inisialisasi Supabase Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface KaryaTulisItem {
  id: string;
  anggota_id: string;
  kategori: string;
  judul: string;
  isi: string;
  dibuat_pada: string;
  foto_url: string | null;
  penulis: string | null;
  slug: string | null;
}

export default function KaryaTulisPage() {
  const [karyaList, setKaryaList] = useState<KaryaTulisItem[]>([]);
  const [selectedKarya, setSelectedKarya] = useState<KaryaTulisItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

  // State dan Ref untuk fitur Drag to Scroll
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDown, setIsDown] = useState(false);
  const [startY, setStartY] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);

  useEffect(() => {
    const fetchKarya = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('karya')
          .select('id, anggota_id, kategori, judul, isi, dibuat_pada, foto_url, penulis, slug')
          .order('dibuat_pada', { ascending: false });

        if (error) throw error;
        
        const list = data || [];
        setKaryaList(list);
        
        if (list.length > 0) {
          setSelectedKarya(list[0]);
        }
      } catch (err) {
        console.error('Gagal memuat karya tulis:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchKarya();
  }, []);

  const handleImageError = (id: string) => {
    setBrokenImages((prev) => ({ ...prev, [id]: true }));
  };

  // Handler Drag to Scroll
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrollRef.current) return;
    setIsDown(true);
    setStartY(e.pageY - scrollRef.current.offsetTop);
    setScrollTop(scrollRef.current.scrollTop);
  };

  const handleMouseLeaveOrUp = () => {
    setIsDown(false);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDown || !scrollRef.current) return;
    e.preventDefault();
    const y = e.pageY - scrollRef.current.offsetTop;
    const walk = (y - startY) * 1.5; // Kecepatan scroll
    scrollRef.current.scrollTop = scrollTop - walk;
  };

  return (
    <div className="bg-slate-50 h-screen w-full text-slate-800 overflow-hidden p-4 md:p-6 flex items-center justify-center">
      
      {loading ? (
        <div className="w-full h-full flex justify-center items-center">
          <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
        </div>
      ) : karyaList.length > 0 ? (
        
        <div className="w-full h-full flex flex-col-reverse lg:flex-row overflow-hidden gap-6">
          
          {/* ================= SISI KIRI: HALAMAN DETAIL (FULL SCROLLABLE & DRAG TO SCROLL) ================= */}
          <div className="w-full lg:w-[40%] xl:w-[35%] h-[50%] lg:h-full bg-white border border-slate-200/60 rounded-3xl p-6 shadow-xs overflow-hidden">
            {selectedKarya ? (
              <div 
                ref={scrollRef}
                onMouseDown={handleMouseDown}
                onMouseLeave={handleMouseLeaveOrUp}
                onMouseUp={handleMouseLeaveOrUp}
                onMouseMove={handleMouseMove}
                className={`h-full overflow-y-auto pr-1 custom-scrollbar select-none space-y-4 ${
                  isDown ? 'cursor-grabbing' : 'cursor-grab'
                }`}
              >
                {/* Gambar Sampul (Ditempatkan di paling atas sebelum komponen lainnya) */}
                {selectedKarya.foto_url && !brokenImages[selectedKarya.id] && (
                  <img 
                    src={selectedKarya.foto_url} 
                    alt={selectedKarya.judul} 
                    draggable="false"
                    className="w-full h-auto rounded-2xl object-cover border border-slate-100 shadow-2xs pointer-events-none"
                  />
                )}

                {/* Meta data: Kategori & Tanggal */}
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-[10px] font-black tracking-wider uppercase">
                    <Tag className="w-2.5 h-2.5" /> {selectedKarya.kategori}
                  </span>
                  <span className="flex items-center gap-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                    <Calendar className="w-3 h-3 text-slate-300" />
                    {new Date(selectedKarya.dibuat_pada).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                
                {/* Judul Utama */}
                <h2 className="text-sm md:text-base font-black text-slate-900 uppercase tracking-tight leading-snug">
                  {selectedKarya.judul}
                </h2>
                
                {/* Info Penulis */}
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wide flex items-center gap-1.5 border-b border-slate-100 pb-4">
                  <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-500 text-[9px]">
                    {(selectedKarya.penulis || 'A').charAt(0).toUpperCase()}
                  </div>
                  <span>Oleh: {selectedKarya.penulis || 'Anonim'}</span>
                </div>

                {/* Isi Konten (Ukuran teks diubah dari text-xs menjadi text-sm) */}
                <div className="text-sm text-slate-600 leading-relaxed font-medium whitespace-pre-line">
                  {selectedKarya.isi}
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                <BookOpen className="h-8 w-8 stroke-[1.2] text-slate-300 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider">Pilih karya untuk membaca</span>
              </div>
            )}
          </div>

          {/* ================= SISI KANAN: MASONRY LIST ================= */}
          <div className="w-full lg:w-[60%] xl:w-[65%] h-[50%] lg:h-full overflow-y-auto pr-2 custom-scrollbar">
            <div className="columns-1 sm:columns-2 md:columns-3 xl:columns-4 gap-4 space-y-4 w-full">
              {karyaList.map((karya) => {
                const isSelected = selectedKarya?.id === karya.id;
                const hasNoImage = !karya.foto_url || brokenImages[karya.id];
                
                return (
                  <div 
                    key={karya.id}
                    onClick={() => setSelectedKarya(karya)}
                    className={`break-inside-avoid bg-transparent group flex flex-col justify-between overflow-hidden h-fit cursor-pointer transition-all duration-200 pb-3 rounded-2xl p-2 ${
                      isSelected ? 'bg-white/80 ring-1 ring-blue-500/20 shadow-xs' : 'hover:bg-slate-100/50'
                    }`}
                  >
                    {!hasNoImage && (
                      <div className="w-full overflow-hidden rounded-xl relative mb-2.5 bg-slate-100">
                        <img
                          src={karya.foto_url!}
                          alt={karya.judul}
                          onError={() => handleImageError(karya.id)}
                          className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                        />
                      </div>
                    )}

                    <div className="px-1 space-y-1.5 min-w-0">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-900 text-white text-[8px] font-black tracking-wider uppercase w-fit">
                        <Tag className="w-2 h-2" /> {karya.kategori}
                      </span>

                      <h4 className={`text-xs font-black uppercase tracking-tight leading-snug transition-colors ${
                        isSelected ? 'text-blue-600' : 'text-slate-900 group-hover:text-blue-600'
                      }`}>
                        {karya.judul}
                      </h4>
                      
                      <p className="text-[10px] text-slate-500 font-medium line-clamp-3 leading-relaxed whitespace-pre-line">
                        {karya.isi}
                      </p>

                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide flex items-center gap-1 pt-0.5">
                        <User className="w-2.5 h-2.5 text-slate-300" /> 
                        <span className="truncate">{karya.penulis || 'Anonim'}</span>
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
          Belum ada karya tulis yang diterbitkan
        </div>
      )}

    </div>
  );
}