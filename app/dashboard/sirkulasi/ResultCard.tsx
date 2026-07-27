'use client';

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { library } from '@fortawesome/fontawesome-svg-core';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { MemberResult, BookSearchResult } from './SmartSearchInput';

library.add(fas);

interface ResultCardProps {
  member: MemberResult;
  book: BookSearchResult;
  dueDate: string;
  onRenew: () => void;
  onReturn: () => void;
  onReset: () => void;
}

export default function ResultCard({ member, book, dueDate, onRenew, onReturn, onReset }: ResultCardProps) {
  return (
    <div className="bg-slate-900/90 border border-cyan-500/30 rounded-2xl p-4 shadow-2xl space-y-4 animate-fade-in">
      {/* Header Info */}
      <div className="flex justify-between items-center border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2 text-cyan-400 font-extrabold text-xs uppercase tracking-wider">
          <FontAwesomeIcon icon={['fas', 'receipt']} />
          <span>Detail Transaksi Sirkulasi</span>
        </div>
        <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
          Status: Active
        </span>
      </div>

      {/* Ringkasan Peminjam & Buku */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        {/* Peminjam */}
        <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 flex items-start gap-3">
          {member.foto ? (
            <img src={member.foto} alt={member.nama} className="w-9 h-9 rounded-full object-cover border border-cyan-500/30 mt-0.5" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 text-xs shrink-0 mt-0.5">
              <FontAwesomeIcon icon={['fas', 'user']} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">Peminjam</p>
            <p className="font-bold text-slate-100 truncate">{member.nama}</p>
            <p className="text-[10px] text-cyan-400 font-mono">
              NIS: {member.nis} {member.jenjang ? `• ${member.jenjang}` : ''}
            </p>
            {(member.organisasi || member.kamar) && (
              <p className="text-[9px] text-slate-400 mt-0.5 truncate">
                {member.organisasi ? `Org: ${member.organisasi}` : ''} {member.kamar ? `• Kamar: ${member.kamar}` : ''}
              </p>
            )}
          </div>
        </div>

        {/* Buku */}
        <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 flex flex-col justify-between">
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">Buku / Eksemplar</p>
            <p className="font-bold text-slate-100 line-clamp-1">{book.title}</p>
            <p className="text-[10px] text-cyan-400 font-mono">
              Kode: {book.barcode} • {book.author}
            </p>
          </div>
          {book.lokasi_rak && (
            <p className="text-[9px] text-slate-400 mt-1">
              Lokasi Rak: <span className="text-slate-200 font-medium">{book.lokasi_rak}</span>
            </p>
          )}
        </div>
      </div>

      {/* Tanggal Jatuh Tempo */}
      <div className="bg-cyan-950/30 border border-cyan-500/20 rounded-xl p-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-300 text-xs">
          <FontAwesomeIcon icon={['fas', 'calendar-days']} className="text-cyan-400" />
          <span>Jatuh Tempo:</span>
        </div>
        <span className="text-xs font-black text-cyan-300 font-mono bg-cyan-900/40 px-2.5 py-1 rounded-lg border border-cyan-500/30">
          {dueDate}
        </span>
      </div>

      {/* Tombol Aksi */}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={onRenew}
          className="flex-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 font-bold text-xs py-2 rounded-xl transition-all flex items-center justify-center gap-1.5"
        >
          <FontAwesomeIcon icon={['fas', 'rotate-right']} className="text-[10px]" />
          Perpanjang
        </button>

        <button
          onClick={onReturn}
          className="flex-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-xs py-2 rounded-xl transition-all flex items-center justify-center gap-1.5"
        >
          <FontAwesomeIcon icon={['fas', 'box-archive']} className="text-[10px]" />
          Kembalikan
        </button>

        <button
          onClick={onReset}
          className="px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs py-2 rounded-xl transition-all"
          title="Transaksi Baru"
        >
          Selesai
        </button>
      </div>
    </div>
  );
}