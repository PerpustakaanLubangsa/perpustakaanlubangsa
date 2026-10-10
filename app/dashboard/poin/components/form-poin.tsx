'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import PilihAnggota, { type AnggotaPilihan } from './pilih-anggota';
import RiwayatPoin from './riwayat-poin';
import DuaKolom from './dua-kolom';
import type { KategoriPoin } from './kelola-kategori';
import { Bidang, KETERANGAN_MAKS, KotakPesan, POIN_MAKS, kelasInput, tombolUtama, type Pesan } from './ui';

type Jenis = 'tambah' | 'kurangi';
type NamaField = 'anggota' | 'jumlah' | 'keterangan';

export default function FormPoin({ versiKategori = 0 }: { versiKategori?: number }) {
  const [anggota, setAnggota] = useState<AnggotaPilihan | null>(null);
  const [jenis, setJenis] = useState<Jenis>('tambah');
  const [kategori, setKategori] = useState<KategoriPoin[]>([]);
  const [kategoriId, setKategoriId] = useState('');
  const [gagalKategori, setGagalKategori] = useState(false);
  const [jumlah, setJumlah] = useState('');
  const [keterangan, setKeterangan] = useState('');
  const [mengirim, setMengirim] = useState(false);
  const [galat, setGalat] = useState<Partial<Record<NamaField, string>>>({});
  const [pesan, setPesan] = useState<Pesan>(null);
  const [versiRiwayat, setVersiRiwayat] = useState(0);

  // Muat daftar kategori; dimuat ulang setiap kali kategori diubah di tab Kategori poin
  useEffect(() => {
    let batal = false;
    supabase
      .from('kategori_poin')
      .select('id, nama, keterangan, created_at')
      .order('nama', { ascending: true })
      .then(({ data, error }) => {
        if (batal) return;
        if (error) {
          console.error('Gagal memuat kategori poin:', error);
          setGagalKategori(true);
          return;
        }
        const baru = (data ?? []) as KategoriPoin[];
        setGagalKategori(false);
        setKategori(baru);
        setKategoriId((lama) => (baru.some((k) => String(k.id) === lama) ? lama : ''));
      });
    return () => {
      batal = true;
    };
  }, [versiKategori]);

  const kategoriTerpilih = kategori.find((k) => String(k.id) === kategoriId);
  const bantuanKategori = gagalKategori
    ? 'Daftar kategori gagal dimuat. Muat ulang halaman untuk mencoba lagi.'
    : kategoriTerpilih?.keterangan || 'Opsional. Kelola daftar kategori di tab Kategori poin.';

  const lampirAria = (id: string, ada?: string) => ({
    'aria-invalid': ada ? true : undefined,
    'aria-describedby': ada ? `${id}-galat` : `${id}-bantuan`,
  });

  function ubahAnggota(a: AnggotaPilihan | null) {
    setAnggota(a);
    setPesan(null);
  }

  // Ambil ulang data anggota (terutama total poin) untuk kartu anggota
  async function segarkanAnggota(id: string) {
    const { data: segar } = await supabase
      .from('anggota')
      .select('id, nama, nis, jenjang, organisasi, total_poin')
      .eq('id', id)
      .maybeSingle();
    if (segar) {
      setAnggota((sekarang) => (sekarang && sekarang.id === segar.id ? (segar as AnggotaPilihan) : sekarang));
    }
  }

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
      kategori_id: kategoriId ? Number(kategoriId) : null,
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
    // Anggota tetap terpilih supaya hasilnya langsung terlihat di riwayat
    setJumlah('');
    setKeterangan('');
    setKategoriId('');
    setJenis('tambah');
    setVersiRiwayat((v) => v + 1);

    await segarkanAnggota(anggota.id);
  }

  return (
    <DuaKolom>
      <form
        onSubmit={kirim}
        noValidate
        className="space-y-4 rounded-2xl border border-blue-100 bg-white p-4 sm:p-5 lg:overflow-y-auto"
      >
        <KotakPesan pesan={pesan} />

        <Bidang
          id="anggota-cari"
          label="Anggota"
          bantuan="Cari dengan nama atau NIS, lalu pilih dari daftar."
          galat={galat.anggota}
        >
          <PilihAnggota id="anggota-cari" terpilih={anggota} onUbah={ubahAnggota} galat={galat.anggota} />
        </Bidang>

        <fieldset>
          <legend className="mb-1.5 text-sm font-semibold text-slate-900">Jenis mutasi</legend>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { nilai: 'tambah', label: 'Tambah poin' },
                { nilai: 'kurangi', label: 'Kurangi poin' },
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
                  className="block cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2 text-center text-sm font-semibold text-slate-900 transition-colors hover:border-blue-300 peer-checked:border-blue-500 peer-checked:bg-blue-50 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500"
                >
                  {j.label}
                </label>
              </div>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <Bidang id="jumlah" label="Jumlah poin" bantuan="Bilangan bulat positif." galat={galat.jumlah}>
            <input
              id="jumlah"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={jumlah}
              onChange={(e) => setJumlah(e.target.value.replace(/\D/g, '').slice(0, 5))}
              className={`${kelasInput} h-10 tabular-nums`}
              {...lampirAria('jumlah', galat.jumlah)}
            />
          </Bidang>

          <Bidang id="kategori" label="Kategori" bantuan={bantuanKategori}>
            <select
              id="kategori"
              value={kategoriId}
              onChange={(e) => setKategoriId(e.target.value)}
              className={`${kelasInput} h-10`}
              aria-describedby="kategori-bantuan"
            >
              <option value="">Tanpa kategori</option>
              {kategori.map((k) => (
                <option key={k.id} value={String(k.id)}>
                  {k.nama}
                </option>
              ))}
            </select>
          </Bidang>
        </div>

        <Bidang
          id="keterangan"
          label="Keterangan"
          bantuan="Alasan pemberian atau pengurangan poin (opsional)."
          galat={galat.keterangan}
        >
          <textarea
            id="keterangan"
            rows={2}
            maxLength={KETERANGAN_MAKS}
            lang="id"
            value={keterangan}
            onChange={(e) => setKeterangan(e.target.value)}
            className={`${kelasInput} resize-none py-2 leading-6`}
            {...lampirAria('keterangan', galat.keterangan)}
          />
          <p className="mt-1 text-right text-xs tabular-nums text-slate-500" aria-hidden="true">
            {keterangan.length}/{KETERANGAN_MAKS}
          </p>
        </Bidang>

        <div className="flex justify-end">
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

      {/* Di luar <form> supaya Enter di kolom pencarian tidak mengirim form */}
      {anggota ? (
        <RiwayatPoin
          key={anggota.id}
          anggotaId={anggota.id}
          kategori={kategori}
          versi={versiRiwayat}
          onDiubah={() => segarkanAnggota(anggota.id)}
        />
      ) : (
        <div className="hidden items-center justify-center rounded-2xl border border-dashed border-slate-500 p-6 text-center text-sm text-slate-300 lg:flex">
          Pilih anggota untuk melihat riwayat poinnya di sini.
        </div>
      )}
    </DuaKolom>
  );
}