'use client';

import { memo, useCallback, useEffect, useState, useTransition } from 'react';
import { Inbox, Loader2 } from 'lucide-react';
import AksiKarya from './aksi-karya';
import EditorKarya from './editor-karya';
import { muatKarya } from '../actions';
import { tombol } from '../tombol';
import type { KaryaAdmin, StatusKarya } from '../tipe';
import { formatTanggal } from '../../../karya-tulis/data';

const KOSONG: Record<StatusKarya, string> = {
  pending: 'Tidak ada karya yang menunggu peninjauan.',
  approved: 'Belum ada karya yang disetujui.',
  rejected: 'Tidak ada karya yang ditolak.',
};

const KartuKarya = memo(function KartuKarya({
  karya,
  onSelesai,
  onEdit,
}: {
  karya: KaryaAdmin;
  onSelesai: (id: string, pesan: string) => void;
  onEdit: (id: string) => void;
}) {
  return (
    <li>
      <article className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm shadow-blue-900/5 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                {karya.kategori}
              </span>
              <span
                className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                  karya.santri ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                }`}
              >
                {karya.santri ? (karya.nis ? `Santri · NIS ${karya.nis}` : 'Santri') : 'Bukan santri'}
              </span>
            </div>

            <h2 className="mt-3 text-lg font-semibold leading-snug tracking-tight text-slate-900 [overflow-wrap:anywhere]">
              {karya.judul}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {karya.penulis || 'Tanpa nama'} &middot;{' '}
              <time dateTime={karya.dibuat_pada}>{formatTanggal(karya.dibuat_pada, 'panjang')}</time>
            </p>
          </div>

          {karya.foto_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={karya.foto_url}
              alt=""
              loading="lazy"
              decoding="async"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
              className="hidden h-20 w-20 shrink-0 rounded-xl border border-slate-200 bg-blue-50 object-cover sm:block"
            />
          )}
        </div>

        <p className="mt-3 text-sm leading-relaxed text-slate-700 [overflow-wrap:anywhere]">{karya.cuplikan}</p>

        <div className="mt-5 border-t border-blue-100 pt-4">
          <AksiKarya karya={karya} onSelesai={onSelesai} onEdit={onEdit} />
        </div>
      </article>
    </li>
  );
});

export default function DaftarKarya({
  status,
  awal,
  totalAwal,
}: {
  status: StatusKarya;
  awal: KaryaAdmin[];
  totalAwal: number;
}) {
  const [items, setItems] = useState(awal);
  const [total, setTotal] = useState(totalAwal);
  const [galat, setGalat] = useState('');
  const [info, setInfo] = useState('');
  const [sedangEdit, setSedangEdit] = useState<string | null>(null);
  const [memuat, mulaiMuat] = useTransition();

  // Pemberitahuan singkat setelah aksi berhasil
  useEffect(() => {
    if (!info) return;
    const t = setTimeout(() => setInfo(''), 4000);
    return () => clearTimeout(t);
  }, [info]);

  // Karya yang berpindah status atau dihapus keluar dari tab ini, di server maupun di daftar lokal,
  // sehingga offset = jumlah item yang sudah tampil tetap akurat untuk halaman berikutnya
  const selesai = useCallback((id: string, pesan: string) => {
    setItems((sebelumnya) => sebelumnya.filter((k) => k.id !== id));
    setTotal((t) => Math.max(0, t - 1));
    setInfo(pesan);
  }, []);

  const bukaEditor = useCallback((id: string) => setSedangEdit(id), []);

  const tersimpan = useCallback((item: KaryaAdmin) => {
    setItems((sebelumnya) => sebelumnya.map((k) => (k.id === item.id ? item : k)));
    setSedangEdit(null);
    setInfo('Perubahan tersimpan.');
  }, []);

  const muatLagi = () => {
    setGalat('');
    mulaiMuat(async () => {
      const hasil = await muatKarya(status, items.length);
      if (!hasil.ok) {
        setGalat(hasil.pesan);
        return;
      }
      setItems((sebelumnya) => {
        const sudahAda = new Set(sebelumnya.map((k) => k.id));
        return [...sebelumnya, ...hasil.items.filter((k) => !sudahAda.has(k.id))];
      });
      setTotal(hasil.total);
    });
  };

  const sisa = total - items.length;

  return (
    <div>
      <p className="sr-only" role="status" aria-live="polite">
        {info}
      </p>
      {info && (
        <div
          aria-hidden="true"
          className="mb-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700 shadow-sm"
        >
          {info}
        </div>
      )}

      {items.length === 0 && total === 0 ? (
        <div className="flex flex-col items-center rounded-3xl border border-blue-100 bg-white px-6 py-16 text-center shadow-sm shadow-blue-900/5">
          <div className="mb-4 rounded-full bg-blue-50 p-4 text-blue-500 ring-8 ring-blue-50/60">
            <Inbox className="h-8 w-8" strokeWidth={1.5} aria-hidden="true" />
          </div>
          <p className="text-sm text-slate-600">{KOSONG[status]}</p>
        </div>
      ) : (
        <>
          {items.length > 0 && (
            <ul className="space-y-4">
              {items.map((k) => (
                <KartuKarya key={k.id} karya={k} onSelesai={selesai} onEdit={bukaEditor} />
              ))}
            </ul>
          )}

          <div className="mt-6 flex flex-col items-center gap-3">
            <p className="text-xs text-slate-500">
              Menampilkan {items.length} dari {total} karya
            </p>

            {galat && (
              <p role="alert" className="text-xs font-medium text-red-600">
                {galat}
              </p>
            )}

            {sisa > 0 && (
              <button type="button" onClick={muatLagi} disabled={memuat} className={`${tombol.utama} px-6 py-2.5`}>
                {memuat && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {memuat ? 'Memuat' : `Muat lebih banyak (${sisa})`}
              </button>
            )}
          </div>
        </>
      )}

      {sedangEdit && (
        <EditorKarya
          key={sedangEdit}
          id={sedangEdit}
          onTutup={() => setSedangEdit(null)}
          onTersimpan={tersimpan}
        />
      )}
    </div>
  );
}