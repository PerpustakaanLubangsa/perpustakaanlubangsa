'use client';

import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';

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

const initialFormState: Eksemplar = {
  nomor_panggil: '',
  lokasi_rak: '',
  status: 'Tersedia',
  status_audit: 'baik',
  kode: '',
};

export default function EksemplarFormModal({
  isOpen,
  onClose,
  onSubmit,
  eksemplarToEdit,
  biblioId,
}: EksemplarFormModalProps) {
  const [formData, setFormData] = useState<Eksemplar>(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Efek untuk mengunci scroll body ketika modal aktif
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Memastikan sinkronisasi state form ketika modal dibuka/ditutup atau beralih mode (tambah/edit)
  useEffect(() => {
    if (isOpen) {
      if (eksemplarToEdit) {
        setFormData(eksemplarToEdit);
      } else {
        setFormData({
          ...initialFormState,
          biblio_id: biblioId,
        });
      }
    } else {
      // Reset form ke awal saat modal ditutup sepenuhnya
      setFormData(initialFormState);
    }
  }, [eksemplarToEdit, isOpen, biblioId]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop gelap tanpa blur */}
      <div className="fixed inset-0 bg-slate-950/80" onClick={onClose} />

      {/* Main Container Modal Dark Mode */}
      <div className="relative bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-800 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <header className="px-5 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-100">
            {eksemplarToEdit ? 'Edit Data Eksemplar' : 'Tambah Eksemplar Baru'}
          </h3>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="p-5 space-y-4">
            
            {/* Input Kode Eksemplar */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-300">Kode Eksemplar / Barcode *</label>
              <input
                type="text"
                name="kode"
                required
                value={formData.kode}
                onChange={handleChange}
                className="h-10 px-3 text-sm bg-slate-950/60 border border-slate-800 rounded-xl focus:outline-none focus:border-slate-600 transition-colors text-slate-100 font-mono placeholder:text-slate-600"
                placeholder="BKS-00001"
              />
            </div>

            {/* Input Nomor Panggil */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-300">Nomor Panggil (Call Number)</label>
              <input
                type="text"
                name="nomor_panggil"
                value={formData.nomor_panggil}
                onChange={handleChange}
                className="h-10 px-3 text-sm bg-slate-950/60 border border-slate-800 rounded-xl focus:outline-none focus:border-slate-600 transition-colors text-slate-100 placeholder:text-slate-600"
                placeholder="Contoh: 813 UMA s"
              />
            </div>

            {/* Input Lokasi Rak */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-300">Lokasi Rak</label>
              <input
                type="text"
                name="lokasi_rak"
                value={formData.lokasi_rak}
                onChange={handleChange}
                className="h-10 px-3 text-sm bg-slate-950/60 border border-slate-800 rounded-xl focus:outline-none focus:border-slate-600 transition-colors text-slate-100 placeholder:text-slate-600"
                placeholder="Contoh: Rak A-1, Lantai 2"
              />
            </div>

          </div>

          {/* Footer */}
          <footer className="p-4 border-t border-slate-800 flex items-center justify-end gap-3 bg-slate-900">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-9 px-4 text-xs font-semibold text-slate-300 bg-slate-800 border border-slate-700 rounded-xl hover:bg-slate-700 hover:text-white transition-colors disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-9 px-4 text-xs font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-500 transition-colors flex items-center gap-2 disabled:opacity-70 shadow-lg shadow-blue-600/20"
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