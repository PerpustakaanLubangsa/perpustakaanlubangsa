'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X, Loader2, ChevronDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { BTN_EDIT, BTN_NEUTRAL, BTN_PRIMARY } from '@/app/dashboard/bibliografi/components/raised-buttons'; // ← sesuaikan path

/* ───────────────────────── Types (dipakai juga oleh halaman) ───────────────────────── */

export interface Rak {
  id: number;
  nama_rak: string;
  kategori_id: number | null;
  kode_awal: string | null;
  huruf_awal: string | null;
  kode_akhir: string | null;
  huruf_akhir: string | null;
  created_at: string | null;
  // Hasil join: kategori:kategori_id ( nama_kategori )
  kategori?: { nama_kategori: string } | { nama_kategori: string }[] | null;
}

export interface RakFormData {
  nama_rak: string;
  kategori_id: number | null;
  kode_awal: string | null;
  huruf_awal: string | null;
  kode_akhir: string | null;
  huruf_akhir: string | null;
}

interface Kategori {
  id: number;
  nama_kategori: string;
}

interface RakFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: RakFormData) => Promise<void>;
  rakToEdit: Rak | null;
}

interface FormState {
  nama_rak: string;
  kategori_id: string; // '' = tanpa kategori
  kode_awal: string;
  huruf_awal: string;
  kode_akhir: string;
  huruf_akhir: string;
}

/* ───────────────────────── Konstanta ───────────────────────── */

const emptyForm: FormState = {
  nama_rak: '',
  kategori_id: '',
  kode_awal: '',
  huruf_awal: '',
  kode_akhir: '',
  huruf_akhir: '',
};

const KLASIFIKASI_GROUPS: {
  title: string;
  kode: 'kode_awal' | 'kode_akhir';
  huruf: 'huruf_awal' | 'huruf_akhir';
  kodePlaceholder: string;
  hurufPlaceholder: string;
}[] = [
  {
    title: 'Klasifikasi Awal (Dari)',
    kode: 'kode_awal',
    huruf: 'huruf_awal',
    kodePlaceholder: 'Contoh: 813',
    hurufPlaceholder: 'Contoh: ABC',
  },
  {
    title: 'Klasifikasi Akhir (Hingga)',
    kode: 'kode_akhir',
    huruf: 'huruf_akhir',
    kodePlaceholder: 'Contoh: 813.087',
    hurufPlaceholder: 'Contoh: XYZ',
  },
];

const INPUT_CLS =
  'h-10 px-3 text-sm font-medium bg-white border border-blue-100 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-colors';
const LABEL_CLS = 'text-xs font-bold text-slate-700';

const MODAL_CSS = `
  @keyframes rak-modal-in { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: scale(1); } }
  .rak-modal-in { animation: rak-modal-in 0.15s ease-out; }
  @media (prefers-reduced-motion: reduce) { .rak-modal-in { animation: none; } }
`;

/* ───────────────────────── Helper ───────────────────────── */

const clean = (v: string) => v.trim().replace(/\s+/g, ' ');
const orNull = (v: string) => {
  const c = clean(v);
  return c === '' ? null : c;
};

const toForm = (rak: Rak | null): FormState =>
  rak
    ? {
        nama_rak: rak.nama_rak,
        kategori_id: rak.kategori_id == null ? '' : String(rak.kategori_id),
        kode_awal: rak.kode_awal ?? '',
        huruf_awal: rak.huruf_awal ?? '',
        kode_akhir: rak.kode_akhir ?? '',
        huruf_akhir: rak.huruf_akhir ?? '',
      }
    : emptyForm;

// Aturan sama dengan constraint di tabel data_rak
function validate(f: FormState): string | null {
  const kodeAwal = clean(f.kode_awal);
  const kodeAkhir = clean(f.kode_akhir);
  const hurufAwal = clean(f.huruf_awal);
  const hurufAkhir = clean(f.huruf_akhir);

  if (!clean(f.nama_rak)) return 'Nama rak wajib diisi.';
  if ((kodeAwal === '') !== (kodeAkhir === '')) return 'Kode awal dan kode akhir harus diisi berpasangan.';
  if ((hurufAwal === '') !== (hurufAkhir === '')) return 'Huruf awal dan huruf akhir harus diisi berpasangan.';
  if (hurufAwal !== '' && kodeAwal === '') return 'Huruf hanya bisa diisi jika kode klasifikasi juga diisi.';
  return null;
}

/* ───────────────────────── Modal ───────────────────────── */

export default function RakFormModal({ isOpen, onClose, onSubmit, rakToEdit }: RakFormModalProps) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [kategoriList, setKategoriList] = useState<Kategori[]>([]);
  const [katStatus, setKatStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  const firstInputRef = useRef<HTMLInputElement>(null);
  const mountedRef = useRef(true);

  /* Kunci scroll halaman belakang, pulihkan nilai aslinya saat tutup */
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  /* Isi form saat modal dibuka atau rak yang diedit berganti */
  useEffect(() => {
    if (!isOpen) return;
    setForm(toForm(rakToEdit));
    setError(null);
  }, [rakToEdit, isOpen]);

  /* Fokus otomatis ke input pertama */
  useEffect(() => {
    if (isOpen) firstInputRef.current?.focus();
  }, [isOpen]);

  /* Esc menutup modal (kecuali saat sedang menyimpan) */
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, isSubmitting, onClose]);

  /* Ambil daftar kategori untuk dropdown */
  const loadKategori = useCallback(async () => {
    setKatStatus('loading');
    const { data, error: err } = await supabase
      .from('kategori')
      .select('id, nama_kategori')
      .order('nama_kategori', { ascending: true });

    if (!mountedRef.current) return;

    if (err) {
      console.error('Gagal memuat kategori:', err);
      setKatStatus('error');
      return;
    }
    setKategoriList((data ?? []) as Kategori[]);
    setKatStatus('ready');
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    if (isOpen) loadKategori();
    return () => {
      mountedRef.current = false;
    };
  }, [isOpen, loadKategori]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError(null);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const problem = validate(form);
    if (problem) {
      setError(problem);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const payload: RakFormData = {
      nama_rak: clean(form.nama_rak),
      kategori_id: form.kategori_id === '' ? null : Number(form.kategori_id),
      kode_awal: orNull(form.kode_awal),
      huruf_awal: orNull(form.huruf_awal),
      kode_akhir: orNull(form.kode_akhir),
      huruf_akhir: orNull(form.huruf_akhir),
    };

    try {
      await onSubmit(payload);
      onClose();
    } catch (err) {
      console.error('Error saat menyimpan form rak:', err);
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat menyimpan data rak.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <style>{MODAL_CSS}</style>

      {/* Backdrop: satu lapis warna, tanpa blur */}
      <div
        className="absolute inset-0 bg-slate-900/50"
        onClick={isSubmitting ? undefined : onClose}
        aria-hidden="true"
      />

      {/* Kontainer utama */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="rak-form-title"
        className="rak-modal-in relative bg-white w-full max-w-lg max-h-full rounded-2xl overflow-hidden flex flex-col border border-blue-100 shadow-xl"
      >
        {/* Header */}
        <header className="px-5 py-4 bg-blue-50 border-b border-blue-100 flex items-center justify-between shrink-0">
          <h3 id="rak-form-title" className="text-sm font-black uppercase tracking-tight text-slate-900">
            {rakToEdit ? 'Edit Data Rak' : 'Tambah Rak Baru'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className={`p-1.5 rounded-lg ${BTN_EDIT}`}
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="flex flex-col min-h-0">
          <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
            {/* Nama rak */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="rak-nama_rak" className={LABEL_CLS}>
                Nama Rak *
              </label>
              <input
                id="rak-nama_rak"
                ref={firstInputRef}
                type="text"
                name="nama_rak"
                required
                value={form.nama_rak}
                onChange={handleChange}
                placeholder="Contoh: A 01"
                disabled={isSubmitting}
                className={INPUT_CLS}
              />
              <span className="text-[11px] text-slate-500">
                Daftar rak diurutkan menurut nama, jadi pakai nomor dua digit (A 01, A 02, ... A 10).
              </span>
            </div>

            {/* Kategori */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="rak-kategori_id" className={LABEL_CLS}>
                Kategori
              </label>
              <div className="relative">
                <select
                  id="rak-kategori_id"
                  name="kategori_id"
                  value={form.kategori_id}
                  onChange={handleChange}
                  disabled={isSubmitting || katStatus === 'loading'}
                  className={`${INPUT_CLS} w-full appearance-none pr-9 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed`}
                >
                  <option value="">{katStatus === 'loading' ? 'Memuat kategori...' : 'Tanpa kategori'}</option>
                  {kategoriList.map((k) => (
                    <option key={k.id} value={String(k.id)}>
                      {k.nama_kategori}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-400 pointer-events-none" />
              </div>
              {katStatus === 'error' && (
                <div className="flex items-center justify-between gap-2 text-[11px] font-semibold text-red-600">
                  <span>Daftar kategori gagal dimuat.</span>
                  <button
                    type="button"
                    onClick={loadKategori}
                    className={`h-7 px-2.5 text-[11px] font-bold rounded-lg ${BTN_NEUTRAL}`}
                  >
                    Coba lagi
                  </button>
                </div>
              )}
            </div>

            {/* Klasifikasi awal & akhir */}
            {KLASIFIKASI_GROUPS.map((group) => (
              <div key={group.kode} className="flex flex-col gap-1.5">
                <span className={LABEL_CLS}>{group.title}</span>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label htmlFor={`rak-${group.kode}`} className="text-[11px] font-semibold text-slate-500">
                      Kode
                    </label>
                    <input
                      id={`rak-${group.kode}`}
                      type="text"
                      name={group.kode}
                      value={form[group.kode]}
                      onChange={handleChange}
                      placeholder={group.kodePlaceholder}
                      disabled={isSubmitting}
                      className={`${INPUT_CLS} tabular-nums`}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label htmlFor={`rak-${group.huruf}`} className="text-[11px] font-semibold text-slate-500">
                      Huruf
                    </label>
                    <input
                      id={`rak-${group.huruf}`}
                      type="text"
                      name={group.huruf}
                      value={form[group.huruf]}
                      onChange={handleChange}
                      placeholder={group.hurufPlaceholder}
                      disabled={isSubmitting}
                      className={INPUT_CLS}
                    />
                  </div>
                </div>
              </div>
            ))}

            {/* Error validasi / simpan */}
            {error && (
              <div
                role="alert"
                className="px-3 py-2 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-xl"
              >
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <footer className="p-4 border-t border-blue-100 bg-blue-50 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className={`h-10 px-4 text-xs font-bold rounded-xl ${BTN_NEUTRAL}`}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`h-10 px-5 text-xs font-extrabold uppercase tracking-wider rounded-xl flex items-center gap-2 ${BTN_PRIMARY}`}
            >
              {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {rakToEdit ? 'Simpan Perubahan' : 'Tambah Rak'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}