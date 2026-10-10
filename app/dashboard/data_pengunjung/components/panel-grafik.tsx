'use client';

import { useEffect, useRef, useState } from 'react';
import { FileSpreadsheet, ImageDown, Loader2, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  TAB_GRAFIK,
  namaLokasi,
  rentang,
  spesifikasi,
  tingkatTren,
  tombolSekunder,
  tombolUtama,
  type Lokasi,
  type Statistik,
  type TabGrafik,
} from '../konfigurasi';
import { eksporRingkasan, slug } from '../ekspor';
import { unduhGambar } from '../gambar';
import { BatangWaktu, DaftarBatang, Donut, KartuAngka } from './grafik';

const fmt = (n: number) => n.toLocaleString('id-ID');

export default function PanelGrafik({
  lokasi,
  tab,
  onTab,
  onTutup,
}: {
  lokasi: Lokasi;
  tab: TabGrafik;
  onTab: (t: TabGrafik) => void;
  onTutup: () => void;
}) {
  const [stat, setStat] = useState<Statistik | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState(false);
  const [mengekspor, setMengekspor] = useState(false);
  const [galatEkspor, setGalatEkspor] = useState('');
  const permintaan = useRef(0);

  const nama = namaLokasi(lokasi);
  const info = TAB_GRAFIK.find((t) => t.kunci === tab) ?? TAB_GRAFIK[0];

  useEffect(() => {
    const id = ++permintaan.current;
    setStat(null);
    setMemuat(true);
    setGalat(false);
    (async () => {
      const { dari, sampai } = rentang(lokasi);
      const { data, error } = await supabase.rpc('statistik_pengunjung', {
        p_dari: dari,
        p_sampai: sampai,
        p_granularitas: tingkatTren(lokasi),
      });
      if (id !== permintaan.current) return; // abaikan respons lama
      if (error || !data) {
        console.error('Gagal memuat statistik pengunjung:', error);
        setGalat(true);
      } else {
        setStat(data as Statistik);
      }
      setMemuat(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lokasi.tahun, lokasi.bulan, lokasi.minggu]);

  const spek = stat ? spesifikasi(stat, tab, lokasi) : null;
  const rata = stat && stat.ringkasan.hari_aktif ? stat.ringkasan.total / stat.ringkasan.hari_aktif : 0;

  async function excel() {
    if (!stat || mengekspor) return;
    setMengekspor(true);
    setGalatEkspor('');
    try {
      await eksporRingkasan(stat, lokasi);
    } catch (err) {
      console.error('Gagal mengekspor Excel:', err);
      setGalatEkspor('Ekspor Excel gagal. Coba lagi sebentar.');
    } finally {
      setMengekspor(false);
    }
  }

  function gambar() {
    if (!spek) return;
    unduhGambar(spek, info.judul, nama, `grafik-${tab}-${slug(nama)}`);
  }

  return (
    <section aria-label={`Grafik ${nama}`} className="rounded-3xl border border-blue-100 bg-white p-4 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Grafik</p>
          <h2 className="truncate text-lg font-bold text-slate-900">{nama}</h2>
        </div>
        <button type="button" onClick={onTutup} aria-label="Tutup grafik" className={`${tombolSekunder} !px-3`}>
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {TAB_GRAFIK.map((t) => (
          <button
            key={t.kunci}
            type="button"
            onClick={() => onTab(t.kunci)}
            aria-pressed={tab === t.kunci}
            className={`${tab === t.kunci ? tombolUtama : tombolSekunder} !px-3 !py-1.5 !text-xs`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {stat && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KartuAngka label="Total kunjungan" nilai={fmt(stat.ringkasan.total)} />
          <KartuAngka label="Pengunjung unik" nilai={fmt(stat.ringkasan.unik)} />
          <KartuAngka label="Hari aktif" nilai={fmt(stat.ringkasan.hari_aktif)} />
          <KartuAngka label="Rata-rata per hari" nilai={rata.toLocaleString('id-ID', { maximumFractionDigits: 1 })} />
        </div>
      )}

      <div className="mt-5 border-t border-slate-100 pt-5">
        <h3 className="mb-4 text-sm font-semibold text-slate-900">{info.judul}</h3>

        {memuat && (
          <div aria-hidden="true" className="h-56 animate-pulse rounded-2xl bg-slate-100" />
        )}

        {galat && (
          <p role="alert" className="rounded-xl border border-red-100 bg-red-50 px-4 py-6 text-center text-sm text-red-700">
            Grafik gagal dimuat. Pastikan fungsi SQL <code>statistik_pengunjung</code> sudah dibuat.
          </p>
        )}

        {spek &&
          (spek.jenis === 'waktu' ? (
            <BatangWaktu data={spek.data} />
          ) : spek.jenis === 'donut' ? (
            <Donut data={spek.data} total={spek.total} label={info.judul} />
          ) : (
            <DaftarBatang data={spek.data} total={spek.total} />
          ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-5">
        <button type="button" onClick={gambar} disabled={!spek} className={tombolUtama}>
          <ImageDown className="h-4 w-4" aria-hidden="true" />
          Unduh gambar (PNG)
        </button>
        <button type="button" onClick={excel} disabled={!stat || mengekspor} className={tombolUtama}>
          {mengekspor ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
          )}
          Excel ringkasan
        </button>
      </div>
      {galatEkspor && (
        <p role="alert" className="mt-3 text-xs font-medium text-red-600">
          {galatEkspor}
        </p>
      )}
    </section>
  );
}