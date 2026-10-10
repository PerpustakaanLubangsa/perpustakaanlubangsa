'use client';

import React, { useActionState, useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Loader2, Send, AlertCircle } from 'lucide-react';
import { kirimKarya } from '../actions';
import { BATAS, KATEGORI_KARYA, type HasilKirim, type NamaField } from '../konfigurasi';
import PilihAnggota from './pilih-anggota';
import { tombolSekunder, tombolUtama } from './gaya';

const KUNCI_DRAF = 'draf-kirim-karya';

const awal: HasilKirim = { status: 'awal' };

const kelasInput =
  'w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 aria-[invalid=true]:border-red-400 aria-[invalid=true]:focus:ring-red-400';

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

function Formulir({ ulang }: { ulang: () => void }) {
  const [hasil, formAction, mengirim] = useActionState(kirimKarya, awal);

  const [penulis, setPenulis] = useState('');
  const [kategori, setKategori] = useState('');
  const [judul, setJudul] = useState('');
  const [isi, setIsi] = useState('');
  const [drafSiap, setDrafSiap] = useState(false);

  // Muat draf tulisan (identitas anggota sengaja tidak disimpan)
  useEffect(() => {
    try {
      const mentah = localStorage.getItem(KUNCI_DRAF);
      if (mentah) {
        const d = JSON.parse(mentah) as Partial<Record<'penulis' | 'kategori' | 'judul' | 'isi', string>>;
        setPenulis(d.penulis ?? '');
        setKategori(d.kategori ?? '');
        setJudul(d.judul ?? '');
        setIsi(d.isi ?? '');
      }
    } catch {
      // abaikan draf yang rusak
    }
    setDrafSiap(true);
  }, []);

  // Simpan draf otomatis supaya tulisan panjang tidak hilang jika halaman tertutup
  useEffect(() => {
    if (!drafSiap || hasil.status === 'sukses') return;
    const t = setTimeout(() => {
      try {
        if (!penulis && !judul && !isi) localStorage.removeItem(KUNCI_DRAF);
        else localStorage.setItem(KUNCI_DRAF, JSON.stringify({ penulis, kategori, judul, isi }));
      } catch {
        // penyimpanan penuh atau diblokir
      }
    }, 600);
    return () => clearTimeout(t);
  }, [drafSiap, hasil.status, penulis, kategori, judul, isi]);

  useEffect(() => {
    if (hasil.status === 'sukses') {
      try {
        localStorage.removeItem(KUNCI_DRAF);
      } catch {
        // abaikan
      }
    }
  }, [hasil.status]);

  if (hasil.status === 'sukses') {
    return (
      <div className="rounded-3xl border border-blue-100 bg-white px-6 py-14 text-center sm:px-10">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-600 ring-8 ring-blue-50/60">
          <CheckCircle2 className="h-8 w-8" strokeWidth={1.6} aria-hidden="true" />
        </div>
        <h2 className="text-xl font-semibold tracking-tight text-slate-900" role="status">
          Karya terkirim
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-600">
          &ldquo;{hasil.judul}&rdquo; menunggu persetujuan petugas. Karya akan tampil di galeri setelah disetujui.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Link href="/karya-tulis" className={tombolUtama}>
            Lihat galeri
          </Link>
          <button type="button" onClick={ulang} className={tombolSekunder}>
            Kirim karya lain
          </button>
        </div>
      </div>
    );
  }

  const galat: Partial<Record<NamaField, string>> = hasil.status === 'gagal' ? hasil.galat : {};
  const jumlahKata = isi.trim() ? isi.trim().split(/\s+/).length : 0;
  const lampirAria = (id: string, ada?: string) => ({
    'aria-invalid': ada ? true : undefined,
    'aria-describedby': ada ? `${id}-galat` : `${id}-bantuan`,
  });

  return (
    <form action={formAction} className="space-y-6 rounded-3xl border border-blue-100 bg-white p-5 sm:p-8">
      {hasil.status === 'gagal' && hasil.pesan && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>{hasil.pesan}</p>
        </div>
      )}

      {/* Kolom jebakan bot, disembunyikan dari pengguna dan pembaca layar */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Jangan diisi
          <input type="text" name="situs" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <Bidang
        id="anggota-cari"
        label="Anggota perpustakaan"
        bantuan="Cari dengan nama atau NIS, lalu pilih nama Anda dari daftar."
        galat={galat.anggota}
      >
        <PilihAnggota id="anggota-cari" galat={galat.anggota} />
      </Bidang>

      <Bidang
        id="penulis"
        label="Nama penulis (opsional)"
        bantuan="Nama yang tampil di galeri, boleh nama pena. Kosongkan untuk memakai nama anggota."
        galat={galat.penulis}
      >
        <input
          id="penulis"
          name="penulis"
          type="text"
          maxLength={BATAS.penulisMaks}
          autoComplete="off"
          value={penulis}
          onChange={(e) => setPenulis(e.target.value)}
          className={`${kelasInput} h-11`}
          {...lampirAria('penulis', galat.penulis)}
        />
      </Bidang>

      <Bidang id="kategori" label="Kategori" galat={galat.kategori}>
        <select
          id="kategori"
          name="kategori"
          required
          value={kategori}
          onChange={(e) => setKategori(e.target.value)}
          className={`${kelasInput} h-11 cursor-pointer`}
          {...lampirAria('kategori', galat.kategori)}
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
      </Bidang>

      <Bidang id="judul" label="Judul" galat={galat.judul}>
        <input
          id="judul"
          name="judul"
          type="text"
          required
          maxLength={BATAS.judulMaks}
          autoComplete="off"
          value={judul}
          onChange={(e) => setJudul(e.target.value)}
          className={`${kelasInput} h-11 font-medium`}
          {...lampirAria('judul', galat.judul)}
        />
      </Bidang>

      <Bidang
        id="isi"
        label="Isi karya"
        bantuan="Pisahkan paragraf atau bait dengan satu baris kosong. Baris baru di dalam paragraf tetap dipertahankan."
        galat={galat.isi}
      >
        <textarea
          id="isi"
          name="isi"
          required
          rows={14}
          maxLength={BATAS.isiMaks}
          lang="id"
          value={isi}
          onChange={(e) => setIsi(e.target.value)}
          className={`${kelasInput} resize-y py-3 text-[15px] leading-7`}
          {...lampirAria('isi', galat.isi)}
        />
        <p className="mt-1.5 text-right text-xs tabular-nums text-slate-500" aria-hidden="true">
          {jumlahKata.toLocaleString('id-ID')} kata &middot; {isi.length.toLocaleString('id-ID')}/
          {BATAS.isiMaks.toLocaleString('id-ID')} karakter
        </p>
      </Bidang>

      <div className="flex flex-col-reverse items-stretch gap-3 border-t border-blue-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-500">Karya akan ditinjau petugas sebelum tampil di galeri.</p>
        <button type="submit" disabled={mengirim} className={tombolUtama}>
          {mengirim ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Mengirim karya
            </>
          ) : (
            <>
              <Send className="h-4 w-4" aria-hidden="true" />
              Kirim karya
            </>
          )}
        </button>
      </div>
    </form>
  );
}

export default function FormKirimKarya() {
  // Mengganti key membuat form kembali kosong setelah "Kirim karya lain"
  const [putaran, setPutaran] = useState(0);
  return <Formulir key={putaran} ulang={() => setPutaran((n) => n + 1)} />;
}