'use client';

import React, { useEffect, useRef, useState, useTransition } from 'react';
import { AlertCircle, ImageOff, Loader2, Save, X } from 'lucide-react';
import { ambilKarya, simpanKarya } from '../actions';
import { tombol } from '../tombol';
import type { KaryaAdmin, KaryaEdit } from '../tipe';
import { BATAS, KATEGORI_KARYA } from '../../../kirim-karya/konfigurasi';

const kelasInput =
  'w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500';

function FormEdit({
  data,
  onBatal,
  onTersimpan,
}: {
  data: KaryaEdit;
  onBatal: () => void;
  onTersimpan: (item: KaryaAdmin) => void;
}) {
  const [judul, setJudul] = useState(data.judul);
  const [kategori, setKategori] = useState(data.kategori);
  const [penulis, setPenulis] = useState(data.penulis);
  const [isi, setIsi] = useState(data.isi);
  const [fotoUrl, setFotoUrl] = useState(data.foto_url);
  const [fotoRusak, setFotoRusak] = useState(false);
  const [pesan, setPesan] = useState('');
  const [menyimpan, mulai] = useTransition();

  // Kategori lama yang tidak ada di daftar tetap bisa dipilih agar tidak berubah tanpa disengaja
  const opsiKategori: string[] = (KATEGORI_KARYA as readonly string[]).includes(data.kategori)
    ? [...KATEGORI_KARYA]
    : [data.kategori, ...KATEGORI_KARYA];

  const kirim = (e: React.FormEvent) => {
    e.preventDefault();
    setPesan('');
    mulai(async () => {
      const hasil = await simpanKarya(data.id, { judul, kategori, penulis, isi, foto_url: fotoUrl });
      if (hasil.ok) onTersimpan(hasil.item);
      else setPesan(hasil.pesan);
    });
  };

  const urlAda = fotoUrl.trim() !== '';

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
        <label htmlFor="ed-judul" className="mb-1.5 block text-sm font-semibold text-slate-900">
          Judul
        </label>
        <input
          id="ed-judul"
          type="text"
          required
          maxLength={BATAS.judulMaks}
          value={judul}
          onChange={(e) => setJudul(e.target.value)}
          className={`${kelasInput} h-11 font-medium`}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="ed-kategori" className="mb-1.5 block text-sm font-semibold text-slate-900">
            Kategori
          </label>
          <select
            id="ed-kategori"
            required
            value={kategori}
            onChange={(e) => setKategori(e.target.value)}
            className={`${kelasInput} h-11 cursor-pointer`}
          >
            {opsiKategori.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="ed-penulis" className="mb-1.5 block text-sm font-semibold text-slate-900">
            Nama penulis
          </label>
          <input
            id="ed-penulis"
            type="text"
            maxLength={BATAS.penulisMaks}
            value={penulis}
            onChange={(e) => setPenulis(e.target.value)}
            className={`${kelasInput} h-11`}
          />
        </div>
      </div>

      <div>
        <label htmlFor="ed-foto" className="mb-1.5 block text-sm font-semibold text-slate-900">
          URL gambar <span className="font-normal text-slate-500">(opsional)</span>
        </label>
        <input
          id="ed-foto"
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
        <p className="mt-1.5 text-xs text-slate-500">Kosongkan untuk menghapus gambar dari karya.</p>

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
        <label htmlFor="ed-isi" className="mb-1.5 block text-sm font-semibold text-slate-900">
          Isi karya
        </label>
        <textarea
          id="ed-isi"
          required
          rows={14}
          maxLength={BATAS.isiMaks}
          lang="id"
          value={isi}
          onChange={(e) => setIsi(e.target.value)}
          className={`${kelasInput} resize-y py-3 text-[15px] leading-7`}
        />
        <p className="mt-1.5 text-right text-xs tabular-nums text-slate-500">
          {isi.length.toLocaleString('id-ID')}/{BATAS.isiMaks.toLocaleString('id-ID')} karakter
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-3 border-t border-blue-100 pt-5 pb-1">
        <button type="button" onClick={onBatal} disabled={menyimpan} className={tombol.netral}>
          Batal
        </button>
        <button type="submit" disabled={menyimpan} className={tombol.utama}>
          {menyimpan ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Save className="h-4 w-4" aria-hidden="true" />
          )}
          {menyimpan ? 'Menyimpan' : 'Simpan perubahan'}
        </button>
      </div>
    </form>
  );
}

// Dipasang saat karya dibuka dan dilepas saat ditutup. Isi lengkap baru diambil di sini,
// jadi daftar tetap ringan.
export default function EditorKarya({
  id,
  onTutup,
  onTersimpan,
}: {
  id: string;
  onTutup: () => void;
  onTersimpan: (item: KaryaAdmin) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [data, setData] = useState<KaryaEdit | null>(null);
  const [galatMuat, setGalatMuat] = useState('');

  useEffect(() => {
    const d = dialog.current;
    if (d && !d.open) d.showModal();
  }, []);

  useEffect(() => {
    let batal = false;
    ambilKarya(id).then((hasil) => {
      if (batal) return;
      if (hasil.ok) setData(hasil.karya);
      else setGalatMuat(hasil.pesan);
    });
    return () => {
      batal = true;
    };
  }, [id]);

  return (
    <dialog
      ref={dialog}
      onClose={onTutup}
      onClick={(e) => {
        // Klik di area gelap di luar kotak menutup editor
        if (e.target === dialog.current) dialog.current?.close();
      }}
      aria-labelledby="judul-editor"
      className="m-auto w-[calc(100%-1.5rem)] max-w-2xl overflow-hidden rounded-3xl border border-blue-100 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-900/60"
    >
      <div className="flex items-center justify-between gap-4 border-b border-blue-100 px-5 py-4 sm:px-6">
        <h2 id="judul-editor" className="text-lg font-bold tracking-tight text-slate-900">
          Baca dan edit karya
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
        {galatMuat ? (
          <p role="alert" className="py-10 text-center text-sm text-red-600">
            {galatMuat}
          </p>
        ) : !data ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500" role="status">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Memuat karya
          </div>
        ) : (
          <FormEdit data={data} onBatal={() => dialog.current?.close()} onTersimpan={onTersimpan} />
        )}
      </div>
    </dialog>
  );
}