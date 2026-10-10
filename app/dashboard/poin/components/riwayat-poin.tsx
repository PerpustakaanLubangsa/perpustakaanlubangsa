'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronRight, History, Loader2, Pencil, Search, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { kelasInput, tombolSekunder, tombolSekunderBesar } from './ui';
import type { KategoriPoin } from './kelola-kategori';
import EditMutasi, { type Mutasi } from './edit-mutasi';

const PER_HALAMAN = 10;
const DEBOUNCE_MS = 350;

const formatTanggal = new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' });

export default function RiwayatPoin({
  anggotaId,
  kategori,
  versi,
  onDiubah,
}: {
  anggotaId: string;
  kategori: KategoriPoin[];
  /** Naikkan angka ini untuk memuat ulang daftar dari awal (mis. setelah poin baru disimpan). */
  versi: number;
  /** Dipanggil setelah sebuah riwayat berhasil diubah (mis. untuk menyegarkan total poin anggota). */
  onDiubah?: () => void;
}) {
  const [kueri, setKueri] = useState('');
  const [q, setQ] = useState('');
  const [baris, setBaris] = useState<Mutasi[]>([]);
  const [adaLagi, setAdaLagi] = useState(false);
  const [memuat, setMemuat] = useState(true);
  const [memuatLagi, setMemuatLagi] = useState(false);
  const [galat, setGalat] = useState<'awal' | 'lagi' | null>(null);
  const [ulang, setUlang] = useState(0);
  const permintaan = useRef(0);
  const [diedit, setDiedit] = useState<Mutasi | null>(null);
  // Ringkasan per kategori (jumlah & total poin) dari seluruh riwayat yang cocok, bukan hanya yang sudah dimuat
  const [ringkasan, setRingkasan] = useState<Map<number | null, { jumlah: number; total: number }> | null>(null);
  const [versiRingkasan, setVersiRingkasan] = useState(0);

  // Debounce pencarian + buang karakter yang punya arti khusus di filter PostgREST / ilike
  useEffect(() => {
    const bersih = kueri.replace(/[%_,()*\\"']/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);
    const t = setTimeout(() => setQ(bersih), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [kueri]);

  // Cari di keterangan, atau di mutasi yang kategorinya namanya cocok
  const filter = useMemo(() => {
    if (!q) return '';
    const kecil = q.toLowerCase();
    const idCocok = kategori.filter((k) => k.nama.toLowerCase().includes(kecil)).map((k) => k.id);
    return `keterangan.ilike.%${q}%${idCocok.length ? `,kategori_id.in.(${idCocok.join(',')})` : ''}`;
  }, [q, kategori]);

  // Keyset pagination: ambil data dengan id lebih kecil dari item terakhir.
  // Lebih stabil daripada offset karena tidak bergeser saat ada data baru masuk.
  const ambil = useCallback(
    async (kursor: number | null) => {
      let query = supabase
        .from('mutasi_poin')
        .select('id, poin, keterangan, created_at, kategori:kategori_poin(id, nama)')
        .eq('anggota_id', anggotaId)
        .order('id', { ascending: false })
        .limit(PER_HALAMAN + 1);
      if (filter) query = query.or(filter);
      if (kursor !== null) query = query.lt('id', kursor);

      const { data, error } = await query;
      if (error) throw error;
      const semua = (data ?? []) as unknown as Mutasi[];
      return { item: semua.slice(0, PER_HALAMAN), adaLagi: semua.length > PER_HALAMAN };
    },
    [anggotaId, filter],
  );

  useEffect(() => {
    const no = ++permintaan.current;
    setMemuat(true);
    setMemuatLagi(false);
    setGalat(null);

    ambil(null)
      .then((h) => {
        if (no !== permintaan.current) return;
        setBaris(h.item);
        setAdaLagi(h.adaLagi);
        setMemuat(false);
      })
      .catch((err) => {
        if (no !== permintaan.current) return;
        console.error('Gagal memuat riwayat poin:', err);
        setBaris([]);
        setAdaLagi(false);
        setGalat('awal');
        setMemuat(false);
      });

    return () => {
      permintaan.current++;
    };
  }, [ambil, versi, ulang]);

  useEffect(() => {
    let batal = false;
    let query = supabase.from('mutasi_poin').select('poin, kategori_id').eq('anggota_id', anggotaId);
    if (filter) query = query.or(filter);
    query.then(({ data, error }) => {
      if (batal) return;
      if (error) {
        console.error('Gagal memuat ringkasan poin:', error);
        setRingkasan(null);
        return;
      }
      const peta = new Map<number | null, { jumlah: number; total: number }>();
      for (const r of (data ?? []) as { poin: number; kategori_id: number | null }[]) {
        const lama = peta.get(r.kategori_id) ?? { jumlah: 0, total: 0 };
        peta.set(r.kategori_id, { jumlah: lama.jumlah + 1, total: lama.total + r.poin });
      }
      setRingkasan(peta);
    });
    return () => {
      batal = true;
    };
  }, [anggotaId, filter, versi, ulang, versiRingkasan]);

  // Kelompokkan baris yang sudah dimuat per kategori; kelompok "Tanpa kategori" selalu paling bawah
  const kelompok = useMemo(() => {
    const nama = new Map<number, string>();
    kategori.forEach((k) => nama.set(k.id, k.nama));
    baris.forEach((b) => b.kategori && nama.set(b.kategori.id, b.kategori.nama));

    const peta = new Map<number | null, Mutasi[]>();
    for (const b of baris) {
      const id = b.kategori?.id ?? null;
      const daftar = peta.get(id);
      if (daftar) daftar.push(b);
      else peta.set(id, [b]);
    }
    const kunci = new Set<number | null>(peta.keys());
    ringkasan?.forEach((_, id) => kunci.add(id));

    return [...kunci]
      .map((id) => {
        const item = peta.get(id) ?? [];
        const r = ringkasan?.get(id);
        return {
          id,
          nama: id === null ? 'Tanpa kategori' : (nama.get(id) ?? `Kategori #${id}`),
          item,
          jumlah: r?.jumlah ?? item.length,
          total: r?.total ?? item.reduce((t, b) => t + b.poin, 0),
        };
      })
      .sort((a, b) => {
        if (a.id === null) return 1;
        if (b.id === null) return -1;
        return a.nama.localeCompare(b.nama, 'id');
      });
  }, [baris, kategori, ringkasan]);

  async function muatLagi() {
    if (memuat || memuatLagi || baris.length === 0) return;
    const no = permintaan.current;
    setMemuatLagi(true);
    setGalat(null);
    try {
      const h = await ambil(baris[baris.length - 1].id);
      if (no !== permintaan.current) return;
      setBaris((lama) => {
        const sudah = new Set(lama.map((b) => b.id));
        return [...lama, ...h.item.filter((b) => !sudah.has(b.id))];
      });
      setAdaLagi(h.adaLagi);
      setMemuatLagi(false);
    } catch (err) {
      if (no !== permintaan.current) return;
      console.error('Gagal memuat riwayat poin berikutnya:', err);
      setGalat('lagi');
      setMemuatLagi(false);
    }
  }

  function sesudahDiubah(baru: Mutasi) {
    setBaris((lama) => lama.map((b) => (b.id === baru.id ? baru : b)));
    setDiedit(null);
    setVersiRingkasan((n) => n + 1);
    onDiubah?.();
  }

  return (
    <section
      aria-labelledby="riwayat-judul"
      className="relative rounded-2xl border border-blue-100 bg-white p-4 sm:p-5 lg:flex lg:flex-col lg:overflow-hidden"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id="riwayat-judul" className="flex items-center gap-2 text-base font-bold text-slate-900">
          <History className="h-4 w-4 text-blue-600" aria-hidden="true" />
          Riwayat poin
        </h2>
        {memuat && baris.length > 0 && (
          <Loader2 className="h-4 w-4 animate-spin text-slate-400" aria-hidden="true" />
        )}
      </div>

      <div className="relative mt-3">
        <label htmlFor="riwayat-cari" className="sr-only">
          Cari riwayat poin
        </label>
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />
        <input
          id="riwayat-cari"
          type="text"
          autoComplete="off"
          placeholder="Cari keterangan atau kategori"
          value={kueri}
          onChange={(e) => setKueri(e.target.value)}
          className={`${kelasInput} h-10 pl-10 pr-10`}
        />
        {kueri && (
          <button
            type="button"
            onClick={() => setKueri('')}
            aria-label="Hapus pencarian"
            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {!memuat && !galat ? `Menampilkan ${baris.length} riwayat poin.` : ''}
      </p>

      {baris.length === 0 && memuat ? (
        <p className="mt-4 flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Memuat riwayat…
        </p>
      ) : galat === 'awal' ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-red-600">Riwayat poin gagal dimuat.</p>
          <button type="button" className={tombolSekunder} onClick={() => setUlang((n) => n + 1)}>
            Coba lagi
          </button>
        </div>
      ) : baris.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">
          {q ? `Tidak ada riwayat yang cocok dengan "${q}".` : 'Anggota ini belum punya riwayat poin.'}
        </p>
      ) : (
        <div className="relative mt-3 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-1">
          <div aria-busy={memuat} className={`space-y-2 transition-opacity ${memuat ? 'opacity-60' : ''}`}>
            {kelompok.map((g) => (
              <details key={g.id ?? 'tanpa'} className="overflow-hidden rounded-xl border border-slate-200">
                <summary className="flex cursor-pointer list-none items-center gap-2 bg-slate-50 px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 [&::-webkit-details-marker]:hidden">
                  <ChevronRight
                    className="h-4 w-4 shrink-0 text-slate-500 transition-transform [details[open]_&]:rotate-90"
                    aria-hidden="true"
                  />
                  <span
                    className={`min-w-0 flex-1 truncate text-sm font-semibold ${
                      g.id === null ? 'italic text-slate-600' : 'text-slate-900'
                    }`}
                  >
                    {g.nama}
                  </span>
                  <span className="shrink-0 text-xs text-slate-500">{g.jumlah} riwayat</span>
                  <span
                    className={`shrink-0 text-sm font-bold tabular-nums ${
                      g.total >= 0 ? 'text-green-700' : 'text-red-600'
                    }`}
                  >
                    {g.total > 0 ? '+' : ''}
                    {g.total.toLocaleString('id-ID')}
                    <span className="sr-only"> poin</span>
                  </span>
                </summary>

                {g.item.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-slate-500">
                    Riwayat kategori ini belum dimuat. Tekan &quot;Muat lebih banyak&quot; di bawah.
                  </p>
                ) : (
                  <ul className="divide-y divide-slate-100 px-3">
                    {g.item.map((b) => (
                      <li key={b.id} className="flex items-start gap-3 py-2">
                        <div className="min-w-0 flex-1">
                          <p
                            className={`break-words text-sm leading-5 ${
                              b.keterangan ? 'text-slate-900' : 'italic text-slate-500'
                            }`}
                          >
                            {b.keterangan || 'Tanpa keterangan'}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            <time dateTime={b.created_at}>{formatTanggal.format(new Date(b.created_at))}</time>
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end">
                          <p
                            className={`text-sm font-bold tabular-nums ${
                              b.poin >= 0 ? 'text-green-700' : 'text-red-600'
                            }`}
                          >
                            {b.poin > 0 ? '+' : ''}
                            {b.poin.toLocaleString('id-ID')}
                            <span className="sr-only"> poin</span>
                          </p>
                          <button
                            type="button"
                            onClick={() => setDiedit(b)}
                            aria-label={`Ubah riwayat ${b.poin > 0 ? '+' : ''}${b.poin.toLocaleString('id-ID')} poin, ${formatTanggal.format(new Date(b.created_at))}`}
                            className="-mr-2 inline-flex h-7 cursor-pointer items-center gap-1 rounded-md px-2 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                          >
                            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                            Ubah
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </details>
            ))}
          </div>

          <div className="mt-3 flex flex-col items-center gap-2 pb-1">
            {galat === 'lagi' && (
              <p className="text-sm text-red-600" role="alert">
                Gagal memuat riwayat berikutnya. Coba lagi.
              </p>
            )}
            {adaLagi ? (
              <button type="button" onClick={muatLagi} disabled={memuat || memuatLagi} className={tombolSekunderBesar}>
                {memuatLagi && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {memuatLagi ? 'Memuat' : 'Muat lebih banyak'}
              </button>
            ) : (
              !memuat && (
                <p className="text-xs text-slate-500">
                  {q ? 'Semua hasil pencarian sudah ditampilkan.' : 'Semua riwayat sudah ditampilkan.'}
                </p>
              )
            )}
          </div>
        </div>
      )}

      {diedit && (
        <EditMutasi
          key={diedit.id}
          mutasi={diedit}
          kategori={kategori}
          onTutup={() => setDiedit(null)}
          onTersimpan={sesudahDiubah}
        />
      )}
    </section>
  );
}