'use client';

import React, { useState, useMemo, useDeferredValue, memo } from 'react';
import Link from 'next/link';
import { Search, X, BookOpenText, ImageIcon } from 'lucide-react';
import GambarKarya from './gambar-karya';
import { formatTanggal, hrefKarya, type KaryaRingkas } from '../data';

const PAGE_SIZE = 20;

const KaryaCard = memo(function KaryaCard({
  karya,
  prioritas,
}: {
  karya: KaryaRingkas;
  prioritas: boolean;
}) {
  const penulis = karya.penulis || 'Anonim';

  const tanpaGambar = (
    <div className="flex min-h-[150px] flex-col justify-center bg-gradient-to-br from-blue-50 to-blue-100 p-4">
      <ImageIcon className="mb-2 h-5 w-5 text-blue-300" strokeWidth={1.4} aria-hidden="true" />
      <p className="line-clamp-5 text-xs font-medium italic leading-relaxed text-slate-700">
        &ldquo;{karya.cuplikan}&rdquo;
      </p>
    </div>
  );

  return (
    <article className="mb-3 break-inside-avoid sm:mb-4">
      <Link
        href={hrefKarya(karya)}
        className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-900/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <div className="relative mb-3 overflow-hidden rounded-xl bg-blue-100 ring-1 ring-slate-900/5">
          {karya.foto_url ? (
            <GambarKarya
              src={karya.foto_url}
              alt={karya.judul}
              prioritas={prioritas}
              fallback={tanpaGambar}
              className="h-auto w-full object-cover"
            />
          ) : (
            tanpaGambar
          )}

          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-t from-blue-950/80 via-blue-900/50 to-blue-900/20 p-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
          >
            <BookOpenText className="h-8 w-8 text-white" strokeWidth={1.4} />
            <span className="rounded-full bg-blue-600 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white shadow-md">
              Baca Karya
            </span>
          </div>
        </div>

        <div className="px-1 pb-1">
          <span className="mb-2 inline-block rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-700">
            {karya.kategori || 'Umum'}
          </span>
          <h2 className="line-clamp-2 text-sm font-semibold leading-snug tracking-tight text-slate-900 transition-colors group-hover:text-blue-700">
            {karya.judul}
          </h2>
          <div className="mt-2 flex items-center gap-2">
            <div
              aria-hidden="true"
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[9px] font-bold text-blue-700"
            >
              {penulis.charAt(0).toUpperCase()}
            </div>
            <span className="truncate text-xs font-medium text-slate-600">{penulis}</span>
          </div>
          <time dateTime={karya.dibuat_pada} className="mt-1.5 block text-[11px] text-slate-500">
            {formatTanggal(karya.dibuat_pada)}
          </time>
        </div>
      </Link>
    </article>
  );
});

export default function KaryaList({ karya, gagal }: { karya: KaryaRingkas[]; gagal: boolean }) {
  const [query, setQuery] = useState('');
  const [kategoriAktif, setKategoriAktif] = useState('Semua');
  const [tampil, setTampil] = useState(PAGE_SIZE);

  // useDeferredValue: ketikan tetap mulus, penyaringan daftar menyusul tanpa timer manual
  const kataKunci = useDeferredValue(query);
  const sedangMenyaring = kataKunci !== query;
  const q = kataKunci.trim().toLowerCase();

  const kategori = useMemo(() => {
    const set = new Set(karya.map((k) => k.kategori).filter(Boolean));
    return ['Semua', ...Array.from(set).sort()];
  }, [karya]);

  const hasil = useMemo(() => {
    let list = karya;
    if (kategoriAktif !== 'Semua') list = list.filter((k) => k.kategori === kategoriAktif);
    if (q) {
      list = list.filter(
        (k) =>
          k.judul.toLowerCase().includes(q) ||
          (k.penulis ?? '').toLowerCase().includes(q) ||
          k.kategori.toLowerCase().includes(q) ||
          k.cuplikan.toLowerCase().includes(q)
      );
    }
    return list;
  }, [karya, kategoriAktif, q]);

  const terlihat = hasil.slice(0, tampil);
  const adaFilter = q !== '' || kategoriAktif !== 'Semua';

  return (
    <>
      {/* Kotak pencarian di perbatasan hero */}
      <div className="relative z-20 mx-auto -mt-7 w-full max-w-5xl px-4">
        <form
          role="search"
          onSubmit={(e) => e.preventDefault()}
          className="rounded-2xl border border-blue-100 bg-white p-2 shadow-lg shadow-blue-900/5 transition-colors focus-within:border-blue-300 sm:rounded-3xl"
        >
          <div className="relative flex w-full items-center">
            <Search className="pointer-events-none absolute left-4 h-4 w-4 text-slate-400" aria-hidden="true" />
            <input
              type="search"
              aria-label="Cari judul karya, penulis, atau isi"
              autoComplete="off"
              enterKeyHint="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setTampil(PAGE_SIZE);
              }}
              placeholder="Cari judul karya, penulis, atau isi..."
              className="h-11 w-full min-w-0 rounded-xl border-none bg-blue-50 pl-11 pr-12 text-sm font-medium tracking-tight text-slate-900 placeholder-slate-500 transition-colors focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 sm:h-12 sm:rounded-full [&::-webkit-search-cancel-button]:hidden"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setTampil(PAGE_SIZE);
                }}
                aria-label="Hapus pencarian"
                className="absolute right-2 inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-blue-100 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="mx-auto w-full max-w-7xl space-y-6 px-4 pb-16 pt-8 sm:px-6">
        {/* Filter kategori */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 -mb-2" role="group" aria-label="Filter kategori">
            {kategori.map((kat) => {
              const aktif = kategoriAktif === kat;
              return (
                <button
                  key={kat}
                  type="button"
                  aria-pressed={aktif}
                  onClick={() => {
                    setKategoriAktif(kat);
                    setTampil(PAGE_SIZE);
                  }}
                  className={`cursor-pointer whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:text-[13px] ${
                    aktif
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-900/15'
                      : 'border border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700'
                  }`}
                >
                  {kat}
                </button>
              );
            })}
          </div>

          <div className="hidden shrink-0 items-center gap-2 rounded-full border border-blue-100 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-600 shadow-sm sm:inline-flex">
            <span className="h-2 w-2 rounded-full bg-blue-500" aria-hidden="true" />
            {karya.length} Karya Tulis
          </div>
        </div>

        {/* Pengumuman hasil untuk pembaca layar */}
        <p className="sr-only" role="status" aria-live="polite">
          {adaFilter ? `Ditemukan ${hasil.length} karya` : ''}
        </p>

        {adaFilter && hasil.length > 0 && (
          <div className="border-b border-blue-100 pb-3">
            <p className="text-sm text-slate-600">
              Ditemukan <span className="font-semibold text-blue-700">{hasil.length}</span> karya
              {q && (
                <>
                  {' '}untuk &ldquo;<span className="font-semibold text-blue-700">{kataKunci.trim()}</span>&rdquo;
                </>
              )}
            </p>
          </div>
        )}

        {gagal ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-red-100 bg-white px-6 py-20 text-center shadow-sm shadow-blue-900/5">
            <div className="mb-5 rounded-full bg-red-50 p-4 text-red-500 ring-8 ring-red-50/60">
              <X className="h-10 w-10 stroke-[1.4]" />
            </div>
            <h2 className="mb-2 text-xl font-semibold tracking-tight text-slate-900">Gagal memuat karya tulis</h2>
            <p className="max-w-md text-sm leading-relaxed text-slate-600">
              Terjadi kendala saat mengambil data. Muat ulang halaman atau coba lagi beberapa saat lagi.
            </p>
          </div>
        ) : hasil.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-blue-100 bg-white px-6 py-20 text-center shadow-sm shadow-blue-900/5">
            <div className="mb-5 rounded-full bg-blue-50 p-4 text-blue-500 ring-8 ring-blue-50/60">
              <Search className="h-10 w-10 stroke-[1.4]" />
            </div>
            <h2 className="mb-2 text-xl font-semibold tracking-tight text-slate-900">
              {adaFilter ? 'Karya Tidak Ditemukan' : 'Belum Ada Karya Tulis'}
            </h2>
            <p className="max-w-md text-sm leading-relaxed text-slate-600">
              {adaFilter
                ? 'Coba periksa kembali ejaan kata kunci Anda atau pilih kategori lain.'
                : 'Karya tulis anggota akan tampil di sini setelah ditambahkan.'}
            </p>
          </div>
        ) : (
          <>
            <div
              className={`columns-2 gap-3 transition-opacity duration-150 sm:columns-3 sm:gap-4 md:columns-4 lg:columns-5 ${
                sedangMenyaring ? 'opacity-70' : 'opacity-100'
              }`}
            >
              {terlihat.map((k, i) => (
                <KaryaCard key={k.id} karya={k} prioritas={i < 4} />
              ))}
            </div>

            {terlihat.length < hasil.length && (
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={() => setTampil((n) => n + PAGE_SIZE)}
                  className="cursor-pointer rounded-full bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-900/15 transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                >
                  Tampilkan lebih banyak ({hasil.length - terlihat.length})
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}