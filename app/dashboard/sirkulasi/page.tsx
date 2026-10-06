'use client';

import React, { useState, useEffect } from 'react';
import SmartSearchInput, { MemberResult, BookSearchResult } from './SmartSearchInput';
import ResultCard from './ResultCard';
import { supabase } from '@/lib/supabase';

// Helper untuk menambah hari
const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

// Helper untuk format YYYY-MM-DD
const formatDateToISO = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function SirkulasiPage() {
  const [selectedMember, setSelectedMember] = useState<MemberResult | null>(null);
  const [selectedBook, setSelectedBook] = useState<BookSearchResult | null>(null);
  const [activeTransactionId, setActiveTransactionId] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Default jatuh tempo: +5 hari dari hari ini (contoh: Tgl 10 -> Tgl 15)
  const [dueDateObj, setDueDateObj] = useState<Date>(() => addDays(new Date(), 5));

  const dueDateFormatted = dueDateObj.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const handleReset = () => {
    setSelectedMember(null);
    setSelectedBook(null);
    setActiveTransactionId(null);
    setDueDateObj(addDays(new Date(), 5));
  };

  // Otomatis Simpan (INSERT) Peminjaman Baru atau Muat Transaksi Aktif
  useEffect(() => {
    async function processTransaction() {
      if (!selectedMember || !selectedBook) return;

      // Jika transaksi sudah tercatat/termuat, hindari re-insert
      if (activeTransactionId) return;

      setLoading(true);

      try {
        // Cek apakah ini transaksi pinjaman yang sudah ada di database
        const { data: existingLoan } = await supabase
          .from('sirkulasi')
          .select('id, tgl_kembali')
          .eq('nis', selectedMember.nis)
          .eq('kode_eksemplar', selectedBook.barcode)
          .eq('status', 'DIPINJAM')
          .maybeSingle();

        if (existingLoan) {
          // Jika transaksi aktif ditemukan, muat ID transaksi dan tanggal kembalinya
          setActiveTransactionId(existingLoan.id);
          if (existingLoan.tgl_kembali) {
            setDueDateObj(new Date(existingLoan.tgl_kembali));
          }
          setLoading(false);
          return;
        }

        // --- PEMINJAMAN BARU (INSERT) ---
        const today = new Date();
        const calculatedDueDate = addDays(today, 5); // Tgl 10 + 5 hari = Tgl 15
        setDueDateObj(calculatedDueDate);

        const tglPinjamStr = formatDateToISO(today);
        const tglKembaliStr = formatDateToISO(calculatedDueDate);

        // Ambil biblio_id dari tabel eksemplar
        let validBiblioId: string | null = null;
        const { data: eksemplarData } = await supabase
          .from('eksemplar')
          .select('biblio_id')
          .eq('kode', selectedBook.barcode)
          .maybeSingle();

        if (eksemplarData && eksemplarData.biblio_id) {
          validBiblioId = eksemplarData.biblio_id;
        }

        const payload: Record<string, any> = {
          nis: selectedMember.nis,
          nama_anggota: selectedMember.nama,
          kode_eksemplar: selectedBook.barcode,
          judul_buku: selectedBook.title,
          penulis: selectedBook.author || null,
          kamar: selectedMember.kamar || null,
          tgl_pinjam: tglPinjamStr,
          tgl_kembali: tglKembaliStr,
          status: 'DIPINJAM',
        };

        if (selectedMember.id) payload.member_id = selectedMember.id;
        if (validBiblioId) payload.biblio_id = validBiblioId;

        // 1. Simpan ke tabel sirkulasi
        const { data: insertData, error: insertError } = await supabase
          .from('sirkulasi')
          .insert([payload])
          .select('id')
          .single();

        if (insertError) throw insertError;

        if (insertData) {
          setActiveTransactionId(insertData.id);

          // 2. Update status eksemplar buku menjadi 'Dipinjam'
          await supabase
            .from('eksemplar')
            .update({ status: 'Dipinjam' })
            .eq('kode', selectedBook.barcode);
        }
      } catch (err: any) {
        console.error('Error proses peminjaman:', err);
        alert('Gagal mencatat peminjaman: ' + (err?.message || err));
      } finally {
        setLoading(false);
      }
    }

    processTransaction();
  }, [selectedMember, selectedBook, activeTransactionId]);

  // Handler PERPANJANG BUKU (+5 Hari dari Tempo Saat Ini)
  const handleRenew = async () => {
    if (!activeTransactionId) {
      alert('Tidak ada transaksi aktif yang dapat diperpanjang.');
      return;
    }

    setLoading(true);

    try {
      const newDueDate = addDays(dueDateObj, 5);
      const newDueDateStr = formatDateToISO(newDueDate);

      const { error } = await supabase
        .from('sirkulasi')
        .update({ tgl_kembali: newDueDateStr })
        .eq('id', activeTransactionId);

      if (error) throw error;

      setDueDateObj(newDueDate);
      alert('Peminjaman buku berhasil diperpanjang!');
    } catch (err: any) {
      console.error('Error perpanjang:', err);
      alert('Gagal memperpanjang peminjaman: ' + (err?.message || err));
    } finally {
      setLoading(false);
    }
  };

  // Handler PENGEMBALIAN BUKU
  const handleReturn = async () => {
    if (!activeTransactionId || !selectedBook) {
      alert('Tidak ada transaksi aktif untuk dikembalikan.');
      return;
    }

    setLoading(true);

    try {
      // 1. Ubah status sirkulasi menjadi 'KEMBALI'
      const { error: sirkulasiError } = await supabase
        .from('sirkulasi')
        .update({ status: 'KEMBALI' })
        .eq('id', activeTransactionId);

      if (sirkulasiError) throw sirkulasiError;

      // 2. Ubah status eksemplar buku kembali menjadi 'Tersedia'
      const { error: eksemplarError } = await supabase
        .from('eksemplar')
        .update({ status: 'Tersedia' })
        .eq('kode', selectedBook.barcode);

      if (eksemplarError) {
        console.warn('Status sirkulasi terupdate, tetapi gagal mengupdate status eksemplar:', eksemplarError);
      }

      alert('Buku berhasil dikembalikan!');
      handleReset();
    } catch (err: any) {
      console.error('Error pengembalian:', err);
      alert('Gagal memproses pengembalian: ' + (err?.message || err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="relative min-h-screen w-full bg-cover bg-center flex flex-col justify-between p-4 pb-6 select-none"
      style={{ backgroundImage: "url('/bg.png')" }}
    >
      {/* AREA KARTU HASIL (Posisi Tengah - Tampil jika Anggota & Buku terpilih) */}
      <div className="w-full max-w-2xl mx-auto my-auto z-10 space-y-4">
        {selectedMember && selectedBook && (
          <ResultCard
            member={selectedMember}
            book={selectedBook}
            dueDate={dueDateFormatted}
            onRenew={handleRenew}
            onReturn={handleReturn}
            onReset={handleReset}
          />
        )}
      </div>

      {/* INPUT PENCARIAN OTOMATIS */}
      <div className="w-full max-w-2xl mx-auto z-20 mt-auto">
        <SmartSearchInput
          selectedMember={selectedMember}
          onSelectMember={(member) => {
            setSelectedMember(member);
            if (!member) handleReset();
          }}
          onSelectBook={(book) => setSelectedBook(book)}
          disabled={loading}
        />
      </div>
    </div>
  );
}