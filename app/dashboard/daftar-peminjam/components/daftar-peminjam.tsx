'use client';

import { useCallback, useState } from 'react';
import { Copy, FileSpreadsheet } from 'lucide-react';
import { SUBTITLE, TITLE, type Loan } from '../konfigurasi';
import { ANIMASI_CSS } from '../gaya';
import { usePeminjam } from '../use-peminjam';
import ActionMenu from './action-menu';
import AnimatedWords from './animated-words';
import LoanDetailModal from './loan-detail-modal';
import LoanList from './loan-list';
import StatCards from './stat-cards';

export default function DaftarPeminjam() {
  const p = usePeminjam();

  // Modal detail
  const [selected, setSelected] = useState<Loan | null>(null);
  const closeDetail = useCallback(() => setSelected(null), []);

  if (!p.authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-slate-800 flex flex-col font-sans">
      <style>{ANIMASI_CSS}</style>

      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        {/* Judul halaman */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-white tracking-tight [text-shadow:0_1px_3px_rgba(0,0,0,0.35)]">
              <AnimatedWords text={TITLE} step={70} />
            </h2>
            <p className="text-xs text-white font-medium [text-shadow:0_1px_2px_rgba(0,0,0,0.35)]">
              <AnimatedWords text={SUBTITLE} startDelay={200} step={35} />
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ActionMenu
              label="Salin"
              icon={Copy}
              variant="light"
              busy={p.busyAction === 'copy'}
              disabled={p.busyAction !== null}
              borrowedCount={p.counts.borrowed}
              lateCount={p.counts.late}
              onSelect={(s) => p.runAction('copy', s)}
            />
            <ActionMenu
              label="Ekspor Excel"
              icon={FileSpreadsheet}
              variant="solid"
              busy={p.busyAction === 'excel'}
              disabled={p.busyAction !== null}
              borrowedCount={p.counts.borrowed}
              lateCount={p.counts.late}
              onSelect={(s) => p.runAction('excel', s)}
            />
          </div>
        </div>

        <StatCards counts={p.counts} />

        <LoanList
          scope={p.scope}
          onScopeChange={p.setScope}
          counts={p.counts}
          query={p.query}
          onQueryChange={p.setQuery}
          hasSearch={p.hasSearch}
          rows={p.rows}
          total={p.total}
          hasMore={p.hasMore}
          loading={p.loading}
          loadingMore={p.loadingMore}
          error={p.error}
          moreError={p.moreError}
          onRefresh={p.refresh}
          onLoadMore={p.loadMore}
          onSelect={setSelected}
        />
      </main>

      {/* Modal detail peminjam */}
      {selected && <LoanDetailModal loan={selected} onClose={closeDetail} />}

      {/* Notifikasi salin / ekspor */}
      {p.notice && (
        <div
          role="status"
          className={`fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl text-xs font-bold shadow-lg border bg-white ${
            p.notice.type === 'ok' ? 'text-blue-700 border-blue-200' : 'text-red-600 border-red-200'
          }`}
        >
          {p.notice.text}
        </div>
      )}
    </div>
  );
}