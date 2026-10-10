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
  Info,
  CheckCircle2,
  Plus,
  CornerDownLeft,
} from 'lucide-react';
import VisitorProfileModal, { ProfileTarget } from './VisitorProfileModal';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

/* Kelas bersama agar konsisten & mudah diubah */
const labelClass = 'block text-xs font-semibold text-slate-700 mb-1.5';
const inputClass =
  'block w-full pl-9 pr-3 py-2.5 text-base sm:text-sm bg-blue-50 border border-blue-100 rounded-xl text-slate-900 placeholder-slate-500 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition-colors';
const selectClass = `${inputClass} pr-9 appearance-none cursor-pointer`;
const comboInputClass = `${inputClass} pr-9`;
const iconClass = 'h-4 w-4 text-blue-600';
const dropdownClass =
  'absolute left-0 right-0 top-[calc(100%+4px)] bg-white rounded-xl max-h-56 overflow-y-auto z-50 border border-blue-200 shadow-md';

/* Tombol timbul (gaya sama seperti tombol X): biru, bayangan bawah, hover = seperti ditekan */
const raisedButtonBase =
  'flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-blue-600 px-3 py-3 text-sm font-bold text-white shadow-[0_4px_0_0_#1e40af] transition-all duration-100 hover:translate-y-1 hover:bg-blue-700 hover:shadow-[0_0_0_0_#1e40af] active:translate-y-1 active:shadow-[0_0_0_0_#1e40af] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 cursor-pointer disabled:cursor-not-allowed disabled:translate-y-0 disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-[0_4px_0_0_#94a3b8]';
const raisedButtonClass = `${raisedButtonBase} flex-1`;

/* =========================================================
   FUNGSI PENCARIAN (Supabase)
   ========================================================= */

async function searchAnggota(query: string): Promise<any[]> {
  // Hindari karakter yang merusak sintaks filter .or()
  const safe = query.replace(/[,()%*]/g, ' ').trim();
  if (!safe) return [];

  const { data, error } = await supabase
    .from('anggota')
    .select('*')
    .or(`nama.ilike.%${safe}%,nis.ilike.%${safe}%`)
    .order('nama', { ascending: true })
    .limit(10);

  if (error) throw error;
  return data || [];
}

async function searchBuku(query: string): Promise<any[]> {
  const safe = query.replace(/[,()%*"\\]/g, ' ').trim();
  if (!safe) return [];

  const { data, error } = await supabase
    .from('biblio')
    .select('*')
    .or(`judul.ilike.%${safe}%,daftar_kode.cs.["${safe}"]`)
    .limit(10);

  if (error) throw error;
  return data || [];
}

/* =========================================================
   HOOK AUTOCOMPLETE
   - dropdown langsung terbuka + skeleton saat mengetik
   - navigasi keyboard (panah, Enter, Esc)
   - hasil lama diabaikan jika ada pencarian yang lebih baru
   ========================================================= */

interface UseAutocompleteOptions<T> {
  search: (query: string) => Promise<T[]>;
  onPick: (item: T) => void;
  minChars?: number;
  delay?: number;
}

function useAutocomplete<T>({
  search,
  onPick,
  minChars = 2,
  delay = 250,
}: UseAutocompleteOptions<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reqIdRef = useRef(0);

  // Simpan fungsi terbaru agar tidak basi di dalam timer
  const searchRef = useRef(search);
  const onPickRef = useRef(onPick);
  searchRef.current = search;
  onPickRef.current = onPick;

  // Tutup dropdown saat klik di luar & bersihkan timer saat unmount
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const reset = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    reqIdRef.current += 1; // batalkan hasil pencarian yang masih berjalan
    setItems([]);
    setOpen(false);
    setLoading(false);
    setError(false);
    setActiveIndex(0);
  };

  const onQueryChange = (val: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const id = ++reqIdRef.current;
    const query = val.trim();

    if (query.length < minChars) {
      setItems([]);
      setOpen(false);
      setLoading(false);
      setError(false);
      setActiveIndex(0);
      return;
    }

    // Langsung tampilkan dropdown dengan skeleton
    setOpen(true);
    setLoading(true);
    setError(false);
    setItems([]);
    setActiveIndex(0);

    timerRef.current = setTimeout(async () => {
      try {
        const result = await searchRef.current(query);
        if (id !== reqIdRef.current) return;
        setItems(result);
        setActiveIndex(0);
      } catch {
        if (id !== reqIdRef.current) return;
        setItems([]);
        setError(true);
      } finally {
        if (id === reqIdRef.current) setLoading(false);
      }
    }, delay);
  };

  const pick = (item: T) => {
    onPickRef.current(item);
    reset();
  };

  const onFocus = () => {
    if (items.length > 0 || loading) setOpen(true);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) {
      if (e.key === 'ArrowDown' && items.length > 0) {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (items.length > 0) setActiveIndex((i) => (i + 1) % items.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (items.length > 0) setActiveIndex((i) => (i - 1 + items.length) % items.length);
        break;
      case 'Enter':
        if (loading) {
          // Tunggu hasil pencarian, jangan submit form
          e.preventDefault();
        } else if (items.length > 0) {
          e.preventDefault();
          pick(items[activeIndex] ?? items[0]);
        }
        break;
      case 'Escape':
        // preventDefault dipakai modal sebagai penanda: Esc hanya menutup dropdown
        e.preventDefault();
        setOpen(false);
        break;
      case 'Tab':
        setOpen(false);
        break;
      default:
        break;
    }
  };

  return {
    containerRef,
    items,
    open,
    loading,
    error,
    activeIndex,
    setActiveIndex,
    onQueryChange,
    onKeyDown,
    onFocus,
    pick,
    reset,
  };
}

/* =========================================================
   DROPDOWN SARAN (skeleton, kosong, error, daftar)
   ========================================================= */

function SkeletonRow() {
  return (
    <div className="animate-pulse border-b border-blue-50 px-3 py-2.5 last:border-none">
      <div className="mb-2 h-3.5 w-3/5 rounded bg-blue-100" />
      <div className="h-3 w-2/5 rounded bg-blue-50" />
    </div>
  );
}

/* Tanda "Enter" pada item yang sedang terfokus */
function EnterHint() {
  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center gap-1 rounded-md border border-blue-300 bg-white px-1.5 py-0.5 text-[11px] font-bold leading-none text-blue-700"
    >
      <CornerDownLeft className="h-3 w-3" />
      Enter
    </span>
  );
}

interface SuggestionDropdownProps<T> {
  id: string;
  open: boolean;
  loading: boolean;
  error: boolean;
  items: T[];
  activeIndex: number;
  onHover: (index: number) => void;
  onPick: (item: T) => void;
  renderItem: (item: T) => React.ReactNode;
  emptyText: string;
}

function SuggestionDropdown<T extends { id: string | number }>({
  id,
  open,
  loading,
  error,
  items,
  activeIndex,
  onHover,
  onPick,
  renderItem,
  emptyText,
}: SuggestionDropdownProps<T>) {
  // Pastikan item yang disorot selalu terlihat saat navigasi keyboard
  useEffect(() => {
    if (!open || loading) return;
    document
      .getElementById(`${id}-opt-${activeIndex}`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open, loading, id]);

  if (!open) return null;

  return (
    <div id={id} role="listbox" aria-busy={loading} className={dropdownClass}>
      {loading ? (
        <>
          <span className="sr-only">Memuat hasil pencarian...</span>
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </>
      ) : error ? (
        <div className="px-3 py-3 text-sm font-medium text-red-700">
          Gagal memuat data. Coba ketik ulang.
        </div>
      ) : items.length === 0 ? (
        <div className="px-3 py-3 text-sm text-slate-600">{emptyText}</div>
      ) : (
        items.map((item, index) => {
          const isActive = index === activeIndex;
          return (
            <div
              key={item.id}
              id={`${id}-opt-${index}`}
              role="option"
              aria-selected={isActive}
              // Cegah input kehilangan fokus saat item diklik
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onPick(item)}
              onMouseEnter={() => onHover(index)}
              className={`flex cursor-pointer items-center justify-between gap-2 border-b border-blue-50 px-3 py-2 text-left last:border-none ${
                isActive ? 'bg-blue-100' : 'bg-white'
              }`}
            >
              <div className="min-w-0 flex-1">{renderItem(item)}</div>
              {isActive && <EnterHint />}
            </div>
          );
        })
      )}
    </div>
  );
}

/* =========================================================
   FORM + PEMBERITAHUAN BERHASIL
   (hanya dirender saat modal terbuka, jadi state
   otomatis kosong setiap modal dibuka kembali)
   ========================================================= */

type ProfilNote = 'none' | 'updated' | 'failed';

interface VisitorFormContentProps {
  onSuccess: (target: ProfileTarget) => void;
  onClose: () => void;
}

function VisitorFormContent({ onSuccess, onClose }: VisitorFormContentProps) {
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

  // Jika terisi, tampilan berubah menjadi pemberitahuan berhasil
  const [savedName, setSavedName] = useState<string | null>(null);
  const [profilNote, setProfilNote] = useState<ProfilNote>('none');

  // Data yang dipilih dari list pencarian
  const [selectedAnggota, setSelectedAnggota] = useState<any>(null);
  const [selectedBuku, setSelectedBuku] = useState<any>(null);

  // Ref untuk pindah fokus otomatis setelah memilih
  const bukuInputRef = useRef<HTMLInputElement>(null);
  const aktivitasSelectRef = useRef<HTMLSelectElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Semua input sudah terisi (nama & buku harus dipilih dari daftar pencarian)
  const allFilled = Boolean(
    selectedAnggota &&
      selectedBuku &&
      nama.trim() &&
      kamar.trim() &&
      jenjang &&
      buku.trim() &&
      kategori &&
      aktivitas
  );

  // Autocomplete Nama
  const anggotaAC = useAutocomplete<any>({
    search: searchAnggota,
    onPick: (item) => {
      setNama(item.nama);
      setKamar(item.kamar || '');
      setJenjang(item.jenjang || '');
      setSelectedAnggota(item);
      bukuInputRef.current?.focus();
    },
  });

  // Autocomplete Buku
  const bukuAC = useAutocomplete<any>({
    search: searchBuku,
    onPick: (item) => {
      setBuku(item.judul);
      setKategori(item.kategori || '');
      setSelectedBuku(item);
      aktivitasSelectRef.current?.focus();
    },
  });

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

  // Saat ada pesan error, gulir ke atas agar pesan selalu terlihat di layar pendek
  useEffect(() => {
    if (errorMsg) scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [errorMsg]);

  const handleNamaChange = (val: string) => {
    setNama(val);
    setSelectedAnggota(null);
    anggotaAC.onQueryChange(val);
  };

  const handleBukuChange = (val: string) => {
    setBuku(val);
    setSelectedBuku(null);
    bukuAC.onQueryChange(val);
  };

  // Kembali ke form kosong untuk menulis kunjungan baru
  const handleNewVisit = () => {
    setSavedName(null);
    setProfilNote('none');
    setErrorMsg(null);
  };

  // Tekan Enter di field mana pun (termasuk dropdown pilihan) saat semua terisi = simpan.
  // Jika Enter sudah dipakai dropdown saran (defaultPrevented), tidak ikut menyimpan.
  const handleFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key !== 'Enter' || e.defaultPrevented || e.nativeEvent.isComposing) return;
    const target = e.target as HTMLElement;
    if (target.closest('button, a, textarea')) return;
    if (!allFilled) return;

    e.preventDefault(); // cegah submit bawaan browser agar tidak dobel
    if (!loading) formRef.current?.requestSubmit();
  };

  // Validasi sesi waktu & submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (!selectedAnggota || !selectedBuku) {
      setErrorMsg('Harap pilih Nama & Buku dari daftar pencarian yang muncul.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

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
          id_buku: selectedBuku.id,
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

      // Jika Kamar / Jenjang diubah, perbarui juga data profil anggota
      const kamarBaru = kamar.trim();
      const profilBerubah =
        kamarBaru !== (selectedAnggota.kamar || '') ||
        jenjang !== (selectedAnggota.jenjang || '');

      let note: ProfilNote = 'none';
      if (profilBerubah) {
        const { error: updateError } = await supabase
          .from('anggota')
          .update({ kamar: kamarBaru, jenjang: jenjang })
          .eq('id', selectedAnggota.id);

        if (updateError) {
          console.error('Gagal memperbarui profil:', updateError.message);
          note = 'failed';
        } else {
          note = 'updated';
        }
      }

      // Simpan data anggota sebelum form di-reset
      const profileTarget: ProfileTarget = {
        id: selectedAnggota.id,
        nama: selectedAnggota.nama,
      };
      const namaTersimpan: string = selectedAnggota.nama;

      // Reset form
      setNama('');
      setKamar('');
      setJenjang('');
      setBuku('');
      setKategori('');
      setAktivitas('');
      setSelectedAnggota(null);
      setSelectedBuku(null);
      anggotaAC.reset();
      bukuAC.reset();

      // Ubah modal form menjadi pemberitahuan, lalu buka modal profil di atasnya
      setProfilNote(note);
      setSavedName(namaTersimpan);
      onSuccess(profileTarget);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan data kunjungan.');
    } finally {
      setLoading(false);
    }
  };

  /* ---------- TAMPILAN PEMBERITAHUAN BERHASIL ---------- */
  if (savedName !== null) {
    return (
      <>
        <div className="flex-1 min-h-0 overflow-y-auto bg-white px-4 py-6 sm:px-6 sm:py-8">
          <div role="status" className="flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 className="h-9 w-9 text-emerald-600" />
            </div>
            <h3 className="mt-4 text-lg font-bold text-slate-900">Kunjungan Tersimpan</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Kunjungan atas nama{' '}
              <span className="font-bold text-slate-900">{savedName}</span> berhasil disimpan.
            </p>

            {profilNote === 'updated' && (
              <p className="mt-3 rounded-xl bg-blue-50 px-3 py-2 text-xs font-medium text-blue-800">
                Data profil (kamar/jenjang) juga sudah diperbarui.
              </p>
            )}
            {profilNote === 'failed' && (
              <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                Data profil (kamar/jenjang) gagal diperbarui, tetapi kunjungan tetap tersimpan.
              </p>
            )}
          </div>
        </div>

        <div className="shrink-0 bg-white px-4 pb-4 pt-2 sm:px-6 sm:pb-5">
          <div className="flex items-stretch gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-blue-200 bg-white px-3 py-3 text-sm font-bold text-blue-700 transition-colors hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={handleNewVisit}
              className="flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-blue-600 px-3 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 cursor-pointer"
            >
              <Plus className="h-4 w-4 shrink-0" />
              Tulis Kunjungan Baru
            </button>
          </div>
        </div>
      </>
    );
  }

  /* ---------- TAMPILAN FORM ---------- */
  return (
    <>
      {/* Isi form (area yang bisa di-scroll) */}
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto bg-white px-4 py-3 sm:px-6 sm:py-5"
      >
        <form
          id="visitor-form"
          ref={formRef}
          onSubmit={handleSubmit}
          onKeyDown={handleFormKeyDown}
          className="space-y-4"
          autoComplete="off"
        >
          {errorMsg && (
            <div
              role="alert"
              className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-800 font-medium leading-relaxed"
            >
              {errorMsg}
            </div>
          )}

          {/* INPUT NAMA */}
          <div className="relative" ref={anggotaAC.containerRef}>
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
                onKeyDown={anggotaAC.onKeyDown}
                onFocus={anggotaAC.onFocus}
                placeholder="Cari nama atau NIS..."
                className={comboInputClass}
                role="combobox"
                aria-expanded={anggotaAC.open}
                aria-controls="vf-nama-list"
                aria-autocomplete="list"
                aria-activedescendant={
                  anggotaAC.open && !anggotaAC.loading && anggotaAC.items.length > 0
                    ? `vf-nama-list-opt-${anggotaAC.activeIndex}`
                    : undefined
                }
                required
              />
              {anggotaAC.open && anggotaAC.loading && (
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                </div>
              )}
            </div>
            <SuggestionDropdown
              id="vf-nama-list"
              open={anggotaAC.open}
              loading={anggotaAC.loading}
              error={anggotaAC.error}
              items={anggotaAC.items}
              activeIndex={anggotaAC.activeIndex}
              onHover={anggotaAC.setActiveIndex}
              onPick={anggotaAC.pick}
              emptyText="Nama atau NIS tidak ditemukan."
              renderItem={(item) => (
                <>
                  <div className="text-sm font-semibold text-slate-900">{item.nama}</div>
                  <div className="text-xs text-slate-600">
                    {item.nis || '-'} • Kamar: {item.kamar || '-'}
                  </div>
                </>
              )}
            />
          </div>

          {/* ROW KAMAR & JENJANG + KETERANGAN EDIT PROFIL */}
          <div>
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
                    aria-describedby="vf-profil-hint"
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
                    aria-describedby="vf-profil-hint"
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
            <p
              id="vf-profil-hint"
              className="mt-2 flex items-start gap-1.5 text-xs leading-relaxed text-slate-600"
            >
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600" />
              <span>Ubah kamar atau jenjang di sini untuk memperbarui data profil Anda.</span>
            </p>
          </div>

          {/* INPUT KOLEKSI BUKU */}
          <div className="relative" ref={bukuAC.containerRef}>
            <label htmlFor="vf-buku" className={labelClass}>
              Koleksi Buku
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <BookOpen className={iconClass} />
              </div>
              <input
                id="vf-buku"
                ref={bukuInputRef}
                type="text"
                value={buku}
                onChange={(e) => handleBukuChange(e.target.value)}
                onKeyDown={bukuAC.onKeyDown}
                onFocus={bukuAC.onFocus}
                placeholder="Cari judul buku atau kode..."
                className={comboInputClass}
                role="combobox"
                aria-expanded={bukuAC.open}
                aria-controls="vf-buku-list"
                aria-autocomplete="list"
                aria-activedescendant={
                  bukuAC.open && !bukuAC.loading && bukuAC.items.length > 0
                    ? `vf-buku-list-opt-${bukuAC.activeIndex}`
                    : undefined
                }
                required
              />
              {bukuAC.open && bukuAC.loading && (
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                </div>
              )}
            </div>
            <SuggestionDropdown
              id="vf-buku-list"
              open={bukuAC.open}
              loading={bukuAC.loading}
              error={bukuAC.error}
              items={bukuAC.items}
              activeIndex={bukuAC.activeIndex}
              onHover={bukuAC.setActiveIndex}
              onPick={bukuAC.pick}
              emptyText="Buku tidak ditemukan."
              renderItem={(item) => (
                <>
                  <div className="text-sm font-semibold text-slate-900 line-clamp-1">
                    {item.judul}
                  </div>
                  <div className="text-xs text-slate-600 line-clamp-1">
                    {item.penulis || 'Tanpa Penulis'} • Kat: {item.kategori || '-'}
                  </div>
                </>
              )}
            />
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
                  ref={aktivitasSelectRef}
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

      {/* FOOTER ACTIONS: padding bawah cukup agar bayangan tombol tidak terpotong */}
      <div className="shrink-0 bg-white px-4 pb-6 pt-3 sm:px-6 sm:pb-7">
        {allFilled ? (
          /* Semua terisi: satu tombol Enter di tengah + petunjuk */
          <div className="flex flex-col items-center gap-3">
            <button
              type="submit"
              form="visitor-form"
              disabled={loading}
              className={`${raisedButtonBase} min-w-[9.5rem] px-8`}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <CornerDownLeft className="h-4 w-4 shrink-0" />
                  Enter
                </>
              )}
            </button>
            <p className="text-center text-xs leading-relaxed text-slate-600">
              Tekan{' '}
              <kbd className="rounded border border-blue-300 bg-blue-50 px-1.5 py-0.5 font-sans text-[11px] font-bold text-blue-700">
                Enter
              </kbd>{' '}
              untuk menyimpan kunjungan
            </p>
          </div>
        ) : (
          <div className="flex items-stretch gap-3">
            <Link href="/leaderboard" className={raisedButtonClass}>
              <Trophy className="h-4 w-4 shrink-0 text-amber-300" />
              Lihat Leaderboard
            </Link>

            <button
              type="submit"
              form="visitor-form"
              disabled={loading}
              className={raisedButtonClass}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 shrink-0" />
                  Simpan Kunjungan
                </>
              )}
            </button>
          </div>
        )}
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
  // Modal profil dikelola di sini agar modal form tetap terbuka di belakangnya
  const [profileTarget, setProfileTarget] = useState<ProfileTarget | null>(null);

  // Reset modal profil saat modal form ditutup
  useEffect(() => {
    if (!isOpen) setProfileTarget(null);
  }, [isOpen]);

  // Kunci scroll halaman saat modal terbuka
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Tombol Escape: tutup modal profil dulu, baru modal form.
  // Jika Esc sudah dipakai menutup dropdown (defaultPrevented), modal tidak ikut tertutup.
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      if (profileTarget) setProfileTarget(null);
      else onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, profileTarget]);

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-label="Catat Kunjungan"
      >
        {/* Overlay gelap transparan (tanpa blur agar ringan di device rendah) */}
        <div className="absolute inset-0 bg-slate-900/60" onClick={onClose} />

        {/* Konten Modal: tinggi mengikuti area layar yang benar-benar terlihat (dvh),
            dikurangi padding overlay, sehingga tidak pernah melebihi layar */}
        <div className="relative z-10 flex w-full max-w-md max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-3rem)] flex-col overflow-hidden rounded-2xl border border-blue-200 bg-white text-slate-900">
          {/* Header Modal (tanpa garis pemisah) */}
          <div className="flex shrink-0 items-center justify-between gap-3 bg-white px-4 pb-3 pt-4 sm:px-6">
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

            {/* Tombol X: biru, timbul, hover = seperti ditekan */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup"
              className="mb-1 shrink-0 cursor-pointer rounded-lg bg-blue-600 p-1.5 text-white shadow-[0_4px_0_0_#1e40af] transition-all duration-100 hover:translate-y-1 hover:bg-blue-700 hover:shadow-[0_0_0_0_#1e40af] active:translate-y-1 active:shadow-[0_0_0_0_#1e40af] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Form / pemberitahuan berhasil */}
          <VisitorFormContent onSuccess={setProfileTarget} onClose={onClose} />
        </div>
      </div>

      {/* Modal profil (z-60, di atas modal form) */}
      <VisitorProfileModal
        isOpen={profileTarget !== null}
        target={profileTarget}
        onClose={() => setProfileTarget(null)}
      />
    </>
  );
}