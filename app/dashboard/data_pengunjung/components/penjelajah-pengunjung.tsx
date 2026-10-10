'use client';

import { useEffect, useRef, useState } from 'react';
import { BarChart3, ChevronRight, FileText, Folder, Home } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  LOKASI_AWAL,
  NAMA_BULAN,
  TAB_GRAFIK,
  namaLokasi,
  rentang,
  samaLokasi,
  tombolSekunder,
  tombolUtama,
  type IsiFolder,
  type Lokasi,
  type TabGrafik,
} from '../konfigurasi';
import PanelGrafik from './panel-grafik';
import DataMentah from './data-mentah';

type Anak = { k: number; nama: string; sub?: string; n: number; unik: number; lokasi: Lokasi };
type Grafik = { lokasi: Lokasi; tab: TabGrafik } | null;

const fmt = (n: number) => n.toLocaleString('id-ID');
const tingkatLokasi = (l: Lokasi) => (!l.tahun ? 0 : !l.bulan ? 1 : !l.minggu ? 2 : 3);

export default function PenjelajahPengunjung() {
  const [lokasi, setLokasi] = useState<Lokasi>(LOKASI_AWAL);
  const [mentah, setMentah] = useState(false);
  const [isi, setIsi] = useState<IsiFolder[] | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState(false);
  const [grafik, setGrafik] = useState<Grafik>(null);
  const permintaan = useRef(0);

  const tingkat = tingkatLokasi(lokasi);

  function buka(l: Lokasi, bukaMentah = false) {
    setLokasi(l);
    setMentah(bukaMentah);
    setGrafik(null);
  }

  useEffect(() => {
    if (tingkat === 3) {
      setIsi([]);
      setMemuat(false);
      setGalat(false);
      return;
    }
    const id = ++permintaan.current;
    setIsi(null);
    setMemuat(true);
    setGalat(false);
    (async () => {
      const { data, error } = await supabase.rpc('folder_pengunjung', {
        p_tahun: lokasi.tahun,
        p_bulan: lokasi.bulan,
      });
      if (id !== permintaan.current) return; // abaikan respons lama
      if (error) {
        console.error('Gagal memuat folder pengunjung:', error);
        setGalat(true);
      } else {
        setIsi((data ?? []) as IsiFolder[]);
      }
      setMemuat(false);
    })();
  }, [lokasi.tahun, lokasi.bulan, tingkat]);

  // Susun isi folder: tahun (hanya yang ada datanya), 12 bulan, atau 5 minggu
  const anak: Anak[] = (() => {
    if (!isi || tingkat === 3) return [];
    const peta = new Map(isi.map((f) => [f.k, f]));

    if (tingkat === 0) {
      return [...isi]
        .sort((a, b) => b.k - a.k)
        .map((f) => ({
          k: f.k,
          nama: String(f.k),
          n: f.n,
          unik: f.unik,
          lokasi: { tahun: f.k, bulan: null, minggu: null },
        }));
    }

    if (tingkat === 1) {
      return NAMA_BULAN.map((nama, i) => ({
        k: i + 1,
        nama,
        n: peta.get(i + 1)?.n ?? 0,
        unik: peta.get(i + 1)?.unik ?? 0,
        lokasi: { tahun: lokasi.tahun, bulan: i + 1, minggu: null },
      }));
    }

    return [1, 2, 3, 4, 5].map((m) => {
      const l: Lokasi = { tahun: lokasi.tahun, bulan: lokasi.bulan, minggu: m };
      const { dari, sampai } = rentang(l);
      const awal = Number((dari ?? '').slice(8));
      const akhir = Number((sampai ?? '').slice(8));
      return {
        k: m,
        nama: `Minggu ${m}`,
        sub: `${awal}–${akhir} ${NAMA_BULAN[(lokasi.bulan ?? 1) - 1]}`,
        n: peta.get(m)?.n ?? 0,
        unik: peta.get(m)?.unik ?? 0,
        lokasi: l,
      };
    });
  })();

  const maks = Math.max(1, ...anak.map((a) => a.n));
  const totalFolder = anak.reduce((a, b) => a + b.n, 0);

  return (
    <div className="space-y-4">
      {/* Jejak folder */}
      <nav
        aria-label="Lokasi folder"
        className="flex flex-wrap items-center gap-1 rounded-2xl border border-blue-100 bg-white px-3 py-2 text-sm"
      >
        <button
          type="button"
          onClick={() => buka(LOKASI_AWAL)}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-semibold text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 [@media(hover:hover)]:hover:bg-blue-50"
        >
          <Home className="h-4 w-4" aria-hidden="true" />
          Data Pengunjung
        </button>
        {lokasi.tahun && (
          <>
            <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden="true" />
            <button
              type="button"
              onClick={() => buka({ tahun: lokasi.tahun, bulan: null, minggu: null })}
              className="rounded-md px-2 py-1 font-semibold text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 [@media(hover:hover)]:hover:bg-blue-50"
            >
              {lokasi.tahun}
            </button>
          </>
        )}
        {lokasi.bulan && (
          <>
            <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden="true" />
            <button
              type="button"
              onClick={() => buka({ tahun: lokasi.tahun, bulan: lokasi.bulan, minggu: null })}
              className="rounded-md px-2 py-1 font-semibold text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 [@media(hover:hover)]:hover:bg-blue-50"
            >
              {NAMA_BULAN[lokasi.bulan - 1]}
            </button>
          </>
        )}
        {lokasi.minggu && (
          <>
            <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden="true" />
            <button
              type="button"
              onClick={() => buka(lokasi)}
              className={`rounded-md px-2 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                mentah ? 'font-semibold text-blue-700 [@media(hover:hover)]:hover:bg-blue-50' : 'font-bold text-slate-900'
              }`}
            >
              Minggu {lokasi.minggu}
            </button>
          </>
        )}
        {mentah && (
          <>
            <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden="true" />
            <span className="px-2 py-1 font-bold text-slate-900">Data mentah</span>
          </>
        )}
      </nav>

      {/* Tombol grafik untuk lokasi yang sedang dibuka (folder ini atau data mentah) */}
      <section aria-label="Tampilkan grafik" className="rounded-2xl border border-blue-100 bg-white p-4">
        <p className="mb-3 text-sm font-semibold text-slate-900">
          Grafik {mentah ? 'data mentah' : 'folder ini'}: <span className="font-normal text-slate-600">{namaLokasi(lokasi)}</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {TAB_GRAFIK.map((t) => {
            const aktif = grafik !== null && samaLokasi(grafik.lokasi, lokasi) && grafik.tab === t.kunci;
            return (
              <button
                key={t.kunci}
                type="button"
                onClick={() => setGrafik({ lokasi, tab: t.kunci })}
                aria-pressed={aktif}
                className={`${aktif ? tombolUtama : tombolSekunder} !px-3 !py-1.5 !text-xs`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </section>

      {grafik && (
        <PanelGrafik
          lokasi={grafik.lokasi}
          tab={grafik.tab}
          onTab={(tab) => setGrafik({ lokasi: grafik.lokasi, tab })}
          onTutup={() => setGrafik(null)}
        />
      )}

      {/* Isi folder */}
      {mentah ? (
        <DataMentah lokasi={lokasi} />
      ) : tingkat === 3 ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          <li className="flex flex-col gap-3 rounded-2xl border border-blue-100 bg-white p-4">
            <button
              type="button"
              onClick={() => buka(lokasi, true)}
              className="flex items-start gap-3 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <FileText className="mt-0.5 h-8 w-8 shrink-0 text-blue-600" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block font-semibold text-slate-900">Data mentah</span>
                <span className="block text-xs text-slate-500">
                  Daftar kunjungan {namaLokasi(lokasi)}
                </span>
              </span>
            </button>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => buka(lokasi, true)} className={`${tombolUtama} !px-3 !py-1.5 !text-xs`}>
                Buka
              </button>
              <button
                type="button"
                onClick={() => setGrafik({ lokasi, tab: 'waktu' })}
                className={`${tombolSekunder} !px-3 !py-1.5 !text-xs`}
              >
                <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" />
                Grafik
              </button>
            </div>
          </li>
        </ul>
      ) : (
        <section aria-label="Isi folder">
          {memuat && (
            <div aria-hidden="true" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-32 animate-pulse rounded-2xl bg-white/80" />
              ))}
            </div>
          )}

          {galat && (
            <p role="alert" className="rounded-2xl border border-red-100 bg-red-50 px-4 py-6 text-center text-sm text-red-700">
              Folder gagal dimuat. Pastikan fungsi SQL <code>folder_pengunjung</code> sudah dibuat, lalu muat ulang
              halaman.
            </p>
          )}

          {!memuat && !galat && anak.length === 0 && (
            <p className="rounded-2xl border border-blue-100 bg-white px-4 py-10 text-center text-sm text-slate-500">
              Belum ada data kunjungan.
            </p>
          )}

          {!memuat && !galat && anak.length > 0 && (
            <>
              <p className="mb-3 text-sm text-slate-300">
                {anak.length} folder · {fmt(totalFolder)} kunjungan
              </p>
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {anak.map((a) => {
                  const kosong = a.n === 0;
                  return (
                    <li
                      key={a.k}
                      className={`flex flex-col gap-3 rounded-2xl border p-4 ${
                        kosong ? 'border-slate-200 bg-slate-100' : 'border-blue-100 bg-white'
                      }`}
                    >
                      <button
                        type="button"
                        disabled={kosong}
                        onClick={() => buka(a.lokasi)}
                        className="flex items-start gap-3 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed"
                      >
                        <Folder
                          className={`mt-0.5 h-8 w-8 shrink-0 ${kosong ? 'text-slate-400' : 'text-amber-500'}`}
                          aria-hidden="true"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold text-slate-900">{a.nama}</span>
                          {a.sub && <span className="block text-xs text-slate-500">{a.sub}</span>}
                          <span className="mt-1 block text-xs tabular-nums text-slate-600">
                            {kosong ? 'Kosong' : `${fmt(a.n)} kunjungan · ${fmt(a.unik)} orang`}
                          </span>
                        </span>
                      </button>

                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
                        <div className="h-full rounded-full bg-blue-500" style={{ width: `${(a.n / maks) * 100}%` }} />
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={kosong}
                          onClick={() => buka(a.lokasi)}
                          className={`${tombolUtama} !px-3 !py-1.5 !text-xs`}
                        >
                          Buka
                        </button>
                        <button
                          type="button"
                          disabled={kosong}
                          onClick={() => setGrafik({ lokasi: a.lokasi, tab: 'waktu' })}
                          className={`${tombolSekunder} !px-3 !py-1.5 !text-xs`}
                        >
                          <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" />
                          Grafik
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </section>
      )}
    </div>
  );
}