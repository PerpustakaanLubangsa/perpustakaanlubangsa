'use client';

import { AlertTriangle, BookMarked, CheckCircle2, ChevronDown, Inbox, RefreshCw, Search, X } from 'lucide-react';
import type { Counts, Loan, Scope } from '../konfigurasi';
import { initials } from '../helper';
import { BADGE, CARD, tombolKecil, tombolSekunder, tombolUtama } from '../gaya';
import SkeletonRow from './skeleton-row';
import StatusBadge from './status-badge';

interface LoanListProps {
  scope: Scope;
  onScopeChange: (s: Scope) => void;
  counts: Counts;
  query: string;
  onQueryChange: (q: string) => void;
  hasSearch: boolean;
  rows: Loan[];
  total: number;
  hasMore: boolean;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  moreError: string | null;
  onRefresh: () => void;
  onLoadMore: () => void;
  onSelect: (loan: Loan) => void;
}

export default function LoanList({
  scope,
  onScopeChange,
  counts,
  query,
  onQueryChange,
  hasSearch,
  rows,
  total,
  hasMore,
  loading,
  loadingMore,
  error,
  moreError,
  onRefresh,
  onLoadMore,
  onSelect,
}: LoanListProps) {
  return (
    <div className={`${CARD} rounded-2xl overflow-hidden`}>
      {/* Header: judul, filter, pencarian, muat ulang */}
      <div className="p-5 space-y-4 border-b border-slate-200">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
              {scope === 'late' ? 'Peminjam Terlambat' : 'Semua Peminjam'}
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              Klik nama peminjam untuk melihat detail lengkap
            </p>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            aria-label="Muat ulang data"
            className={`${tombolSekunder} ${tombolKecil}`}
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            Muat Ulang
          </button>
        </div>

        {/* Filter: semua / terlambat saja */}
        <div
          role="group"
          aria-label="Filter peminjam"
          className="inline-flex p-1 bg-blue-50 border border-blue-100 rounded-xl"
        >
          {(
            [
              { value: 'all', label: 'Semua', count: counts.borrowed },
              { value: 'late', label: 'Terlambat', count: counts.late },
            ] as { value: Scope; label: string; count: number | null }[]
          ).map((opt) => {
            const active = scope === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onScopeChange(opt.value)}
                aria-pressed={active}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[11px] font-extrabold uppercase tracking-wider transition-colors cursor-pointer ${
                  active ? 'bg-blue-600 text-white shadow-sm' : 'text-blue-700 hover:bg-white'
                }`}
              >
                {opt.label}
                <span
                  className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${
                    active ? 'bg-blue-500 text-white' : 'bg-white text-blue-600'
                  }`}
                >
                  {opt.count === null ? '–' : opt.count.toLocaleString('id-ID')}
                </span>
              </button>
            );
          })}
        </div>

        {/* Kotak pencarian */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-600 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Cari nama, NIS, kamar, judul, atau kode buku..."
            aria-label="Cari peminjam"
            className="block w-full pl-9 pr-9 py-2.5 text-base sm:text-sm bg-blue-50 border border-blue-100 rounded-xl text-slate-900 placeholder-slate-500 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition-colors"
          />
          {query && (
            <button
              type="button"
              onClick={() => onQueryChange('')}
              aria-label="Hapus pencarian"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-700 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Judul kolom (desktop) */}
      <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-2.5 bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-wider">
        <span className="col-span-5">Peminjam</span>
        <span className="col-span-4">Buku</span>
        <span className="col-span-3 text-right">Status</span>
      </div>

      {/* Isi daftar */}
      <div className="divide-y divide-slate-200" aria-busy={loading}>
        {loading ? (
          <>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </>
        ) : error ? (
          <div role="alert" className="px-5 py-12 flex flex-col items-center text-center gap-3">
            <div className={`w-12 h-12 ${BADGE} rounded-xl flex items-center justify-center`}>
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-black text-slate-900">Gagal memuat data</p>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">{error}</p>
            </div>
            <button type="button" onClick={onRefresh} className={tombolUtama}>
              Coba Lagi
            </button>
          </div>
        ) : rows.length === 0 ? (
          <div className="px-5 py-12 flex flex-col items-center text-center gap-3">
            <div className={`w-12 h-12 ${BADGE} rounded-xl flex items-center justify-center`}>
              {hasSearch ? <Inbox className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
            </div>
            <div>
              <p className="text-sm font-black text-slate-900">
                {hasSearch
                  ? 'Tidak ada data yang cocok'
                  : scope === 'late'
                    ? 'Tidak ada keterlambatan'
                    : 'Tidak ada peminjam aktif'}
              </p>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                {hasSearch
                  ? 'Coba ubah kata kunci pencarian.'
                  : scope === 'late'
                    ? 'Semua buku yang dipinjam masih dalam batas waktu atau sudah dikembalikan.'
                    : 'Semua buku sudah dikembalikan.'}
              </p>
            </div>
          </div>
        ) : (
          rows.map((loan) => (
            <div
              key={loan.id}
              className="px-5 py-3 grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 md:items-center hover:bg-blue-50 transition-colors"
            >
              {/* Peminjam: klik nama untuk detail */}
              <div className="md:col-span-5 flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white text-[11px] font-black flex items-center justify-center shrink-0">
                  {initials(loan.nama)}
                </div>
                <div className="min-w-0">
                  <button
                    type="button"
                    onClick={() => onSelect(loan)}
                    title="Lihat detail"
                    className="block max-w-full text-left text-xs font-black text-slate-900 hover:text-blue-700 hover:underline underline-offset-2 truncate cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
                  >
                    {loan.nama}
                  </button>
                  <span className="text-[11px] text-slate-500 font-medium block truncate">
                    Kamar {loan.kamar}
                  </span>
                </div>
              </div>

              {/* Buku */}
              <div className="md:col-span-4 flex items-center gap-2 min-w-0">
                <BookMarked className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span className="text-[11px] font-bold text-slate-800 truncate">{loan.judul}</span>
              </div>

              {/* Status */}
              <div className="md:col-span-3 flex md:justify-end">
                <StatusBadge loan={loan} />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Muat lebih banyak */}
      {!loading && !error && rows.length > 0 && (
        <div className="px-5 py-4 flex flex-col items-center gap-2.5 border-t border-slate-200 bg-slate-50">
          <span className="text-[11px] text-slate-500 font-medium">
            Menampilkan {rows.length.toLocaleString('id-ID')} dari {total.toLocaleString('id-ID')}
          </span>

          {moreError && (
            <span role="alert" className="text-[11px] text-red-600 font-medium">
              {moreError}
            </span>
          )}

          {hasMore && (
            <button type="button" onClick={onLoadMore} disabled={loadingMore} className={tombolSekunder}>
              {loadingMore ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
              {loadingMore
                ? 'Memuat...'
                : `Muat Lebih Banyak (${Math.max(0, total - rows.length).toLocaleString('id-ID')} lagi)`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}