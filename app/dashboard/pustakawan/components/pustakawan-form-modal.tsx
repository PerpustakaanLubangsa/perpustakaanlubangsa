'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { X, Loader2, Save, Users } from 'lucide-react';
import { BTN_PRIMARY, BTN_NEUTRAL, BTN_NEUTRAL_SM } from '../../bibliografi/components/raised-buttons';

/* ───────────────────────── Types (dipakai juga oleh halaman) ───────────────────────── */

export interface JabatanOption {
  id: number;
  nama: string;
  urutan: number;
}

export interface Pustakawan {
  id: number;
  nama: string;
  created_at: string | null;
  jabatan_id: number | null;
  jabatan: { nama: string } | null;
}

export interface PustakawanFormData {
  nama: string;
  jabatan_id: number | null;
}

interface PustakawanFormModalProps {
  pustakawanToEdit: Pustakawan | null;
  jabatanOptions: JabatanOption[];
  onClose: () => void;
  onSubmit: (data: PustakawanFormData) => Promise<void>;
}

const INPUT_CLASS =
  'w-full h-10 px-3 text-sm font-medium bg-white border border-blue-100 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-colors disabled:opacity-60';

const LABEL_CLASS = 'block mb-1 text-[10px] font-black text-slate-500 uppercase tracking-wider';

/* ───────────────────────── Modal ───────────────────────── */

export default function PustakawanFormModal({
  pustakawanToEdit,
  jabatanOptions,
  onClose,
  onSubmit,
}: PustakawanFormModalProps) {
  const isEdit = pustakawanToEdit !== null;
  const uid = useId();

  const [nama, setNama] = useState(pustakawanToEdit?.nama ?? '');
  const [jabatanId, setJabatanId] = useState(
    pustakawanToEdit?.jabatan_id != null ? String(pustakawanToEdit.jabatan_id) : ''
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // Fokus ke kolom nama, Esc untuk menutup, kunci scroll halaman
  useEffect(() => {
    inputRef.current?.focus();

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
  }, [saving, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    const clean = nama.trim().replace(/\s+/g, ' ');
    if (!clean) {
      setError('Nama pustakawan wajib diisi.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        nama: clean,
        jabatan_id: jabatanId === '' ? null : Number(jabatanId),
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Gagal menyimpan data pustakawan.');
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
        aria-label={isEdit ? 'Edit pustakawan' : 'Tambah pustakawan'}
        className="w-full max-w-sm max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center gap-3 p-5 border-b border-slate-200 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
              {isEdit ? 'Edit Pustakawan' : 'Tambah Pustakawan'}
            </h3>
            <p className="text-[11px] text-slate-500 font-medium truncate">
              {isEdit ? pustakawanToEdit.nama : 'Isi nama dan pilih jabatan'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Tutup"
            className={`w-8 h-8 flex items-center justify-center rounded-lg ${BTN_NEUTRAL_SM}`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1" noValidate>
          <div className="p-5 space-y-4 overflow-y-auto min-h-0">
            <div>
              <label htmlFor={`${uid}-nama`} className={LABEL_CLASS}>
                Nama Pustakawan<span className="text-blue-600"> *</span>
              </label>
              <input
                ref={inputRef}
                id={`${uid}-nama`}
                type="text"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                disabled={saving}
                autoComplete="off"
                placeholder="Contoh: Ahmad Fauzi"
                className={INPUT_CLASS}
              />
            </div>

            <div>
              <label htmlFor={`${uid}-jabatan`} className={LABEL_CLASS}>
                Jabatan
              </label>
              <select
                id={`${uid}-jabatan`}
                value={jabatanId}
                onChange={(e) => setJabatanId(e.target.value)}
                disabled={saving}
                className={`${INPUT_CLASS} cursor-pointer`}
              >
                <option value="">— Belum dipilih —</option>
                {jabatanOptions.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.nama}
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <p role="alert" className="text-xs font-semibold text-red-600">
                {error}
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-200 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className={`h-9 px-4 text-[11px] font-extrabold uppercase tracking-wider rounded-lg ${BTN_NEUTRAL}`}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`inline-flex items-center justify-center gap-1.5 h-9 px-4 text-[11px] font-extrabold uppercase tracking-wider rounded-lg ${BTN_PRIMARY}`}
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
