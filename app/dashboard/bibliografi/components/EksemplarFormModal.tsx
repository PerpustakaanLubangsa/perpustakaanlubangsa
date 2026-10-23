'use client';

import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
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
  created_at?: string;
}

interface EksemplarFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: Eksemplar) => Promise<void>;
  eksemplarToEdit: Eksemplar | null;
  biblioId?: string;
}

type FieldName = 'kode' | 'nomor_panggil' | 'lokasi_rak';

interface FieldConfig {
  name: FieldName;
  label: string;
  placeholder: string;
  required?: boolean;
  mono?: boolean;
}

/* ───────────────────────── Konstanta ───────────────────────── */

const initialFormState: Eksemplar = {
  nomor_panggil: '',
  lokasi_rak: '',
  status: 'Tersedia',
  status_audit: 'baik',
  kode: '',
};

// Field "lokasi_rak" dirender sebagai dropdown (RakSelect), bukan input teks.
const FIELDS: FieldConfig[] = [
  { name: 'kode', label: 'Kode Eksemplar / Barcode *', placeholder: 'BKS-00001', required: true, mono: true },
  { name: 'nomor_panggil', label: 'Nomor Panggil (Call Number)', placeholder: 'Contoh: 813 UMA s' },
  { name: 'lokasi_rak', label: 'Lokasi Rak', placeholder: 'Pilih rak' },
];

const INPUT_CLS =
  'h-10 px-3 text-sm font-medium bg-white border border-blue-100 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-colors';
const LABEL_CLS = 'text-xs font-bold text-slate-700';

const MODAL_CSS = `
  @keyframes eks-modal-in { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: scale(1); } }
  .eks-modal-in { animation: eks-modal-in 0.15s ease-out; }
  @media (prefers-reduced-motion: reduce) { .eks-modal-in { animation: none; } }
`;

// Jeda untuk mengabaikan klik backdrop yang baru saja dipakai menutup daftar rak
const RAK_CLOSE_GUARD_MS = 300;

/* ───────────────────────── Helper murni ───────────────────────── */

/** Ubah data dari server (bisa null) menjadi state form yang aman. */
const toFormState = (item: Eksemplar | null, biblioId?: string): Eksemplar => {
  if (!item) return { ...initialFormState, biblio_id: biblioId };
  return {
    ...item,
    kode: item.kode ?? '',
    nomor_panggil: item.nomor_panggil ?? '',
    lokasi_rak: item.lokasi_rak ?? '',
    status: item.status || initialFormState.status,
    status_audit: item.status_audit || initialFormState.status_audit,
  };
};

/* ───────────────────────── Field form (memoized) ───────────────────────── */

const FormField = memo(function FormField({
  field,
  value,
  disabled,
  inputRef,
  onInputChange,
  onRakChange,
  onRakOpenChange,
}: {
  field: FieldConfig;
  value: string;
  disabled: boolean;
  inputRef?: React.Ref<HTMLInputElement>;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRakChange: (value: string) => void;
  onRakOpenChange: (open: boolean) => void;
}) {
  const inputId = `eks-${field.name}`;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className={LABEL_CLS}>
        {field.label}
      </label>

      {field.name === 'lokasi_rak' ? (
        <RakSelect
          id={inputId}
          value={value}
          onChange={onRakChange}
          onOpenChange={onRakOpenChange}
          placeholder={field.placeholder}
          disabled={disabled}
        />
      ) : (
        <input
          id={inputId}
          ref={inputRef}
          type="text"
          name={field.name}
          required={field.required}
          autoComplete="off"
          spellCheck={false}
          disabled={disabled}
          value={value}
          onChange={onInputChange}
          placeholder={field.placeholder}
          className={field.mono ? `${INPUT_CLS} font-mono` : INPUT_CLS}
        />
      )}
    </div>
  );
});

/* ───────────────────────── Modal ───────────────────────── */

export default function EksemplarFormModal({
  isOpen,
  onClose,
  onSubmit,
  eksemplarToEdit,
  biblioId,
}: EksemplarFormModalProps) {
  const [formData, setFormData] = useState<Eksemplar>(() => toFormState(eksemplarToEdit, biblioId));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const firstInputRef = useRef<HTMLInputElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Status daftar rak (terbuka / tidak), dibaca oleh handler Esc dan klik backdrop
  const isRakOpenRef = useRef(false);
  const lastRakCloseRef = useRef(0);

  const handleRakOpenChange = useCallback((open: boolean) => {
    isRakOpenRef.current = open;
    if (!open) lastRakCloseRef.current = Date.now();
  }, []);

  /* Isi / reset form saat modal dibuka atau item yang diedit berganti (berdasarkan id).
     Dilakukan saat render (bukan di effect) agar tidak ada kedipan data lama,
     dan form TIDAK ter-reset ketika parent hanya mengirim ulang objek yang sama. */
  const syncKey = isOpen ? (eksemplarToEdit?.id ?? 'new') : null;
  const [prevSyncKey, setPrevSyncKey] = useState<string | null>(syncKey);
  if (syncKey !== prevSyncKey) {
    setPrevSyncKey(syncKey);
    if (syncKey !== null) {
      setFormData(toFormState(eksemplarToEdit, biblioId));
      setError(null);
    }
  }

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
      onCloseRef.current();
    };
    // Fase capture agar berjalan lebih dulu daripada listener Esc milik modal induk
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [isOpen, isSubmitting]);

  /* ───────────── Handler ───────────── */

  const requestClose = useCallback(() => {
    if (!isSubmitting) onCloseRef.current();
  }, [isSubmitting]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => (prev[name as FieldName] === value ? prev : { ...prev, [name]: value }));
  }, []);

  // Nilai rak disimpan sebagai nama rak (teks), mis. "A 01"
  const handleRakChange = useCallback((value: string) => {
    setFormData((prev) => (prev.lokasi_rak === value ? prev : { ...prev, lokasi_rak: value }));
  }, []);

  /* Klik backdrop menutup modal, kecuali klik itu baru saja dipakai untuk menutup daftar rak */
  const handleBackdropClick = useCallback(() => {
    if (isRakOpenRef.current || Date.now() - lastRakCloseRef.current < RAK_CLOSE_GUARD_MS) return;
    requestClose();
  }, [requestClose]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (isSubmitting) return;

      const kode = formData.kode.trim();
      if (!kode) {
        setError('Kode eksemplar wajib diisi.');
        firstInputRef.current?.focus();
        return;
      }

      setError(null);
      setIsSubmitting(true);

      // Payload eksplisit dan di-trim; created_at tidak dikirim agar tidak menimpa data server
      const payload: Eksemplar = {
        ...(formData.id ? { id: formData.id } : {}),
        biblio_id: formData.biblio_id ?? biblioId,
        kode,
        nomor_panggil: formData.nomor_panggil.trim(),
        lokasi_rak: formData.lokasi_rak ?? '',
        status: formData.status,
        status_audit: formData.status_audit,
      };

      try {
        await onSubmit(payload);
        onCloseRef.current();
      } catch (err) {
        console.error('Error saat menyimpan data eksemplar:', err);
        setError('Gagal menyimpan data eksemplar. Silakan coba lagi.');
      } finally {
        setIsSubmitting(false);
      }
    },
    [biblioId, formData, isSubmitting, onSubmit]
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6">
      <style>{MODAL_CSS}</style>

      {/* Backdrop: satu lapis warna, tanpa blur */}
      <div className="absolute inset-0 bg-slate-900/50" onClick={handleBackdropClick} aria-hidden="true" />

      {/* Kontainer utama */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="eksemplar-form-title"
        aria-busy={isSubmitting}
        className="eks-modal-in relative bg-white w-full max-w-md max-h-[90dvh] rounded-2xl overflow-hidden flex flex-col border border-blue-100 shadow-xl"
      >
        {/* Header */}
        <header className="px-5 py-4 bg-blue-50 border-b border-blue-100 flex items-center justify-between shrink-0">
          <h3 id="eksemplar-form-title" className="text-sm font-black uppercase tracking-tight text-slate-900">
            {eksemplarToEdit ? 'Edit Data Eksemplar' : 'Tambah Eksemplar Baru'}
          </h3>
          <button
            type="button"
            onClick={requestClose}
            disabled={isSubmitting}
            aria-label="Tutup"
            className={`p-1.5 rounded-lg ${BTN_EDIT}`}
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="flex flex-col min-h-0">
          <div className="p-5 space-y-4 overflow-y-auto">
            {FIELDS.map((field, i) => (
              <FormField
                key={field.name}
                field={field}
                value={formData[field.name] ?? ''}
                disabled={isSubmitting}
                inputRef={i === 0 ? firstInputRef : undefined}
                onInputChange={handleChange}
                onRakChange={handleRakChange}
                onRakOpenChange={handleRakOpenChange}
              />
            ))}
          </div>

          {/* Footer */}
          <footer className="p-4 border-t border-blue-100 bg-blue-50 flex items-center justify-end gap-3 shrink-0">
            {error && (
              <p role="alert" className="mr-auto text-xs font-semibold text-red-600">
                {error}
              </p>
            )}
            <button
              type="button"
              onClick={requestClose}
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