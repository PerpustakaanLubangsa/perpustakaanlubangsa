'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Inbox,
  Printer,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

/* =====================================================================
   KONFIGURASI
   ===================================================================== */

const PAGE_SIZE = 20;
const COLUMNS = 'id, kode, nomor_panggil, lokasi_rak, status, biblio:biblio_id(judul, penulis)';

// Kertas folio / F4 dengan margin 10 mm
const PAPER_W = 215;
const PAPER_H = 330;
const MARGIN = 10;
const GAP = 3;

// Selalu 3 kolom. Lebar label dihitung supaya 3 kolom memenuhi lebar kertas:
// (215 - 2 x 10 - 2 x 3) / 3 = 63 mm
const COLS = 3;
const LABEL_W = (PAPER_W - 2 * MARGIN - (COLS - 1) * GAP) / COLS;
// Tinggi label (mm), bisa diubah sesuai kebutuhan
const LABEL_H = 40;

const MM_PX = 96 / 25.4;
const ROWS_PER_PAGE = Math.floor((PAPER_H - 2 * MARGIN + GAP) / (LABEL_H + GAP));
const PER_PAGE = COLS * ROWS_PER_PAGE;

// Semua teks label (header dan nomor panggil) memakai ukuran bold yang sama
const FONT_PT = 11;
const FONT_MM = +((FONT_PT * 25.4) / 72).toFixed(3);
const FONT_FAMILY = 'Arial, Helvetica, sans-serif';
// Judul buku: kecil dan tidak bold
const JUDUL_PT = 6;

// Header label
const HEADER_BARIS_1 = 'Perpustakaan PP. Annuqayah';
const HEADER_BARIS_2 = 'Daerah Lubangsa';
const WARNA_HEADER_BG = '#d1d5db'; // latar abu-abu
const WARNA_HEADER_TEKS = '#111827';
const WARNA_GARIS = '#4b5563'; // garis pembatas pada label

// Lebar isi header dalam mm (lebar label dikurangi border dan padding)
const HEADER_INNER_W = LABEL_W - 3;

interface Eksemplar {
  id: string;
  kode: string;
  nomorPanggil: string;
  lokasiRak: string;
  status: string;
  judul: string;
  penulis: string;
}

const TITLE = 'Cetak Label';
const SUBTITLE = 'Cari eksemplar, pilih yang ingin dicetak, lalu cetak label punggung buku (nomor panggil).';

/* =====================================================================
   GAYA
   ===================================================================== */

const CARD = 'bg-white border border-slate-200 shadow-sm';
const BADGE = 'bg-blue-50 text-blue-600 border border-blue-200';

const dasarTombol =
  'inline-flex cursor-pointer touch-manipulation select-none items-center justify-center gap-1.5 rounded-lg border px-4 py-2 text-xs font-extrabold uppercase tracking-wider transition-[transform,box-shadow] duration-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 [@media(hover:hover)]:hover:translate-y-1 [@media(hover:hover)]:hover:shadow-none active:translate-y-1 active:shadow-none';

const tombolUtama = `${dasarTombol} border-blue-800 bg-blue-600 text-white shadow-[0_4px_0_0_#1e40af]`;
const tombolSekunder = `${dasarTombol} border-slate-300 bg-white text-slate-700 shadow-[0_4px_0_0_#cbd5e1]`;
const tombolKecil = '!px-2.5 !py-1.5 !text-[10px]';

// Saat mencetak, semua isi halaman disembunyikan kecuali #area-cetak-root
// (display: none, bukan visibility, supaya tidak ada halaman kosong tambahan).
// .label-header dipaksa mencetak warna latarnya walau "Background graphics" mati.
const CETAK_CSS = `
  @page { size: ${PAPER_W}mm ${PAPER_H}mm; margin: ${MARGIN}mm; }
  .label-header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  #area-cetak-root { display: none; }
  @media print {
    html, body { background: #fff !important; margin: 0 !important; padding: 0 !important; }
    body > *:not(#area-cetak-root) { display: none !important; }
    #area-cetak-root { display: block !important; }
  }
`;

/* =====================================================================
   KOMPONEN KECIL
   ===================================================================== */

// Header label: latar abu-abu, teks bold. Baris pertama direntangkan selebar header
// (hanya jarak antarhuruf yang disesuaikan, ukuran huruf tetap sama dengan teks lain).
function LabelHeader() {
  const tinggi = 9;
  return (
    <div
      className="label-header"
      style={{
        background: WARNA_HEADER_BG,
        borderBottom: `0.3mm solid ${WARNA_GARIS}`,
        padding: '0.7mm 1.2mm',
      }}
    >
      <svg
        viewBox={`0 0 ${HEADER_INNER_W} ${tinggi}`}
        role="img"
        aria-label={`${HEADER_BARIS_1} ${HEADER_BARIS_2}`}
        style={{ display: 'block', width: '100%', height: 'auto' }}
      >
        <text
          x="0.5"
          y="3.6"
          fontSize={FONT_MM}
          fontWeight="700"
          fill={WARNA_HEADER_TEKS}
          fontFamily={FONT_FAMILY}
          textLength={HEADER_INNER_W - 1}
          lengthAdjust="spacing"
        >
          {HEADER_BARIS_1}
        </text>
        <text
          x={HEADER_INNER_W / 2}
          y="8.2"
          textAnchor="middle"
          fontSize={FONT_MM}
          fontWeight="700"
          fill={WARNA_HEADER_TEKS}
          fontFamily={FONT_FAMILY}
        >
          {HEADER_BARIS_2}
        </text>
      </svg>
    </div>
  );
}

// Satu label punggung buku: ukuran tetap dalam mm.
// Urutan: header, nomor panggil (satu baris per bagian), garis, judul buku.
function LabelCard({ nomorPanggil, judul }: { nomorPanggil: string; judul: string }) {
  const baris = nomorPanggil.trim().split(/\s+/).filter(Boolean);

  return (
    <div
      className="flex flex-col border border-slate-400 bg-white text-black overflow-hidden"
      style={{
        width: `${LABEL_W}mm`,
        height: `${LABEL_H}mm`,
        boxSizing: 'border-box',
        breakInside: 'avoid',
        pageBreakInside: 'avoid',
        fontFamily: FONT_FAMILY,
      }}
    >
      <LabelHeader />

      {/* Nomor panggil: bold, ukuran sama dengan header */}
      <div
        className="flex-1 min-h-0 flex flex-col items-center justify-center overflow-hidden"
        style={{ padding: '1mm 1.5mm' }}
      >
        {baris.map((b, i) => (
          <div
            key={i}
            className="text-center w-full whitespace-nowrap overflow-hidden text-ellipsis"
            style={{ fontSize: `${FONT_PT}pt`, fontWeight: 700, lineHeight: 1.2 }}
          >
            {b}
          </div>
        ))}
      </div>

      {/* Judul buku: kecil, tidak bold, maksimal 2 baris */}
      <div
        className="text-center"
        style={{
          borderTop: `0.3mm solid ${WARNA_GARIS}`,
          padding: '0.8mm 1.5mm',
        }}
      >
        <div
          className="overflow-hidden"
          style={{
            fontSize: `${JUDUL_PT}pt`,
            fontWeight: 400,
            lineHeight: 1.2,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {judul}
        </div>
      </div>
    </div>
  );
}

function LabelGrid({ items }: { items: Eksemplar[] }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${COLS}, ${LABEL_W}mm)`,
        gap: `${GAP}mm`,
        justifyContent: 'start',
      }}
    >
      {items.map((item) => (
        <LabelCard key={item.id} nomorPanggil={item.nomorPanggil} judul={item.judul} />
      ))}
    </div>
  );
}

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <span
      className={`w-4 h-4 shrink-0 rounded border flex items-center justify-center transition-colors ${
        checked ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-300 text-transparent'
      }`}
    >
      <Check className="w-3 h-3" strokeWidth={3} />
    </span>
  );
}

function SkeletonRow() {
  return (
    <div className="animate-pulse px-5 py-3.5 flex items-center gap-3">
      <div className="w-4 h-4 rounded bg-blue-100 shrink-0" />
      <div className="space-y-2 flex-1">
        <div className="h-3 w-1/2 rounded bg-blue-100" />
        <div className="h-2.5 w-1/3 rounded bg-blue-50" />
      </div>
      <div className="h-5 w-16 rounded-md bg-blue-100" />
    </div>
  );
}

/* =====================================================================
   HALAMAN
   ===================================================================== */

export default function LabelPage() {
  const router = useRouter();

  const [authReady, setAuthReady] = useState(false);
  const [canPortal, setCanPortal] = useState(false);

  // Daftar hasil pencarian
  const [rows, setRows] = useState<Eksemplar[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [moreError, setMoreError] = useState<string | null>(null);

  // Pencarian
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Pilihan (tetap tersimpan walau pencarian berubah)
  const [selected, setSelected] = useState<Record<string, Eksemplar>>({});

  // Ukuran area pratinjau (untuk memperkecil tampilan agar muat di layar)
  const previewRef = useRef<HTMLDivElement>(null);
  const [avail, setAvail] = useState(0);

  const mounted = useRef(true);
  const reqId = useRef(0);
  const fetched = useRef(0);

  useEffect(() => {
    document.title = TITLE;
    mounted.current = true;
    setCanPortal(true);
    return () => {
      mounted.current = false;
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

  // Pantau lebar area pratinjau
  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setAvail(el.clientWidth));
    ro.observe(el);
    setAvail(el.clientWidth);
    return () => ro.disconnect();
  }, [authReady]);

  // Tunda pencarian
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 350);
    return () => clearTimeout(t);
  }, [query]);

  /* ---------- Muat daftar ---------- */
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
        let q: any = supabase
          .from('eksemplar')
          .select(COLUMNS, isFirst ? { count: 'exact' } : undefined);

        const term = debouncedQuery.replace(/[%,()*\\]/g, ' ').replace(/\s+/g, ' ').trim();
        if (term) {
          // Cari juga lewat judul / penulis di tabel biblio
          const { data: bib, error: bibError } = await supabase
            .from('biblio')
            .select('id')
            .or(`judul.ilike.%${term}%,penulis.ilike.%${term}%`)
            .limit(200);
          if (bibError) throw bibError;
          if (!mounted.current || id !== reqId.current) return;

          const ids = (bib ?? []).map((b: any) => b.id);
          const parts = [`kode.ilike.%${term}%`, `nomor_panggil.ilike.%${term}%`];
          if (ids.length) parts.push(`biblio_id.in.(${ids.join(',')})`);
          q = q.or(parts.join(','));
        }

        // Terbaru di atas. Eksemplar tanpa created_at di paling bawah,
        // id sebagai pembeda supaya halaman berikutnya tidak tumpang tindih.
        const { data, error: fetchError, count } = await q
          .order('created_at', { ascending: false, nullsFirst: false })
          .order('id', { ascending: false })
          .range(offset, offset + PAGE_SIZE - 1);

        if (!mounted.current || id !== reqId.current) return;
        if (fetchError) throw fetchError;

        const raw: any[] = data ?? [];
        const items: Eksemplar[] = raw.map((row) => {
          const b = Array.isArray(row.biblio) ? row.biblio[0] : row.biblio;
          return {
            id: row.id,
            kode: row.kode ?? '',
            nomorPanggil: row.nomor_panggil ?? '',
            lokasiRak: row.lokasi_rak ?? '',
            status: row.status ?? '',
            judul: b?.judul ?? '-',
            penulis: b?.penulis ?? '',
          };
        });

        fetched.current = offset + raw.length;
        const totalMatch = isFirst ? count ?? raw.length : undefined;

        setRows((prev) => (isFirst ? items : [...prev, ...items]));
        if (totalMatch !== undefined) setTotal(totalMatch);
        setHasMore(
          raw.length === PAGE_SIZE && fetched.current < (totalMatch ?? Number.POSITIVE_INFINITY),
        );
      } catch (err: any) {
        if (!mounted.current || id !== reqId.current) return;
        const msg = err?.message || 'Gagal memuat data eksemplar.';
        if (isFirst) setError(msg);
        else setMoreError(msg);
      } finally {
        if (mounted.current && id === reqId.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [debouncedQuery],
  );

  useEffect(() => {
    if (authReady) loadPage(0);
  }, [authReady, loadPage]);

  /* ---------- Pilihan ---------- */
  // Label hanya bisa dibuat jika eksemplar punya nomor panggil
  const bisaDipilih = (r: Eksemplar) => r.nomorPanggil.trim() !== '';

  const toggle = (item: Eksemplar) =>
    setSelected((prev) => {
      const next = { ...prev };
      if (next[item.id]) delete next[item.id];
      else next[item.id] = item;
      return next;
    });

  const validRows = rows.filter(bisaDipilih);
  const allOnPage = validRows.length > 0 && validRows.every((r) => selected[r.id]);

  const togglePage = () =>
    setSelected((prev) => {
      const next = { ...prev };
      if (allOnPage) validRows.forEach((r) => delete next[r.id]);
      else validRows.forEach((r) => (next[r.id] = r));
      return next;
    });

  // Pratinjau & cetak diurutkan sesuai nomor panggil (urutan rak), lalu kode
  const selectedList = Object.values(selected).sort(
    (a, b) =>
      a.nomorPanggil.localeCompare(b.nomorPanggil, 'id', { numeric: true }) ||
      a.kode.localeCompare(b.kode, 'id', { numeric: true }),
  );
  const hasSearch = debouncedQuery.trim() !== '';

  // Skala tampilan pratinjau (hanya di layar; hasil cetak selalu ukuran asli)
  const paperPx = (COLS * LABEL_W + (COLS - 1) * GAP) * MM_PX;
  const scale = avail > 0 ? Math.min(1, avail / paperPx) : 1;
  const pages = Math.max(1, Math.ceil(selectedList.length / PER_PAGE));

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-slate-800 flex flex-col font-sans">
      <style>{CETAK_CSS}</style>

      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        {/* Judul halaman */}
        <div>
          <h2 className="text-xl font-black text-white tracking-tight [text-shadow:0_1px_3px_rgba(0,0,0,0.35)]">
            {TITLE}
          </h2>
          <p className="text-xs text-white font-medium [text-shadow:0_1px_2px_rgba(0,0,0,0.35)]">
            {SUBTITLE}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ===== KIRI: daftar eksemplar ===== */}
          <div className={`${CARD} rounded-2xl overflow-hidden lg:col-span-5 min-w-0`}>
            <div className="p-5 space-y-4 border-b border-slate-200">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                    Daftar Eksemplar
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Terbaru di atas • centang eksemplar yang ingin dicetak labelnya
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => loadPage(0)}
                  disabled={loading}
                  aria-label="Muat ulang data"
                  className={`${tombolSekunder} ${tombolKecil}`}
                >
                  <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                  Muat Ulang
                </button>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-600 pointer-events-none" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Cari kode, nomor panggil, judul, atau penulis..."
                  aria-label="Cari eksemplar"
                  className="block w-full pl-9 pr-9 py-2.5 text-base sm:text-sm bg-blue-50 border border-blue-100 rounded-xl text-slate-900 placeholder-slate-500 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition-colors"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    aria-label="Hapus pencarian"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-700 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Pilih semua yang tampil */}
            {!loading && !error && validRows.length > 0 && (
              <button
                type="button"
                onClick={togglePage}
                className="w-full flex items-center gap-3 px-5 py-2.5 bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-wider hover:bg-blue-50 transition-colors cursor-pointer text-left"
              >
                <Checkbox checked={allOnPage} />
                {allOnPage ? 'Batalkan pilihan yang tampil' : 'Pilih semua yang tampil'}
              </button>
            )}

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
                  <button type="button" onClick={() => loadPage(0)} className={tombolUtama}>
                    Coba Lagi
                  </button>
                </div>
              ) : rows.length === 0 ? (
                <div className="px-5 py-12 flex flex-col items-center text-center gap-3">
                  <div className={`w-12 h-12 ${BADGE} rounded-xl flex items-center justify-center`}>
                    <Inbox className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900">
                      {hasSearch ? 'Tidak ada data yang cocok' : 'Belum ada eksemplar'}
                    </p>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                      {hasSearch
                        ? 'Coba ubah kata kunci pencarian.'
                        : 'Tambahkan eksemplar lewat halaman Bibliografi.'}
                    </p>
                  </div>
                </div>
              ) : (
                rows.map((item) => {
                  const checked = !!selected[item.id];
                  const disabled = !bisaDipilih(item);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggle(item)}
                      disabled={disabled}
                      aria-pressed={checked}
                      title={disabled ? 'Eksemplar ini belum punya nomor panggil' : undefined}
                      className={`w-full flex items-center gap-3 px-5 py-3 text-left transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                        checked ? 'bg-blue-50' : 'hover:bg-blue-50'
                      }`}
                    >
                      <Checkbox checked={checked} />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-black text-slate-900 truncate">{item.judul}</p>
                        <p className="text-[11px] text-slate-500 font-medium truncate">
                          {[
                            item.penulis,
                            item.nomorPanggil ? `No. panggil ${item.nomorPanggil}` : 'Tanpa nomor panggil',
                            item.lokasiRak && `Rak ${item.lokasiRak}`,
                          ]
                            .filter(Boolean)
                            .join(' • ')}
                        </p>
                      </div>
                      <span className="shrink-0 text-[10px] font-black text-blue-700 bg-blue-50 border border-blue-200 rounded-md px-2 py-1 tracking-wider">
                        {item.kode || '-'}
                      </span>
                    </button>
                  );
                })
              )}
            </div>

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
                  <button
                    type="button"
                    onClick={() => loadPage(fetched.current)}
                    disabled={loadingMore}
                    className={tombolSekunder}
                  >
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

          {/* ===== KANAN: pratinjau & cetak ===== */}
          <div className={`${CARD} rounded-2xl overflow-hidden lg:col-span-7 min-w-0 lg:sticky lg:top-6`}>
            <div className="p-5 space-y-4 border-b border-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                    Pratinjau Label
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {selectedList.length.toLocaleString('id-ID')} label dipilih
                    {selectedList.length > 0 && ` • ${pages} lembar folio`}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelected({})}
                    disabled={selectedList.length === 0}
                    className={tombolSekunder}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Kosongkan
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    disabled={selectedList.length === 0}
                    className={tombolUtama}
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Cetak
                  </button>
                </div>
              </div>

              <span className="block text-[11px] text-slate-500 font-medium">
                {COLS} kolom • label {LABEL_W} × {LABEL_H} mm • kertas folio {PAPER_W} × {PAPER_H} mm •{' '}
                {PER_PAGE} label per lembar
              </span>
            </div>

            <div className="p-5">
              {/* Wadah ukur lebar: selalu ada agar ResizeObserver tetap terpasang */}
              <div ref={previewRef} className="w-full">
                {selectedList.length === 0 ? (
                  <div className="py-12 flex flex-col items-center text-center gap-3">
                    <div className={`w-12 h-12 ${BADGE} rounded-xl flex items-center justify-center`}>
                      <Printer className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900">Belum ada label dipilih</p>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                        Centang eksemplar di daftar untuk melihat pratinjau label.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="max-h-[70vh] overflow-y-auto">
                    <div style={{ zoom: scale }}>
                      <LabelGrid items={selectedList} />
                    </div>
                  </div>
                )}
              </div>

              {selectedList.length > 0 && scale < 1 && (
                <p className="mt-3 text-[11px] text-slate-500 font-medium">
                  Pratinjau diperkecil {Math.round(scale * 100)}% agar muat di layar. Ukuran cetak tetap {LABEL_W} ×{' '}
                  {LABEL_H} mm.
                </p>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Area cetak: dipasang langsung di <body>, hanya ini yang tampil saat print */}
      {canPortal &&
        createPortal(
          <div id="area-cetak-root">
            <LabelGrid items={selectedList} />
          </div>,
          document.body,
        )}
    </div>
  );
}