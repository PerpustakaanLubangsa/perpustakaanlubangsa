'use client';

import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { library } from '@fortawesome/fontawesome-svg-core';
import { fas } from '@fortawesome/free-solid-svg-icons';

library.add(fas);

interface CartItem {
  id: string;
  barcode: string;
  title: string;
  author: string;
  category: string;
}

export default function SirkulasiPage() {
  const [activeTab, setActiveTab] = useState<'pinjam' | 'kembali'>('pinjam');

  // State Peminjaman
  const [memberId, setMemberId] = useState('');
  const [bookBarcode, setBookBarcode] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [memberInfo, setMemberInfo] = useState<{ name: string; status: string; maxLimit: number } | null>(null);

  // State Pengembalian
  const [returnBarcode, setReturnBarcode] = useState('');
  const [returnResult, setReturnResult] = useState<any | null>(null);

  // Simulation: Cari/Set Member
  const handleCheckMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberId) return;
    // Dummy response - Integrasikan dengan Supabase/API Anda
    setMemberInfo({
      name: 'Ahmad Fauzi',
      status: 'Aktif (Santri)',
      maxLimit: 3,
    });
  };

  // Simulation: Tambah Buku ke Keranjang Pinjam
  const handleAddBookToCart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookBarcode) return;

    if (cart.length >= (memberInfo?.maxLimit || 3)) {
      alert('Batas maksimal peminjaman telah tercapai!');
      return;
    }

    const newItem: CartItem = {
      id: Date.now().toString(),
      barcode: bookBarcode,
      title: `Buku sampel #${bookBarcode}`,
      author: 'Penulis Contoh',
      category: 'Literatur Agama',
    };

    setCart([...cart, newItem]);
    setBookBarcode('');
  };

  const handleRemoveFromCart = (id: string) => {
    setCart(cart.filter((item) => item.id !== id));
  };

  // Simulation: Proses Pengembalian Buku
  const handleProcessReturn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnBarcode) return;

    // Dummy response data pengembalian
    setReturnResult({
      barcode: returnBarcode,
      title: 'Fiqih Syafi\'i Al-Jilid 1',
      borrower: 'Ahmad Fauzi',
      borrowDate: '2026-07-10',
      dueDate: '2026-07-17',
      returnDate: '2026-07-23',
      lateDays: 6,
      fineAmount: 6000, // Rp 1.000 / hari
    });
    setReturnBarcode('');
  };

  return (
    <div className="min-h-screen bg-[#0b0c10] text-slate-100 p-6 space-y-6">
      
      {/* HEADER HALAMAN */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-slate-100 flex items-center gap-3">
            <FontAwesomeIcon icon={['fas', 'retweet']} className="text-cyan-400 w-6 h-6" />
            Sirkulasi Perpustakaan
          </h1>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1">
            Layanan Peminjaman, Pengembalian, dan Perpanjangan Buku
          </p>
        </div>

        {/* TAB NAVIGASI UTAMA */}
        <div className="flex bg-slate-950 p-1 rounded-xl shrink-0">
          <button
            onClick={() => setActiveTab('pinjam')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-extrabold uppercase tracking-wider transition-all duration-150 ${
              activeTab === 'pinjam'
                ? 'bg-cyan-500/10 text-cyan-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FontAwesomeIcon icon={['fas', 'hand-holding-hand']} className="w-3.5 h-3.5" />
            Peminjaman
          </button>
          <button
            onClick={() => setActiveTab('kembali')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-extrabold uppercase tracking-wider transition-all duration-150 ${
              activeTab === 'kembali'
                ? 'bg-cyan-500/10 text-cyan-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FontAwesomeIcon icon={['fas', 'box-archive']} className="w-3.5 h-3.5" />
            Pengembalian
          </button>
        </div>
      </div>

      {/* TAB CONTENT: PEMINJAMAN */}
      {activeTab === 'pinjam' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* KOLOM KIRI: FORM ANGGOTA & INPUT BARCODE */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* CARD 1: INFORMASI ANGGOTA */}
            <div className="bg-slate-950 p-5 rounded-2xl space-y-4">
              <h2 className="text-xs font-extrabold text-cyan-400 uppercase tracking-widest flex items-center gap-2">
                <FontAwesomeIcon icon={['fas', 'id-card']} className="w-3.5 h-3.5" />
                Data Peminjam
              </h2>

              <form onSubmit={handleCheckMember} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Scan/Masukkan ID Anggota (NIM/NIS)..."
                  value={memberId}
                  onChange={(e) => setMemberId(e.target.value)}
                  className="flex-1 h-10 px-3.5 bg-slate-900 text-xs font-medium text-slate-100 placeholder-slate-500 rounded-xl outline-none focus:bg-slate-800 transition-colors"
                />
                <button
                  type="submit"
                  className="px-4 bg-slate-900 hover:bg-slate-800 text-cyan-400 font-bold text-xs rounded-xl transition-colors shrink-0"
                >
                  Cari
                </button>
              </form>

              {memberInfo ? (
                <div className="bg-slate-900 p-4 rounded-xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-bold text-slate-400">Nama Pustakawan/Santri:</span>
                    <span className="text-xs font-black text-slate-100">{memberInfo.name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-bold text-slate-400">Status Keanggotaan:</span>
                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded-md">
                      {memberInfo.status}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-bold text-slate-400">Limit Pinjam Sisa:</span>
                    <span className="text-xs font-black text-cyan-400">{memberInfo.maxLimit - cart.length} Buku</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-xs text-slate-500 font-medium">
                  Silakan masukkan ID Anggota terlebih dahulu untuk memproses peminjaman.
                </div>
              )}
            </div>

            {/* CARD 2: INPUT BARCODE BUKU */}
            <div className={`bg-slate-950 p-5 rounded-2xl space-y-4 ${!memberInfo ? 'opacity-50 pointer-events-none' : ''}`}>
              <h2 className="text-xs font-extrabold text-cyan-400 uppercase tracking-widest flex items-center gap-2">
                <FontAwesomeIcon icon={['fas', 'barcode']} className="w-3.5 h-3.5" />
                Scan Kode Buku
              </h2>

              <form onSubmit={handleAddBookToCart} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Scan/Ketik Barcode Buku..."
                  value={bookBarcode}
                  onChange={(e) => setBookBarcode(e.target.value)}
                  className="flex-1 h-10 px-3.5 bg-slate-900 text-xs font-medium text-slate-100 placeholder-slate-500 rounded-xl outline-none focus:bg-slate-800 transition-colors"
                />
                <button
                  type="submit"
                  className="px-4 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 font-bold text-xs rounded-xl transition-colors shrink-0"
                >
                  Tambah
                </button>
              </form>
            </div>

          </div>

          {/* KOLOM KANAN: DAFTAR PINJAMAN & KONFIRMASI */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-slate-950 p-5 rounded-2xl flex flex-col justify-between min-h-[420px]">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-extrabold text-cyan-400 uppercase tracking-widest flex items-center gap-2">
                    <FontAwesomeIcon icon={['fas', 'list-check']} className="w-3.5 h-3.5" />
                    Daftar Item Dipinjam ({cart.length})
                  </h2>
                  {cart.length > 0 && (
                    <button
                      onClick={() => setCart([])}
                      className="text-[10px] font-bold text-rose-400 hover:text-rose-300 uppercase tracking-wider"
                    >
                      Kosongkan Keranjang
                    </button>
                  )}
                </div>

                {cart.length > 0 ? (
                  <div className="space-y-2">
                    {cart.map((item, idx) => (
                      <div
                        key={item.id}
                        className="bg-slate-900 p-3.5 rounded-xl flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-lg bg-slate-950 text-cyan-400 flex items-center justify-center text-[10px] font-black">
                            {idx + 1}
                          </span>
                          <div>
                            <h3 className="text-xs font-bold text-slate-100">{item.title}</h3>
                            <p className="text-[10px] text-slate-500 font-medium">
                              Barcode: {item.barcode} • {item.category}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => handleRemoveFromCart(item.id)}
                          className="w-8 h-8 rounded-lg bg-slate-950 hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 flex items-center justify-center transition-colors"
                        >
                          <FontAwesomeIcon icon={['fas', 'trash-can']} className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16 text-xs text-slate-500 font-medium">
                    Belum ada buku yang dimasukkan ke dalam antrean pinjam.
                  </div>
                )}
              </div>

              {/* FOOTER TRANSAKSI */}
              <div className="pt-6 mt-6 bg-slate-900/50 -mx-5 -mb-5 p-5 rounded-b-2xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
                  <div className="text-slate-400">
                    Masa Peminjaman: <span className="text-slate-100 font-bold">7 Hari</span>
                  </div>
                  <div className="text-slate-400">
                    Jatuh Tempo Kembali: <span className="text-cyan-400 font-bold">30 Juli 2026</span>
                  </div>
                </div>

                <button
                  disabled={cart.length === 0 || !memberInfo}
                  onClick={() => alert('Transaksi peminjaman berhasil disimpan!')}
                  className="w-full py-3 bg-cyan-500/10 hover:bg-cyan-500/20 disabled:bg-slate-900 disabled:text-slate-600 text-cyan-400 font-black text-xs uppercase tracking-widest rounded-xl transition-all duration-150 flex items-center justify-center gap-2"
                >
                  <FontAwesomeIcon icon={['fas', 'check-double']} className="w-4 h-4" />
                  Konfirmasi Peminjaman
                </button>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* TAB CONTENT: PENGEMBALIAN */}
      {activeTab === 'kembali' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* INPUT SCANNER PENGEMBALIAN */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-slate-950 p-5 rounded-2xl space-y-4">
              <h2 className="text-xs font-extrabold text-cyan-400 uppercase tracking-widest flex items-center gap-2">
                <FontAwesomeIcon icon={['fas', 'qrcode']} className="w-3.5 h-3.5" />
                Scan Pengembalian Buku
              </h2>

              <form onSubmit={handleProcessReturn} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Scan Kode / Barcode Buku..."
                  value={returnBarcode}
                  onChange={(e) => setReturnBarcode(e.target.value)}
                  className="flex-1 h-10 px-3.5 bg-slate-900 text-xs font-medium text-slate-100 placeholder-slate-500 rounded-xl outline-none focus:bg-slate-800 transition-colors"
                />
                <button
                  type="submit"
                  className="px-4 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 font-bold text-xs rounded-xl transition-colors shrink-0"
                >
                  Proses
                </button>
              </form>
              <p className="text-[10px] text-slate-500 font-medium">
                Arahkan scanner barcode ke buku atau ketikkan kode buku secara manual.
              </p>
            </div>
          </div>

          {/* DETAIL HASIL PENGEMBALIAN */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-slate-950 p-5 rounded-2xl flex flex-col justify-between min-h-[300px]">
              {returnResult ? (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xs font-extrabold text-cyan-400 uppercase tracking-widest flex items-center gap-2">
                      <FontAwesomeIcon icon={['fas', 'receipt']} className="w-3.5 h-3.5" />
                      Detail Pengembalian
                    </h2>
                    <span className="text-[10px] font-extrabold text-emerald-400 uppercase bg-emerald-500/10 px-2.5 py-1 rounded-md">
                      Buku Ditemukan
                    </span>
                  </div>

                  <div className="bg-slate-900 p-4 rounded-xl space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-400 font-medium">Judul Buku:</span>
                      <span className="text-xs font-bold text-slate-100">{returnResult.title}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-400 font-medium">Peminjam:</span>
                      <span className="text-xs font-bold text-slate-100">{returnResult.borrower}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-400 font-medium">Tanggal Pinjam:</span>
                      <span className="text-xs font-bold text-slate-100">{returnResult.borrowDate}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-400 font-medium">Tgl Jatuh Tempo:</span>
                      <span className="text-xs font-bold text-slate-100">{returnResult.dueDate}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-400 font-medium">Keterlambatan:</span>
                      <span className="text-xs font-black text-rose-400">{returnResult.lateDays} Hari</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-slate-800/0">
                      <span className="text-xs text-slate-400 font-medium">Denda Keterlambatan:</span>
                      <span className="text-sm font-black text-rose-400">
                        Rp {returnResult.fineAmount.toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => alert('Selesai dan Simpan!')}
                      className="flex-1 py-3 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 font-black text-xs uppercase tracking-widest rounded-xl transition-all"
                    >
                      Selesaikan Pengembalian
                    </button>
                    <button
                      onClick={() => alert('Buku diperpanjang 7 hari!')}
                      className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-slate-200 font-black text-xs uppercase tracking-widest rounded-xl transition-all"
                    >
                      Perpanjang
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center space-y-2">
                  <FontAwesomeIcon icon={['fas', 'arrow-left-long']} className="w-6 h-6 text-slate-600 mb-2" />
                  <p className="text-xs text-slate-500 font-medium">
                    Belum ada barcode buku yang diproses.
                  </p>
                </div>
              )}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}