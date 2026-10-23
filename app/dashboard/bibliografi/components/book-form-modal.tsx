'use client';

import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { X, Loader2, Image as ImageIcon, Plus, Edit2, Trash2, Library } from 'lucide-react';
import EksemplarFormModal from './EksemplarFormModal';
import KategoriSelect from './KategoriSelect';
import {
  BTN_DELETE,
  BTN_EDIT,
  BTN_NEUTRAL,
  BTN_PRIMARY,
  BTN_PRIMARY_SM,
  BTN_TAG_REMOVE,
} from './raised-buttons';

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

type TextFieldName =
  | 'judul'
  | 'penulis'
  | 'kategori'
  | 'isbn_issn'
  | 'penerbit'
  | 'tahun_terbit'
  | 'deskripsi_fisik'
  | 'sampul_url';

interface FieldConfig {
  name: TextFieldName;
  label: string;
  placeholder: string;
  type?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  required?: boolean;
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

const EMPTY_EKSEMPLAR: Eksemplar[] = [];

// Field berbentuk data. "kategori" dirender sebagai dropdown (KategoriSelect).
const FIELDS: FieldConfig[] = [
  { name: 'judul', label: 'Judul Buku *', placeholder: 'Masukkan judul lengkap buku', required: true },
  { name: 'penulis', label: 'Penulis / Pengarang', placeholder: 'Nama penulis' },
  { name: 'kategori', label: 'Kategori Buku', placeholder: 'Pilih kategori buku' },
  { name: 'isbn_issn', label: 'ISBN / ISSN', placeholder: '978-xxx-xxx-x' },
  { name: 'penerbit', label: 'Penerbit', placeholder: 'Nama perusahaan penerbit' },
  { name: 'tahun_terbit', label: 'Tahun Terbit', placeholder: 'Contoh: 2024', inputMode: 'numeric' },
  { name: 'deskripsi_fisik', label: 'Deskripsi Fisik', placeholder: 'Contoh: xx, 240 hlm; 21 cm' },
  {
    name: 'sampul_url',
    label: 'URL Gambar Sampul',
    placeholder: 'https://example.com/gambar.jpg',
    type: 'url',
    inputMode: 'url',
  },
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

const COVER_DEBOUNCE_MS = 400;
const HTTP_URL_RE = /^https?:\/\//i;

/* ───────────────────────── Helper murni ───────────────────────── */

/** Ubah data dari server (bisa null) menjadi state form yang aman. */
const toFormState = (book: Book | null): Book => {
  if (!book) return initialFormState;
  const next: Book = { ...book };
  for (const f of FIELDS) next[f.name] = book[f.name] ?? '';
  next.abstrak = book.abstrak ?? '';
  next.topik = book.topik ?? [];
  return next;
};

const normalizeTag = (value: string) => value.replace(/\s+/g, ' ').trim();

/** Pisahkan teks menjadi tag berdasarkan koma (mendukung paste "a, b, c"). */
const splitTags = (raw: string) => raw.split(',').map(normalizeTag).filter(Boolean);

/** Gabungkan tag baru tanpa duplikat (case-insensitive). Mengembalikan array lama bila tidak berubah. */
const mergeTags = (current: string[], raw: string) => {
  const seen = new Set(current.map((t) => t.toLowerCase()));
  const next = [...current];
  for (const tag of splitTags(raw)) {
    const key = tag.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      next.push(tag);
    }
  }
  return next.length === current.length ? current : next;
};

/* ───────────────────────── Pratinjau sampul (memoized) ───────────────────────── */

const CoverPreview = memo(function CoverPreview({ url }: { url: string }) {
  const [debouncedUrl, setDebouncedUrl] = useState(url.trim());
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  // Debounce supaya gambar tidak dimuat ulang di setiap ketikan
  useEffect(() => {
    const t = setTimeout(() => setDebouncedUrl(url.trim()), COVER_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [url]);

  const isValid = HTTP_URL_RE.test(debouncedUrl);
  const failed = failedUrl === debouncedUrl;
  const showCover = isValid && !failed;

  return (
    <div>
      <span className="text-xs font-bold text-slate-600 mb-2.5 block">Pratinjau Sampul</span>
      <div className="w-full aspect-[3/4] max-w-[160px] mx-auto bg-white rounded-xl overflow-hidden border border-blue-100 flex items-center justify-center">
        {showCover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={debouncedUrl}
            alt="Pratinjau sampul"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setFailedUrl(debouncedUrl)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-blue-300 p-4 text-center">
            <ImageIcon className="h-7 w-7 stroke-[1.2]" />
            <span className="text-[10px] text-slate-500">
              {failed ? 'Gambar tidak dapat dimuat' : 'Belum ada URL gambar'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
});

/* ───────────────────────── Item eksemplar (memoized) ───────────────────────── */

const EksemplarItem = memo(function EksemplarItem({
  item,
  isDeleting,
  onEdit,
  onDelete,
}: {
  item: Eksemplar;
  isDeleting: boolean;
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

      <div className="flex flex-col gap-2 shrink-0 pb-0.5">
        <button
          type="button"
          onClick={() => onEdit(item)}
          disabled={isDeleting}
          aria-label={`Edit eksemplar ${item.kode}`}
          className={`p-1.5 rounded-md ${BTN_EDIT}`}
        >
          <Edit2 className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(item.id)}
          disabled={isDeleting}
          aria-label={`Hapus eksemplar ${item.kode}`}
          className={`p-1.5 rounded-md ${BTN_DELETE}`}
        >
          {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
        </button>
      </div>
    </div>
  );
});

/* ───────────────────────── Field form (memoized) ───────────────────────── */
// Hanya field yang nilainya berubah yang dirender ulang saat mengetik.

const FormField = memo(function FormField({
  field,
  value,
  disabled,
  autoFocus,
  onInputChange,
  onKategoriChange,
}: {
  field: FieldConfig;
  value: string;
  disabled: boolean;
  autoFocus?: boolean;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKategoriChange: (value: string) => void;
}) {
  const inputId = `field-${field.name}`;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className={LABEL_CLS}>
        {field.label}
      </label>

      {field.name === 'kategori' ? (
        <KategoriSelect id={inputId} value={value} onChange={onKategoriChange} disabled={disabled} />
      ) : (
        <input
          id={inputId}
          type={field.type ?? 'text'}
          inputMode={field.inputMode}
          name={field.name}
          required={field.required}
          autoFocus={autoFocus}
          autoComplete="off"
          value={value}
          onChange={onInputChange}
          placeholder={field.placeholder}
          className={INPUT_CLS}
        />
      )}
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
  eksemplarList = EMPTY_EKSEMPLAR,
}: BookFormModalProps) {
  const [formData, setFormData] = useState<Book>(initialFormState);
  const [topikTags, setTopikTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isEksemplarModalOpen, setIsEksemplarModalOpen] = useState(false);
  const [eksemplarToEdit, setEksemplarToEdit] = useState<Eksemplar | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  /* Isi / reset form saat modal dibuka atau buku yang diedit berganti.
     Dilakukan saat render (bukan di effect) agar tidak ada kedipan data lama,
     dan form TIDAK ikut ter-reset ketika parent hanya mengirim ulang objek
     bookToEdit yang sama (mis. setelah refetch daftar eksemplar). */
  const syncKey = isOpen ? (bookToEdit?.id ?? 'new') : null;
  const [prevSyncKey, setPrevSyncKey] = useState<string | null>(null);
  if (syncKey !== prevSyncKey) {
    setPrevSyncKey(syncKey);
    setIsEksemplarModalOpen(false);
    if (syncKey !== null) {
      setFormData(toFormState(bookToEdit));
      setTopikTags(bookToEdit?.topik ?? []);
      setTagInput('');
      setError(null);
      setEksemplarToEdit(null);
    }
  }

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
      if (e.key === 'Escape' && !isEksemplarModalOpen && !isSubmitting) onCloseRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, isEksemplarModalOpen, isSubmitting]);

  /* Tinggi textarea mengikuti isi */
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [formData.abstrak, isOpen]);

  /* ───────────── Handler ───────────── */

  const requestClose = useCallback(() => {
    if (!isSubmitting) onCloseRef.current();
  }, [isSubmitting]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => (prev[name as TextFieldName | 'abstrak'] === value ? prev : { ...prev, [name]: value }));
  }, []);

  // Nilai kategori disimpan sebagai nama kategori (teks)
  const handleKategoriChange = useCallback((value: string) => {
    setFormData((prev) => (prev.kategori === value ? prev : { ...prev, kategori: value }));
  }, []);

  const commitTag = useCallback(() => {
    setTopikTags((prev) => mergeTags(prev, tagInput));
    setTagInput('');
  }, [tagInput]);

  const handleTagInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    if (value.includes(',')) {
      // Koma (ketik maupun paste) langsung memecah menjadi tag
      setTopikTags((prev) => mergeTags(prev, value));
      setTagInput('');
    } else {
      setTagInput(value);
    }
  }, []);

  const handleKeyDownTag = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        if (e.nativeEvent.isComposing) return; // jangan ganggu input IME
        e.preventDefault(); // cegah submit form
        commitTag();
      } else if (e.key === 'Backspace' && !tagInput) {
        setTopikTags((prev) => (prev.length ? prev.slice(0, -1) : prev));
      }
    },
    [commitTag, tagInput]
  );

  const removeTag = useCallback((tag: string) => {
    setTopikTags((prev) => prev.filter((t) => t !== tag));
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (isSubmitting) return;

      const judul = formData.judul.trim();
      if (!judul) {
        setError('Judul buku wajib diisi.');
        return;
      }

      setError(null);
      setIsSubmitting(true);

      // Payload eksplisit: hanya field yang memang diedit user.
      // created_at, updated_at, jumlah_baca, jumlah_pinjam tidak dikirim
      // agar nilai lama/stale tidak menimpa data di server.
      const payload = {
        ...(formData.id ? { id: formData.id } : {}),
        judul,
        penulis: formData.penulis.trim(),
        isbn_issn: formData.isbn_issn.trim(),
        penerbit: formData.penerbit.trim(),
        tahun_terbit: formData.tahun_terbit.trim(),
        deskripsi_fisik: formData.deskripsi_fisik.trim(),
        sampul_url: formData.sampul_url.trim(),
        abstrak: formData.abstrak.trim(),
        kategori: formData.kategori ?? '',
        topik: mergeTags(topikTags, tagInput), // tag yang belum di-Enter ikut tersimpan
      };

      try {
        await onSubmit(payload);
        onCloseRef.current();
      } catch (err) {
        console.error('Error saat menyimpan form:', err);
        setError('Gagal menyimpan data. Silakan coba lagi.');
      } finally {
        setIsSubmitting(false);
      }
    },
    [formData, isSubmitting, onSubmit, tagInput, topikTags]
  );

  const handleOpenAddEksemplar = useCallback(() => {
    setEksemplarToEdit(null);
    setIsEksemplarModalOpen(true);
  }, []);

  const handleOpenEditEksemplar = useCallback((eksemplar: Eksemplar) => {
    setEksemplarToEdit(eksemplar);
    setIsEksemplarModalOpen(true);
  }, []);

  const handleCloseEksemplar = useCallback(() => setIsEksemplarModalOpen(false), []);

  const handleDeleteEksemplar = useCallback(
    async (id?: string) => {
      if (!id || !onDeleteEksemplar) return;
      if (!window.confirm('Hapus eksemplar ini? Tindakan ini tidak dapat dibatalkan.')) return;

      setError(null);
      setDeletingId(id);
      try {
        await onDeleteEksemplar(id);
      } catch (err) {
        console.error('Error saat menghapus eksemplar:', err);
        setError('Gagal menghapus eksemplar. Silakan coba lagi.');
      } finally {
        setDeletingId(null);
      }
    },
    [onDeleteEksemplar]
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      <style>{MODAL_CSS}</style>

      {/* Backdrop: satu lapis warna, tanpa blur */}
      <div className="absolute inset-0 bg-slate-900/50" onClick={requestClose} aria-hidden="true" />

      {/* Kontainer utama */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="book-form-title"
        aria-busy={isSubmitting}
        className="modal-in relative bg-white w-full max-w-5xl h-[90dvh] rounded-2xl overflow-hidden flex flex-col border border-blue-100 shadow-xl"
      >
        {/* Header */}
        <header className="px-6 py-4 bg-blue-50 border-b border-blue-100 flex items-center justify-between shrink-0">
          <h2 id="book-form-title" className="text-base font-black uppercase tracking-tight text-slate-900">
            {bookToEdit ? 'Edit Data Bibliografi' : 'Tambah Bibliografi Baru'}
          </h2>
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

        {/* Mobile: satu kolom & bisa di-scroll. Desktop: 3 kolom, scroll di tiap panel. */}
        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-3 md:grid-rows-1 overflow-y-auto md:overflow-hidden">
          {/* Sisi kiri: sampul & eksemplar */}
          <aside
            className={`p-5 bg-blue-50 border-b md:border-b-0 md:border-r border-blue-100 flex flex-col gap-5 md:overflow-y-auto ${SCROLL_CLS}`}
          >
            <CoverPreview url={formData.sampul_url} />

            <hr className="border-blue-100" />

            {/* Daftar eksemplar */}
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5 text-slate-700">
                  <Library className="h-4 w-4 text-blue-500" />
                  <span className="text-xs font-bold">Daftar Eksemplar ({eksemplarList.length})</span>
                </div>
                {bookToEdit && onSubmitEksemplar && (
                  <button
                    type="button"
                    onClick={handleOpenAddEksemplar}
                    className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 mb-0.5 rounded-lg ${BTN_PRIMARY_SM}`}
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
                      key={item.id ?? `${item.kode}-${index}`}
                      item={item}
                      isDeleting={!!item.id && item.id === deletingId}
                      onEdit={handleOpenEditEksemplar}
                      onDelete={handleDeleteEksemplar}
                    />
                  ))}
                </div>
              )}
            </div>
          </aside>

          {/* Sisi kanan: form utama */}
          <form onSubmit={handleSubmit} className="md:col-span-2 flex flex-col min-h-0 bg-white">
            <div className={`flex-1 min-h-0 md:overflow-y-auto p-6 space-y-4 ${SCROLL_CLS}`}>
              {FIELDS.map((field) => (
                <FormField
                  key={field.name}
                  field={field}
                  value={formData[field.name] ?? ''}
                  disabled={isSubmitting}
                  autoFocus={field.name === 'judul' && !bookToEdit}
                  onInputChange={handleChange}
                  onKategoriChange={handleKategoriChange}
                />
              ))}

              {/* Topik */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="field-topik" className={LABEL_CLS}>
                  Topik Spesifik (Tekan Enter / Koma)
                </label>
                <div className="flex flex-wrap gap-2 p-2 bg-white border border-blue-100 rounded-xl min-h-10 transition-colors focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-500/20">
                  {topikTags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-lg border border-blue-200"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        aria-label={`Hapus topik ${tag}`}
                        className={`p-0.5 rounded ${BTN_TAG_REMOVE}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    id="field-topik"
                    type="text"
                    autoComplete="off"
                    value={tagInput}
                    onChange={handleTagInputChange}
                    onKeyDown={handleKeyDownTag}
                    onBlur={commitTag}
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
                  value={formData.abstrak ?? ''}
                  onChange={handleChange}
                  placeholder="Tulis ringkasan singkat isi buku..."
                  className="p-3 text-sm font-medium bg-white border border-blue-100 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-colors resize-none overflow-hidden min-h-[80px]"
                />
              </div>
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