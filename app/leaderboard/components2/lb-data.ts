'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../components/vp-data';
import { COLUMNS, PAGE_SIZE, VIEW, sanitize, type Item, type JenjangKey, type Row } from './lb-types';

/** Semua logika data leaderboard: pencarian (debounce), halaman pertama, muat lebih banyak, statistik jenjang. */
export function useLeaderboard(jenjang: JenjangKey, input: string) {
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [moreError, setMoreError] = useState(false);
  const [stats, setStats] = useState<{ total: number; maxPoin: number } | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  const reqIdRef = useRef(0);

  /* debounce pencarian */
  useEffect(() => {
    const t = setTimeout(() => setSearch(sanitize(input)), 300);
    return () => clearTimeout(t);
  }, [input]);

  /* ambil satu halaman data dari server */
  const runQuery = useCallback(
    async (from: number) => {
      const rankCol = jenjang === 'Semua' ? 'peringkat' : 'peringkat_jenjang';

      let q: any = supabase
        .from(VIEW)
        .select(COLUMNS, { count: from === 0 ? 'exact' : undefined });

      if (jenjang !== 'Semua') q = q.eq('jenjang', jenjang);
      if (search) q = q.or(`nama.ilike.%${search}%,nis.ilike.%${search}%`);

      const { data, error, count } = await q
        .order(rankCol, { ascending: true })
        .order('total_kunjungan', { ascending: false, nullsFirst: false })
        .order('nama', { ascending: true })
        .order('id', { ascending: true })
        .range(from, from + PAGE_SIZE - 1);

      if (error) throw error;
      return { rows: (data || []) as Row[], count: count as number | null };
    },
    [jenjang, search]
  );

  const decorate = useCallback(
    (rows: Row[]): Item[] =>
      rows.map((r, i) => ({
        ...r,
        posisi: jenjang === 'Semua' ? r.peringkat : r.peringkat_jenjang ?? r.peringkat,
        delay: Math.min(i, 14) * 0.035,
      })),
    [jenjang]
  );

  /* muat ulang dari halaman pertama saat filter berubah */
  useEffect(() => {
    const id = ++reqIdRef.current;
    setLoading(true);
    setLoadingMore(false);
    setErrorMsg(null);
    setMoreError(false);
    setItems([]);
    setTotal(null);

    runQuery(0)
      .then(({ rows, count }) => {
        if (id !== reqIdRef.current) return;
        setItems(decorate(rows));
        setTotal(count ?? rows.length);
      })
      .catch((err: any) => {
        if (id !== reqIdRef.current) return;
        setErrorMsg(err?.message || 'Gagal memuat leaderboard.');
      })
      .finally(() => {
        if (id === reqIdRef.current) setLoading(false);
      });
  }, [runQuery, decorate, retryKey]);

  /* statistik jenjang (total anggota & poin tertinggi untuk bar) */
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        let q: any = supabase.from(VIEW).select('total_poin', { count: 'exact' });
        if (jenjang !== 'Semua') q = q.eq('jenjang', jenjang);
        const { data, count, error } = await q
          .order('total_poin', { ascending: false, nullsFirst: false })
          .limit(1);
        if (error) throw error;
        if (active) setStats({ total: count ?? 0, maxPoin: data?.[0]?.total_poin ?? 0 });
      } catch {
        if (active) setStats(null);
      }
    })();
    return () => {
      active = false;
    };
  }, [jenjang, retryKey]);

  /* load more */
  const loadMore = async () => {
    if (loading || loadingMore) return;
    const id = reqIdRef.current;
    setLoadingMore(true);
    setMoreError(false);
    try {
      const { rows } = await runQuery(items.length);
      if (id !== reqIdRef.current) return;
      setItems((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...decorate(rows.filter((r) => !seen.has(r.id)))];
      });
    } catch {
      if (id === reqIdRef.current) setMoreError(true);
    } finally {
      if (id === reqIdRef.current) setLoadingMore(false);
    }
  };

  const retry = useCallback(() => setRetryKey((k) => k + 1), []);

  return { search, items, total, loading, loadingMore, errorMsg, moreError, stats, loadMore, retry };
}