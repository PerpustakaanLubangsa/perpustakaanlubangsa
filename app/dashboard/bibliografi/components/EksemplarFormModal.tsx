'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import RakSelect from './RakSelect';
import { BTN_EDIT, BTN_NEUTRAL, BTN_PRIMARY } from './raised-buttons';

/* ───────────────────────── Types ───────────────────────── */

interface Eksemplar {
  id?: string;
  biblio_id?: string;
  nomor_panggil: string;
  lokasi_rak: string;
  status: string;
  status_audit: string;
  kode: string;
}

interface EksemplarFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: Eksemplar) => Promise<void>;
  eksemplarToEdit: Eksemplar | null;
  biblioId?: string;
}

/* ───────────────────────── Konstanta ───────────────────────── */

const initialFormState: Eksemplar = {
  nomor_panggil: '',
  lokasi_rak: '',
  status: 'Tersedia',
  status_audit: 'baik',
  kode: '',
};

type FieldName = 'kode' | 'nomor_panggil' | 'lokasi_rak';

// Field "lokasi_rak" dirender sebagai dropdown (RakSelect), bukan input teks.
const FIELDS: {
  name: FieldName;
  label: string;
  placeholder: string;
  required?: boolean;
  mono?: boolean;
}[] = [
  { name: 'kode', label: 'Kode Eksemplar / Barcode *', placeholder: 'BKS-00001', required: true, mono: true },
  { name: 'nomor_panggil', label: 'Nomor Panggil (Call Number)', placeholder: 'Contoh: 813 UMA s' },
  { name: 'lokasi_rak', label: 'Lokasi Rak', placeholder: 'Pilih rak' },
];

const INPUT_CLS =
  'h-10 px-3 text-sm font-medium bg-white border border-blue-100 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-colors';

const MODAL_CSS = `
  @keyframes eks-modal-in { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: scale(1); } }
  .eks-modal-in { animation: eks-modal-in 0.15s ease-out; }
  @media (prefers-reduced-motion: reduce) { .eks-modal-in { animation: none; } }
`;

/* ───────────────────────── Modal ───────────────────────── */

export default function EksemplarFormModal({
  isOpen,
  onClose,
  onSubmit,
  eksemplarToEdit,
  biblioId,
}: EksemplarFormModalProps) {
  const [formData, setFormData] = useState<Eksemplar>(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const firstInputRef = useRef<HTMLInputElement>(null);

  // Status daftar rak (terbuka / tidak), dibaca oleh handler Esc dan klik backdrop
  const isRakOpenRef = useRef(false);
  const lastRakCloseRef = useRef(0);

  const handleRakOpenChange = useCallback((open: boolean) => {
    isRakOpenRef.current = open;
    if (!open) lastRakCloseRef.current = Date.now();
  }, []);

  /* Kunci scroll body.
     Modal induk (BookFormModal) sudah mengunci scroll, jadi nilai asli disimpan
     dan dipulihkan persis, bukan dipaksa ke '' yang bisa membuka kunci induk. */
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  /* Isi form saat modal dibuka atau mode tambah/edit berganti */
  useEffect(() => {
    if (!isOpen) return;
    setFormData(eksemplarToEdit ?? { ...initialFormState, biblio_id: biblioId });
  }, [eksemplarToEdit, isOpen, biblioId]);

  /* Fokus otomatis ke input pertama */
  useEffect(() => {
    if (isOpen) firstInputRef.current?.focus();
  }, [isOpen]);

  /* Esc menutup modal ini saja (tidak ikut menutup modal induk).
     Kalau daftar rak sedang terbuka, Esc hanya menutup daftar itu. */
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || isSubmitting) return;
      if (isRakOpenRef.current) return;
      e.stopPropagation();
      onClose();
    };
    // Fase capture agar berjalan lebih dulu daripada listener Esc milik modal induk
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [isOpen, isSubmitting, onClose]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  // Nilai rak disimpan sebagai nama rak (teks), mis. "A 01"
  const handleRakChange = useCallback((value: string) => {
    setFormData((prev) => ({ ...prev, lokasi_rak: value }));
  }, []);

  /* Klik backdrop menutup modal, kecuali klik itu baru saja dipakai untuk menutup daftar rak */
  const handleBackdropClick = useCallback(() => {
    if (isSubmitting) return;
    if (isRakOpenRef.current || Date.now() - lastRakCloseRef.current < 300) return;
    onClose();
  }, [isSubmitting, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Error saat menyimpan data eksemplar:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
      <style>{MODAL_CSS}</style>

      {/* Backdrop: satu lapis warna, tanpa blur */}
      <div className="absolute inset-0 bg-slate-900/50" onClick={handleBackdropClick} aria-hidden="true" />

      {/* Kontainer utama */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="eksemplar-form-title"
        className="eks-modal-in relative bg-white w-full max-w-md rounded-2xl overflow-hidden border border-blue-100 shadow-xl"
      >
        {/* Header */}
        <header className="px-5 py-4 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
          <h3 id="eksemplar-form-title" className="text-sm font-black uppercase tracking-tight text-slate-900">
            {eksemplarToEdit ? 'Edit Data Eksemplar' : 'Tambah Eksemplar Baru'}
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

        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="p-5 space-y-4">
            {FIELDS.map((field, i) => {
              const inputId = `eks-${field.name}`;

              return (
                <div key={field.name} className="flex flex-col gap-1.5">
                  <label htmlFor={inputId} className="text-xs font-bold text-slate-700">
                    {field.label}
                  </label>

                  {field.name === 'lokasi_rak' ? (
                    <RakSelect
                      id={inputId}
                      value={formData.lokasi_rak ?? ''}
                      onChange={handleRakChange}
                      onOpenChange={handleRakOpenChange}
                      placeholder={field.placeholder}
                      disabled={isSubmitting}
                    />
                  ) : (
                    <input
                      id={inputId}
                      ref={i === 0 ? firstInputRef : undefined}
                      type="text"
                      name={field.name}
                      required={field.required}
                      value={formData[field.name] ?? ''}
                      onChange={handleChange}
                      placeholder={field.placeholder}
                      className={`${INPUT_CLS} ${field.mono ? 'font-mono' : ''}`}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <footer className="p-4 border-t border-blue-100 bg-blue-50 flex items-center justify-end gap-3">
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
              {eksemplarToEdit ? 'Simpan' : 'Tambah'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}