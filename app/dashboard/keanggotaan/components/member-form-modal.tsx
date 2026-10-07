'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { X, Loader2, Save, UserPlus, ChevronDown } from 'lucide-react';

/* ───────────────────────── Types (dipakai juga oleh halaman) ───────────────────────── */

export interface Member {
  id: string;
  created_at: string | null;
  updated_at: string | null;
  nis: string;
  nama: string;
  jenjang: string;
  organisasi: string | null;
  kamar: string | null;
  role: string;
  rank: string | null;
  total_kunjungan: number | null;
  total_baca: number | null;
  total_pinjam: number | null;
  poin_tambahan: number | null;
  total_poin: number | null;
  avatar_rank: string | null;
}

/** Data yang dikirim ke database. Statistik, poin, dan rank tidak diubah dari form ini. */
export interface MemberFormData {
  nis: string;
  nama: string;
  jenjang: string;
  organisasi: string | null;
  kamar: string | null;
  role: string;
}

interface MemberFormModalProps {
  isOpen: boolean;
  memberToEdit: Member | null;
  onClose: () => void;
  onSubmit: (data: MemberFormData) => Promise<void>;
}

interface Option {
  value: string;
  label: string;
}

/* ───────────────────────── Konstanta ───────────────────────── */

const JENJANG_OPTIONS: Option[] = [
  { value: 'SLTP', label: 'SLTP' },
  { value: 'SLTA', label: 'SLTA' },
  { value: 'PT', label: 'PT' },
];

const ROLE_OPTIONS: Option[] = [
  { value: 'anggota', label: 'Anggota' },
  { value: 'pustakawan', label: 'Pustakawan' },
  { value: 'admin', label: 'Admin' },
];

const DEFAULT_ROLE = 'anggota';

const INPUT_CLASS =
  'w-full h-10 px-3 text-sm font-medium bg-white border border-blue-100 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-colors disabled:opacity-60';

interface FormState {
  nis: string;
  nama: string;
  jenjang: string;
  organisasi: string;
  kamar: string;
  role: string;
}

const toFormState = (m: Member | null): FormState => ({
  nis: m?.nis ?? '',
  nama: m?.nama ?? '',
  jenjang: m?.jenjang ?? '',
  organisasi: m?.organisasi ?? '',
  kamar: m?.kamar ?? '',
  role: m?.role ?? DEFAULT_ROLE,
});

/** Jika data lama berisi nilai di luar daftar, tetap tampilkan agar tidak hilang saat disimpan */
const withLegacyValue = (options: Option[], current?: string | null): Option[] => {
  if (!current || options.some((o) => o.value === current)) return options;
  return [...options, { value: current, label: current }];
};

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

function SelectInput({
  id,
  value,
  onChange,
  options,
  placeholder,
  disabled,
}: {
  id: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: Option[];
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <div className="relative">
      <select
        id={id}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`${INPUT_CLASS} appearance-none pr-9 cursor-pointer disabled:cursor-not-allowed ${
          value === '' ? 'text-slate-400' : ''
        }`}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((o) => (
          <option key={o.value} value={o.value} className="text-slate-800">
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500 pointer-events-none" />
    </div>
  );
}

/* ───────────────────────── Modal ───────────────────────── */

export default function MemberFormModal({
  isOpen,
  memberToEdit,
  onClose,
  onSubmit,
}: MemberFormModalProps) {
  const isEdit = memberToEdit !== null;
  const uid = useId();
  const id = (name: string) => `${uid}-${name}`;

  const [form, setForm] = useState<FormState>(() => toFormState(memberToEdit));
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

  const jenjangOptions = withLegacyValue(JENJANG_OPTIONS, memberToEdit?.jenjang);
  const roleOptions = withLegacyValue(ROLE_OPTIONS, memberToEdit?.role);

  const setField =
    (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
    };

  const validate = (): string | null => {
    if (!form.nis.trim()) return 'NIS wajib diisi.';
    if (!form.nama.trim()) return 'Nama wajib diisi.';
    if (!form.jenjang) return 'Jenjang wajib dipilih.';
    if (!form.role) return 'Role wajib dipilih.';
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

    const payload: MemberFormData = {
      nis: form.nis.trim(),
      nama: form.nama.trim().replace(/\s+/g, ' '),
      jenjang: form.jenjang,
      organisasi: form.organisasi.trim() || null,
      kamar: form.kamar.trim() || null,
      role: form.role,
    };

    setSaving(true);
    setError(null);
    try {
      await onSubmit(payload);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Gagal menyimpan data anggota.');
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
        aria-label={isEdit ? 'Edit anggota' : 'Tambah anggota'}
        className="w-full max-w-sm max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center gap-3 p-5 border-b border-slate-200 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
            <UserPlus className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
              {isEdit ? 'Edit Anggota' : 'Tambah Anggota'}
            </h3>
            <p className="text-[11px] text-slate-500 font-medium truncate">
              {isEdit ? memberToEdit.nama : 'Isi data anggota perpustakaan'}
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
              label="NIS"
              htmlFor={id('nis')}
              required
              hint={isEdit ? 'Mengubah NIS tidak mengubah riwayat sirkulasi yang sudah tercatat.' : undefined}
            >
              <input
                ref={firstFieldRef}
                id={id('nis')}
                type="text"
                inputMode="numeric"
                value={form.nis}
                onChange={setField('nis')}
                disabled={saving}
                autoComplete="off"
                className={INPUT_CLASS}
              />
            </Field>

            <Field label="Nama" htmlFor={id('nama')} required>
              <input
                id={id('nama')}
                type="text"
                value={form.nama}
                onChange={setField('nama')}
                disabled={saving}
                autoComplete="off"
                className={INPUT_CLASS}
              />
            </Field>

            <Field label="Jenjang" htmlFor={id('jenjang')} required>
              <SelectInput
                id={id('jenjang')}
                value={form.jenjang}
                onChange={setField('jenjang')}
                options={jenjangOptions}
                placeholder="Pilih jenjang"
                disabled={saving}
              />
            </Field>

            <Field label="Role" htmlFor={id('role')} required>
              <SelectInput
                id={id('role')}
                value={form.role}
                onChange={setField('role')}
                options={roleOptions}
                disabled={saving}
              />
            </Field>

            <Field label="Kamar" htmlFor={id('kamar')}>
              <input
                id={id('kamar')}
                type="text"
                value={form.kamar}
                onChange={setField('kamar')}
                disabled={saving}
                autoComplete="off"
                className={INPUT_CLASS}
              />
            </Field>

            <Field label="Organisasi" htmlFor={id('organisasi')}>
              <input
                id={id('organisasi')}
                type="text"
                value={form.organisasi}
                onChange={setField('organisasi')}
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
              {saving ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Tambah Anggota'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}