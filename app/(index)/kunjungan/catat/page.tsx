'use client';

import React, { useState } from 'react';
import VisitorForm from '@/components/visitor-form';
import VisitorRanking from '@/components/visitor-ranking';
import MemberProfile from '@/components/MemberProfile'; // Import komponen MemberProfile Anda

export default function CatatKunjunganPage() {
  // State untuk menyimpan UUID anggota yang aktif, sekaligus mengontrol pergantian komponen
  const [activeMemberId, setActiveMemberId] = useState<string | null>(null);
  const [refreshRankKey, setRefreshRankKey] = useState(0);

  const handleFormSuccess = (idAnggota: string) => {
    // Tampilkan komponen profil dengan menyimpan ID anggota yang sukses mengisi form
    setActiveMemberId(idAnggota);
    
    // Memicu re-fetch data pada komponen VisitorRanking agar peringkat langsung ter-update
    setRefreshRankKey(prev => prev + 1);
  };

  const handleBackToForm = () => {
    // Kembalikan ke tampilan Form Buku Tamu dengan me-null-kan ID
    setActiveMemberId(null);
  };

  return (
    <div className="h-screen bg-slate-50 flex flex-col p-0 sm:p-2 overflow-hidden">
      <div className="w-full max-w-none h-full flex flex-col">
        
        {/* Layout Grid Utama */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-stretch flex-1 min-h-0 overflow-y-auto md:overflow-hidden">
          
          {/* KOLOM KIRI: Kondisional render antara Form atau Profil Anggota */}
          <div className="md:col-span-1 h-full min-h-0">
            {!activeMemberId ? (
              <VisitorForm onSuccess={handleFormSuccess} />
            ) : (
              // Menampilkan MemberProfile dengan membawa data UUID dan fungsi kembali
              <MemberProfile memberId={activeMemberId} onBack={handleBackToForm} />
            )}
          </div>

          {/* KOLOM KANAN: Komponen Ranking Pengunjung */}
          <div className="md:col-span-3 h-full p-0 md:overflow-y-auto">
            {/* key digunakan agar komponen ranking me-refresh datanya ketika form sukses dikirim */}
            <VisitorRanking key={refreshRankKey} />
          </div>

        </div>
      </div>
    </div>
  );
}