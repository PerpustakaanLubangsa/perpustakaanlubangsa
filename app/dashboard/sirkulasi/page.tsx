'use client';

import React, { useState } from 'react';
import SmartSearchInput, { MemberResult, BookSearchResult } from './SmartSearchInput';
import ResultCard from './ResultCard';

export default function SirkulasiPage() {
  const [selectedMember, setSelectedMember] = useState<MemberResult | null>(null);
  const [selectedBook, setSelectedBook] = useState<BookSearchResult | null>(null);

  // Tanggal Jatuh Tempo (Contoh: 7 hari ke depan)
  const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const handleReset = () => {
    setSelectedMember(null);
    setSelectedBook(null);
  };

  return (
    <div
      className="relative min-h-screen w-full bg-cover bg-center flex flex-col justify-between p-4 pb-6 select-none"
      style={{ backgroundImage: "url('/bg.png')" }}
    >
      {/* AREA KARTU HASIL (Posisi Tengah - Hanya Tampil Jika Anggota & Buku Sudah Terpilih) */}
      <div className="w-full max-w-2xl mx-auto my-auto z-10 space-y-4">
        {selectedMember && selectedBook && (
          <ResultCard
            member={selectedMember}
            book={selectedBook}
            dueDate={dueDate}
            onRenew={() => alert('Buku berhasil diperpanjang!')}
            onReturn={() => {
              alert('Buku berhasil dikembalikan!');
              handleReset();
            }}
            onReset={handleReset}
          />
        )}
      </div>

      {/* INPUT PENCARIAN OTOMATIS (Satu Input di Bawah Layar) */}
      <div className="w-full max-w-2xl mx-auto z-20 mt-auto">
        <SmartSearchInput
          selectedMember={selectedMember}
          onSelectMember={(member) => {
            setSelectedMember(member);
            if (!member) setSelectedBook(null);
          }}
          onSelectBook={(book) => setSelectedBook(book)}
          disabled={Boolean(selectedMember && selectedBook)} // Nonaktifkan jika transaksi sudah siap/tampil di kartu hasil
        />
      </div>
    </div>
  );
}