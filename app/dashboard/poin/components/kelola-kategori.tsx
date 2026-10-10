'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Pencil, Plus, Save, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import DuaKolom from './dua-kolom';
import {
  Bidang,
  KotakPesan,
  kelasInput,
  tombolBahaya,
  tombolSekunder,
  tombolSekunderBesar,
  tombolUtama,
  type Pesan,
} from './ui';

export type KategoriPoin = {
  id: number;
  nama: string;
  keterangan: string | null;
  created_at: string;
};

const NAMA_MAKS = 60;
const KETERANGAN_MAKS = 300;

type Galat = { nama?: string; keterangan?: string };

export default function KelolaKategori({ onBerubah }: { onBerubah?: () => void }) {
  const [daftar, setDaftar] = useState<KategoriPoin[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [gagalMuat, setGagalMuat] = useState(false);

  const [nama, setNama] = useState('');
  const [keterangan, setKeterangan] = useState('');
  const [editId, setEditId] = useState<number | null>(null);
  const [mengirim, setMengirim] = useState(false);
  const [galat, setGalat] = useState<Galat>({});
  const [pesan, setPesan] = useState<Pesan>(null);

  const [hapusId, setHapusId] = useState<number | null>(null);
  const [menghapus, setMenghapus] = useState(false);

  const namaRef = useRef<HTMLInputElement>(null);

  const muat = useCallback(async () => {
    const { data, error } = await supabase
      .from('kategori_poin')
      .select('id, nama, keterangan, created_at')
      .order('nama', { ascending: true });
    if (error) {
      console.error('Gagal memuat kategori poin:', error);
      setGagalMuat(true);
    } else {
      setGagalMuat(false);
      setDaftar((data ?? []) as KategoriPoin[]);
    }
    setMemuat(false);
  }, []);

  useEffect(() => {
    muat();
  }, [muat]);

  function kosongkanForm() {
    setNama('');
    setKeterangan('');
    setEditId(null);
    setGalat({});
  }

  function mulaiUbah(k: KategoriPoin) {
    setEditId(k.id);
    setNama(k.nama);
    setKeterangan(k.keterangan ?? '');
    setGalat({});
    setPesan(null);
    setHapusId(null);
    namaRef.current?.focus();
  }

  async function simpan(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (mengirim) return;

    const n = nama.replace(/\s+/g, ' ').trim();
    const ket = keterangan.trim();
    const baru: Galat = {};

    if (!n) baru.nama = 'Nama kategori wajib diisi.';
    else if (n.length > NAMA_MAKS) baru.nama = `Nama kategori maksimal ${NAMA_MAKS} karakter.`;
    else if (daftar.some((k) => k.id !== editId && k.nama.toLowerCase() === n.toLowerCase())) {
      baru.nama = 'Nama kategori sudah dipakai.';
    }
    if (ket.length > KETERANGAN_MAKS) baru.keterangan = `Keterangan maksimal ${KETERANGAN_MAKS} karakter.`;

    setGalat(baru);
    setPesan(null);
    if (Object.keys(baru).length > 0) return;

    const nilai = { nama: n, keterangan: ket || null };
    const sedangUbah = editId !== null;
    setMengirim(true);

    const { data, error } = sedangUbah
      ? await supabase.from('kategori_poin').update(nilai).eq('id', editId).select('id')
      : await supabase.from('kategori_poin').insert(nilai).select('id');

    setMengirim(false);

    if (error) {
      if (error.code === '23505') {
        setGalat({ nama: 'Nama kategori sudah dipakai.' });
      } else {
        console.error('Gagal menyimpan kategori poin:', error);
        setPesan({ tipe: 'gagal', teks: 'Kategori belum tersimpan. Coba lagi beberapa saat lagi.' });
      }
      return;
    }

    // Supabase tidak mengembalikan error jika RLS menolak update/delete, hanya 0 baris
    if (!data || data.length === 0) {
      setPesan({ tipe: 'gagal', teks: 'Perubahan tidak tersimpan. Periksa izin (RLS) tabel kategori_poin.' });
      return;
    }

    setPesan({
      tipe: 'sukses',
      teks: sedangUbah ? `Kategori "${n}" diperbarui.` : `Kategori "${n}" ditambahkan.`,
    });
    kosongkanForm();
    await muat();
    onBerubah?.();
  }

  async function hapus(k: KategoriPoin) {
    if (menghapus) return;
    setMenghapus(true);
    setPesan(null);

    const { data, error } = await supabase.from('kategori_poin').delete().eq('id', k.id).select('id');

    setMenghapus(false);
    setHapusId(null);

    if (error || !data || data.length === 0) {
      if (error) console.error('Gagal menghapus kategori poin:', error);
      setPesan({
        tipe: 'gagal',
        teks: error
          ? 'Kategori belum terhapus. Coba lagi beberapa saat lagi.'
          : 'Kategori tidak terhapus. Periksa izin (RLS) tabel kategori_poin.',
      });
      return;
    }

    if (editId === k.id) kosongkanForm();
    setPesan({ tipe: 'sukses', teks: `Kategori "${k.nama}" dihapus.` });
    await muat();
    onBerubah?.();
  }

  const sedangUbah = editId !== null;

  return (
    <DuaKolom>
      <form onSubmit={simpan} noValidate className="space-y-4 rounded-2xl border border-blue-100 bg-white p-4 sm:p-5 lg:overflow-y-auto">
        <h2 className="text-base font-bold text-slate-900">{sedangUbah ? 'Ubah kategori' : 'Tambah kategori'}</h2>

        <KotakPesan pesan={pesan} />

        <Bidang id="kategori-nama" label="Nama kategori" bantuan="Contoh: Karya Tulis, Lomba, Kehadiran." galat={galat.nama}>
          <input
            ref={namaRef}
            id="kategori-nama"
            type="text"
            autoComplete="off"
            maxLength={NAMA_MAKS}
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            className={`${kelasInput} h-10`}
            aria-invalid={galat.nama ? true : undefined}
            aria-describedby={galat.nama ? 'kategori-nama-galat' : 'kategori-nama-bantuan'}
          />
        </Bidang>

        <Bidang
          id="kategori-keterangan"
          label="Keterangan"
          bantuan="Penjelasan singkat tentang kategori ini (opsional)."
          galat={galat.keterangan}
        >
          <textarea
            id="kategori-keterangan"
            rows={2}
            maxLength={KETERANGAN_MAKS}
            lang="id"
            value={keterangan}
            onChange={(e) => setKeterangan(e.target.value)}
            className={`${kelasInput} resize-y py-3 leading-6`}
            aria-invalid={galat.keterangan ? true : undefined}
            aria-describedby={galat.keterangan ? 'kategori-keterangan-galat' : 'kategori-keterangan-bantuan'}
          />
          <p className="mt-1.5 text-right text-xs tabular-nums text-slate-500" aria-hidden="true">
            {keterangan.length}/{KETERANGAN_MAKS}
          </p>
        </Bidang>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          {sedangUbah && (
            <button type="button" onClick={kosongkanForm} disabled={mengirim} className={tombolSekunderBesar}>
              Batal
            </button>
          )}
          <button type="submit" disabled={mengirim} className={`${tombolUtama} w-full sm:w-auto`}>
            {mengirim ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Menyimpan
              </>
            ) : sedangUbah ? (
              <>
                <Save className="h-4 w-4" aria-hidden="true" />
                Simpan perubahan
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Tambah kategori
              </>
            )}
          </button>
        </div>
      </form>

      <section
        aria-labelledby="daftar-kategori-judul"
        className="rounded-2xl border border-blue-100 bg-white p-4 sm:p-5 lg:flex lg:flex-col lg:overflow-hidden"
      >
        <h2 id="daftar-kategori-judul" className="text-base font-bold text-slate-900">
          Daftar kategori{!memuat && !gagalMuat ? ` (${daftar.length})` : ''}
        </h2>

        {memuat ? (
          <p className="mt-4 flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Memuat kategori…
          </p>
        ) : gagalMuat ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-red-600">Daftar kategori gagal dimuat.</p>
            <button
              type="button"
              className={tombolSekunder}
              onClick={() => {
                setMemuat(true);
                muat();
              }}
            >
              Coba lagi
            </button>
          </div>
        ) : daftar.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">
            Belum ada kategori. Tambahkan yang pertama lewat formulir tambah kategori.
          </p>
        ) : (
          <ul className="mt-3 space-y-2 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:p-1">
            {daftar.map((k) => (
              <li
                key={k.id}
                className={`rounded-xl border p-3 ${
                  editId === k.id ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="break-words text-sm font-semibold text-slate-900">{k.nama}</p>
                    <p
                      className={`mt-0.5 break-words text-xs leading-5 ${
                        k.keterangan ? 'text-slate-600' : 'italic text-slate-500'
                      }`}
                    >
                      {k.keterangan || 'Tanpa keterangan'}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-3 pb-1">
                    <button
                      type="button"
                      onClick={() => mulaiUbah(k)}
                      aria-label={`Ubah kategori ${k.nama}`}
                      className={tombolSekunder}
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                      Ubah
                    </button>
                    <button
                      type="button"
                      onClick={() => setHapusId(hapusId === k.id ? null : k.id)}
                      aria-label={`Hapus kategori ${k.nama}`}
                      aria-expanded={hapusId === k.id}
                      className={tombolSekunder}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      Hapus
                    </button>
                  </div>
                </div>

                {hapusId === k.id && (
                  <div role="alert" className="mt-3 rounded-lg border border-red-100 bg-red-50 p-3">
                    <p className="text-xs leading-5 text-red-700">
                      Hapus kategori ini? Riwayat poin yang memakainya tidak ikut terhapus, hanya kategorinya yang
                      dikosongkan.
                    </p>
                    <div className="mt-3 flex gap-3 pb-1">
                      <button
                        type="button"
                        onClick={() => hapus(k)}
                        disabled={menghapus}
                        className={tombolBahaya}
                      >
                        {menghapus ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        )}
                        Ya, hapus
                      </button>
                      <button
                        type="button"
                        onClick={() => setHapusId(null)}
                        disabled={menghapus}
                        className={tombolSekunder}
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </DuaKolom>
  );
}