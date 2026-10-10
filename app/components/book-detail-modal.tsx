'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { X, Calendar, BookOpen, Tag, Barcode, Building, FileText, Hash, Eye, Bookmark, Loader2, User } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface Book {
  id: string;
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

interface Peminjam {
  nama: string;
  organisasi: string | null;
  kamar: string | null;
  jenjang: string | null;
  rank: string | null;
}

interface Eksemplar {
  id: string;
  kode: string;
  nomor_panggil: string;
  lokasi_rak: string;
  status: string;
  status_audit: string;
  peminjam?: Peminjam | null;
}

interface BookDetailModalProps {
  book: Book | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function BookDetailModal({ book, isOpen, onClose }: BookDetailModalProps) {
  const [eksemplarList, setEksemplarList] = useState<Eksemplar[]>([]);
  const [loadingEksemplar, setLoadingEksemplar] = useState(false);

  // Kunci scroll background + ambil eksemplar & data peminjam
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'unset';

    if (!(isOpen && book?.id)) {
      setEksemplarList([]);
      return () => {
        document.body.style.overflow = 'unset';
      };
    }

    let cancelled = false;

    const getEksemplar = async () => {
      setLoadingEksemplar(true);

      const { data: eksData, error } = await supabase
        .from('eksemplar')
        .select('id, kode, nomor_panggil, lokasi_rak, status, status_audit')
        .eq('biblio_id', book.id);

      if (cancelled) return;

      if (error || !eksData) {
        setEksemplarList([]);
        setLoadingEksemplar(false);
        return;
      }

      // Eksemplar yang tidak berstatus "tersedia" dianggap sedang dipinjam
      const kodeDipinjam = eksData
        .filter((e) => e.status?.toLowerCase() !== 'tersedia')
        .map((e) => e.kode);

      const peminjamByKode: Record<string, Peminjam> = {};

      if (kodeDipinjam.length > 0) {
        // Peminjaman aktif = belum ada tanggal kembali
        const { data: sirkData } = await supabase
          .from('sirkulasi')
          .select('kode_eksemplar, nis, nama_anggota, kamar, created_at')
          .in('kode_eksemplar', kodeDipinjam)
          .is('tgl_kembali', null)
          .order('created_at', { ascending: false });

        if (cancelled) return;

        if (sirkData && sirkData.length > 0) {
          const nisList = Array.from(new Set(sirkData.map((s) => s.nis)));

          const { data: anggotaData } = await supabase
            .from('anggota')
            .select('nis, nama, organisasi, kamar, jenjang, rank')
            .in('nis', nisList);

          if (cancelled) return;

          const anggotaByNis: Record<string, any> = {};
          (anggotaData || []).forEach((a) => {
            anggotaByNis[a.nis] = a;
          });

          // Ambil peminjaman terbaru untuk tiap kode
          sirkData.forEach((s) => {
            if (peminjamByKode[s.kode_eksemplar]) return;
            const a = anggotaByNis[s.nis];
            peminjamByKode[s.kode_eksemplar] = {
              nama: a?.nama || s.nama_anggota || '-',
              organisasi: a?.organisasi ?? null,
              kamar: a?.kamar ?? s.kamar ?? null,
              jenjang: a?.jenjang ?? null,
              rank: a?.rank ?? null,
            };
          });
        }
      }

      setEksemplarList(
        eksData.map((e) => ({ ...e, peminjam: peminjamByKode[e.kode] || null }))
      );
      setLoadingEksemplar(false);
    };

    getEksemplar();

    return () => {
      cancelled = true;
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, book]);

  // Tutup dengan tombol Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Pecah abstrak: setiap baris baru menjadi paragraf terpisah (jarak sebesar 1 baris kosong)
  const paragraphs = useMemo(
    () =>
      (book?.abstrak || '')
        .split(/\r?\n+/)
        .map((p) => p.trim())
        .filter(Boolean),
    [book?.abstrak]
  );

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
      <div className="absolute inset-0 bg-slate-900/60" onClick={onClose} />

      <div className="relative bg-white w-full max-w-4xl h-[90vh] md:h-auto max-h-[90vh] rounded-2xl overflow-hidden border border-blue-200 flex flex-col md:flex-row z-10 text-slate-900">

        {/* Tombol Tutup: biru, timbul, saat hover/klik/sentuh terlihat tertekan */}
        <button
          onClick={onClose}
          aria-label="Tutup"
          className="absolute right-3 top-3 z-20 h-10 w-10 flex items-center justify-center rounded-xl
                     bg-blue-600 text-white border border-blue-700 cursor-pointer touch-manipulation
                     shadow-[0_4px_0_0_#1e3a8a]
                     transition-all duration-100
                     hover:translate-y-[3px] hover:shadow-[0_1px_0_0_#1e3a8a] hover:bg-blue-700
                     active:translate-y-[4px] active:shadow-none active:bg-blue-800
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
        >
          <X className="h-5 w-5" strokeWidth={3} />
        </button>

        {/* Sisi Kiri: Sampul */}
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

        {/* Sisi Kanan: Metadata */}
        <div className="w-full md:w-2/3 p-5 sm:p-8 flex flex-col overflow-y-auto max-h-full [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="space-y-6">
            <div>
              <span className="inline-block px-3 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded-full">
                {book.kategori || 'Umum'}
              </span>
            </div>

            <div className="space-y-2 pr-12">
              <h2 className="text-xl sm:text-3xl font-bold text-slate-900 leading-snug">
                {book.judul}
              </h2>
              <p className="text-base text-slate-700">
                Ditulis oleh <span className="text-blue-700 font-semibold">{book.penulis || 'Anonim'}</span>
              </p>
            </div>

            {/* Abstrak: rata kanan-kiri, jarak antarparagraf 1 baris kosong, paragraf pertama menjorok */}
            {paragraphs.length > 0 && (
              <div className="bg-blue-50 p-4 sm:p-5 rounded-xl border-l-4 border-blue-500">
                <h4 className="text-sm font-bold text-blue-800 mb-3">Abstrak / Ringkasan</h4>
                <div
                  lang="id"
                  className="text-[15px] sm:text-base text-slate-800 leading-relaxed text-justify"
                  style={{ hyphens: 'auto', WebkitHyphens: 'auto' }}
                >
                  {paragraphs.map((p, idx) => (
                    <p
                      key={idx}
                      className={`mb-[1.5em] last:mb-0 ${idx === 0 ? 'indent-8' : ''}`}
                    >
                      {p}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Informasi Detail */}
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

            {/* Topik */}
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

            {/* Eksemplar */}
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
                    <table className="w-full min-w-[560px] text-left border-collapse">
                      <thead>
                        <tr className="bg-blue-50 border-b border-blue-200 text-blue-900 text-xs font-bold">
                          <th className="p-3 pl-4">Barcode / Kode</th>
                          <th className="p-3">No. Panggil</th>
                          <th className="p-3">Lokasi Rak</th>
                          <th className="p-3 pr-4">Status / Peminjam</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-blue-100 text-slate-800">
                        {eksemplarList.map((item) => {
                          const tersedia = item.status?.toLowerCase() === 'tersedia';
                          const p = item.peminjam;
                          const detailPeminjam = p
                            ? [p.organisasi, p.kamar && `Kamar ${p.kamar}`, p.jenjang, p.rank]
                                .filter(Boolean)
                                .join(' • ')
                            : '';

                          return (
                            <tr key={item.id} className="align-top">
                              <td className="p-3 pl-4">
                                <div className="flex items-center gap-1.5 font-mono font-medium text-slate-900">
                                  <Barcode className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                                  {item.kode}
                                </div>
                              </td>
                              <td className="p-3 font-medium">{item.nomor_panggil || '-'}</td>
                              <td className="p-3">{item.lokasi_rak || '-'}</td>
                              <td className="p-3 pr-4">
                                <span
                                  className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                                    tersedia
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                      : 'bg-amber-50 text-amber-800 border-amber-300'
                                  }`}
                                >
                                  {item.status || 'Unknown'}
                                </span>

                                {!tersedia && p && (
                                  <div className="mt-2 flex items-start gap-1.5">
                                    <User className="h-3.5 w-3.5 text-blue-600 shrink-0 mt-0.5" />
                                    <div className="min-w-0">
                                      <div className="font-semibold text-slate-900 break-words">{p.nama}</div>
                                      {detailPeminjam && (
                                        <div className="text-xs text-slate-600 break-words">{detailPeminjam}</div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
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