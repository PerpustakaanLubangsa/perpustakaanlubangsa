'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { X, Loader2, Save, Tags } from 'lucide-react';

/* ───────────────────────── Types (dipakai juga oleh halaman) ───────────────────────── */

export interface Kategori {
  id: number;
  nama_kategori: string;
  kode_awal: number | null;
  kode_akhir: number | null;
  created_at: string | null;
}

export interface KategoriFormData {
  nama_kategori: string;
  kode_awal: number;
  kode_akhir: number;
}

interface KategoriFormModalProps {
  isOpen: boolean;
  kategoriToEdit: Kategori | null;
  onClose: () => void;
  onSubmit: (data: KategoriFormData) => Promise<void>;
}

/* ───────────────────────── Konstanta ───────────────────────── */

const INPUT_CLASS =
  'w-full h-10 px-3 text-sm font-medium bg-white border border-blue-100 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-colors disabled:opacity-60';

const CODE_INPUT_CLASS = `${INPUT_CLASS} text-center tabular-nums tracking-widest`;

// Tombol timbul: hover/sentuh = turun seperti ditekan
const RAISED_BASE =
  'transition-[transform,box-shadow,background-color,color,border-color] duration-100 cursor-pointer select-none disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0';

const BTN_PRIMARY = `${RAISED_BASE} text-white bg-blue-600 border border-blue-700 shadow-[0_4px_0_0_#1e40af] hover:translate-y-[3px] hover:shadow-[0_1px_0_0_#1e40af] active:translate-y-1 active:shadow-none disabled:hover:shadow-[0_4px_0_0_#1e40af]`;

const BTN_NEUTRAL = `${RAISED_BASE} text-slate-600 bg-white border border-slate-300 shadow-[0_4px_0_0_#cbd5e1] hover:translate-y-[3px] hover:shadow-[0_1px_0_0_#cbd5e1] hover:text-blue-700 hover:border-blue-300 active:translate-y-1 active:shadow-none disabled:hover:shadow-[0_4px_0_0_#cbd5e1]`;

const BTN_ICON = `${RAISED_BASE} text-slate-400 bg-white border border-slate-200 shadow-[0_2px_0_0_#e2e8f0] hover:translate-y-0.5 hover:shadow-none hover:text-blue-700 hover:bg-blue-50 active:translate-y-0.5 active:shadow-none disabled:hover:shadow-[0_2px_0_0_#e2e8f0]`;

interface FormState {
  nama_kategori: string;
  kode_awal: string;
  kode_akhir: string;
}

type CodeKey = 'kode_awal' | 'kode_akhir';

// Kode Dewey ditampilkan 3 digit: 0 -> "000", 97 -> "097"
const pad3 = (n: number | null | undefined) =>
  n === null || n === undefined ? '' : String(n).padStart(3, '0');

const toFormState = (k: Kategori | null): FormState => ({
  nama_kategori: k?.nama_kategori ?? '',
  kode_awal: pad3(k?.kode_awal),
  kode_akhir: pad3(k?.kode_akhir),
});

/* ───────────────────────── Komponen kecil ───────────────────────── */

function Field({
  label,
  htmlFor,
  required = false,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="block mb-1 text-[10px] font-black text-slate-500 uppercase tracking-wider"
      >
        {label}
        {required && <span className="text-blue-600"> *</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-[10px] text-slate-500 font-medium">{hint}</p>}
    </div>
  );
}

/* ───────────────────────── Modal ───────────────────────── */

export default function KategoriFormModal({
  isOpen,
  kategoriToEdit,
  onClose,
  onSubmit,
}: KategoriFormModalProps) {
  const isEdit = kategoriToEdit !== null;
  const uid = useId();
  const id = (name: string) => `${uid}-${name}`;

  const [form, setForm] = useState<FormState>(() => toFormState(kategoriToEdit));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const firstFieldRef = useRef<HTMLInputElement>(null);

  // Fokus ke kolom pertama, Esc untuk menutup, kunci scroll halaman
  useEffect(() => {
    if (!isOpen) return;
    firstFieldRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) onClose();
    };
    document.addEventListener('keydown', onKey);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, saving, onClose]);

  if (!isOpen) return null;

  const setName = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, nama_kategori: e.target.value }));
  };

  // Kode hanya boleh angka, maksimal 3 digit
  const setCode = (key: CodeKey) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 3);
    setForm((prev) => ({ ...prev, [key]: digits }));
  };

  // Saat kolom ditinggalkan, lengkapi jadi 3 digit (5 -> 005)
  const padCode = (key: CodeKey) => () => {
    setForm((prev) =>
      prev[key] === '' ? prev : { ...prev, [key]: prev[key].padStart(3, '0') }
    );
  };

  const validate = (): string | null => {
    if (!form.nama_kategori.trim()) return 'Nama kategori wajib diisi.';
    if (form.kode_awal === '' || form.kode_akhir === '') {
      return 'Kode klasifikasi "Dari" dan "Sampai" wajib diisi.';
    }
    if (parseInt(form.kode_awal, 10) > parseInt(form.kode_akhir, 10)) {
      return 'Kode "Dari" tidak boleh lebih besar dari kode "Sampai".';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }

    const payload: KategoriFormData = {
      nama_kategori: form.nama_kategori.trim().replace(/\s+/g, ' '),
      kode_awal: parseInt(form.kode_awal, 10),
      kode_akhir: parseInt(form.kode_akhir, 10),
    };

    setSaving(true);
    setError(null);
    try {
      await onSubmit(payload);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Gagal menyimpan data kategori.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={isEdit ? 'Edit kategori' : 'Tambah kategori'}
        className="w-full max-w-sm max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center gap-3 p-5 border-b border-slate-200 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
            <Tags className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
              {isEdit ? 'Edit Kategori' : 'Tambah Kategori'}
            </h3>
            <p className="text-[11px] text-slate-500 font-medium truncate">
              {isEdit ? kategoriToEdit.nama_kategori : 'Isi data kategori buku'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Tutup"
            className={`w-8 h-8 flex items-center justify-center rounded-lg ${BTN_ICON}`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1" noValidate>
          {/* Isi form */}
          <div className="p-5 space-y-4 overflow-y-auto min-h-0">
            <Field
              label="Nama Kategori"
              htmlFor={id('nama')}
              required
              hint={
                isEdit
                  ? 'Mengubah nama tidak ikut mengubah data buku yang sudah memakai nama kategori lama.'
                  : undefined
              }
            >
              <input
                ref={firstFieldRef}
                id={id('nama')}
                type="text"
                value={form.nama_kategori}
                onChange={setName}
                disabled={saving}
                autoComplete="off"
                placeholder="Contoh: Fikih, Tafsir, Novel"
                className={INPUT_CLASS}
              />
            </Field>

            {/* Rentang kode klasifikasi */}
            <div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Kode Dari" htmlFor={id('awal')} required>
                  <input
                    id={id('awal')}
                    type="text"
                    inputMode="numeric"
                    maxLength={3}
                    value={form.kode_awal}
                    onChange={setCode('kode_awal')}
                    onBlur={padCode('kode_awal')}
                    disabled={saving}
                    autoComplete="off"
                    placeholder="200"
                    className={CODE_INPUT_CLASS}
                  />
                </Field>

                <Field label="Kode Sampai" htmlFor={id('akhir')} required>
                  <input
                    id={id('akhir')}
                    type="text"
                    inputMode="numeric"
                    maxLength={3}
                    value={form.kode_akhir}
                    onChange={setCode('kode_akhir')}
                    onBlur={padCode('kode_akhir')}
                    disabled={saving}
                    autoComplete="off"
                    placeholder="299"
                    className={CODE_INPUT_CLASS}
                  />
                </Field>
              </div>
              <p className="mt-1 text-[10px] text-slate-500 font-medium">
                Rentang 3 digit utama kode klasifikasi (000 sampai 999). Kode seperti 297.1 akan
                cocok ke kategori yang rentangnya mencakup 297.
              </p>
            </div>

            {error && (
              <p
                role="alert"
                className="px-3 py-2 text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-xl"
              >
                {error}
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 pt-3 pb-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider ${BTN_NEUTRAL}`}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider ${BTN_PRIMARY}`}
            >
              {saving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              {saving ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Tambah Kategori'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}