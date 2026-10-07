'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import {
  Trash2,
  Search,
  Loader2,
  ArrowLeft,
  User,
  BookOpen,
  Home,
  Clock,
  AlertTriangle,
  X,
  RefreshCw,
  Inbox,
  ClipboardList,
} from 'lucide-react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const PAGE_SIZE = 20;

interface Kunjungan {
  id: number | string;
  id_anggota: number | string | null;
  nis: string | null;
  nama: string | null;
  kamar: string | null;
  jenjang: string | null;
  judul_buku: string | null;
  kategori: string | null;
  aktivitas: string | null;
  tanggal_kunjungan: string | null;
  created_at: string;
}

function formatWaktu(iso: string) {
  try {
    return new Date(iso).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

/* Latar belakang dekoratif (ringan: hanya gradient, tanpa blur) */
function PageBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* Gradasi dasar */}
      <div className="absolute inset-0 bg-gradient-to-br from-sky-100 via-blue-50 to-indigo-100" />

      {/* Lingkaran cahaya dekoratif */}
      <div
        className="absolute -left-40 -top-40 h-[28rem] w-[28rem] rounded-full"
        style={{
          background:
            'radial-gradient(circle at center, rgba(59,130,246,0.28) 0%, rgba(59,130,246,0) 70%)',
        }}
      />
      <div
        className="absolute -right-32 top-1/3 h-[26rem] w-[26rem] rounded-full"
        style={{
          background:
            'radial-gradient(circle at center, rgba(99,102,241,0.22) 0%, rgba(99,102,241,0) 70%)',
        }}
      />
      <div
        className="absolute -bottom-40 left-1/4 h-[30rem] w-[30rem] rounded-full"
        style={{
          background:
            'radial-gradient(circle at center, rgba(14,165,233,0.20) 0%, rgba(14,165,233,0) 70%)',
        }}
      />

      {/* Pola titik halus */}
      <div
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage: 'radial-gradient(rgba(37,99,235,0.18) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
          maskImage: 'linear-gradient(to bottom, black 0%, transparent 70%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 0%, transparent 70%)',
        }}
      />
    </div>
  );
}

export default function HapusKunjunganPage() {
  const [items, setItems] = useState<Kunjungan[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal konfirmasi
  const [target, setTarget] = useState<Kunjungan | null>(null);
  const [deleting, setDeleting] = useState(false);

  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce pencarian
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Bersihkan timer saat unmount
  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    };
  }, []);

  const fetchData = useCallback(
    async (pageNum: number, replace: boolean) => {
      if (replace) setLoading(true);
      else setLoadingMore(true);
      setErrorMsg(null);

      try {
        const from = pageNum * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        let query = supabase
          .from('data_pengunjung')
          .select('*')
          .order('created_at', { ascending: false })
          .range(from, to);

        if (debouncedSearch) {
          // Hindari karakter yang merusak sintaks filter .or()
          const safe = debouncedSearch.replace(/[,()%]/g, ' ');
          query = query.or(
            `nama.ilike.%${safe}%,nis.ilike.%${safe}%,judul_buku.ilike.%${safe}%`
          );
        }

        const { data, error } = await query;
        if (error) throw error;

        const rows = (data || []) as Kunjungan[];
        setItems((prev) => (replace ? rows : [...prev, ...rows]));
        setHasMore(rows.length === PAGE_SIZE);
        setPage(pageNum);
      } catch (err: any) {
        setErrorMsg(err.message || 'Gagal memuat data kunjungan.');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [debouncedSearch]
  );

  // Muat ulang dari awal saat kata kunci berubah
  useEffect(() => {
    fetchData(0, true);
  }, [fetchData]);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    if (successTimerRef.current) clearTimeout(successTimerRef.current);
    successTimerRef.current = setTimeout(() => setSuccessMsg(null), 4000);
  };

  const handleDelete = async () => {
    if (!target) return;
    setDeleting(true);
    setErrorMsg(null);

    try {
      const { error } = await supabase
        .from('data_pengunjung')
        .delete()
        .eq('id', target.id);

      if (error) throw error;

      setItems((prev) => prev.filter((i) => i.id !== target.id));
      showSuccess(`Data kunjungan "${target.nama || '-'}" berhasil dihapus.`);
      setTarget(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menghapus data kunjungan.');
      setTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  // Tutup modal konfirmasi dengan Escape
  useEffect(() => {
    if (!target) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !deleting) setTarget(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [target, deleting]);

  return (
    <div className="relative min-h-screen text-slate-900">
      <PageBackground />

      {/* KONTEN HALAMAN */}
      <div className="relative z-10">
        {/* HEADER */}
        <header className="sticky top-0 z-30 border-b border-blue-700/30 bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 shadow-md shadow-blue-900/10">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <Link
                href="/"
                aria-label="Kembali"
                className="shrink-0 rounded-lg border border-white/30 bg-white/10 p-1.5 text-white transition-colors hover:bg-white hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div className="flex min-w-0 items-center gap-3">
                <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/15 text-white sm:flex">
                  <ClipboardList className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h1 className="truncate text-lg font-bold leading-tight text-white">
                    Hapus Data Kunjungan
                  </h1>
                  <p className="truncate text-sm text-blue-100">
                    Diurutkan dari yang terbaru
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => fetchData(0, true)}
              disabled={loading}
              aria-label="Muat ulang"
              className="shrink-0 cursor-pointer rounded-lg border border-white/30 bg-white/10 p-1.5 text-white transition-colors hover:bg-white hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-3xl space-y-4 px-4 py-5 sm:px-6 sm:py-8">
          {/* PENCARIAN */}
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
              <Search className="h-4 w-4 text-blue-600" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama, NIS, atau judul buku..."
              className="block w-full rounded-xl border border-blue-200 bg-white py-3 pl-10 pr-3 text-base text-slate-900 shadow-sm shadow-blue-900/5 placeholder-slate-500 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 sm:text-sm"
            />
          </div>

          {/* INFO JUMLAH */}
          {!loading && items.length > 0 && (
            <div className="flex items-center justify-between px-1 text-xs font-semibold text-slate-600">
              <span>
                Menampilkan{' '}
                <span className="text-blue-700">{items.length}</span> data
                {debouncedSearch ? ` untuk "${debouncedSearch}"` : ''}
              </span>
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] text-blue-700">
                Terbaru dulu
              </span>
            </div>
          )}

          {/* PESAN */}
          {errorMsg && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium leading-relaxed text-red-800 shadow-sm"
            >
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div
              role="status"
              className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800 shadow-sm"
            >
              {successMsg}
            </div>
          )}

          {/* DAFTAR */}
          {loading ? (
            <div className="flex items-center justify-center gap-2 rounded-2xl border border-blue-100 bg-white py-16 text-sm text-slate-600 shadow-sm">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              Memuat data...
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-blue-100 bg-white py-16 text-center shadow-sm">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-50">
                <Inbox className="h-7 w-7 text-blue-400" />
              </div>
              <p className="text-sm font-semibold text-slate-700">
                {debouncedSearch ? 'Data tidak ditemukan' : 'Belum ada data kunjungan'}
              </p>
              <p className="text-xs text-slate-500">
                {debouncedSearch
                  ? 'Coba kata kunci lain.'
                  : 'Data kunjungan akan muncul di sini.'}
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-start justify-between gap-3 rounded-2xl border border-blue-100 border-l-4 border-l-blue-500 bg-white p-4 shadow-sm shadow-blue-900/5 transition-shadow hover:shadow-md hover:shadow-blue-900/10"
                >
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 shrink-0 text-blue-600" />
                      <span className="truncate text-sm font-bold text-slate-900">
                        {item.nama || '-'}
                      </span>
                      {item.jenjang && (
                        <span className="shrink-0 rounded-md bg-blue-100 px-1.5 py-0.5 text-[11px] font-semibold text-blue-700">
                          {item.jenjang}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <Home className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span className="truncate">
                        NIS: {item.nis || '-'} • Kamar: {item.kamar || '-'}
                      </span>
                    </div>

                    <div className="flex items-start gap-2 text-xs text-slate-600">
                      <BookOpen className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span className="line-clamp-2">
                        {item.judul_buku || '-'}
                        {item.kategori ? ` • ${item.kategori}` : ''}
                        {item.aktivitas ? ` • ${item.aktivitas}` : ''}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span>{formatWaktu(item.created_at)}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setTarget(item)}
                    aria-label={`Hapus kunjungan ${item.nama || ''}`}
                    className="shrink-0 cursor-pointer rounded-lg border border-red-200 bg-red-50 p-2 text-red-600 transition-colors hover:bg-red-600 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* MUAT LEBIH BANYAK */}
          {!loading && hasMore && (
            <button
              type="button"
              onClick={() => fetchData(page + 1, false)}
              disabled={loadingMore}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm font-bold text-blue-700 shadow-sm transition-colors hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loadingMore ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Memuat...
                </>
              ) : (
                'Muat Lebih Banyak'
              )}
            </button>
          )}

          {!loading && items.length > 0 && !hasMore && (
            <p className="py-2 text-center text-xs font-medium text-slate-500">
              Semua data sudah ditampilkan
            </p>
          )}
        </main>
      </div>

      {/* MODAL KONFIRMASI HAPUS */}
      {target && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label="Konfirmasi hapus kunjungan"
        >
          <div
            className="absolute inset-0 bg-slate-900/60"
            onClick={() => !deleting && setTarget(null)}
          />

          <div className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-xl">
            <div className="flex items-center justify-between gap-3 border-b border-red-100 bg-red-50 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-600 text-white">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-bold leading-tight text-slate-900">
                  Hapus Kunjungan?
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setTarget(null)}
                disabled={deleting}
                aria-label="Tutup"
                className="shrink-0 cursor-pointer rounded-lg border border-slate-300 bg-white p-1.5 text-slate-600 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 px-4 py-4">
              <p className="text-sm leading-relaxed text-slate-700">
                Data kunjungan berikut akan dihapus permanen. Setelah dihapus,
                anggota ini dapat mengisi buku tamu lagi pada sesi tersebut.
              </p>
              <div className="space-y-1 rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm">
                <div className="font-bold text-slate-900">{target.nama || '-'}</div>
                <div className="text-xs text-slate-600">
                  NIS: {target.nis || '-'} • Kamar: {target.kamar || '-'}
                </div>
                <div className="line-clamp-2 text-xs text-slate-600">
                  {target.judul_buku || '-'}
                </div>
                <div className="text-xs text-slate-500">
                  {formatWaktu(target.created_at)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 border-t border-blue-100 bg-blue-50 px-4 py-3">
              <button
                type="button"
                onClick={() => setTarget(null)}
                disabled={deleting}
                className="cursor-pointer rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-bold text-blue-700 transition-colors hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
              >
                {deleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Menghapus...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Hapus
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}