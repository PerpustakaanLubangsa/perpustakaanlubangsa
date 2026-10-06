'use client';

import React, { useEffect, useState } from 'react';
import { X, Calendar, BookOpen, Tag, Barcode, Building, FileText, Hash, Eye, Bookmark, Loader2 } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// Inisialisasi Supabase Client internal modal untuk mengambil data relasi eksemplar
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface Book {
  id: string; // disesuaikan ke uuid
  judul: string;
  penulis: string;
  isbn_issn: string;
  penerbit: string;
  tahun_terbit: string;
  deskripsi_fisik: string;
  sampul_url: string;
  abstrak: string;
  topik: string[];
  kategori: string;
  created_at: string;
  updated_at: string;
  jumlah_baca: number;
  jumlah_pinjam: number;
}

interface Eksemplar {
  id: string;
  kode: string;
  nomor_panggil: string;
  lokasi_rak: string;
  status: string;
  status_audit: string;
}

interface BookDetailModalProps {
  book: Book | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function BookDetailModal({ book, isOpen, onClose }: BookDetailModalProps) {
  const [eksemplarList, setEksemplarList] = useState<Eksemplar[]>([]);
  const [loadingEksemplar, setLoadingEksemplar] = useState(false);

  // 1. Mengunci scroll background & 2. Mengambil relasi data Eksemplar berdasarkan biblio_id
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    if (isOpen && book?.id) {
      let cancelled = false;
      const getEksemplar = async () => {
        setLoadingEksemplar(true);
        const { data, error } = await supabase
          .from('eksemplar')
          .select('id, kode, nomor_panggil, lokasi_rak, status, status_audit')
          .eq('biblio_id', book.id);

        if (cancelled) return;
        if (!error && data) {
          setEksemplarList(data);
        }
        setLoadingEksemplar(false);
      };
      getEksemplar();

      return () => {
        cancelled = true;
        document.body.style.overflow = 'unset';
      };
    } else {
      setEksemplarList([]);
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, book]);

  // Tutup modal dengan tombol Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !book) return null;

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return '-';
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={`Detail buku ${book.judul}`}
    >
      {/* Overlay gelap transparan (tanpa blur agar ringan di device rendah) */}
      <div
        className="absolute inset-0 bg-slate-900/60"
        onClick={onClose}
      />

      {/* Konten Utama Modal (tanpa animasi, shadow berat, dan gradient) */}
      <div className="relative bg-white w-full max-w-4xl h-[90vh] md:h-auto max-h-[90vh] rounded-2xl overflow-hidden border border-blue-200 flex flex-col md:flex-row z-10 text-slate-900">

        {/* Tombol Tutup Silang */}
        <button
          onClick={onClose}
          aria-label="Tutup"
          className="absolute right-3 top-3 p-1.5 rounded-lg text-slate-600 hover:bg-blue-600 hover:text-white transition-colors z-20 bg-white border border-slate-300 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Bagian Sisi Kiri: Visual Sampul (Static/Tidak dapat di-scroll) */}
        <div className="w-full md:w-1/3 bg-blue-50 flex flex-col items-center justify-center p-5 md:p-6 border-b md:border-b-0 md:border-r border-blue-100 shrink-0">
          <div className="w-full flex flex-col items-center space-y-4 md:space-y-6">
            <div className="relative aspect-[3/4] w-32 sm:w-40 md:w-full max-w-[220px] overflow-hidden rounded-lg bg-blue-100 border border-blue-200 flex items-center justify-center">
              {book.sampul_url ? (
                <img
                  src={book.sampul_url}
                  alt={book.judul}
                  decoding="async"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm font-medium text-blue-500">
                  Tanpa Sampul
                </div>
              )}
            </div>

            {/* Panel Statistik */}
            <div className="w-full max-w-[220px] grid grid-cols-2 text-center bg-white rounded-lg border border-blue-100">
              <div className="flex flex-col items-center justify-center p-2.5">
                <Eye className="h-4 w-4 text-blue-600 mb-1" />
                <span className="text-xs font-medium text-slate-600">Dibaca</span>
                <span className="text-base font-bold text-blue-700">{book.jumlah_baca || 0}x</span>
              </div>
              <div className="flex flex-col items-center justify-center p-2.5 border-l border-blue-100">
                <Bookmark className="h-4 w-4 text-blue-600 mb-1" />
                <span className="text-xs font-medium text-slate-600">Dipinjam</span>
                <span className="text-base font-bold text-blue-700">{book.jumlah_pinjam || 0}x</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bagian Sisi Kanan: Seluruh Teks Informasi Metadata */}
        <div className="w-full md:w-2/3 p-5 sm:p-8 flex flex-col overflow-y-auto max-h-full [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="space-y-6">
            {/* Kategori Badge */}
            <div>
              <span className="inline-block px-3 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded-full">
                {book.kategori || 'Umum'}
              </span>
            </div>

            {/* Judul Utama & Nama Penulis */}
            <div className="space-y-2 pr-10">
              <h2 className="text-xl sm:text-3xl font-bold text-slate-900 leading-snug">
                {book.judul}
              </h2>
              <p className="text-base text-slate-700">
                Ditulis oleh <span className="text-blue-700 font-semibold">{book.penulis || 'Anonim'}</span>
              </p>
            </div>

            {/* Blok Abstrak / Deskripsi Buku */}
            {book.abstrak && (
              <div className="bg-blue-50 p-4 sm:p-5 rounded-xl border-l-4 border-blue-500">
                <h4 className="text-sm font-bold text-blue-800 mb-2">Abstrak / Ringkasan</h4>
                <p className="text-[15px] sm:text-base text-slate-800 leading-relaxed whitespace-pre-line">
                  {book.abstrak}
                </p>
              </div>
            )}

            {/* Blok Spesifikasi / Detail Informasi Dokumen */}
            <div>
              <h4 className="text-sm font-bold text-blue-800 mb-3">Informasi Detail</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-[15px] border-t border-blue-100 pt-4">
                <div className="flex items-start gap-3">
                  <Hash className="h-4 w-4 text-blue-600 shrink-0 mt-1" />
                  <span className="text-slate-600 w-28 shrink-0">ISBN / ISSN</span>
                  <span className="text-slate-900 font-medium break-words min-w-0">{book.isbn_issn || '-'}</span>
                </div>
                <div className="flex items-start gap-3">
                  <Building className="h-4 w-4 text-blue-600 shrink-0 mt-1" />
                  <span className="text-slate-600 w-28 shrink-0">Penerbit</span>
                  <span className="text-slate-900 font-medium break-words min-w-0">{book.penerbit || '-'}</span>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="h-4 w-4 text-blue-600 shrink-0 mt-1" />
                  <span className="text-slate-600 w-28 shrink-0">Tahun Terbit</span>
                  <span className="text-slate-900 font-medium break-words min-w-0">{book.tahun_terbit || '-'}</span>
                </div>
                <div className="flex items-start gap-3">
                  <FileText className="h-4 w-4 text-blue-600 shrink-0 mt-1" />
                  <span className="text-slate-600 w-28 shrink-0">Deskripsi Fisik</span>
                  <span className="text-slate-900 font-medium break-words min-w-0">{book.deskripsi_fisik || '-'}</span>
                </div>
                <div className="flex items-start gap-3 sm:col-span-2">
                  <BookOpen className="h-4 w-4 text-blue-600 shrink-0 mt-1" />
                  <span className="text-slate-600 w-28 shrink-0">Tanggal Input</span>
                  <span className="text-slate-900 font-medium">{formatDate(book.created_at)}</span>
                </div>
              </div>
            </div>

            {/* Blok Topik Spesifik (JSONB) */}
            <div>
              <h4 className="text-sm font-bold text-blue-800 mb-2.5">Topik Bahasan</h4>
              <div className="flex flex-wrap gap-2">
                {book.topik && book.topik.length > 0 ? (
                  book.topik.map((t, idx) => (
                    <span
                      key={idx}
                      className="flex items-center gap-1.5 px-2.5 py-1 text-sm font-medium bg-blue-50 text-blue-800 rounded-full border border-blue-200"
                    >
                      <Tag className="h-3 w-3 text-blue-600" />
                      {t}
                    </span>
                  ))
                ) : (
                  <span className="text-[15px] text-slate-500 italic">-</span>
                )}
              </div>
            </div>

            {/* Blok Sub-Tabel Ketersediaan Eksemplar Fisik Buku */}
            <div className="pt-1">
              <h4 className="text-sm font-bold text-blue-800 mb-3">
                Ketersediaan Eksemplar Fisik ({eksemplarList.length})
              </h4>
              <div className="border border-blue-200 rounded-xl overflow-hidden text-sm bg-white">
                {loadingEksemplar ? (
                  <div className="p-5 text-center text-slate-700 flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" /> Memuat salinan...
                  </div>
                ) : eksemplarList.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-blue-50 border-b border-blue-200 text-blue-900 text-xs font-bold">
                          <th className="p-3 pl-4">Barcode / Kode</th>
                          <th className="p-3">No. Panggil</th>
                          <th className="p-3">Lokasi Rak</th>
                          <th className="p-3 pr-4 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-blue-100 text-slate-800">
                        {eksemplarList.map((item) => (
                          <tr key={item.id}>
                            <td className="p-3 pl-4">
                              <div className="flex items-center gap-1.5 font-mono font-medium text-slate-900">
                                <Barcode className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                                {item.kode}
                              </div>
                            </td>
                            <td className="p-3 font-medium">{item.nomor_panggil || '-'}</td>
                            <td className="p-3">{item.lokasi_rak || '-'}</td>
                            <td className="p-3 pr-4 text-right">
                              <span
                                className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                                  item.status?.toLowerCase() === 'tersedia'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                    : 'bg-amber-50 text-amber-800 border-amber-300'
                                }`}
                              >
                                {item.status || 'Unknown'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-5 text-center text-slate-600 italic">
                    Belum ada data eksemplar fisik untuk katalog ini.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}