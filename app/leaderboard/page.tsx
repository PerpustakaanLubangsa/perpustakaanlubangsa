'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, RefreshCw, Search, Loader2, ChevronDown } from 'lucide-react';
// Sesuaikan path import ini dengan lokasi file modal Anda
import VisitorProfileModal, { ProfileTarget } from './components/VisitorProfileModal';
import { detectLite } from './components/vp-types';
import { FILTERS, PAGE_SIZE, VIEW, fmt, type Item, type JenjangKey } from './components2/lb-types';
import { LB_CSS } from './components2/lb-styles';
import { useLeaderboard } from './components2/lb-data';
import Sidebar from './components2/lb-sidebar';
import { Podium } from './components2/lb-podium';
import { RankRow, RowSkeleton, PageSkeleton } from './components2/lb-row';

export default function LeaderboardPage() {
  const [jenjang, setJenjang] = useState<JenjangKey>('Semua');
  const [input, setInput] = useState('');
  const [profileTarget, setProfileTarget] = useState<ProfileTarget | null>(null);
  const [lite, setLite] = useState(false);

  const { search, items, total, loading, loadingMore, errorMsg, moreError, stats, loadMore, retry } =
    useLeaderboard(jenjang, input);

  useEffect(() => {
    setLite(detectLite());
  }, []);

  const openProfile = useCallback((a: Item) => {
    setProfileTarget({ id: a.id, nama: a.nama });
  }, []);

  /* ---------- turunan ---------- */
  const searching = search.length > 0;
  const top3 = searching ? [] : items.slice(0, 3);
  const listItems = searching ? items : items.slice(3);
  const maxPoin = stats?.maxPoin || items[0]?.total_poin || 0;
  const hasMore =
    total !== null
      ? items.length < total
      : items.length > 0 && items.length % PAGE_SIZE === 0;
  const remaining = total !== null ? Math.max(0, total - items.length) : 0;
  const activeLabel = FILTERS.find((f) => f.key === jenjang)?.label ?? FILTERS[0].label;

  return (
    <div
      data-lite={lite ? 'true' : 'false'}
      className="min-h-screen min-w-[1180px] bg-[#f7f8fa] text-slate-800"
    >
      <style>{LB_CSS}</style>

      <div className="grid grid-cols-[340px_minmax(0,1fr)]">
        {/* ================= SIDEBAR ================= */}
        <Sidebar
          input={input}
          onInput={setInput}
          jenjang={jenjang}
          onJenjang={setJenjang}
          stats={stats}
          lite={lite}
        />

        {/* ================= KONTEN ================= */}
        <main className="min-w-0 px-12 py-10">
          <div className="mx-auto max-w-[1180px]">
            <header className="mb-8 flex items-end justify-between gap-6">
              <div className="lb-slide">
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-blue-600">{activeLabel}</p>
                <h2 className="mt-1 text-4xl font-black tracking-tight text-slate-900">
                  {searching ? 'Hasil Pencarian' : 'Peringkat Teratas'}
                </h2>
                {searching && (
                  <p className="mt-1 text-sm text-slate-500">
                    Kata kunci: <span className="font-bold text-blue-700">&ldquo;{search}&rdquo;</span>
                  </p>
                )}
              </div>
              {!loading && !errorMsg && total !== null && (
                <p className="text-sm font-medium text-slate-500" aria-live="polite">
                  Menampilkan <span className="font-bold text-slate-800">{fmt(items.length)}</span> dari{' '}
                  <span className="font-bold text-slate-800">{fmt(total)}</span> anggota
                </p>
              )}
            </header>

            {loading ? (
              <PageSkeleton />
            ) : errorMsg ? (
              <div
                role="alert"
                className="flex flex-col items-center rounded-3xl border border-blue-200 bg-blue-50 px-8 py-14 text-center"
              >
                <AlertCircle className="h-10 w-10 text-blue-600" />
                <p className="mt-4 text-base font-bold text-blue-900">{errorMsg}</p>
                <p className="mt-1 text-sm text-blue-700">
                  Pastikan view <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs">{VIEW}</code>{' '}
                  sudah dibuat di Supabase.
                </p>
                <button
                  type="button"
                  onClick={retry}
                  className="mt-6 flex cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition-transform duration-200 hover:-translate-y-0.5 hover:bg-blue-700 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Coba lagi
                </button>
              </div>
            ) : items.length === 0 ? (
              <div className="lb-pop flex flex-col items-center rounded-3xl border border-blue-100 bg-white px-8 py-20 text-center">
                <Search className="h-12 w-12 text-blue-300" />
                <p className="mt-4 text-base font-bold text-slate-800">
                  {searching ? 'Nama atau NIS tidak ditemukan.' : 'Belum ada data peringkat.'}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {searching ? 'Coba kata kunci lain atau ganti jenjang.' : 'Data akan muncul setelah ada kunjungan.'}
                </p>
              </div>
            ) : (
              <>
                {!searching && top3.length > 0 && <Podium top={top3} lite={lite} onOpen={openProfile} />}

                {listItems.length > 0 && (
                  <section className={searching ? '' : 'mt-12'}>
                    {/* header kolom (menempel saat scroll) */}
                    <div className="sticky top-0 z-20 bg-[#f7f8fa] pb-3 pt-2">
                      <div
                        className="grid grid-cols-[56px_minmax(0,2.2fr)_minmax(0,1fr)_84px_84px_84px_minmax(0,1.5fr)] items-center gap-4 px-4 text-[11px] font-bold uppercase tracking-[0.18em] text-blue-600"
                      >
                        <div className="text-center">#</div>
                        <div>Anggota</div>
                        <div>Jenjang</div>
                        <div className="text-center">Kunjungan</div>
                        <div className="text-center">Baca</div>
                        <div className="text-center">Pinjam</div>
                        <div>Total Poin</div>
                      </div>
                    </div>

                    <ul className="space-y-3">
                      {listItems.map((item) => (
                        <RankRow key={item.id} item={item} maxPoin={maxPoin} onOpen={openProfile} />
                      ))}
                    </ul>

                    {loadingMore && (
                      <div role="status" aria-busy="true" className="mt-3 space-y-3">
                        <span className="sr-only">Memuat data berikutnya...</span>
                        <RowSkeleton />
                        <RowSkeleton />
                        <RowSkeleton />
                      </div>
                    )}
                  </section>
                )}

                {/* LOAD MORE */}
                <div className="mt-10 flex flex-col items-center gap-3">
                  {moreError && (
                    <p className="flex items-center gap-2 text-sm font-semibold text-blue-800">
                      <AlertCircle className="h-4 w-4" />
                      Gagal memuat data berikutnya. Coba lagi.
                    </p>
                  )}

                  {hasMore ? (
                    <button
                      type="button"
                      onClick={loadMore}
                      disabled={loadingMore}
                      className="group flex cursor-pointer items-center gap-3 rounded-2xl bg-blue-600 px-8 py-4 text-sm font-bold text-white transition-[transform,background-color] duration-200 hover:-translate-y-0.5 hover:bg-blue-700 active:translate-y-0 active:scale-95 disabled:cursor-wait disabled:bg-blue-300 disabled:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                    >
                      {loadingMore ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Memuat...
                        </>
                      ) : (
                        <>
                          Muat lebih banyak
                          {remaining > 0 && (
                            <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs">
                              {fmt(remaining)} lagi
                            </span>
                          )}
                          <ChevronDown className="h-4 w-4 transition-transform duration-200 group-hover:translate-y-1" />
                        </>
                      )}
                    </button>
                  ) : (
                    <p className="text-sm font-medium text-slate-400">Semua peringkat sudah ditampilkan.</p>
                  )}
                </div>
              </>
            )}
          </div>
        </main>
      </div>

      {/* Modal profil (intro bergaya game) */}
      <VisitorProfileModal
        isOpen={profileTarget !== null}
        target={profileTarget}
        onClose={() => setProfileTarget(null)}
      />
    </div>
  );
}