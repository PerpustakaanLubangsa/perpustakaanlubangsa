'use client';

import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { X, Loader2, Image as ImageIcon, Plus, Edit2, Trash2, Library } from 'lucide-react';
import EksemplarFormModal from './EksemplarFormModal';

/* ───────────────────────── Types ───────────────────────── */

interface Book {
  id?: string;
  judul: string;
  penulis: string;
  isbn_issn: string;
  penerbit: string;
  tahun_terbit: string;
  deskripsi_fisik: string;
  sampul_url: string;
  abstrak: string;
  kategori: string;
  topik: string[];
  created_at?: string;
  updated_at?: string;
  jumlah_baca?: number;
  jumlah_pinjam?: number;
}

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

interface BookFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: Omit<Book, 'id' | 'created_at' | 'updated_at'> & { id?: string }) => Promise<void>;
  bookToEdit: Book | null;
  onSubmitEksemplar?: (data: Eksemplar) => Promise<void>;
  onDeleteEksemplar?: (id: string) => Promise<void>;
  eksemplarList?: Eksemplar[];
}

/* ───────────────────────── Konstanta ───────────────────────── */

const initialFormState: Book = {
  judul: '',
  penulis: '',
  isbn_issn: '',
  penerbit: '',
  tahun_terbit: '',
  deskripsi_fisik: '',
  sampul_url: '',
  abstrak: '',
  kategori: '',
  topik: [],
};

type TextFieldName =
  | 'judul'
  | 'penulis'
  | 'kategori'
  | 'isbn_issn'
  | 'penerbit'
  | 'tahun_terbit'
  | 'deskripsi_fisik'
  | 'sampul_url';

// Field berbentuk data, bukan JSX yang diulang 8 kali
const FIELDS: {
  name: TextFieldName;
  label: string;
  placeholder: string;
  type?: string;
  required?: boolean;
}[] = [
  { name: 'judul', label: 'Judul Buku *', placeholder: 'Masukkan judul lengkap buku', required: true },
  { name: 'penulis', label: 'Penulis / Pengarang', placeholder: 'Nama penulis' },
  { name: 'kategori', label: 'Kategori Buku', placeholder: 'Contoh: Fiksi, Komputer, Sejarah' },
  { name: 'isbn_issn', label: 'ISBN / ISSN', placeholder: '978-xxx-xxx-x' },
  { name: 'penerbit', label: 'Penerbit', placeholder: 'Nama perusahaan penerbit' },
  { name: 'tahun_terbit', label: 'Tahun Terbit', placeholder: 'Contoh: 2024' },
  { name: 'deskripsi_fisik', label: 'Deskripsi Fisik', placeholder: 'Contoh: xx, 240 hlm; 21 cm' },
  { name: 'sampul_url', label: 'URL Gambar Sampul', placeholder: 'https://example.com/gambar.jpg', type: 'url' },
];

const INPUT_CLS =
  'h-10 px-3 text-sm font-medium bg-white border border-blue-100 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-colors';
const LABEL_CLS = 'text-xs font-bold text-slate-700';
const SCROLL_CLS =
  '[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-blue-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-blue-300';

const MODAL_CSS = `
  @keyframes modal-in { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: scale(1); } }
  .modal-in { animation: modal-in 0.15s ease-out; }
  @media (prefers-reduced-motion: reduce) { .modal-in { animation: none; } }
`;

const cleanTag = (value: string) => value.trim().replace(/,/g, '');

/* ───────────────────────── Item eksemplar (memoized) ───────────────────────── */

const EksemplarItem = memo(function EksemplarItem({
  item,
  onEdit,
  onDelete,
}: {
  item: Eksemplar;
  onEdit: (item: Eksemplar) => void;
  onDelete: (id?: string) => void;
}) {
  const available = item.status === 'Tersedia';

  return (
    <div className="p-3 bg-white border border-blue-100 rounded-xl flex items-start justify-between gap-2 text-xs hover:border-blue-300 transition-colors">
      <div className="space-y-0.5 min-w-0">
        <div className="font-mono font-bold text-blue-700 bg-blue-50 border border-blue-100 inline-block px-1.5 py-0.5 rounded text-[10px]">
          {item.kode}
        </div>
        <div className="font-semibold text-slate-700 truncate">No. Panggil: {item.nomor_panggil || '-'}</div>
        <div className="text-[11px] text-slate-500">Rak: {item.lokasi_rak || '-'}</div>
        <div className="pt-1 flex flex-wrap gap-1.5">
          <span
            className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${
              available
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}
          >
            {item.status}
          </span>
          {item.status_audit && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-slate-50 text-slate-600 uppercase border border-slate-200">
              {item.status_audit}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1 shrink-0">
        <button
          type="button"
          onClick={() => onEdit(item)}
          aria-label={`Edit eksemplar ${item.kode}`}
          className="p-1.5 text-blue-500 hover:text-white hover:bg-blue-600 rounded-md border border-blue-100 hover:border-blue-600 transition-colors cursor-pointer"
        >
          <Edit2 className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(item.id)}
          aria-label={`Hapus eksemplar ${item.kode}`}
          className="p-1.5 text-red-500 hover:text-white hover:bg-red-500 rounded-md border border-red-100 hover:border-red-500 transition-colors cursor-pointer"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
});

/* ───────────────────────── Modal ───────────────────────── */

export default function BookFormModal({
  isOpen,
  onClose,
  onSubmit,
  bookToEdit,
  onSubmitEksemplar,
  onDeleteEksemplar,
  eksemplarList = [],
}: BookFormModalProps) {
  const [formData, setFormData] = useState<Book>(initialFormState);
  const [topikTags, setTopikTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [coverFailed, setCoverFailed] = useState(false);

  const [isEksemplarModalOpen, setIsEksemplarModalOpen] = useState(false);
  const [eksemplarToEdit, setEksemplarToEdit] = useState<Eksemplar | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /* Kunci scroll halaman belakang, pulihkan nilai aslinya saat tutup */
  useEffect(() => {
    if (!isOpen) return;
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
    };
  }, [isOpen]);

  /* Esc menutup modal (kecuali saat modal eksemplar terbuka atau sedang menyimpan) */
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isEksemplarModalOpen && !isSubmitting) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, isEksemplarModalOpen, isSubmitting, onClose]);

  /* Isi form saat modal dibuka atau buku yang diedit berganti */
  useEffect(() => {
    if (bookToEdit) {
      setFormData(bookToEdit);
      setTopikTags(bookToEdit.topik || []);
    } else {
      setFormData(initialFormState);
      setTopikTags([]);
    }
    setTagInput('');
  }, [bookToEdit, isOpen]);

  /* Reset status error pratinjau saat URL sampul berubah */
  useEffect(() => {
    setCoverFailed(false);
  }, [formData.sampul_url]);

  /* Tinggi textarea mengikuti isi */
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [formData.abstrak, isOpen]);

  /* ───────────── Handler ───────────── */

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleKeyDownTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const value = cleanTag(tagInput);
      if (value) setTopikTags((prev) => (prev.includes(value) ? prev : [...prev, value]));
      setTagInput('');
    } else if (e.key === 'Backspace' && !tagInput) {
      setTopikTags((prev) => prev.slice(0, -1));
    }
  };

  const removeTag = (index: number) => {
    setTopikTags((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    const tags = [...topikTags];
    const pending = cleanTag(tagInput);
    if (pending && !tags.includes(pending)) tags.push(pending);

    const { created_at, updated_at, ...cleanFormData } = formData;

    try {
      await onSubmit({ ...cleanFormData, topik: tags });
      onClose();
    } catch (error) {
      console.error('Error saat menyimpan form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenAddEksemplar = useCallback(() => {
    setEksemplarToEdit(null);
    setIsEksemplarModalOpen(true);
  }, []);

  const handleOpenEditEksemplar = useCallback((eksemplar: Eksemplar) => {
    setEksemplarToEdit(eksemplar);
    setIsEksemplarModalOpen(true);
  }, []);

  const handleDeleteEksemplar = useCallback(
    (id?: string) => {
      if (id) onDeleteEksemplar?.(id);
    },
    [onDeleteEksemplar]
  );

  const handleCloseEksemplar = useCallback(() => setIsEksemplarModalOpen(false), []);

  if (!isOpen) return null;

  const showCover = formData.sampul_url && !coverFailed;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <style>{MODAL_CSS}</style>

      {/* Backdrop: satu lapis warna, tanpa blur */}
      <div className="absolute inset-0 bg-slate-900/50" onClick={isSubmitting ? undefined : onClose} aria-hidden="true" />

      {/* Kontainer utama */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="book-form-title"
        className="modal-in relative bg-white w-full max-w-5xl h-[90vh] rounded-2xl overflow-hidden flex flex-col border border-blue-100 shadow-xl"
      >
        {/* Header */}
        <header className="px-6 py-4 bg-blue-50 border-b border-blue-100 flex items-center justify-between shrink-0">
          <h2 id="book-form-title" className="text-base font-black uppercase tracking-tight text-slate-900">
            {bookToEdit ? 'Edit Data Bibliografi' : 'Tambah Bibliografi Baru'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="p-1.5 text-blue-500 hover:text-white rounded-lg hover:bg-blue-600 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 min-h-0 grid grid-cols-3">
          {/* Sisi kiri: sampul & eksemplar */}
          <aside className={`p-5 bg-blue-50 border-r border-blue-100 flex flex-col gap-5 overflow-y-auto ${SCROLL_CLS}`}>
            <div>
              <span className="text-xs font-bold text-slate-600 mb-2.5 block">Pratinjau Sampul</span>
              <div className="w-full aspect-[3/4] max-w-[160px] mx-auto bg-white rounded-xl overflow-hidden border border-blue-100 flex items-center justify-center">
                {showCover ? (
                  <img
                    src={formData.sampul_url}
                    alt="Pratinjau sampul"
                    decoding="async"
                    onError={() => setCoverFailed(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-blue-300 p-4 text-center">
                    <ImageIcon className="h-7 w-7 stroke-[1.2]" />
                    <span className="text-[10px] text-slate-500">
                      {coverFailed ? 'Gambar tidak dapat dimuat' : 'Belum ada URL gambar'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <hr className="border-blue-100" />

            {/* Daftar eksemplar */}
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5 text-slate-700">
                  <Library className="h-4 w-4 text-blue-500" />
                  <span className="text-xs font-bold">Daftar Eksemplar ({eksemplarList.length})</span>
                </div>
                {bookToEdit && (
                  <button
                    type="button"
                    onClick={handleOpenAddEksemplar}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-700 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                  >
                    <Plus className="h-3 w-3 stroke-[3]" />
                    Tambah
                  </button>
                )}
              </div>

              {!bookToEdit ? (
                <div className="text-center p-4 bg-white border border-dashed border-blue-200 rounded-xl text-slate-500 text-xs">
                  Simpan data bibliografi terlebih dahulu untuk menambahkan eksemplar.
                </div>
              ) : eksemplarList.length === 0 ? (
                <div className="text-center p-6 bg-white border border-blue-100 rounded-xl text-slate-500 text-[11px]">
                  Belum ada item eksemplar untuk buku ini.
                </div>
              ) : (
                <div className={`space-y-2 overflow-y-auto max-h-[260px] pr-1 ${SCROLL_CLS}`}>
                  {eksemplarList.map((item, index) => (
                    <EksemplarItem
                      key={item.id ?? index}
                      item={item}
                      onEdit={handleOpenEditEksemplar}
                      onDelete={handleDeleteEksemplar}
                    />
                  ))}
                </div>
              )}
            </div>
          </aside>

          {/* Sisi kanan: form utama */}
          <form onSubmit={handleSubmit} className="col-span-2 flex flex-col min-h-0 bg-white">
            <div className={`flex-1 min-h-0 overflow-y-auto p-6 space-y-4 ${SCROLL_CLS}`}>
              {FIELDS.map((field) => (
                <div key={field.name} className="flex flex-col gap-1.5">
                  <label htmlFor={`field-${field.name}`} className={LABEL_CLS}>
                    {field.label}
                  </label>
                  <input
                    id={`field-${field.name}`}
                    type={field.type ?? 'text'}
                    name={field.name}
                    required={field.required}
                    value={formData[field.name]}
                    onChange={handleChange}
                    placeholder={field.placeholder}
                    className={INPUT_CLS}
                  />
                </div>
              ))}

              {/* Topik */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="field-topik" className={LABEL_CLS}>
                  Topik Spesifik (Tekan Enter / Koma)
                </label>
                <div className="flex flex-wrap gap-2 p-2 bg-white border border-blue-100 rounded-xl min-h-10 transition-colors focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-500/20">
                  {topikTags.map((tag, index) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-lg border border-blue-200"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(index)}
                        aria-label={`Hapus topik ${tag}`}
                        className="text-blue-400 hover:text-blue-700 rounded-md transition-colors cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    id="field-topik"
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleKeyDownTag}
                    placeholder={topikTags.length === 0 ? 'Contoh: Next.js, Database' : ''}
                    className="flex-grow min-w-[120px] text-sm font-medium bg-transparent outline-none text-slate-800 placeholder:text-slate-400 px-1 py-0.5"
                  />
                </div>
              </div>

              {/* Abstrak */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="field-abstrak" className={LABEL_CLS}>
                  Abstrak / Sinopsis
                </label>
                <textarea
                  id="field-abstrak"
                  ref={textareaRef}
                  name="abstrak"
                  rows={3}
                  value={formData.abstrak}
                  onChange={handleChange}
                  placeholder="Tulis ringkasan singkat isi buku..."
                  className="p-3 text-sm font-medium bg-white border border-blue-100 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-colors resize-none overflow-hidden min-h-[80px]"
                />
              </div>
            </div>

            {/* Footer */}
            <footer className="p-4 border-t border-blue-100 bg-blue-50 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="h-10 px-4 text-xs font-bold text-slate-600 bg-white border border-blue-100 rounded-xl hover:border-blue-300 hover:text-blue-700 transition-colors disabled:opacity-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="h-10 px-5 text-xs font-extrabold uppercase tracking-wider text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-70 cursor-pointer active:scale-95"
              >
                {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {bookToEdit ? 'Simpan Perubahan' : 'Tambah Buku'}
              </button>
            </footer>
          </form>
        </div>
      </div>

      {/* Modal eksemplar bertingkat: hanya dirender saat dibuka */}
      {onSubmitEksemplar && isEksemplarModalOpen && (
        <EksemplarFormModal
          isOpen
          onClose={handleCloseEksemplar}
          onSubmit={onSubmitEksemplar}
          eksemplarToEdit={eksemplarToEdit}
          biblioId={bookToEdit?.id}
        />
      )}
    </div>
  );
}