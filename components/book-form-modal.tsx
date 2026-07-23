'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Loader2, Image as ImageIcon, Plus, Edit2, Trash2, Library } from 'lucide-react';
// Import komponen modal eksemplar terpisah yang sudah dibuat sebelumnya
import EksemplarFormModal from './EksemplarFormModal'; 

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
  // Handler untuk menyimpan operasi eksemplar ke database melalui komponen utama (parent)
  onSubmitEksemplar?: (data: Eksemplar) => Promise<void>;
  onDeleteEksemplar?: (id: string) => Promise<void>;
  eksemplarList?: Eksemplar[];
}

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

export default function BookFormModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  bookToEdit,
  onSubmitEksemplar,
  onDeleteEksemplar,
  eksemplarList = [] 
}: BookFormModalProps) {
  const [formData, setFormData] = useState<Book>(initialFormState);
  const [topikTags, setTopikTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // State untuk mengontrol pembukaan modal eksemplar
  const [isEksemplarModalOpen, setIsEksemplarModalOpen] = useState(false);
  const [eksemplarToEdit, setEksemplarToEdit] = useState<Eksemplar | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [formData.abstrak, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleKeyDownTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const cleanValue = tagInput.trim().replace(/,/g, '');
      
      if (cleanValue && !topikTags.includes(cleanValue)) {
        setTopikTags([...topikTags, cleanValue]);
      }
      setTagInput('');
    } else if (e.key === 'Backspace' && !tagInput && topikTags.length > 0) {
      setTopikTags(topikTags.slice(0, -1));
    }
  };

  const removeTag = (indexToRemove: number) => {
    setTopikTags(topikTags.filter((_, index) => index !== indexToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const updatedTags = [...topikTags];
    if (tagInput.trim()) {
      const cleanInput = tagInput.trim().replace(/,/g, '');
      if (cleanInput && !updatedTags.includes(cleanInput)) {
        updatedTags.push(cleanInput);
      }
    }

    const { created_at, updated_at, ...cleanFormData } = formData;

    try {
      await onSubmit({
        ...cleanFormData,
        topik: updatedTags,
      });
      onClose();
    } catch (error) {
      console.error('Error saat menyimpan form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fungsi pengontrol aksi internal eksemplar
  const handleOpenAddEksemplar = () => {
    setEksemplarToEdit(null);
    setIsEksemplarModalOpen(true);
  };

  const handleOpenEditEksemplar = (eksemplar: Eksemplar) => {
    setEksemplarToEdit(eksemplar);
    setIsEksemplarModalOpen(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-950/60" onClick={onClose} />

      <div className="relative bg-[#F5F5F5] w-full max-w-5xl rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        
        <header className="px-6 py-4 bg-white border-b border-slate-100 flex items-center justify-between z-10">
          <h2 className="text-base font-bold text-slate-900">
            {bookToEdit ? 'Edit Data Bibliografi' : 'Tambah Bibliografi Baru'}
          </h2>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-grow overflow-hidden grid grid-cols-1 md:grid-cols-3">
          
          {/* Sisi Kiri: Sampul & Panel Eksemplar */}
          <div className="p-5 bg-white border-r border-slate-100 flex flex-col gap-5 overflow-y-auto max-h-[calc(90vh-60px)] hidden md:flex">
            <div>
              <span className="text-xs font-semibold text-slate-500 mb-2.5 block">Pratinjau Sampul</span>
              <div className="w-full aspect-[3/4] max-w-[160px] mx-auto bg-slate-100 rounded-xl overflow-hidden border border-slate-200 flex items-center justify-center relative shadow-inner">
                {formData.sampul_url ? (
                  <img 
                    src={formData.sampul_url} 
                    alt="Pratinjau Sampul" 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '';
                    }}
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-slate-400 p-4 text-center">
                    <ImageIcon className="h-7 w-7 stroke-[1.2]" />
                    <span className="text-[10px]">Belum ada URL gambar</span>
                  </div>
                )}
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Bagian Manajemen Daftar Eksemplar */}
            <div className="flex flex-col flex-grow">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5 text-slate-700">
                  <Library className="h-4 w-4 text-slate-500" />
                  <span className="text-xs font-bold">Daftar Eksemplar ({eksemplarList.length})</span>
                </div>
                {bookToEdit && (
                  <button
                    type="button"
                    onClick={handleOpenAddEksemplar}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-white bg-slate-900 hover:bg-slate-800 px-2.5 py-1 rounded-lg transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                    Tambah
                  </button>
                )}
              </div>

              {!bookToEdit ? (
                <div className="text-center p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
                  Simpan data bibliografi terlebih dahulu untuk menambahkan eksemplar.
                </div>
              ) : eksemplarList.length === 0 ? (
                <div className="text-center p-6 bg-slate-50 border border-slate-100 rounded-xl text-slate-400 text-[11px]">
                  Belum ada item eksemplar untuk buku ini.
                </div>
              ) : (
                <div className="space-y-2 overflow-y-auto max-h-[240px] pr-1">
                  {eksemplarList.map((item, index) => (
                    <div 
                      key={item.id || index} 
                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start justify-between gap-2 text-xs hover:border-slate-300 transition-colors"
                    >
                      <div className="space-y-0.5 text-slate-700">
                        <div className="font-mono font-bold text-slate-900 bg-slate-200/60 inline-block px-1.5 py-0.5 rounded text-[10px]">
                          {item.kode}
                        </div>
                        <div className="font-medium text-slate-600 truncate max-w-[150px]">
                          No. Panggil: {item.nomor_panggil || '-'}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Rak: {item.lokasi_rak || '-'}
                        </div>
                        <div className="pt-1 flex gap-1.5">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                            item.status === 'Tersedia' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {item.status}
                          </span>
                          {item.status_audit && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-slate-200 text-slate-700 uppercase">
                              {item.status_audit}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditEksemplar(item)}
                          className="p-1 text-slate-400 hover:text-slate-600 hover:bg-white rounded border border-transparent hover:border-slate-200 transition-all"
                        >
                          <Edit2 className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => item.id && onDeleteEksemplar?.(item.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-white rounded border border-transparent hover:border-slate-200 transition-all"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sisi Kanan: Form Utama Bibliografi */}
          <form onSubmit={handleSubmit} className="md:col-span-2 flex flex-col h-full overflow-hidden">
            <div className="flex-grow overflow-y-auto p-6 space-y-4 max-h-[calc(90vh-130px)]">
              {/* Form Input fields (Judul, Penulis, Kategori, dst tetap sama) */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700">Judul Buku *</label>
                <input
                  type="text"
                  name="judul"
                  required
                  value={formData.judul}
                  onChange={handleChange}
                  className="h-10 px-3 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 transition-colors text-slate-800"
                  placeholder="Masukkan judul lengkap buku"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700">Penulis / Pengarang</label>
                <input
                  type="text"
                  name="penulis"
                  value={formData.penulis}
                  onChange={handleChange}
                  className="h-10 px-3 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 transition-colors text-slate-800"
                  placeholder="Nama penulis"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700">Kategori Buku</label>
                <input
                  type="text"
                  name="kategori"
                  value={formData.kategori}
                  onChange={handleChange}
                  className="h-10 px-3 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 transition-colors text-slate-800"
                  placeholder="Contoh: Fiksi, Komputer, Sejarah"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700">ISBN / ISSN</label>
                <input
                  type="text"
                  name="isbn_issn"
                  value={formData.isbn_issn}
                  onChange={handleChange}
                  className="h-10 px-3 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 transition-colors text-slate-800"
                  placeholder="978-xxx-xxx-x"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700">Penerbit</label>
                <input
                  type="text"
                  name="penerbit"
                  value={formData.penerbit}
                  onChange={handleChange}
                  className="h-10 px-3 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 transition-colors text-slate-800"
                  placeholder="Nama perusahaan penerbit"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700">Tahun Terbit</label>
                <input
                  type="text"
                  name="tahun_terbit"
                  value={formData.tahun_terbit}
                  onChange={handleChange}
                  className="h-10 px-3 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 transition-colors text-slate-800"
                  placeholder="Contoh: 2024"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700">Deskripsi Fisik</label>
                <input
                  type="text"
                  name="deskripsi_fisik"
                  value={formData.deskripsi_fisik}
                  onChange={handleChange}
                  className="h-10 px-3 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 transition-colors text-slate-800"
                  placeholder="Contoh: xx, 240 hlm; 21 cm"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700">URL Gambar Sampul</label>
                <input
                  type="url"
                  name="sampul_url"
                  value={formData.sampul_url}
                  onChange={handleChange}
                  className="h-10 px-3 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 transition-colors text-slate-800"
                  placeholder="https://example.com/gambar.jpg"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700">Topik Spesifik (Tekan Enter / Koma)</label>
                <div className="flex flex-wrap gap-2 p-2 bg-white border border-slate-200 rounded-xl focus-within:border-slate-400 min-h-10 transition-colors">
                  {topikTags.map((tag, index) => (
                    <span 
                      key={index} 
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-800 text-xs font-medium rounded-lg border border-slate-200/60"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(index)}
                        className="text-slate-400 hover:text-slate-600 rounded-md transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleKeyDownTag}
                    className="flex-grow min-w-[120px] text-sm bg-transparent outline-none text-slate-800 px-1 py-0.5"
                    placeholder={topikTags.length === 0 ? "Contoh: Next.js, Database" : ""}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700">Abstrak / Sinopsis</label>
                <textarea
                  ref={textareaRef}
                  name="abstrak"
                  rows={3}
                  value={formData.abstrak}
                  onChange={handleChange}
                  className="p-3 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 transition-all text-slate-800 resize-none overflow-hidden min-h-[80px]"
                  placeholder="Tulis ringkasan singkat isi buku..."
                />
              </div>
            </div>

            <footer className="p-4 border-t border-slate-200 flex items-center justify-end gap-3 bg-[#F5F5F5] z-10">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="h-10 px-4 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="h-10 px-5 text-xs font-semibold text-white bg-slate-900 rounded-xl hover:bg-slate-800 transition-colors flex items-center gap-2 disabled:opacity-70"
              >
                {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {bookToEdit ? 'Simpan Perubahan' : 'Tambah Buku'}
              </button>
            </footer>
          </form>

        </div>
      </div>

      {/* RENDER MODAL EKSEMPLAR SECARA NESTED */}
      {onSubmitEksemplar && (
        <EksemplarFormModal
          isOpen={isEksemplarModalOpen}
          onClose={() => setIsEksemplarModalOpen(false)}
          onSubmit={onSubmitEksemplar}
          eksemplarToEdit={eksemplarToEdit}
          biblioId={bookToEdit?.id}
        />
      )}
    </div>
  );
}