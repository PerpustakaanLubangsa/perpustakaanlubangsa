'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Save, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { KategoriPoin } from './kelola-kategori';
import {
  Bidang,
  KETERANGAN_MAKS,
  KotakPesan,
  POIN_MAKS,
  kelasInput,
  tombolSekunderBesar,
  tombolUtama,
  type Pesan,
} from './ui';

export type Mutasi = {
  id: number;
  poin: number;
  keterangan: string | null;
  created_at: string;
  kategori: { id: number; nama: string } | null;
};

type Jenis = 'tambah' | 'kurangi';
type NamaField = 'jumlah' | 'keterangan';

const formatTanggal = new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeStyle: 'short' });

/**
 * Pasang komponen ini hanya saat ada riwayat yang diubah, mis. `{diedit && <EditMutasi ... />}`.
 * Dialog dibuka saat dipasang dan ditutup saat dilepas.
 */
export default function EditMutasi({
  mutasi,
  kategori,
  onTutup,
  onTersimpan,
}: {
  mutasi: Mutasi;
  kategori: KategoriPoin[];
  onTutup: () => void;
  onTersimpan: (baru: Mutasi) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [jenis, setJenis] = useState<Jenis>(mutasi.poin < 0 ? 'kurangi' : 'tambah');
  const [jumlah, setJumlah] = useState(String(Math.abs(mutasi.poin)));
  const [kategoriId, setKategoriId] = useState(mutasi.kategori ? String(mutasi.kategori.id) : '');
  const [keterangan, setKeterangan] = useState(mutasi.keterangan ?? '');
  const [menyimpan, setMenyimpan] = useState(false);
  const [galat, setGalat] = useState<Partial<Record<NamaField, string>>>({});
  const [pesan, setPesan] = useState<Pesan>(null);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (!d.open) d.showModal();
    const overflowLama = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflowLama;
      // close() mengembalikan fokus ke tombol "Ubah" yang membukanya
      if (d.open) d.close();
    };
  }, []);

  const lampirAria = (id: string, ada?: string) => ({
    'aria-invalid': ada ? true : undefined,
    'aria-describedby': ada ? `${id}-galat` : `${id}-bantuan`,
  });

  // Kategori riwayat ini mungkin belum ada di daftar (belum termuat); tetap tampilkan agar nilainya tidak hilang
  const kategoriAda = !mutasi.kategori || kategori.some((k) => k.id === mutasi.kategori?.id);

  async function simpan(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (menyimpan) return;

    const baru: Partial<Record<NamaField, string>> = {};
    const angka = Number(jumlah);
    const ket = keterangan.replace(/\s+/g, ' ').trim();

    if (!jumlah.trim() || !Number.isInteger(angka) || angka < 1) {
      baru.jumlah = 'Masukkan jumlah poin berupa bilangan bulat, minimal 1.';
    } else if (angka > POIN_MAKS) {
      baru.jumlah = `Jumlah poin maksimal ${POIN_MAKS.toLocaleString('id-ID')} sekali input.`;
    }
    if (ket.length > KETERANGAN_MAKS) baru.keterangan = `Keterangan maksimal ${KETERANGAN_MAKS} karakter.`;

    setGalat(baru);
    setPesan(null);
    if (Object.keys(baru).length > 0) return;

    const poin = jenis === 'tambah' ? angka : -angka;
    const kid = kategoriId ? Number(kategoriId) : null;

    // Tidak ada yang berubah: tutup saja tanpa menghubungi server
    if (poin === mutasi.poin && (ket || null) === (mutasi.keterangan || null) && kid === (mutasi.kategori?.id ?? null)) {
      onTutup();
      return;
    }

    setMenyimpan(true);
    const { data, error } = await supabase
      .from('mutasi_poin')
      .update({ poin, keterangan: ket || null, kategori_id: kid })
      .eq('id', mutasi.id)
      .select('id, poin, keterangan, created_at, kategori:kategori_poin(id, nama)');
    setMenyimpan(false);

    if (error) {
      console.error('Gagal mengubah mutasi poin:', error);
      setPesan({ tipe: 'gagal', teks: 'Perubahan belum tersimpan. Coba lagi beberapa saat lagi.' });
      return;
    }
    // Supabase tidak mengembalikan error jika RLS menolak update, hanya 0 baris
    if (!data || data.length === 0) {
      setPesan({ tipe: 'gagal', teks: 'Perubahan tidak tersimpan. Periksa izin (RLS) update tabel mutasi_poin.' });
      return;
    }

    onTersimpan(data[0] as unknown as Mutasi);
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="edit-judul"
      onCancel={(e) => {
        // Escape: biarkan React yang menutup, dan jangan tutup saat sedang menyimpan
        e.preventDefault();
        if (!menyimpan) onTutup();
      }}
      onMouseDown={(e) => {
        // Klik di area gelap (backdrop) menutup dialog
        if (e.target === e.currentTarget && !menyimpan) onTutup();
      }}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-3xl border border-blue-100 bg-white p-0 text-slate-900 shadow-xl backdrop:bg-slate-900/60"
    >
      <form onSubmit={simpan} noValidate className="space-y-4 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 id="edit-judul" className="text-base font-bold text-slate-900">
              Ubah riwayat poin
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Dicatat <time dateTime={mutasi.created_at}>{formatTanggal.format(new Date(mutasi.created_at))}</time>
            </p>
          </div>
          <button
            type="button"
            onClick={onTutup}
            disabled={menyimpan}
            aria-label="Tutup"
            className="-mr-2 -mt-1 flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <KotakPesan pesan={pesan} />

        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-slate-900">Jenis mutasi</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                { nilai: 'tambah', label: 'Tambah poin' },
                { nilai: 'kurangi', label: 'Kurangi poin' },
              ] as const
            ).map((j) => (
              <div key={j.nilai} className="relative">
                <input
                  id={`edit-jenis-${j.nilai}`}
                  type="radio"
                  name="edit-jenis"
                  value={j.nilai}
                  checked={jenis === j.nilai}
                  onChange={() => setJenis(j.nilai)}
                  className="peer sr-only"
                />
                <label
                  htmlFor={`edit-jenis-${j.nilai}`}
                  className="block cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition-colors hover:border-blue-300 peer-checked:border-blue-500 peer-checked:bg-blue-50 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500"
                >
                  {j.label}
                </label>
              </div>
            ))}
          </div>
        </fieldset>

        <Bidang id="edit-jumlah" label="Jumlah poin" bantuan="Bilangan bulat positif." galat={galat.jumlah}>
          <input
            id="edit-jumlah"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={jumlah}
            onChange={(e) => setJumlah(e.target.value.replace(/\D/g, '').slice(0, 5))}
            className={`${kelasInput} h-10 tabular-nums`}
            {...lampirAria('edit-jumlah', galat.jumlah)}
          />
        </Bidang>

        <Bidang id="edit-kategori" label="Kategori" bantuan="Opsional.">
          <select
            id="edit-kategori"
            value={kategoriId}
            onChange={(e) => setKategoriId(e.target.value)}
            className={`${kelasInput} h-10`}
            aria-describedby="edit-kategori-bantuan"
          >
            <option value="">Tanpa kategori</option>
            {!kategoriAda && mutasi.kategori && (
              <option value={String(mutasi.kategori.id)}>{mutasi.kategori.nama}</option>
            )}
            {kategori.map((k) => (
              <option key={k.id} value={String(k.id)}>
                {k.nama}
              </option>
            ))}
          </select>
        </Bidang>

        <Bidang
          id="edit-keterangan"
          label="Keterangan"
          bantuan="Alasan pemberian atau pengurangan poin (opsional)."
          galat={galat.keterangan}
        >
          <textarea
            id="edit-keterangan"
            rows={2}
            maxLength={KETERANGAN_MAKS}
            lang="id"
            value={keterangan}
            onChange={(e) => setKeterangan(e.target.value)}
            className={`${kelasInput} resize-y py-2 leading-6`}
            {...lampirAria('edit-keterangan', galat.keterangan)}
          />
          <p className="mt-1.5 text-right text-xs tabular-nums text-slate-500" aria-hidden="true">
            {keterangan.length}/{KETERANGAN_MAKS}
          </p>
        </Bidang>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onTutup} disabled={menyimpan} className={tombolSekunderBesar}>
            Batal
          </button>
          <button type="submit" disabled={menyimpan} className={tombolUtama}>
            {menyimpan ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Menyimpan
              </>
            ) : (
              <>
                <Save className="h-4 w-4" aria-hidden="true" />
                Simpan perubahan
              </>
            )}
          </button>
        </div>
      </form>
    </dialog>
  );
}