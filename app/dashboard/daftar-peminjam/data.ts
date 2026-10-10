import { supabase } from '@/lib/supabase';
import { COLUMNS, EXPORT_BATCH, TABLE, type Loan, type Scope } from './konfigurasi';
import { lateCutoff, mapRow } from './helper';

/** Query dasar: buku yang belum kembali (+ filter terlambat jika scope = 'late') */
export function buildQuery(
  scope: Scope,
  today: Date,
  columns: string,
  opts?: { count?: 'exact'; head?: boolean },
) {
  let q: any = supabase
    .from(TABLE)
    .select(columns, opts)
    .is('tgl_kembali', null)
    .not('tgl_pinjam', 'is', null);
  if (scope === 'late') q = q.lte('tgl_pinjam', lateCutoff(today));
  return q;
}

/** Ambil SEMUA data sesuai scope secara bertahap. Hanya dipanggil saat salin/ekspor. */
export async function fetchAllLoans(scope: Scope): Promise<Loan[]> {
  const today = new Date();
  const out: Loan[] = [];

  for (let from = 0; ; from += EXPORT_BATCH) {
    const { data, error } = await buildQuery(scope, today, COLUMNS)
      .order('tgl_pinjam', { ascending: true })
      .order('id', { ascending: true })
      .range(from, from + EXPORT_BATCH - 1);

    if (error) throw error;
    const rows: any[] = data ?? [];
    for (const row of rows) {
      const item = mapRow(row, today);
      if (item) out.push(item);
    }
    if (rows.length < EXPORT_BATCH) break;
  }
  return out;
}