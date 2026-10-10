'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  COLUMNS,
  LOAN_DAYS,
  PAGE_SIZE,
  type Action,
  type Counts,
  type Loan,
  type Scope,
} from './konfigurasi';
import { addDays, diffDays, mapRow, toDate } from './helper';
import { buildQuery, fetchAllLoans } from './data';
import { copyTable } from './salin';
import { exportExcel } from './ekspor';

export function usePeminjam() {
  const router = useRouter();

  const [authReady, setAuthReady] = useState(false);

  // Daftar yang tampil (dimuat bertahap)
  const [rows, setRows] = useState<Loan[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [moreError, setMoreError] = useState<string | null>(null);

  // Angka ringkasan (hanya hitungan, tidak memuat baris)
  const [counts, setCounts] = useState<Counts>({ borrowed: null, late: null, terlamaHari: null });

  // Filter
  const [scope, setScope] = useState<Scope>('all');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Salin / ekspor
  const [busyAction, setBusyAction] = useState<Action | null>(null);
  const [notice, setNotice] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const mounted = useRef(true);
  const reqId = useRef(0);
  const fetchedRaw = useRef(0); // jumlah baris mentah yang sudah diambil (offset berikutnya)
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    };
  }, []);

  // Proteksi halaman
  useEffect(() => {
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!mounted.current) return;

      if (!session) router.replace('/login');
      else setAuthReady(true);
    })();
  }, [router]);

  // Tunda pencarian agar tidak query di setiap ketikan
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 350);
    return () => clearTimeout(t);
  }, [query]);

  /* ---------- Ringkasan (hanya count) ---------- */
  const loadCounts = useCallback(async () => {
    try {
      const today = new Date();
      const [all, late, oldest] = await Promise.all([
        buildQuery('all', today, 'id', { count: 'exact', head: true }),
        buildQuery('late', today, 'id', { count: 'exact', head: true }),
        buildQuery('late', today, 'tgl_pinjam').order('tgl_pinjam', { ascending: true }).limit(1),
      ]);

      if (!mounted.current) return;
      if (all.error) throw all.error;
      if (late.error) throw late.error;
      if (oldest.error) throw oldest.error;

      const oldestDate = toDate(oldest.data?.[0]?.tgl_pinjam);
      const terlamaHari = oldestDate
        ? Math.max(0, diffDays(today, addDays(oldestDate, LOAN_DAYS - 1)))
        : 0;

      setCounts({
        borrowed: all.count ?? 0,
        late: late.count ?? 0,
        terlamaHari,
      });
    } catch {
      // Kegagalan ringkasan tidak boleh memblokir daftar
      if (mounted.current) setCounts({ borrowed: null, late: null, terlamaHari: null });
    }
  }, []);

  /* ---------- Daftar (per halaman, "Muat Lebih Banyak") ---------- */
  const loadPage = useCallback(
    async (offset: number) => {
      const id = ++reqId.current;
      const isFirst = offset === 0;

      if (isFirst) {
        setLoading(true);
        setError(null);
        setMoreError(null);
      } else {
        setLoadingMore(true);
        setMoreError(null);
      }

      try {
        const today = new Date();
        let q = buildQuery(scope, today, COLUMNS, isFirst ? { count: 'exact' } : undefined);

        // Hilangkan karakter yang merusak sintaks filter .or()
        const term = debouncedQuery.replace(/[%,()*\\]/g, ' ').replace(/\s+/g, ' ').trim();
        if (term) {
          q = q.or(
            [
              `nama_anggota.ilike.%${term}%`,
              `nis.ilike.%${term}%`,
              `kamar.ilike.%${term}%`,
              `judul_buku.ilike.%${term}%`,
              `kode_eksemplar.ilike.%${term}%`,
            ].join(','),
          );
        }

        // Urutan stabil (tgl_pinjam, id) supaya halaman berikutnya tidak tumpang tindih
        const { data, error: fetchError, count } = await q
          .order('tgl_pinjam', { ascending: true })
          .order('id', { ascending: true })
          .range(offset, offset + PAGE_SIZE - 1);

        if (!mounted.current || id !== reqId.current) return;
        if (fetchError) throw fetchError;

        const raw: any[] = data ?? [];
        const items: Loan[] = [];
        for (const row of raw) {
          const item = mapRow(row, today);
          if (item) items.push(item);
        }

        fetchedRaw.current = offset + raw.length;
        const totalMatch = isFirst ? count ?? raw.length : undefined;

        setRows((prev) => (isFirst ? items : [...prev, ...items]));
        if (totalMatch !== undefined) setTotal(totalMatch);
        setHasMore(
          raw.length === PAGE_SIZE && fetchedRaw.current < (totalMatch ?? Number.POSITIVE_INFINITY),
        );
      } catch (err: any) {
        if (!mounted.current || id !== reqId.current) return;
        const msg = err?.message || 'Gagal memuat data peminjam.';
        if (isFirst) setError(msg);
        else setMoreError(msg);
      } finally {
        if (mounted.current && id === reqId.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [scope, debouncedQuery],
  );

  // Muat ulang daftar saat scope / pencarian berubah
  useEffect(() => {
    if (authReady) loadPage(0);
  }, [authReady, loadPage]);

  useEffect(() => {
    if (authReady) loadCounts();
  }, [authReady, loadCounts]);

  const refresh = () => {
    loadCounts();
    loadPage(0);
  };

  const loadMore = () => loadPage(fetchedRaw.current);

  /* ---------- Salin & ekspor (mengambil semua data sesuai pilihan) ---------- */
  const showNotice = (type: 'ok' | 'err', text: string) => {
    setNotice({ type, text });
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 3500);
  };

  const runAction = async (action: Action, target: Scope) => {
    if (busyAction) return;
    setBusyAction(action);
    setNotice(null);
    try {
      const data = await fetchAllLoans(target);
      if (!mounted.current) return;

      if (data.length === 0) {
        showNotice('err', target === 'late' ? 'Tidak ada peminjam terlambat.' : 'Tidak ada data peminjam.');
        return;
      }

      if (action === 'copy') {
        await copyTable(data);
        if (mounted.current)
          showNotice('ok', `${data.length.toLocaleString('id-ID')} data berhasil disalin sebagai tabel`);
      } else {
        await exportExcel(data, target);
        if (mounted.current)
          showNotice('ok', `${data.length.toLocaleString('id-ID')} data diekspor ke Excel`);
      }
    } catch (err: any) {
      if (mounted.current) showNotice('err', err?.message || 'Gagal memproses data.');
    } finally {
      if (mounted.current) setBusyAction(null);
    }
  };

  return {
    authReady,
    rows,
    total,
    hasMore,
    loading,
    loadingMore,
    error,
    moreError,
    counts,
    scope,
    setScope,
    query,
    setQuery,
    hasSearch: debouncedQuery.trim() !== '',
    busyAction,
    notice,
    runAction,
    refresh,
    loadMore,
  };
}