'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { User, Loader2, Save, GraduationCap, BookOpen, Layers, Activity, Home, ChevronDown, Trophy } from 'lucide-react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface VisitorFormProps {
  onSuccess?: (idAnggota: string) => void;
}

export default function VisitorForm({ onSuccess }: VisitorFormProps) {
  // States Form Utama
  const [nama, setNama] = useState('');
  const [kamar, setKamar] = useState('');
  const [jenjang, setJenjang] = useState('');
  const [buku, setBuku] = useState('');
  const [kategori, setKategori] = useState('');
  const [aktivitas, setAktivitas] = useState('');

  // States Data Tambahan & Kontrol UI
  const [kategoriOptions, setKategoriOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // States Autocomplete / Suggestions
  const [anggotaSuggestions, setAnggotaSuggestions] = useState<any[]>([]);
  const [bukuSuggestions, setBukuSuggestions] = useState<any[]>([]);
  const [showAnggotaDrop, setShowAnggotaDrop] = useState(false);
  const [showBukuDrop, setShowBukuDrop] = useState(false);

  // Data yang dipilih dari list pencarian cerdas
  const [selectedAnggota, setSelectedAnggota] = useState<any>(null);
  const [selectedBuku, setSelectedBuku] = useState<any>(null);

  const dropAnggotaRef = useRef<HTMLDivElement>(null);
  const dropBukuRef = useRef<HTMLDivElement>(null);

  // Debounce Timer Ref
  const namaTimerRef = useRef<NodeJS.Timeout | null>(null);
  const bukuTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Ambil list Kategori dari database saat component dimuat
  useEffect(() => {
    async function fetchKategori() {
      try {
        const { data, error } = await supabase
          .from('kategori')
          .select('nama_kategori')
          .order('nama_kategori', { ascending: true });
        if (error) throw error;
        if (data) setKategoriOptions(data.map((item) => item.nama_kategori));
      } catch (err: any) {
        console.error('Gagal memuat kategori:', err.message);
      }
    }
    fetchKategori();
  }, []);

  // Handle klik di luar untuk menutup dropdown sugesti
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropAnggotaRef.current && !dropAnggotaRef.current.contains(event.target as Node)) {
        setShowAnggotaDrop(false);
      }
      if (dropBukuRef.current && !dropBukuRef.current.contains(event.target as Node)) {
        setShowBukuDrop(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Logika Smart Search Nama dengan pembersihan timer yang benar
  const handleNamaChange = (val: string) => {
    setNama(val);
    setSelectedAnggota(null);

    if (namaTimerRef.current) clearTimeout(namaTimerRef.current);

    if (val.trim().length < 2) {
      setAnggotaSuggestions([]);
      setShowAnggotaDrop(false);
      return;
    }

    namaTimerRef.current = setTimeout(async () => {
      const { data, error } = await supabase
        .from('anggota')
        .select('*')
        .or(`nama.ilike.%${val}%,nis.ilike.%${val}%`)
        .limit(10);

      if (!error && data) {
        setAnggotaSuggestions(data);
        setShowAnggotaDrop(data.length > 0);
      }
    }, 300);
  };

  // Logika Smart Search Buku dengan pembersihan timer yang benar
  const handleBukuChange = (val: string) => {
    setBuku(val);
    setSelectedBuku(null);

    if (bukuTimerRef.current) clearTimeout(bukuTimerRef.current);

    if (val.trim().length < 2) {
      setBukuSuggestions([]);
      setShowBukuDrop(false);
      return;
    }

    bukuTimerRef.current = setTimeout(async () => {
      const { data, error } = await supabase
        .from('biblio')
        .select('*')
        .or(`judul.ilike.%${val}%,daftar_kode.cs.["${val}"]`)
        .limit(10);

      if (!error && data) {
        setBukuSuggestions(data);
        setShowBukuDrop(data.length > 0);
      }
    }, 300);
  };

  // Logika Validasi Sesi Waktu & Submit Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedAnggota || !selectedBuku) {
      setErrorMsg('⚠️ Harap pilih Nama & Buku dari daftar pencarian yang muncul.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const sekarang = new Date();
      const jamSekarang = sekarang.getHours();

      let sesiHariIni = '';
      let tglMulaiCheck = '';
      let tglSelesaiCheck = '';

      const targetYear = sekarang.getFullYear();
      const targetMonth = String(sekarang.getMonth() + 1).padStart(2, '0');
      const targetDay = String(sekarang.getDate()).padStart(2, '0');
      const dateString = `${targetYear}-${targetMonth}-${targetDay}`;

      if (jamSekarang >= 4 && jamSekarang < 15) {
        sesiHariIni = 'Pagi-Siang';
        tglMulaiCheck = new Date(`${dateString}T04:00:00`).toISOString();
        tglSelesaiCheck = new Date(`${dateString}T14:59:59`).toISOString();
      } else {
        sesiHariIni = 'Malam';
        if (jamSekarang >= 15) {
          const besok = new Date(sekarang);
          besok.setDate(sekarang.getDate() + 1);
          const dateStringBesok = `${besok.getFullYear()}-${String(besok.getMonth() + 1).padStart(2, '0')}-${String(besok.getDate()).padStart(2, '0')}`;

          tglMulaiCheck = new Date(`${dateString}T15:00:00`).toISOString();
          tglSelesaiCheck = new Date(`${dateStringBesok}T03:59:59`).toISOString();
        } else {
          const kemarin = new Date(sekarang);
          kemarin.setDate(sekarang.getDate() - 1);
          const dateStringKemarin = `${kemarin.getFullYear()}-${String(kemarin.getMonth() + 1).padStart(2, '0')}-${String(kemarin.getDate()).padStart(2, '0')}`;

          tglMulaiCheck = new Date(`${dateStringKemarin}T15:00:00`).toISOString();
          tglSelesaiCheck = new Date(`${dateString}T03:59:59`).toISOString();
        }
      }

      // Memeriksa riwayat sesi
      const { data: checkSesi, error: errorCheck } = await supabase
        .from('data_pengunjung')
        .select('id')
        .eq('id_anggota', selectedAnggota.id)
        .gte('created_at', tglMulaiCheck)
        .lte('created_at', tglSelesaiCheck)
        .limit(1);

      if (errorCheck) throw errorCheck;

      if (checkSesi && checkSesi.length > 0) {
        setErrorMsg(`Batas Kunjungan Terpenuhi: Anda sudah mengisi buku tamu pada Sesi ${sesiHariIni}. Pengunjung hanya diperbolehkan 1 kali kunjungan per sesi.`);
        setLoading(false);
        return;
      }

      const { error: insertError } = await supabase
        .from('data_pengunjung')
        .insert([{
          id_anggota: selectedAnggota.id,
          nis: selectedAnggota.nis,
          nama: nama.trim(),
          kamar: kamar.trim(),
          jenjang: jenjang,
          judul_buku: buku.trim(),
          kategori: kategori,
          aktivitas: aktivitas,
          tanggal_kunjungan: dateString,
        }]);

      if (insertError) throw insertError;

      setSuccessMsg('Kunjungan berhasil disimpan!');

      const savedMemberId = selectedAnggota.id;

      // Reset State Form
      setNama('');
      setKamar('');
      setJenjang('');
      setBuku('');
      setKategori('');
      setAktivitas('');
      setSelectedAnggota(null);
      setSelectedBuku(null);

      if (onSuccess) onSuccess(savedMemberId);

    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan data kunjungan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900/90 p-4 sm:p-5 border border-slate-800 rounded-2xl h-full flex flex-col justify-between overflow-y-auto max-h-full text-slate-100 backdrop-blur-md">
      <form id="visitor-form" onSubmit={handleSubmit} className="space-y-3" autoComplete="off">
        {errorMsg && (
          <div className="mb-3 p-3 rounded-xl bg-red-950/40 border border-red-800/50 text-[11px] text-red-300 font-medium leading-relaxed animate-in fade-in duration-200">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="mb-3 p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/50 text-[11px] text-emerald-300 font-medium animate-in fade-in duration-200">
            {successMsg}
          </div>
        )}

        {/* INPUT NAMA */}
        <div className="relative" ref={dropAnggotaRef}>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nama Pengunjung</label>
          <div className="relative rounded-xl shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className="h-3.5 w-3.5 text-slate-500" />
            </div>
            <input
              type="text"
              value={nama}
              onChange={(e) => handleNamaChange(e.target.value)}
              placeholder="Cari nama atau NIS..."
              className="block w-full pl-9 pr-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-slate-600 transition-colors"
              required
            />
          </div>
          {/* Dropdown Hasil Pencarian Nama */}
          {showAnggotaDrop && (
            <div className="absolute left-0 right-0 top-[calc(100%+4px)] bg-slate-900 text-slate-100 rounded-xl shadow-xl max-h-40 overflow-y-auto z-50 border border-slate-800">
              {anggotaSuggestions.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    setNama(item.nama);
                    setKamar(item.kamar || '');
                    setJenjang(item.jenjang || '');
                    setSelectedAnggota(item);
                    setShowAnggotaDrop(false);
                  }}
                  className="p-2 border-b border-slate-800/60 last:border-none cursor-pointer hover:bg-slate-800 text-left transition-colors"
                >
                  <div className="text-xs font-bold text-white">{item.nama}</div>
                  <div className="text-[10px] text-slate-400">{item.nis || '-'} • Kamar: {item.kamar || '-'}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ROW KAMAR & JENJANG */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Kamar</label>
            <div className="relative rounded-xl shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Home className="h-3.5 w-3.5 text-slate-500" />
              </div>
              <input
                type="text"
                value={kamar}
                onChange={(e) => setKamar(e.target.value)}
                placeholder="A-01"
                className="block w-full pl-9 pr-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-slate-600 transition-colors"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Jenjang</label>
            <div className="relative rounded-xl shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <GraduationCap className="h-3.5 w-3.5 text-slate-500" />
              </div>
              <select
                value={jenjang}
                onChange={(e) => setJenjang(e.target.value)}
                className="block w-full pl-9 pr-8 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-slate-600 appearance-none cursor-pointer transition-colors"
                required
              >
                <option value="" disabled className="bg-slate-900 text-slate-500">Pilih</option>
                <option value="SLTP" className="bg-slate-900 text-slate-100">SLTP</option>
                <option value="SLTA" className="bg-slate-900 text-slate-100">SLTA</option>
                <option value="PT" className="bg-slate-900 text-slate-100">PT</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* INPUT KOLEKSI BUKU */}
        <div className="relative" ref={dropBukuRef}>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Koleksi Buku</label>
          <div className="relative rounded-xl shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <BookOpen className="h-3.5 w-3.5 text-slate-500" />
            </div>
            <input
              type="text"
              value={buku}
              onChange={(e) => handleBukuChange(e.target.value)}
              placeholder="Cari judul buku atau kode..."
              className="block w-full pl-9 pr-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-slate-600 transition-colors"
              required
            />
          </div>
          {/* Dropdown Hasil Pencarian Buku */}
          {showBukuDrop && (
            <div className="absolute left-0 right-0 top-[calc(100%+4px)] bg-slate-900 text-slate-100 rounded-xl shadow-xl max-h-40 overflow-y-auto z-50 border border-slate-800">
              {bukuSuggestions.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    setBuku(item.judul);
                    setKategori(item.kategori || '');
                    setSelectedBuku(item);
                    setShowBukuDrop(false);
                  }}
                  className="p-2 border-b border-slate-800/60 last:border-none cursor-pointer hover:bg-slate-800 text-left transition-colors"
                >
                  <div className="text-xs font-bold text-white line-clamp-1">{item.judul}</div>
                  <div className="text-[10px] text-slate-400 line-clamp-1">{item.penulis || 'Tanpa Penulis'} • Kat: {item.kategori || '-'}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ROW KATEGORI & AKTIVITAS */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Kategori</label>
            <div className="relative rounded-xl shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Layers className="h-3.5 w-3.5 text-slate-500" />
              </div>
              <select
                value={kategori}
                onChange={(e) => setKategori(e.target.value)}
                className="block w-full pl-9 pr-8 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-slate-600 appearance-none cursor-pointer transition-colors"
                required
              >
                <option value="" disabled className="bg-slate-900 text-slate-500">{kategoriOptions.length === 0 ? 'Memuat...' : 'Pilih'}</option>
                {kategoriOptions.map((katOption, index) => (
                  <option key={index} value={katOption} className="bg-slate-900 text-slate-100">{katOption}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Aktivitas</label>
            <div className="relative rounded-xl shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Activity className="h-3.5 w-3.5 text-slate-500" />
              </div>
              <select
                value={aktivitas}
                onChange={(e) => setAktivitas(e.target.value)}
                className="block w-full pl-9 pr-8 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-slate-600 appearance-none cursor-pointer transition-colors"
                required
              >
                <option value="" disabled className="bg-slate-900 text-slate-500">Pilih</option>
                <option value="Baca" className="bg-slate-900 text-slate-100">Baca</option>
                <option value="Pinjam" className="bg-slate-900 text-slate-100">Pinjam</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500 pointer-events-none" />
            </div>
          </div>
        </div>
      </form>

      {/* FOOTER ACTIONS */}
      <div className="pt-4 space-y-2 border-t border-slate-800/80 mt-4">
        <button
          type="submit"
          form="visitor-form"
          disabled={loading}
          className="w-full flex justify-center items-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-center text-slate-900 bg-white hover:bg-slate-200 active:scale-[0.98] transition-all shadow-sm disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-900" />
              Menyinkronkan...
            </>
          ) : (
            <>
              <Save className="h-3.5 w-3.5" />
              Simpan Kunjungan
            </>
          )}
        </button>

        <Link
          href="/leaderboard"
          className="w-full flex justify-center items-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-center text-slate-300 bg-slate-950 hover:bg-slate-800 hover:text-white border border-slate-800 active:scale-[0.98] transition-all cursor-pointer"
        >
          <Trophy className="h-3.5 w-3.5 text-amber-400" />
          Lihat Leaderboard
        </Link>
      </div>
    </div>
  );
}