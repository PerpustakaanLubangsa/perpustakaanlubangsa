'use client';

import React, { useState, useEffect } from 'react';
import { FileText, Search, BookOpen, User, Calendar, Tag, ChevronRight, ArrowUpDown } from 'lucide-react';

// Interface Dummy Data Karya Tulis (Sesuaikan dengan skema Supabase Anda nantinya)
interface KaryaTulisItem {
  id: string;
  judul: string;
  penulis: string;
  kategori: string;
  sinopsis: string;
  tanggal_rilis: string;
  jumlah_halaman: number;
}

const DUMMY_KARYA_TULIS: KaryaTulisItem[] = [
  {
    id: '1',
    judul: 'Implementasi Nilai Pesantren dalam Menghadapi Era Digital',
    penulis: 'Ahmad Muzakki',
    kategori: 'Makalah',
    sinopsis: 'Karya tulis ini mengulas tentang bagaimana nilai-nilai luhur pesantren dapat diintegrasikan dengan perkembangan teknologi modern agar santri tetap adaptif tanpa kehilangan identitas.',
    tanggal_rilis: '2026-05-12',
    jumlah_halaman: 18,
  },
  {
    id: '2',
    judul: 'Dilema Santri dan Modernitas: Sebuah Refleksi Sosial',
    penulis: 'Muhammad Faiz',
    kategori: 'Artikel',
    sinopsis: 'Sebuah tulisan reflektif mengenai tantangan sosial yang dihadapi santri masa kini dalam menyeimbangkan kegiatan mengaji dan tuntutan akademik formal.',
    tanggal_rilis: '2026-06-01',
    jumlah_halaman: 5,
  },
  {
    id: '3',
    judul: 'Antologi Puisi: Kidung Rindu dari Bilik Kamar',
    penulis: 'Zainal Arifin',
    kategori: 'Puisi',
    sinopsis: 'Kumpulan puisi pendek yang mengekspresikan kehidupan sehari-hari, perjuangan menahan rindu kepada orang tua, dan indahnya persaudaraan di pesantren.',
    tanggal_rilis: '2026-06-14',
    jumlah_halaman: 42,
  },
];

export default function KaryaTulisPage() {
  const [searchInput, setSearchInput] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedKategori, setSelectedKategori] = useState('Semua');
  const [sortBy, setSortBy] = useState<'terbaru' | 'terlama'>('terbaru');

  // Efek Debounce untuk Pencarian (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchInput);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchInput]);

  // Ekstrak semua kategori unik untuk opsi filter
  const daftarKategori = ['Semua', ...Array.from(new Set(DUMMY_KARYA_TULIS.map(item => item.kategori)))];

  // Logika Filter dan Sorting
  const filteredKarya = DUMMY_KARYA_TULIS.filter((item) => {
    const matchesSearch = 
      item.judul.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
      item.penulis.toLowerCase().includes(debouncedQuery.toLowerCase());
    
    const matchesKategori = selectedKategori === 'Semua' || item.kategori === selectedKategori;

    return matchesSearch && matchesKategori;
  }).sort((a, b) => {
    const dateA = new Date(a.tanggal_rilis).getTime();
    const dateB = new Date(b.tanggal_rilis).getTime();
    return sortBy === 'terbaru' ? dateB - dateA : dateA - dateB;
  });

  return (
    <div className="bg-slate-50 min-h-screen w-full p-4 md:p-6 text-slate-800 flex flex-col justify-between">
      <div className="max-w-4xl w-full mx-auto space-y-4">
        
        {/* HEADER CARD */}
        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            <div>
              <h3 className="text-sm font-black text-slate-900 tracking-tight uppercase">Karya Tulis Santri</h3>
              <p className="text-[11px] text-slate-400 font-medium">Kumpulan naskah ilmiah, artikel, dan sastra hasil karya santri Lubangsa</p>
            </div>
          </div>

          {/* BAR PENCARIAN & FILTER */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="relative md:col-span-6">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Cari judul naskah atau nama penulis..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500 focus:bg-white transition-all placeholder:text-slate-400"
              />
            </div>

            {/* Filter Kategori */}
            <div className="md:col-span-3">
              <select
                value={selectedKategori}
                onChange={(e) => setSelectedKategori(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500 focus:bg-white transition-all text-slate-700 uppercase tracking-wider"
              >
                {daftarKategori.map((kat) => (
                  <option key={kat} value={kat}>{kat.toUpperCase()}</option>
                ))}
              </select>
            </div>

            {/* Urutan Tanggal */}
            <div className="md:col-span-3">
              <button
                onClick={() => setSortBy(prev => prev === 'terbaru' ? 'terlama' : 'terbaru')}
                className="w-full flex items-center justify-between px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-all active:scale-[0.98]"
              >
                <span className="uppercase tracking-wider">Urutan: {sortBy}</span>
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
          </div>
        </div>

        {/* LIST KARYA TULIS */}
        {filteredKarya.length > 0 ? (
          <div className="space-y-3 w-full">
            {filteredKarya.map((karya) => {
              const tglFormat = new Date(karya.tanggal_rilis).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              });

              return (
                <div 
                  key={karya.id}
                  className="group bg-white border border-slate-200/70 p-5 rounded-2xl shadow-sm hover:scale-[1.002] transition-all duration-150 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-2 min-w-0 flex-1">
                    {/* Badge Kategori */}
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-600 text-[9px] font-black tracking-wider uppercase">
                      <Tag className="w-2.5 h-2.5" /> {karya.kategori}
                    </span>

                    {/* Judul & Penulis */}
                    <div>
                      <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight leading-snug group-hover:text-blue-600 transition-colors">
                        {karya.judul}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide mt-0.5 flex items-center gap-1.5">
                        <User className="w-3 h-3 text-slate-300" /> {karya.penulis}
                      </p>
                    </div>

                    {/* Sinopsis Singkat */}
                    <p className="text-xs text-slate-500 font-medium line-clamp-2 leading-relaxed">
                      {karya.sinopsis}
                    </p>

                    {/* Meta Data Bawah */}
                    <div className="flex items-center gap-4 text-[9px] font-bold text-slate-400 uppercase tracking-wider pt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-300" /> {tglFormat}
                      </span>
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-3 h-3 text-slate-300" /> {karya.jumlah_halaman} Halaman
                      </span>
                    </div>
                  </div>

                  {/* Aksi Baca */}
                  <div className="flex items-center justify-end shrink-0 pl-0 md:pl-4 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                    <button className="flex items-center gap-1 px-4 py-2 bg-slate-50 group-hover:bg-blue-600 border border-slate-200 group-hover:border-blue-600 text-slate-700 group-hover:text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 active:scale-95 shadow-sm">
                      Baca Naskah <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-xs font-bold text-slate-400 uppercase tracking-wider shadow-sm">
            Karya tulis tidak ditemukan
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div className="max-w-4xl w-full mx-auto text-[10px] font-medium text-center text-slate-400 pt-4 border-t border-slate-200/60 mt-8">
        Hak Cipta karya tulis sepenuhnya milik <span className="text-blue-500 font-bold">Santri PP. Latee Lubangsa</span>.
      </div>
    </div>
  );
}