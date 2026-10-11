'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Search, UserRound, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import DuaKolom from './dua-kolom';
import RiwayatPoin from './riwayat-poin';
import type { AnggotaPilihan } from './pilih-anggota';
import type { KategoriPoin } from './kelola-kategori';
import { kelasInput, tombolSekunder, tombolSekunderBesar } from './ui';

const PER_HALAMAN = 15;
const DEBOUNCE_MS = 350;

const KOLOM_ANGGOTA = 'id, nama, nis, jenjang, organisasi, total_poin';

const infoAnggota = (a: AnggotaPilihan) =>
  `NIS ${a.nis} · ${a.jenjang}${a.organisasi ? ` · ${a.organisasi}` : ''}`;

export default function AnggotaBermutasi({
  aktif,
  versiInput,
  versiKategori,
  onMutasiBerubah,
}: {
  /** Apakah tab ini sedang ditampilkan. */
  aktif: boolean;
  /** Naik setiap kali mutasi berubah dari tab Input poin; daftar dimuat ulang saat tab ini dibuka. */
  versiInput: number;
  versiKategori: number;
  /** Dipanggil setelah sebuah riwayat diubah dari tab ini. */
  onMutasiBerubah?: () => void;
}) {
  const [kueri, setKueri] = useState('');
  const [q, setQ] = useState('');
  const [baris, setBaris] = useState<AnggotaPilihan[]>([]);
  const [adaLagi, setAdaLagi] = useState(false);
  const [memuat, setMemuat] = useState(true);
  const [memuatLagi, setMemuatLagi] = useState(false);
  const [galat, setGalat] = useState<'awal' | 'lagi' | null>(null);
  const [ulang, setUlang] = useState(0);
  const [versiDaftar, setVersiDaftar] = useState(0);
  const [terpilih, setTerpilih] = useState<AnggotaPilihan | null>(null);
  const [kategori, setKategori] = useState<KategoriPoin[]>([]);
  const permintaan = useRef(0);
  const detailRef = useRef<HTMLDivElement>(null);

  // Debounce pencarian + buang karakter yang punya arti khusus di filter PostgREST / ilike
  useEffect(() => {
    const bersih = kueri.replace(/[%_,()*\\"']/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);
    const t = setTimeout(() => setQ(bersih), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [kueri]);

  // Muat ulang daftar saat tab dibuka kembali setelah ada mutasi baru dari tab Input poin
  useEffect(() => {
    if (aktif) setVersiDaftar(versiInput);
  }, [aktif, versiInput]);

  // Kategori dipakai riwayat di kanan (untuk pencarian dan pengelompokan)
  useEffect(() => {
    let batal = false;
    supabase
      .from('kategori_poin')
      .select('id, nama, keterangan, created_at')
      .order('nama', { ascending: true })
      .then(({ data, error }) => {
        if (batal) return;
        if (error) {
          console.error('Gagal memuat kategori poin:', error);
          return;
        }
        setKategori((data ?? []) as KategoriPoin[]);
      });
    return () => {
      batal = true;
    };
  }, [versiKategori]);

  // `mutasi_poin!inner` hanya meloloskan anggota yang punya minimal satu mutasi.
  // Embed dibatasi 1 baris supaya tidak membawa seluruh id mutasi.
  const ambil = useCallback(
    async (mulai: number) => {
      let query = supabase
        .from('anggota')
        .select(`${KOLOM_ANGGOTA}, mutasi_poin!inner(id)`)
        .order('nama', { ascending: true })
        .order('id', { ascending: true })
        .limit(1, { referencedTable: 'mutasi_poin' })
        .range(mulai, mulai + PER_HALAMAN); // inklusif: PER_HALAMAN + 1 baris untuk mengetahui masih ada lagi
      if (q) query = query.or(`nama.ilike.%${q}%,nis.eq.${q}`);

      const { data, error } = await query;
      if (error) throw error;
      const semua = (data ?? []) as unknown as AnggotaPilihan[];
      return { item: semua.slice(0, PER_HALAMAN), adaLagi: semua.length > PER_HALAMAN };
    },
    [q],
  );

  useEffect(() => {
    const no = ++permintaan.current;
    setMemuat(true);
    setMemuatLagi(false);
    setGalat(null);

    ambil(0)
      .then((h) => {
        if (no !== permintaan.current) return;
        setBaris(h.item);
        setAdaLagi(h.adaLagi);
        setMemuat(false);
      })
      .catch((err) => {
        if (no !== permintaan.current) return;
        // Error Supabase berupa objek biasa yang tampil sebagai {} di console, jadi cetak field-nya satu per satu
        const e = err as { code?: string; message?: string; details?: string; hint?: string };
        console.error('Gagal memuat anggota bermutasi:', e?.code, e?.message, e?.details, e?.hint);
        setBaris([]);
        setAdaLagi(false);
        setGalat('awal');
        setMemuat(false);
      });

    return () => {
      permintaan.current++;
    };
  }, [ambil, versiDaftar, ulang]);

  async function muatLagi() {
    if (memuat || memuatLagi || baris.length === 0) return;
    const no = permintaan.current;
    setMemuatLagi(true);
    setGalat(null);
    try {
      const h = await ambil(baris.length);
      if (no !== permintaan.current) return;
      setBaris((lama) => {
        const sudah = new Set(lama.map((a) => a.id));
        return [...lama, ...h.item.filter((a) => !sudah.has(a.id))];
      });
      setAdaLagi(h.adaLagi);
      setMemuatLagi(false);
    } catch (err) {
      if (no !== permintaan.current) return;
      console.error('Gagal memuat anggota berikutnya:', err);
      setGalat('lagi');
      setMemuatLagi(false);
    }
  }

  function pilih(a: AnggotaPilihan) {
    setTerpilih(a);
    // Di layar sempit detail ada di bawah daftar, jadi bawa ke sana
    if (!window.matchMedia('(min-width: 1024px)').matches) {
      requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
  }

  // Setelah sebuah riwayat diubah, total poin anggota ikut berubah: ambil ulang untuk daftar dan kartu
  async function segarkanAnggota(id: string) {
    const { data: segar } = await supabase
      .from('anggota')
      .select(KOLOM_ANGGOTA)
      .eq('id', id)
      .maybeSingle();
    if (segar) {
      const baru = segar as AnggotaPilihan;
      setBaris((lama) => lama.map((a) => (a.id === baru.id ? baru : a)));
      setTerpilih((sekarang) => (sekarang && sekarang.id === baru.id ? baru : sekarang));
    }
  }

  return (
    <DuaKolom>
      <section
        aria-labelledby="anggota-bermutasi-judul"
        className="relative rounded-2xl border border-blue-100 bg-white p-4 sm:p-5 lg:flex lg:flex-col lg:overflow-hidden"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id="anggota-bermutasi-judul" className="text-base font-bold text-slate-900">
            Anggota yang punya riwayat poin
          </h2>
          {memuat && baris.length > 0 && (
            <Loader2 className="h-4 w-4 animate-spin text-slate-400" aria-hidden="true" />
          )}
        </div>

        <div className="relative mt-3">
          <label htmlFor="anggota-bermutasi-cari" className="sr-only">
            Cari anggota
          </label>
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            id="anggota-bermutasi-cari"
            type="text"
            autoComplete="off"
            placeholder="Cari nama atau NIS anggota"
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
          {!memuat && !galat ? `Menampilkan ${baris.length} anggota.` : ''}
        </p>

        {baris.length === 0 && memuat ? (
          <p className="mt-4 flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Memuat anggota…
          </p>
        ) : galat === 'awal' ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-red-600">Daftar anggota gagal dimuat.</p>
            <button type="button" className={tombolSekunder} onClick={() => setUlang((n) => n + 1)}>
              Coba lagi
            </button>
          </div>
        ) : baris.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">
            {q ? `Tidak ada anggota bermutasi yang cocok dengan "${q}".` : 'Belum ada anggota yang punya riwayat poin.'}
          </p>
        ) : (
          <div className="relative mt-3 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-1">
            <ul aria-busy={memuat} className={`space-y-2 transition-opacity ${memuat ? 'opacity-60' : ''}`}>
              {baris.map((a) => {
                const dipilih = terpilih?.id === a.id;
                const total = a.total_poin ?? 0;
                return (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={() => pilih(a)}
                      aria-pressed={dipilih}
                      className={`flex w-full cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                        dipilih
                          ? 'border-blue-400 bg-blue-50'
                          : 'border-slate-200 bg-white hover:border-blue-300'
                      }`}
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-blue-600">
                        <UserRound className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-slate-900">{a.nama}</span>
                        <span className="block truncate text-xs text-slate-500">{infoAnggota(a)}</span>
                      </span>
                      <span
                        className={`shrink-0 text-sm font-bold tabular-nums ${
                          total >= 0 ? 'text-green-700' : 'text-red-600'
                        }`}
                      >
                        {total.toLocaleString('id-ID')}
                        <span className="sr-only"> poin</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="mt-3 flex flex-col items-center gap-2 pb-1">
              {galat === 'lagi' && (
                <p className="text-sm text-red-600" role="alert">
                  Gagal memuat anggota berikutnya. Coba lagi.
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
                    {q ? 'Semua hasil pencarian sudah ditampilkan.' : 'Semua anggota sudah ditampilkan.'}
                  </p>
                )
              )}
            </div>
          </div>
        )}
      </section>

      {terpilih ? (
        <div ref={detailRef} className="scroll-mt-4 lg:flex lg:min-h-0 lg:flex-col lg:gap-3">
          <div className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-white px-4 py-3 lg:shrink-0">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
              <UserRound className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900">{terpilih.nama}</p>
              <p className="truncate text-xs text-slate-600">{infoAnggota(terpilih)}</p>
            </div>
            <p className="shrink-0 text-right text-xs font-medium text-blue-700">
              Total poin
              <span className="block text-base font-bold tabular-nums">
                {(terpilih.total_poin ?? 0).toLocaleString('id-ID')}
              </span>
            </p>
          </div>

          <div className="lg:flex lg:min-h-0 lg:flex-1 lg:flex-col lg:[&>*]:min-h-0 lg:[&>*]:flex-1">
            <RiwayatPoin
              key={terpilih.id}
              anggotaId={terpilih.id}
              kategori={kategori}
              versi={0}
              onDiubah={() => {
                segarkanAnggota(terpilih.id);
                onMutasiBerubah?.();
              }}
            />
          </div>
        </div>
      ) : (
        <div className="hidden items-center justify-center rounded-2xl border border-dashed border-slate-500 p-6 text-center text-sm text-slate-300 lg:flex">
          Pilih anggota di kiri untuk melihat riwayat poinnya di sini.
        </div>
      )}
    </DuaKolom>
  );
}