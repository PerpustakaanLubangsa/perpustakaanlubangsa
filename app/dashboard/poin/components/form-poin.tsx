'use client';

import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, Send } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import PilihAnggota, { type AnggotaPilihan } from './pilih-anggota';

const POIN_MAKS = 10000;
const KETERANGAN_MAKS = 200;

const kelasInput =
  'w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 aria-[invalid=true]:border-red-400 aria-[invalid=true]:focus:ring-red-400';

const tombolUtama =
  'inline-flex cursor-pointer touch-manipulation select-none items-center justify-center gap-2 rounded-lg border border-blue-800 bg-blue-600 px-7 py-3 text-sm font-semibold text-white shadow-[0_4px_0_0_#1e40af] transition-[transform,box-shadow] duration-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-70 [@media(hover:hover)]:hover:translate-y-1 [@media(hover:hover)]:hover:shadow-none active:translate-y-1 active:shadow-none';

type Jenis = 'tambah' | 'kurangi';
type NamaField = 'anggota' | 'jumlah' | 'keterangan';
type Pesan = { tipe: 'sukses' | 'gagal'; teks: string } | null;

function Bidang({
  id,
  label,
  bantuan,
  galat,
  children,
}: {
  id: string;
  label: string;
  bantuan?: string;
  galat?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-slate-900">
        {label}
      </label>
      {children}
      {bantuan && !galat && (
        <p id={`${id}-bantuan`} className="mt-1.5 text-xs text-slate-500">
          {bantuan}
        </p>
      )}
      {galat && (
        <p id={`${id}-galat`} className="mt-1.5 text-xs font-medium text-red-600">
          {galat}
        </p>
      )}
    </div>
  );
}

export default function FormPoin() {
  const [anggota, setAnggota] = useState<AnggotaPilihan | null>(null);
  const [jenis, setJenis] = useState<Jenis>('tambah');
  const [jumlah, setJumlah] = useState('');
  const [keterangan, setKeterangan] = useState('');
  const [mengirim, setMengirim] = useState(false);
  const [galat, setGalat] = useState<Partial<Record<NamaField, string>>>({});
  const [pesan, setPesan] = useState<Pesan>(null);

  const lampirAria = (id: string, ada?: string) => ({
    'aria-invalid': ada ? true : undefined,
    'aria-describedby': ada ? `${id}-galat` : `${id}-bantuan`,
  });

  async function kirim(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (mengirim) return;

    const baru: Partial<Record<NamaField, string>> = {};
    const angka = Number(jumlah);
    const ket = keterangan.replace(/\s+/g, ' ').trim();

    if (!anggota) baru.anggota = 'Cari dan pilih anggota dari daftar.';
    if (!jumlah.trim() || !Number.isInteger(angka) || angka < 1) {
      baru.jumlah = 'Masukkan jumlah poin berupa bilangan bulat, minimal 1.';
    } else if (angka > POIN_MAKS) {
      baru.jumlah = `Jumlah poin maksimal ${POIN_MAKS.toLocaleString('id-ID')} sekali input.`;
    }
    if (ket.length > KETERANGAN_MAKS) baru.keterangan = `Keterangan maksimal ${KETERANGAN_MAKS} karakter.`;

    setGalat(baru);
    setPesan(null);
    if (Object.keys(baru).length > 0 || !anggota) return;

    const poin = jenis === 'tambah' ? angka : -angka;
    setMengirim(true);

    const { error } = await supabase.from('mutasi_poin').insert({
      anggota_id: anggota.id,
      poin,
      keterangan: ket || null,
    });

    setMengirim(false);

    if (error) {
      console.error('Gagal menyimpan mutasi poin:', error);
      setPesan({ tipe: 'gagal', teks: 'Poin belum tersimpan. Coba lagi beberapa saat lagi.' });
      return;
    }

    setPesan({
      tipe: 'sukses',
      teks: `${poin > 0 ? '+' : ''}${poin.toLocaleString('id-ID')} poin tercatat untuk ${anggota.nama}.`,
    });
    setAnggota(null);
    setJumlah('');
    setKeterangan('');
    setJenis('tambah');
  }

  return (
    <form onSubmit={kirim} noValidate className="space-y-6 rounded-3xl border border-blue-100 bg-white p-5 sm:p-8">
      <div aria-live="polite">
        {pesan && (
          <div
            role={pesan.tipe === 'gagal' ? 'alert' : 'status'}
            className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
              pesan.tipe === 'sukses'
                ? 'border-green-100 bg-green-50 text-green-800'
                : 'border-red-100 bg-red-50 text-red-700'
            }`}
          >
            {pesan.tipe === 'sukses' ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            ) : (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            )}
            <p>{pesan.teks}</p>
          </div>
        )}
      </div>

      <Bidang
        id="anggota-cari"
        label="Anggota"
        bantuan="Cari dengan nama atau NIS, lalu pilih dari daftar."
        galat={galat.anggota}
      >
        <PilihAnggota id="anggota-cari" terpilih={anggota} onUbah={setAnggota} galat={galat.anggota} />
      </Bidang>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-slate-900">Jenis mutasi</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              { nilai: 'tambah', label: 'Tambah poin', ket: 'Poin anggota bertambah' },
              { nilai: 'kurangi', label: 'Kurangi poin', ket: 'Poin anggota berkurang' },
            ] as const
          ).map((j) => (
            <div key={j.nilai} className="relative">
              <input
                id={`jenis-${j.nilai}`}
                type="radio"
                name="jenis"
                value={j.nilai}
                checked={jenis === j.nilai}
                onChange={() => setJenis(j.nilai)}
                className="peer sr-only"
              />
              <label
                htmlFor={`jenis-${j.nilai}`}
                className="block cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-3 transition-colors hover:border-blue-300 peer-checked:border-blue-500 peer-checked:bg-blue-50 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500"
              >
                <span className="block text-sm font-semibold text-slate-900">{j.label}</span>
                <span className="mt-0.5 block text-xs text-slate-500">{j.ket}</span>
              </label>
            </div>
          ))}
        </div>
      </fieldset>

      <Bidang id="jumlah" label="Jumlah poin" bantuan="Bilangan bulat positif." galat={galat.jumlah}>
        <input
          id="jumlah"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={jumlah}
          onChange={(e) => setJumlah(e.target.value.replace(/\D/g, '').slice(0, 5))}
          className={`${kelasInput} h-11 tabular-nums`}
          {...lampirAria('jumlah', galat.jumlah)}
        />
      </Bidang>

      <Bidang
        id="keterangan"
        label="Keterangan"
        bantuan="Alasan pemberian atau pengurangan poin (opsional)."
        galat={galat.keterangan}
      >
        <textarea
          id="keterangan"
          rows={3}
          maxLength={KETERANGAN_MAKS}
          lang="id"
          value={keterangan}
          onChange={(e) => setKeterangan(e.target.value)}
          className={`${kelasInput} resize-y py-3 leading-6`}
          {...lampirAria('keterangan', galat.keterangan)}
        />
        <p className="mt-1.5 text-right text-xs tabular-nums text-slate-500" aria-hidden="true">
          {keterangan.length}/{KETERANGAN_MAKS}
        </p>
      </Bidang>

      <div className="flex justify-end border-t border-blue-100 pt-6">
        <button type="submit" disabled={mengirim} className={`${tombolUtama} w-full sm:w-auto`}>
          {mengirim ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Menyimpan
            </>
          ) : (
            <>
              <Send className="h-4 w-4" aria-hidden="true" />
              Simpan poin
            </>
          )}
        </button>
      </div>
    </form>
  );
}