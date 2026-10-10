'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, Search, UserRound } from 'lucide-react';
import { cariAnggota } from '../actions';
import { BATAS, LABEL_IDENTITAS, type AnggotaHasil } from '../konfigurasi';
import { tombolSekunder } from './gaya';

// Dropdown pencarian anggota: hasil dibatasi (BATAS.hasilMaks) dan pencarian ditunda (debounce).
export default function PilihAnggota({ id, galat }: { id: string; galat?: string }) {
  const [kueri, setKueri] = useState('');
  const [hasil, setHasil] = useState<AnggotaHasil[]>([]);
  const [memuat, setMemuat] = useState(false);
  const [gagalCari, setGagalCari] = useState(false);
  const [terbuka, setTerbuka] = useState(false);
  const [aktif, setAktif] = useState(-1);
  const [terpilih, setTerpilih] = useState<AnggotaHasil | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const idDaftar = `${id}-daftar`;
  const q = kueri.trim();
  const cukupPanjang = q.length >= BATAS.kueriMin;

  useEffect(() => {
    if (terpilih || !cukupPanjang) {
      setHasil([]);
      setMemuat(false);
      setGagalCari(false);
      return;
    }
    setMemuat(true);
    let batal = false;
    const t = setTimeout(async () => {
      try {
        const r = await cariAnggota(q);
        if (batal) return;
        setHasil(r.hasil);
        setGagalCari(Boolean(r.galat));
        setAktif(-1);
      } catch {
        if (!batal) setGagalCari(true);
      } finally {
        if (!batal) setMemuat(false);
      }
    }, BATAS.debounceMs);
    return () => {
      batal = true;
      clearTimeout(t);
    };
  }, [q, cukupPanjang, terpilih]);

  function pilih(a: AnggotaHasil) {
    setTerpilih(a);
    setKueri('');
    setTerbuka(false);
    setAktif(-1);
  }

  function ganti() {
    setTerpilih(null);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function tombol(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setTerbuka(true);
      setAktif((i) => Math.min(i + 1, hasil.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setAktif((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      // Cegah form terkirim tidak sengaja dari kolom pencarian
      e.preventDefault();
      if (terbuka && aktif >= 0 && hasil[aktif]) pilih(hasil[aktif]);
    } else if (e.key === 'Escape') {
      setTerbuka(false);
    }
  }

  const deskripsi = galat ? `${id}-galat` : `${id}-bantuan`;

  if (terpilih) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5">
        <input type="hidden" name="anggota_id" value={terpilih.id} />
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-blue-600">
          <UserRound className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">{terpilih.nama}</p>
          <p className="truncate text-xs text-slate-600">
            {LABEL_IDENTITAS} {terpilih.nisSamar} &middot; {terpilih.jenjang}
            {terpilih.organisasi ? ` · ${terpilih.organisasi}` : ''}
          </p>
        </div>
        <button
          id={id}
          type="button"
          onClick={ganti}
          aria-describedby={deskripsi}
          className={`${tombolSekunder} !px-4 !py-1.5 text-xs`}
        >
          Ganti
        </button>
      </div>
    );
  }

  return (
    <div
      className="relative"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setTerbuka(false);
      }}
    >
      <input type="hidden" name="anggota_id" value="" />
      <Search
        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
        aria-hidden="true"
      />
      <input
        ref={inputRef}
        id={id}
        type="text"
        role="combobox"
        aria-expanded={terbuka}
        aria-controls={idDaftar}
        aria-autocomplete="list"
        aria-activedescendant={aktif >= 0 ? `${id}-opsi-${aktif}` : undefined}
        aria-invalid={galat ? true : undefined}
        aria-describedby={deskripsi}
        autoComplete="off"
        placeholder={`Ketik nama atau ${LABEL_IDENTITAS} Anda`}
        value={kueri}
        onChange={(e) => {
          setKueri(e.target.value);
          setTerbuka(true);
        }}
        onFocus={() => setTerbuka(true)}
        onKeyDown={tombol}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 aria-[invalid=true]:border-red-400 aria-[invalid=true]:focus:ring-red-400"
      />
      {memuat && (
        <Loader2
          className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400"
          aria-hidden="true"
        />
      )}

      {terbuka && (
        <div
          id={idDaftar}
          role="listbox"
          aria-label="Hasil pencarian anggota"
          // Menjaga fokus tetap di kolom input saat daftar disentuh atau diklik
          onMouseDown={(e) => e.preventDefault()}
          className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto overscroll-contain rounded-xl border border-slate-300 bg-white py-1"
        >
          {!cukupPanjang ? (
            <p className="px-4 py-3 text-sm text-slate-500">
              Ketik minimal {BATAS.kueriMin} huruf nama atau {LABEL_IDENTITAS} Anda.
            </p>
          ) : memuat ? (
            <p className="px-4 py-3 text-sm text-slate-500">Mencari anggota…</p>
          ) : gagalCari ? (
            <p className="px-4 py-3 text-sm text-red-600">Pencarian gagal. Coba lagi sebentar.</p>
          ) : hasil.length === 0 ? (
            <p className="px-4 py-3 text-sm text-slate-500">Tidak ada anggota yang cocok.</p>
          ) : (
            hasil.map((a, i) => (
              <div
                key={a.id}
                id={`${id}-opsi-${i}`}
                role="option"
                aria-selected={i === aktif}
                onClick={() => pilih(a)}
                onMouseEnter={() => setAktif(i)}
                className={`cursor-pointer px-4 py-2.5 ${i === aktif ? 'bg-blue-50' : ''}`}
              >
                <p className="truncate text-sm font-semibold text-slate-900">{a.nama}</p>
                <p className="truncate text-xs text-slate-500">
                  {LABEL_IDENTITAS} {a.nisSamar} &middot; {a.jenjang}
                  {a.organisasi ? ` · ${a.organisasi}` : ''}
                </p>
              </div>
            ))
          )}
          {cukupPanjang && !memuat && !gagalCari && hasil.length >= BATAS.hasilMaks && (
            <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
              Hanya {BATAS.hasilMaks} hasil teratas. Ketik lebih lengkap untuk mempersempit.
            </p>
          )}
        </div>
      )}
    </div>
  );
}