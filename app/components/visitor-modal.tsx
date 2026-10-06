'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import {
  X,
  ClipboardSignature,
  User,
  Loader2,
  Save,
  GraduationCap,
  BookOpen,
  Layers,
  Activity,
  Home,
  ChevronDown,
  Trophy,
} from 'lucide-react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

/* Kelas bersama agar konsisten & mudah diubah */
const labelClass = 'block text-xs font-semibold text-slate-700 mb-1.5';
const inputClass =
  'block w-full pl-9 pr-3 py-2.5 text-base sm:text-sm bg-blue-50 border border-blue-100 rounded-xl text-slate-900 placeholder-slate-500 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition-colors';
const selectClass = `${inputClass} pr-9 appearance-none cursor-pointer`;
const iconClass = 'h-4 w-4 text-blue-600';
const dropdownClass =
  'absolute left-0 right-0 top-[calc(100%+4px)] bg-white rounded-xl max-h-48 overflow-y-auto z-50 border border-blue-200 shadow-md';
const dropdownItemClass =
  'px-3 py-2 border-b border-blue-50 last:border-none cursor-pointer hover:bg-blue-50 text-left';

/* =========================================================
   FORM (hanya dirender saat modal terbuka, jadi state
   otomatis kosong setiap modal dibuka kembali)
   ========================================================= */

function VisitorFormContent() {
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

  // Data yang dipilih dari list pencarian
  const [selectedAnggota, setSelectedAnggota] = useState<any>(null);
  const [selectedBuku, setSelectedBuku] = useState<any>(null);

  const dropAnggotaRef = useRef<HTMLDivElement>(null);
  const dropBukuRef = useRef<HTMLDivElement>(null);
  const namaTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bukuTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ambil list Kategori dari database
  useEffect(() => {
    let active = true;
    async function fetchKategori() {
      try {
        const { data, error } = await supabase
          .from('kategori')
          .select('nama_kategori')
          .order('nama_kategori', { ascending: true });
        if (error) throw error;
        if (data && active) setKategoriOptions(data.map((item) => item.nama_kategori));
      } catch (err: any) {
        console.error('Gagal memuat kategori:', err.message);
      }
    }
    fetchKategori();
    return () => {
      active = false;
    };
  }, []);

  // Tutup dropdown saat klik di luar & bersihkan timer saat unmount
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
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (namaTimerRef.current) clearTimeout(namaTimerRef.current);
      if (bukuTimerRef.current) clearTimeout(bukuTimerRef.current);
    };
  }, []);

  // Smart Search Nama
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

  // Smart Search Buku
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

  // Validasi sesi waktu & submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedAnggota || !selectedBuku) {
      setErrorMsg('Harap pilih Nama & Buku dari daftar pencarian yang muncul.');
      setSuccessMsg(null);
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

      // Periksa riwayat sesi
      const { data: checkSesi, error: errorCheck } = await supabase
        .from('data_pengunjung')
        .select('id')
        .eq('id_anggota', selectedAnggota.id)
        .gte('created_at', tglMulaiCheck)
        .lte('created_at', tglSelesaiCheck)
        .limit(1);

      if (errorCheck) throw errorCheck;

      if (checkSesi && checkSesi.length > 0) {
        setErrorMsg(
          `Batas Kunjungan Terpenuhi: Anda sudah mengisi buku tamu pada Sesi ${sesiHariIni}. Pengunjung hanya diperbolehkan 1 kali kunjungan per sesi.`
        );
        setLoading(false);
        return;
      }

      const { error: insertError } = await supabase.from('data_pengunjung').insert([
        {
          id_anggota: selectedAnggota.id,
          nis: selectedAnggota.nis,
          nama: nama.trim(),
          kamar: kamar.trim(),
          jenjang: jenjang,
          judul_buku: buku.trim(),
          kategori: kategori,
          aktivitas: aktivitas,
          tanggal_kunjungan: dateString,
        },
      ]);

      if (insertError) throw insertError;

      setSuccessMsg('Kunjungan berhasil disimpan!');

      // Reset form
      setNama('');
      setKamar('');
      setJenjang('');
      setBuku('');
      setKategori('');
      setAktivitas('');
      setSelectedAnggota(null);
      setSelectedBuku(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan data kunjungan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Isi form (area yang bisa di-scroll) */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
        <form id="visitor-form" onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          {errorMsg && (
            <div
              role="alert"
              className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-800 font-medium leading-relaxed"
            >
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div
              role="status"
              className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-800 font-medium"
            >
              {successMsg}
            </div>
          )}

          {/* INPUT NAMA */}
          <div className="relative" ref={dropAnggotaRef}>
            <label htmlFor="vf-nama" className={labelClass}>
              Nama Pengunjung
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className={iconClass} />
              </div>
              <input
                id="vf-nama"
                type="text"
                value={nama}
                onChange={(e) => handleNamaChange(e.target.value)}
                placeholder="Cari nama atau NIS..."
                className={inputClass}
                required
              />
            </div>
            {showAnggotaDrop && (
              <div className={dropdownClass}>
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
                    className={dropdownItemClass}
                  >
                    <div className="text-sm font-semibold text-slate-900">{item.nama}</div>
                    <div className="text-xs text-slate-600">
                      {item.nis || '-'} • Kamar: {item.kamar || '-'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ROW KAMAR & JENJANG */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="vf-kamar" className={labelClass}>
                Kamar
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Home className={iconClass} />
                </div>
                <input
                  id="vf-kamar"
                  type="text"
                  value={kamar}
                  onChange={(e) => setKamar(e.target.value)}
                  placeholder="A-01"
                  className={inputClass}
                  required
                />
              </div>
            </div>
            <div>
              <label htmlFor="vf-jenjang" className={labelClass}>
                Jenjang
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <GraduationCap className={iconClass} />
                </div>
                <select
                  id="vf-jenjang"
                  value={jenjang}
                  onChange={(e) => setJenjang(e.target.value)}
                  className={selectClass}
                  required
                >
                  <option value="" disabled>
                    Pilih
                  </option>
                  <option value="SLTP">SLTP</option>
                  <option value="SLTA">SLTA</option>
                  <option value="PT">PT</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* INPUT KOLEKSI BUKU */}
          <div className="relative" ref={dropBukuRef}>
            <label htmlFor="vf-buku" className={labelClass}>
              Koleksi Buku
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <BookOpen className={iconClass} />
              </div>
              <input
                id="vf-buku"
                type="text"
                value={buku}
                onChange={(e) => handleBukuChange(e.target.value)}
                placeholder="Cari judul buku atau kode..."
                className={inputClass}
                required
              />
            </div>
            {showBukuDrop && (
              <div className={dropdownClass}>
                {bukuSuggestions.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setBuku(item.judul);
                      setKategori(item.kategori || '');
                      setSelectedBuku(item);
                      setShowBukuDrop(false);
                    }}
                    className={dropdownItemClass}
                  >
                    <div className="text-sm font-semibold text-slate-900 line-clamp-1">
                      {item.judul}
                    </div>
                    <div className="text-xs text-slate-600 line-clamp-1">
                      {item.penulis || 'Tanpa Penulis'} • Kat: {item.kategori || '-'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ROW KATEGORI & AKTIVITAS */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="vf-kategori" className={labelClass}>
                Kategori
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Layers className={iconClass} />
                </div>
                <select
                  id="vf-kategori"
                  value={kategori}
                  onChange={(e) => setKategori(e.target.value)}
                  className={selectClass}
                  required
                >
                  <option value="" disabled>
                    {kategoriOptions.length === 0 ? 'Memuat...' : 'Pilih'}
                  </option>
                  {kategoriOptions.map((katOption, index) => (
                    <option key={index} value={katOption}>
                      {katOption}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
              </div>
            </div>
            <div>
              <label htmlFor="vf-aktivitas" className={labelClass}>
                Aktivitas
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Activity className={iconClass} />
                </div>
                <select
                  id="vf-aktivitas"
                  value={aktivitas}
                  onChange={(e) => setAktivitas(e.target.value)}
                  className={selectClass}
                  required
                >
                  <option value="" disabled>
                    Pilih
                  </option>
                  <option value="Baca">Baca</option>
                  <option value="Pinjam">Pinjam</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* FOOTER ACTIONS (tetap terlihat di bawah modal) */}
      <div className="shrink-0 space-y-2 border-t border-blue-100 bg-blue-50 px-4 py-3 sm:px-6 sm:py-4">
        <button
          type="submit"
          form="visitor-form"
          disabled={loading}
          className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Menyimpan...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Simpan Kunjungan
            </>
          )}
        </button>

        <Link
          href="/leaderboard"
          className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-blue-700 bg-white hover:bg-blue-100 border border-blue-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer"
        >
          <Trophy className="h-4 w-4 text-amber-500" />
          Lihat Leaderboard
        </Link>
      </div>
    </>
  );
}

/* =========================================================
   MODAL CATAT KUNJUNGAN
   ========================================================= */

interface VisitorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function VisitorModal({ isOpen, onClose }: VisitorModalProps) {
  // Kunci scroll halaman saat modal terbuka
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Tutup dengan tombol Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Catat Kunjungan"
    >
      {/* Overlay gelap transparan (tanpa blur agar ringan di device rendah) */}
      <div className="absolute inset-0 bg-slate-900/60" onClick={onClose} />

      {/* Konten Modal */}
      <div className="relative z-10 flex w-full max-w-md max-h-[92vh] flex-col overflow-hidden rounded-2xl border border-blue-200 bg-white text-slate-900">
        {/* Header Modal */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-blue-100 bg-blue-50 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
              <ClipboardSignature className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-slate-900 leading-tight truncate">
                Catat Kunjungan
              </h2>
              <p className="text-sm text-slate-600 truncate">Isi buku tamu perpustakaan</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="shrink-0 cursor-pointer rounded-lg border border-slate-300 bg-white p-1.5 text-slate-600 transition-colors hover:bg-blue-600 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form langsung ditampilkan */}
        <VisitorFormContent />
      </div>
    </div>
  );
}