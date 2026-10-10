'use client';

import React, { useEffect, useRef } from 'react';
import { BookMarked, X } from 'lucide-react';
import { FINE_PER_DAY, dateFormatter, rupiah, type Loan } from '../konfigurasi';
import { initials } from '../helper';
import { tombolUtama } from '../gaya';
import StatusBadge from './status-badge';

function DetailItem({
  label,
  children,
  full = false,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={full ? 'col-span-2' : ''}>
      <dt className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{label}</dt>
      <dd className="mt-0.5 text-xs font-bold text-slate-900 break-words">{children}</dd>
    </div>
  );
}

export default function LoanDetailModal({ loan, onClose }: { loan: Loan; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const late = loan.hariTerlambat > 0;

  useEffect(() => {
    closeRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);

    // Kunci scroll halaman selama modal terbuka
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Detail peminjam ${loan.nama}`}
        className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center gap-3 p-5 border-b border-slate-200">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white text-xs font-black flex items-center justify-center shrink-0">
            {initials(loan.nama)}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-black text-slate-900 truncate">{loan.nama}</h3>
            <p className="text-[11px] text-slate-500 font-medium truncate">
              {loan.nis} • Kamar {loan.kamar}
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Isi */}
        <div className="p-5 space-y-4">
          <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-100 rounded-xl">
            <BookMarked className="w-4 h-4 mt-0.5 text-blue-600 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-black text-slate-900 break-words">{loan.judul}</p>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                {loan.penulis || 'Penulis tidak tercatat'}
              </p>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
            <DetailItem label="Kode Eksemplar">{loan.kode}</DetailItem>
            <DetailItem label="Kamar">{loan.kamar}</DetailItem>
            <DetailItem label="Tanggal Pinjam">{dateFormatter.format(loan.tglPinjam)}</DetailItem>
            <DetailItem label="Batas Kembali">{dateFormatter.format(loan.jatuhTempo)}</DetailItem>
            <DetailItem label="Status">
              <StatusBadge loan={loan} />
            </DetailItem>
            <DetailItem label="Denda">{late ? rupiah(loan.denda) : 'Belum ada denda'}</DetailItem>
          </dl>

          {late && (
            <p className="text-[11px] text-slate-500 font-medium">
              {loan.hariTerlambat} hari × {rupiah(FINE_PER_DAY)} = {rupiah(loan.denda)}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button type="button" onClick={onClose} className={tombolUtama}>
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}