'use client';

import React, { useEffect, useRef, useState, useTransition } from 'react';
import { AlertCircle, ImageOff, Loader2, Send, X } from 'lucide-react';
import { tambahKarya } from '../actions';
import { tombol } from '../tombol';
import type { KaryaAdmin } from '../tipe';
import { BATAS, KATEGORI_KARYA } from '../../../kirim-karya/konfigurasi';
import PilihAnggota from '../../../kirim-karya/components/pilih-anggota';

const kelasInput =
  'w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500';

function FormTambah({
  onBatal,
  onTersimpan,
}: {
  onBatal: () => void;
  onTersimpan: (item: KaryaAdmin) => void;
}) {
  const [penulis, setPenulis] = useState('');
  const [kategori, setKategori] = useState('');
  const [judul, setJudul] = useState('');
  const [isi, setIsi] = useState('');
  const [fotoUrl, setFotoUrl] = useState('');
  const [fotoRusak, setFotoRusak] = useState(false);
  const [pesan, setPesan] = useState('');
  const [menyimpan, mulai] = useTransition();

  const kirim = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // anggota_id berasal dari input tersembunyi milik PilihAnggota (kosong jika tidak ada yang dipilih)
    const anggotaId = String(new FormData(e.currentTarget).get('anggota_id') ?? '');
    setPesan('');
    mulai(async () => {
      const hasil = await tambahKarya({
        anggota_id: anggotaId,
        judul,
        kategori,
        penulis,
        isi,
        foto_url: fotoUrl,
      });
      if (hasil.ok) onTersimpan(hasil.item);
      else setPesan(hasil.pesan);
    });
  };

  const urlAda = fotoUrl.trim() !== '';
  const jumlahKata = isi.trim() ? isi.trim().split(/\s+/).length : 0;

  return (
    <form onSubmit={kirim} className="space-y-5">
      {pesan && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>{pesan}</p>
        </div>
      )}

      <div>
        <label htmlFor="tb-anggota" className="mb-1.5 block text-sm font-semibold text-slate-900">
          Anggota perpustakaan <span className="font-normal text-slate-500">(opsional)</span>
        </label>
        <PilihAnggota id="tb-anggota" />
        <p id="tb-anggota-bantuan" className="mt-1.5 text-xs text-slate-500">
          Pilih jika penulis anggota terdaftar. Jika tidak, kosongkan dan isi nama penulis di bawah.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="tb-penulis" className="mb-1.5 block text-sm font-semibold text-slate-900">
            Nama penulis
          </label>
          <input
            id="tb-penulis"
            type="text"
            maxLength={BATAS.penulisMaks}
            autoComplete="off"
            value={penulis}
            onChange={(e) => setPenulis(e.target.value)}
            className={`${kelasInput} h-11`}
          />
          <p className="mt-1.5 text-xs text-slate-500">Wajib jika tanpa anggota. Kosong = nama anggota.</p>
        </div>

        <div>
          <label htmlFor="tb-kategori" className="mb-1.5 block text-sm font-semibold text-slate-900">
            Kategori
          </label>
          <select
            id="tb-kategori"
            required
            value={kategori}
            onChange={(e) => setKategori(e.target.value)}
            className={`${kelasInput} h-11 cursor-pointer`}
          >
            <option value="" disabled>
              Pilih kategori
            </option>
            {KATEGORI_KARYA.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="tb-judul" className="mb-1.5 block text-sm font-semibold text-slate-900">
          Judul
        </label>
        <input
          id="tb-judul"
          type="text"
          required
          maxLength={BATAS.judulMaks}
          autoComplete="off"
          value={judul}
          onChange={(e) => setJudul(e.target.value)}
          className={`${kelasInput} h-11 font-medium`}
        />
      </div>

      <div>
        <label htmlFor="tb-foto" className="mb-1.5 block text-sm font-semibold text-slate-900">
          URL gambar <span className="font-normal text-slate-500">(opsional)</span>
        </label>
        <input
          id="tb-foto"
          type="url"
          inputMode="url"
          placeholder="https://contoh.com/gambar.jpg"
          value={fotoUrl}
          onChange={(e) => {
            setFotoUrl(e.target.value);
            setFotoRusak(false);
          }}
          className={`${kelasInput} h-11`}
        />

        {urlAda && (
          <div className="mt-3 flex items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-blue-50 p-2">
            {fotoRusak ? (
              <div className="flex items-center gap-2 py-6 text-xs text-slate-500">
                <ImageOff className="h-4 w-4" aria-hidden="true" />
                Gambar tidak bisa ditampilkan dari URL ini.
              </div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={fotoUrl.trim()}
                alt="Pratinjau gambar karya"
                loading="lazy"
                decoding="async"
                onError={() => setFotoRusak(true)}
                className="max-h-56 w-auto max-w-full rounded-lg object-contain"
              />
            )}
          </div>
        )}
      </div>

      <div>
        <label htmlFor="tb-isi" className="mb-1.5 block text-sm font-semibold text-slate-900">
          Isi karya
        </label>
        <textarea
          id="tb-isi"
          required
          rows={14}
          maxLength={BATAS.isiMaks}
          lang="id"
          value={isi}
          onChange={(e) => setIsi(e.target.value)}
          className={`${kelasInput} resize-y py-3 text-[15px] leading-7`}
        />
        <p className="mt-1.5 text-xs text-slate-500">
          Pisahkan paragraf atau bait dengan satu baris kosong.
        </p>
        <p className="mt-1 text-right text-xs tabular-nums text-slate-500" aria-hidden="true">
          {jumlahKata.toLocaleString('id-ID')} kata &middot; {isi.length.toLocaleString('id-ID')}/
          {BATAS.isiMaks.toLocaleString('id-ID')} karakter
        </p>
      </div>

      <div className="flex flex-col-reverse items-stretch gap-3 border-t border-blue-100 pt-5 pb-1 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-500">Karya langsung disetujui dan tampil di galeri.</p>
        <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-3">
          <button type="button" onClick={onBatal} disabled={menyimpan} className={tombol.netral}>
            Batal
          </button>
          <button type="submit" disabled={menyimpan} className={tombol.utama}>
            {menyimpan ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="h-4 w-4" aria-hidden="true" />
            )}
            {menyimpan ? 'Menayangkan' : 'Tambah dan tayangkan'}
          </button>
        </div>
      </div>
    </form>
  );
}

// Dipasang saat tombol "Tambah karya" ditekan dan dilepas saat ditutup, jadi form selalu mulai kosong.
export default function TambahKarya({
  onTutup,
  onTersimpan,
}: {
  onTutup: () => void;
  onTersimpan: (item: KaryaAdmin) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = dialog.current;
    if (d && !d.open) d.showModal();
  }, []);

  return (
    <dialog
      ref={dialog}
      onClose={onTutup}
      onClick={(e) => {
        // Klik di area gelap di luar kotak menutup dialog
        if (e.target === dialog.current) dialog.current?.close();
      }}
      aria-labelledby="judul-tambah"
      className="m-auto w-[calc(100%-1.5rem)] max-w-2xl overflow-hidden rounded-3xl border border-blue-100 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-900/60"
    >
      <div className="flex items-center justify-between gap-4 border-b border-blue-100 px-5 py-4 sm:px-6">
        <h2 id="judul-tambah" className="text-lg font-bold tracking-tight text-slate-900">
          Tambah karya
        </h2>
        <button
          type="button"
          onClick={() => dialog.current?.close()}
          aria-label="Tutup"
          className={`${tombol.netral} !h-9 !w-9 !p-0`}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="max-h-[75vh] overflow-y-auto px-5 py-5 sm:px-6">
        <FormTambah onBatal={() => dialog.current?.close()} onTersimpan={onTersimpan} />
      </div>
    </dialog>
  );
}