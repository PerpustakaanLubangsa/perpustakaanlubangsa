'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  bangunMentah,
  tanggalIndo,
  tombolSekunder,
  type FilterDim,
  type Pengunjung,
  type Waktu,
} from '../konfigurasi';

const UKURAN = [25, 50, 100] as const;

// Dipasang dengan `key` yang berubah saat filter berubah, jadi halaman otomatis kembali ke 1
export default function DataMentah({ waktu, fDim }: { waktu: Waktu; fDim: FilterDim }) {
  const [halaman, setHalaman] = useState(1);
  const [ukuran, setUkuran] = useState<number>(25);
  const [baris, setBaris] = useState<Pengunjung[]>([]);
  const [total, setTotal] = useState(0);
  const [memuat, setMemuat] = useState(true);
  const [pernahMuat, setPernahMuat] = useState(false);
  const [galat, setGalat] = useState(false);
  const permintaan = useRef(0);

  const totalHalaman = Math.max(1, Math.ceil(total / ukuran));
  const awal = total === 0 ? 0 : (halaman - 1) * ukuran + 1;
  const akhir = Math.min(halaman * ukuran, total);

  useEffect(() => {
    const id = ++permintaan.current;
    setMemuat(true);
    setGalat(false);
    (async () => {
      const dari = (halaman - 1) * ukuran;
      const { data, error, count } = await bangunMentah(waktu, fDim, true).range(dari, dari + ukuran - 1);
      if (id !== permintaan.current) return; // abaikan respons lama
      if (error) {
        console.error('Gagal memuat data mentah:', error);
        setGalat(true);
        setBaris([]);
        setTotal(0);
      } else {
        setBaris((data ?? []) as Pengunjung[]);
        setTotal(count ?? 0);
      }
      setMemuat(false);
      setPernahMuat(true);
    })();
  }, [waktu, fDim, halaman, ukuran]);

  return (
    <section aria-label="Data mentah" className="overflow-hidden rounded-3xl border border-blue-100 bg-white">
      <div className={`overflow-x-auto transition-opacity ${memuat && pernahMuat ? 'opacity-60' : ''}`}>
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
            <tr>
              {['Tanggal', 'Nama', 'NIS', 'Kamar', 'Jenjang', 'Judul buku', 'Kategori', 'Aktivitas'].map((h) => (
                <th key={h} scope="col" className="px-4 py-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800">
            {!pernahMuat && memuat ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} aria-hidden="true">
                  {Array.from({ length: 8 }).map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 animate-pulse rounded bg-slate-100" />
                    </td>
                  ))}
                </tr>
              ))
            ) : galat ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-sm text-red-600">
                  Data mentah gagal dimuat. Coba ubah filter atau muat ulang halaman.
                </td>
              </tr>
            ) : baris.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-500">
                  Tidak ada data yang cocok.
                </td>
              </tr>
            ) : (
              baris.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-3 tabular-nums">{tanggalIndo(b.tanggal_kunjungan)}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{b.nama || '—'}</td>
                  <td className="whitespace-nowrap px-4 py-3 tabular-nums">{b.nis || '—'}</td>
                  <td className="whitespace-nowrap px-4 py-3">{b.kamar || '—'}</td>
                  <td className="whitespace-nowrap px-4 py-3">{b.jenjang || '—'}</td>
                  <td className="max-w-[18rem] px-4 py-3">{b.judul_buku || '—'}</td>
                  <td className="whitespace-nowrap px-4 py-3">{b.kategori || '—'}</td>
                  <td className="whitespace-nowrap px-4 py-3">{b.aktivitas || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
          <span className="tabular-nums">
            {awal.toLocaleString('id-ID')}–{akhir.toLocaleString('id-ID')} dari {total.toLocaleString('id-ID')}
          </span>
          <label className="flex items-center gap-2">
            <span className="text-xs">Per halaman</span>
            <select
              value={ukuran}
              onChange={(e) => {
                setUkuran(Number(e.target.value));
                setHalaman(1);
              }}
              className="h-9 cursor-pointer rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {UKURAN.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setHalaman((h) => Math.max(1, h - 1))}
            disabled={halaman <= 1 || memuat}
            className={tombolSekunder}
            aria-label="Halaman sebelumnya"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            Sebelumnya
          </button>
          <span className="whitespace-nowrap text-sm tabular-nums text-slate-600">
            {halaman.toLocaleString('id-ID')} / {totalHalaman.toLocaleString('id-ID')}
          </span>
          <button
            type="button"
            onClick={() => setHalaman((h) => Math.min(totalHalaman, h + 1))}
            disabled={halaman >= totalHalaman || memuat}
            className={tombolSekunder}
            aria-label="Halaman berikutnya"
          >
            Berikutnya
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
}