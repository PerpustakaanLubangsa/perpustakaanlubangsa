'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronRight, Download, FileSpreadsheet, Loader2, RotateCcw, Table2, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  BULAN_SINGKAT,
  DIM,
  HARI_SINGKAT,
  NAMA_BULAN,
  WAKTU_AWAL,
  rentang,
  tanggalHari,
  tingkatTren,
  tombolSekunder,
  tombolUtama,
  type DimKey,
  type FilterDim,
  type Statistik,
  type Tingkat,
  type Waktu,
} from '../konfigurasi';
import { MAKS_EKSPOR, eksporMentah, eksporRingkasan } from '../ekspor';
import { BatangWaktu, DaftarBatang, Donut, KartuAngka, type TitikWaktu } from './grafik';
import DataMentah from './data-mentah';

type Hasil = { stat: Statistik; tingkat: Tingkat; waktu: Waktu };

const fmt = (n: number) => n.toLocaleString('id-ID');

function Kartu({ judul, ket, children, kelas = '' }: { judul: string; ket?: string; children: React.ReactNode; kelas?: string }) {
  return (
    <section className={`rounded-3xl border border-blue-100 bg-white p-4 sm:p-6 ${kelas}`}>
      <h2 className="text-base font-semibold text-slate-900">{judul}</h2>
      {ket && <p className="mt-0.5 text-xs text-slate-500">{ket}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function DashboardPengunjung() {
  const [waktu, setWaktu] = useState<Waktu>(WAKTU_AWAL);
  const [fDim, setFDim] = useState<FilterDim>({});
  const [hasil, setHasil] = useState<Hasil | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState(false);
  const [mentahTerbuka, setMentahTerbuka] = useState(false);
  const [mengekspor, setMengekspor] = useState<'ringkasan' | 'mentah' | null>(null);
  const [progres, setProgres] = useState(0);
  const [galatEkspor, setGalatEkspor] = useState('');
  const permintaan = useRef(0);

  const tingkat = tingkatTren(waktu);
  const adaFilter = Boolean(waktu.tahun) || Object.keys(fDim).length > 0;

  useEffect(() => {
    const id = ++permintaan.current;
    const t = tingkatTren(waktu);
    setMemuat(true);
    setGalat(false);
    (async () => {
      const { dari, sampai } = rentang(waktu, false);
      const { data, error } = await supabase.rpc('statistik_pengunjung', {
        p_dari: dari,
        p_sampai: sampai,
        p_hari: tanggalHari(waktu),
        p_jenjang: fDim.jenjang ?? null,
        p_kategori: fDim.kategori ?? null,
        p_aktivitas: fDim.aktivitas ?? null,
        p_kamar: fDim.kamar ?? null,
        p_buku: fDim.buku ?? null,
        p_nama: fDim.nama ?? null,
        p_granularitas: t,
      });
      if (id !== permintaan.current) return; // abaikan respons lama
      if (error || !data) {
        console.error('Gagal memuat statistik pengunjung:', error);
        setGalat(true);
      } else {
        setHasil({ stat: data as Statistik, tingkat: t, waktu });
      }
      setMemuat(false);
    })();
  }, [waktu, fDim]);

  // Deret batang waktu, dilengkapi periode yang kosong supaya sumbu selalu utuh
  const seri = useMemo<TitikWaktu[]>(() => {
    if (!hasil) return [];
    const { stat, tingkat: t, waktu: w } = hasil;
    const peta = new Map<number, number>();
    for (const b of stat.tren) {
      const [y, m, d] = b.k.split('-').map(Number);
      peta.set(t === 'tahun' ? y : t === 'bulan' ? m : d, b.n);
    }
    if (t === 'tahun') {
      const tahun = [...peta.keys()];
      if (tahun.length === 0) return [];
      const awal = Math.min(...tahun);
      const akhir = Math.max(...tahun);
      return Array.from({ length: akhir - awal + 1 }, (_, i) => {
        const y = awal + i;
        return { k: String(y), label: String(y), n: peta.get(y) ?? 0, aktif: false };
      });
    }
    if (t === 'bulan') {
      return BULAN_SINGKAT.map((l, i) => ({ k: String(i + 1), label: l, n: peta.get(i + 1) ?? 0, aktif: false }));
    }
    const hariDalamBulan = new Date(w.tahun ?? 2000, w.bulan ?? 1, 0).getDate();
    return Array.from({ length: hariDalamBulan }, (_, i) => ({
      k: String(i + 1),
      label: String(i + 1),
      n: peta.get(i + 1) ?? 0,
      aktif: w.hari === i + 1,
    }));
  }, [hasil]);

  const mingguSeri = useMemo<TitikWaktu[]>(() => {
    if (!hasil) return [];
    const peta = new Map(hasil.stat.minggu.map((b) => [Number(b.k), b.n]));
    return HARI_SINGKAT.map((l, i) => ({ k: String(i + 1), label: l, n: peta.get(i + 1) ?? 0, aktif: false }));
  }, [hasil]);

  function klikTren(t: TitikWaktu) {
    const nilai = Number(t.k);
    if (tingkat === 'tahun') setWaktu({ tahun: nilai, bulan: null, hari: null });
    else if (tingkat === 'bulan') setWaktu((w) => ({ ...w, bulan: nilai, hari: null }));
    else setWaktu((w) => ({ ...w, hari: w.hari === nilai ? null : nilai }));
  }

  function togelDim(d: DimKey, v: string) {
    setFDim((f) => {
      const baru = { ...f };
      if (baru[d] === v) delete baru[d];
      else baru[d] = v;
      return baru;
    });
  }

  function hapusDim(d: DimKey) {
    setFDim((f) => {
      const baru = { ...f };
      delete baru[d];
      return baru;
    });
  }

  function aturUlang() {
    setWaktu(WAKTU_AWAL);
    setFDim({});
  }

  async function ekspor(jenis: 'ringkasan' | 'mentah') {
    if (mengekspor || !hasil) return;
    setMengekspor(jenis);
    setProgres(0);
    setGalatEkspor('');
    try {
      if (jenis === 'ringkasan') await eksporRingkasan(hasil.stat, waktu, fDim);
      else await eksporMentah(waktu, fDim, setProgres);
    } catch (err) {
      console.error('Gagal mengekspor:', err);
      setGalatEkspor('Ekspor gagal. Coba lagi sebentar.');
    } finally {
      setMengekspor(null);
    }
  }

  const stat = hasil?.stat;
  const total = stat?.ringkasan.total ?? 0;
  const rata = stat && stat.ringkasan.hari_aktif ? total / stat.ringkasan.hari_aktif : 0;

  const judulTren =
    tingkat === 'tahun'
      ? 'Kunjungan per tahun'
      : tingkat === 'bulan'
        ? `Kunjungan per bulan, ${waktu.tahun}`
        : `Kunjungan per hari, ${NAMA_BULAN[(waktu.bulan ?? 1) - 1]} ${waktu.tahun}`;

  const kartuDaftar: { dim: DimKey; judul: string; ket?: string; data: Statistik[DimKey extends never ? never : 'kamar'] | undefined }[] = stat
    ? [
        { dim: 'aktivitas', judul: 'Aktivitas', data: stat.aktivitas },
        { dim: 'kategori', judul: 'Kategori', data: stat.kategori },
        { dim: 'kamar', judul: 'Kamar', ket: '10 teratas', data: stat.kamar },
        { dim: 'buku', judul: 'Buku paling sering', ket: '10 teratas', data: stat.buku },
        { dim: 'nama', judul: 'Pengunjung teratas', ket: '10 teratas', data: stat.nama },
      ]
    : [];

  return (
    <div className="space-y-4">
      {/* Kontrol: waktu, filter aktif, ekspor */}
      <section aria-label="Filter dan ekspor" className="rounded-3xl border border-blue-100 bg-white p-4 sm:p-6">
        <nav aria-label="Rentang waktu" className="flex flex-wrap items-center gap-1 text-sm">
          <button
            type="button"
            onClick={() => setWaktu(WAKTU_AWAL)}
            className={`rounded-md px-2 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
              !waktu.tahun ? 'font-bold text-slate-900' : 'text-blue-700 [@media(hover:hover)]:hover:bg-blue-50'
            }`}
          >
            Semua waktu
          </button>
          {waktu.tahun && (
            <>
              <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden="true" />
              <button
                type="button"
                onClick={() => setWaktu({ tahun: waktu.tahun, bulan: null, hari: null })}
                className={`rounded-md px-2 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                  !waktu.bulan ? 'font-bold text-slate-900' : 'text-blue-700 [@media(hover:hover)]:hover:bg-blue-50'
                }`}
              >
                {waktu.tahun}
              </button>
            </>
          )}
          {waktu.bulan && (
            <>
              <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden="true" />
              <button
                type="button"
                onClick={() => setWaktu((w) => ({ ...w, hari: null }))}
                className={`rounded-md px-2 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                  !waktu.hari ? 'font-bold text-slate-900' : 'text-blue-700 [@media(hover:hover)]:hover:bg-blue-50'
                }`}
              >
                {NAMA_BULAN[waktu.bulan - 1]}
              </button>
            </>
          )}
          {waktu.hari && (
            <>
              <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden="true" />
              <span className="px-2 py-1 font-bold text-slate-900">{waktu.hari}</span>
            </>
          )}
        </nav>

        {Object.keys(fDim).length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2" aria-label="Filter aktif">
            {(Object.keys(fDim) as DimKey[]).map((d) => (
              <li key={d}>
                <button
                  type="button"
                  onClick={() => hapusDim(d)}
                  aria-label={`Hapus filter ${DIM[d].label}: ${fDim[d]}`}
                  className="inline-flex max-w-full cursor-pointer items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 [@media(hover:hover)]:hover:bg-blue-100"
                >
                  <span className="truncate">
                    {DIM[d].label}: {fDim[d]}
                  </span>
                  <X className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-blue-100 pt-4">
          <button type="button" onClick={aturUlang} disabled={!adaFilter} className={tombolSekunder}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Atur ulang
          </button>
          <button
            type="button"
            onClick={() => ekspor('ringkasan')}
            disabled={!hasil || total === 0 || mengekspor !== null}
            className={tombolUtama}
          >
            {mengekspor === 'ringkasan' ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
            )}
            Excel ringkasan
          </button>
          <button
            type="button"
            onClick={() => ekspor('mentah')}
            disabled={!hasil || total === 0 || mengekspor !== null}
            className={tombolUtama}
          >
            {mengekspor === 'mentah' ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Mengekspor {fmt(progres)}
              </>
            ) : (
              <>
                <Download className="h-4 w-4" aria-hidden="true" />
                Excel data mentah
              </>
            )}
          </button>
        </div>
        {galatEkspor && (
          <p role="alert" className="mt-3 text-xs font-medium text-red-600">
            {galatEkspor}
          </p>
        )}
        {total > MAKS_EKSPOR && (
          <p className="mt-3 text-xs text-slate-500">
            Ekspor data mentah dibatasi {fmt(MAKS_EKSPOR)} baris teratas. Persempit waktu atau filter untuk mengekspor
            sisanya.
          </p>
        )}
      </section>

      {galat && !hasil && (
        <p role="alert" className="rounded-2xl border border-red-100 bg-red-50 px-4 py-6 text-center text-sm text-red-700">
          Statistik gagal dimuat. Pastikan fungsi SQL <code>statistik_pengunjung</code> sudah dibuat, lalu muat ulang
          halaman.
        </p>
      )}

      {!hasil && memuat && (
        <div aria-hidden="true" className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-white/80" />
            ))}
          </div>
          <div className="h-72 animate-pulse rounded-3xl bg-white/80" />
        </div>
      )}

      {stat && (
        <div className={`space-y-4 transition-opacity ${memuat ? 'opacity-60' : ''}`} aria-busy={memuat}>
          {galat && (
            <p role="alert" className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              Pembaruan gagal, data di bawah masih dari pilihan sebelumnya.
            </p>
          )}

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KartuAngka label="Total kunjungan" nilai={fmt(total)} />
            <KartuAngka label="Pengunjung unik" nilai={fmt(stat.ringkasan.unik)} ket="Berdasarkan anggota/NIS" />
            <KartuAngka label="Hari aktif" nilai={fmt(stat.ringkasan.hari_aktif)} ket="Hari dengan kunjungan" />
            <KartuAngka
              label="Rata-rata per hari aktif"
              nilai={rata.toLocaleString('id-ID', { maximumFractionDigits: 1 })}
            />
          </div>

          <Kartu
            judul={judulTren}
            ket={
              tingkat === 'hari'
                ? 'Klik hari untuk melihat rinciannya, klik lagi untuk membatalkan.'
                : 'Klik batang untuk melihat lebih rinci.'
            }
          >
            <BatangWaktu data={seri} bisaKlik onKlik={klikTren} />
          </Kartu>

          <div className="grid gap-4 lg:grid-cols-2">
            <Kartu judul="Jenjang" ket="Klik untuk memfilter">
              <Donut data={stat.jenjang} total={total} terpilih={fDim.jenjang} onPilih={(k) => togelDim('jenjang', k)} />
            </Kartu>

            <Kartu judul="Kunjungan per hari dalam seminggu">
              <BatangWaktu data={mingguSeri} bisaKlik={false} />
            </Kartu>

            {kartuDaftar.map((c) => (
              <Kartu key={c.dim} judul={c.judul} ket={c.ket ? `${c.ket}. Klik untuk memfilter` : 'Klik untuk memfilter'}>
                <DaftarBatang
                  data={c.data ?? []}
                  total={total}
                  terpilih={fDim[c.dim]}
                  onPilih={(k) => togelDim(c.dim, k)}
                />
              </Kartu>
            ))}
          </div>

          <div className="pt-2">
            <button type="button" onClick={() => setMentahTerbuka((b) => !b)} className={tombolSekunder} aria-expanded={mentahTerbuka}>
              <Table2 className="h-4 w-4" aria-hidden="true" />
              {mentahTerbuka ? 'Sembunyikan data mentah' : `Lihat data mentah (${fmt(total)} baris)`}
            </button>
          </div>

          {mentahTerbuka && <DataMentah key={JSON.stringify([waktu, fDim])} waktu={waktu} fDim={fDim} />}
        </div>
      )}
    </div>
  );
}