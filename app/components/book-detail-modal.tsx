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
      const getEksemplar = async () => {
        setLoadingEksemplar(true);
        const { data, error } = await supabase
          .from('eksemplar')
          .select('id, kode, nomor_panggil, lokasi_rak, status, status_audit')
          .eq('biblio_id', book.id);

        if (!error && data) {
          setEksemplarList(data);
        }
        setLoadingEksemplar(false);
      };
      getEksemplar();
    } else {
      setEksemplarList([]);
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, book]);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Overlay Gelap Solid */}
      <div
        className="absolute inset-0 bg-slate-900"
        onClick={onClose}
      />

      {/* Konten Utama Modal */}
      <div className="relative bg-white w-full max-w-4xl h-[90vh] md:h-auto max-h-[90vh] rounded-2xl overflow-hidden border border-slate-200 flex flex-col md:flex-row animate-in fade-in zoom-in-95 duration-200 z-10 text-slate-900">

        {/* Tombol Tutup Silang */}
        <button
          onClick={onClose}
          aria-label="Tutup"
          className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors z-20 bg-white border border-slate-200 cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Bagian Sisi Kiri: Visual Sampul (Static/Tidak dapat di-scroll) */}
        <div className="w-full md:w-1/3 bg-slate-50 flex flex-col items-center justify-center p-6 border-b md:border-b-0 md:border-r border-slate-200 shrink-0">
          <div className="w-full flex flex-col items-center space-y-6">
            <div className="relative aspect-[3/4] w-full max-w-[220px] overflow-hidden rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center">
              {book.sampul_url ? (
                <img src={book.sampul_url} alt={book.judul} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-slate-500">Tanpa Sampul</div>
              )}
            </div>

            {/* Panel Statistik Internal Flat Mini */}
            <div className="w-full max-w-[220px] grid grid-cols-2 gap-2 text-center bg-white p-3 rounded-xl border border-slate-200">
              <div className="flex flex-col items-center justify-center p-1.5">
                <Eye className="h-4 w-4 text-slate-500 mb-1" />
                <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Dibaca</span>
                <span className="text-xs font-bold text-slate-900">{book.jumlah_baca || 0}x</span>
              </div>
              <div className="flex flex-col items-center justify-center p-1.5 border-l border-slate-200">
                <Bookmark className="h-4 w-4 text-slate-500 mb-1" />
                <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Dipinjam</span>
                <span className="text-xs font-bold text-slate-900">{book.jumlah_pinjam || 0}x</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bagian Sisi Kanan: Seluruh Teks Informasi Metadata */}
        <div
          className="w-full md:w-2/3 p-6 sm:p-8 flex flex-col overflow-y-auto max-h-full space-y-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        >
          <div className="space-y-5">
            {/* Kategori Badge */}
            <div>
              <span className="inline-block px-2.5 py-0.5 text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 rounded-md">
                {book.kategori || 'Umum'}
              </span>
            </div>

            {/* Judul Utama & Nama Penulis */}
            <div className="space-y-1.5">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-snug">
                {book.judul}
              </h2>
              <p className="text-sm text-slate-500">
                Ditulis oleh <span className="text-slate-800 font-semibold">{book.penulis || 'Anonim'}</span>
              </p>
            </div>

            {/* Blok Abstrak / Deskripsi Buku */}
            {book.abstrak && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Abstrak / Ringkasan</h4>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                  {book.abstrak}
                </p>
              </div>
            )}

            {/* Blok Spesifikasi / Detail Informasi Dokumen */}
            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">Informasi Detail</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-xs border-t border-slate-200 pt-3">
                <div className="flex items-center gap-3">
                  <Hash className="h-4 w-4 text-slate-500 shrink-0" />
                  <span className="text-slate-500 w-24 shrink-0">ISBN / ISSN</span>
                  <span className="text-slate-900 font-medium">{book.isbn_issn || '-'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Building className="h-4 w-4 text-slate-500 shrink-0" />
                  <span className="text-slate-500 w-24 shrink-0">Penerbit</span>
                  <span className="text-slate-900 font-medium">{book.penerbit || '-'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-slate-500 shrink-0" />
                  <span className="text-slate-500 w-24 shrink-0">Tahun Terbit</span>
                  <span className="text-slate-900 font-medium">{book.tahun_terbit || '-'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-slate-500 shrink-0" />
                  <span className="text-slate-500 w-24 shrink-0">Deskripsi Fisik</span>
                  <span className="text-slate-900 font-medium">{book.deskripsi_fisik || '-'}</span>
                </div>
                <div className="flex items-center gap-3 sm:col-span-2">
                  <BookOpen className="h-4 w-4 text-slate-500 shrink-0" />
                  <span className="text-slate-500 w-24 shrink-0">Tanggal Input</span>
                  <span className="text-slate-900 font-medium">{formatDate(book.created_at)}</span>
                </div>
              </div>
            </div>

            {/* Blok Topik Spesifik (JSONB) */}
            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Topik Bahasan</h4>
              <div className="flex flex-wrap gap-1.5">
                {book.topik && book.topik.length > 0 ? (
                  book.topik.map((t, idx) => (
                    <span key={idx} className="flex items-center gap-1 px-2 py-0.5 text-xs bg-slate-100 text-slate-700 rounded-md border border-slate-200">
                      <Tag className="h-3 w-3 text-slate-500" />
                      {t}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-500 italic">-</span>
                )}
              </div>
            </div>

            {/* Blok Sub-Tabel Ketersediaan Eksemplar Fisik Buku */}
            <div className="pt-2">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">
                Ketersediaan Eksemplar Fisik ({eksemplarList.length})
              </h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs bg-white">
                {loadingEksemplar ? (
                  <div className="p-4 text-center text-slate-500 flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Memuat salinan...
                  </div>
                ) : eksemplarList.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                          <th className="p-2.5 pl-4">Barcode / Kode</th>
                          <th className="p-2.5">No. Panggil</th>
                          <th className="p-2.5">Lokasi Rak</th>
                          <th className="p-2.5 pr-4 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-slate-700">
                        {eksemplarList.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-2.5 pl-4 font-mono font-medium text-slate-900 flex items-center gap-1.5">
                              <Barcode className="h-3.5 w-3.5 text-slate-500" />
                              {item.kode}
                            </td>
                            <td className="p-2.5 font-medium">{item.nomor_panggil || '-'}</td>
                            <td className="p-2.5">{item.lokasi_rak || '-'}</td>
                            <td className="p-2.5 pr-4 text-right">
                              <span
                                className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border
                                ${
                                  item.status?.toLowerCase() === 'tersedia'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-amber-50 text-amber-700 border-amber-200'
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
                  <div className="p-4 text-center text-slate-500 italic">
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