'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { X, Loader2, Save, Library } from 'lucide-react';

/* ───────────────────────── Types (dipakai juga oleh halaman) ───────────────────────── */

export interface Rak {
  id: number;
  nama_rak: string;
  kode_klasifikasi: string | null;
  created_at: string | null;
  nomor_urut: number | null;
}

// Nomor urut tidak diisi lewat form: diatur dengan drag and drop di halaman
export interface RakFormData {
  nama_rak: string;
  kode_klasifikasi: string | null;
}

interface RakFormModalProps {
  isOpen: boolean;
  rakToEdit: Rak | null;
  onClose: () => void;
  onSubmit: (data: RakFormData) => Promise<void>;
}

/* ───────────────────────── Konstanta ───────────────────────── */

const INPUT_CLASS =
  'w-full h-10 px-3 text-sm font-medium bg-white border border-blue-100 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-colors disabled:opacity-60';

interface FormState {
  nama_rak: string;
  kode_klasifikasi: string;
}

const toFormState = (r: Rak | null): FormState => ({
  nama_rak: r?.nama_rak ?? '',
  kode_klasifikasi: r?.kode_klasifikasi ?? '',
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

export default function RakFormModal({ isOpen, rakToEdit, onClose, onSubmit }: RakFormModalProps) {
  const isEdit = rakToEdit !== null;
  const uid = useId();
  const id = (name: string) => `${uid}-${name}`;

  const [form, setForm] = useState<FormState>(() => toFormState(rakToEdit));
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

  const setField = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const validate = (): string | null => {
    if (!form.nama_rak.trim()) return 'Nama rak wajib diisi.';
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

    const payload: RakFormData = {
      nama_rak: form.nama_rak.trim().replace(/\s+/g, ' '),
      kode_klasifikasi: form.kode_klasifikasi.trim() || null,
    };

    setSaving(true);
    setError(null);
    try {
      await onSubmit(payload);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Gagal menyimpan data rak.');
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
        aria-label={isEdit ? 'Edit rak' : 'Tambah rak'}
        className="w-full max-w-sm max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center gap-3 p-5 border-b border-slate-200 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
            <Library className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
              {isEdit ? 'Edit Rak' : 'Tambah Rak'}
            </h3>
            <p className="text-[11px] text-slate-500 font-medium truncate">
              {isEdit ? rakToEdit.nama_rak : 'Isi data rak perpustakaan'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Tutup"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1" noValidate>
          {/* Isi form: satu input per baris */}
          <div className="p-5 space-y-4 overflow-y-auto min-h-0">
            <Field
              label="Nama Rak"
              htmlFor={id('nama')}
              required
              hint={
                isEdit
                  ? 'Mengubah nama tidak ikut mengubah lokasi rak pada data eksemplar yang sudah ada.'
                  : undefined
              }
            >
              <input
                ref={firstFieldRef}
                id={id('nama')}
                type="text"
                value={form.nama_rak}
                onChange={setField('nama_rak')}
                disabled={saving}
                autoComplete="off"
                className={INPUT_CLASS}
              />
            </Field>

            <Field
              label="Kode Klasifikasi"
              htmlFor={id('kode')}
              hint="Opsional. Contoh: 000, 297, 800."
            >
              <input
                id={id('kode')}
                type="text"
                value={form.kode_klasifikasi}
                onChange={setField('kode_klasifikasi')}
                disabled={saving}
                autoComplete="off"
                className={INPUT_CLASS}
              />
            </Field>

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
          <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 bg-white hover:bg-blue-50 text-slate-600 hover:text-blue-700 border border-slate-200 hover:border-blue-300 font-extrabold rounded-xl text-xs uppercase tracking-wider transition-colors active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider transition-colors active:scale-95 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {saving ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Tambah Rak'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}