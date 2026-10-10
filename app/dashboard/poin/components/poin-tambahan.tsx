'use client';

import React, { useRef, useState } from 'react';
import FormPoin from './form-poin';
import KelolaKategori from './kelola-kategori';

const TAB = [
  { id: 'input', label: 'Input poin' },
  { id: 'kategori', label: 'Kategori poin' },
] as const;

type IdTab = (typeof TAB)[number]['id'];

export default function PoinTambahan() {
  const [aktif, setAktif] = useState<IdTab>('input');
  // Naik setiap kali kategori berubah, supaya dropdown di form ikut diperbarui
  const [versiKategori, setVersiKategori] = useState(0);
  const refTab = useRef<Record<string, HTMLButtonElement | null>>({});

  function tombol(e: React.KeyboardEvent<HTMLButtonElement>, i: number) {
    let j: number;
    if (e.key === 'ArrowRight') j = (i + 1) % TAB.length;
    else if (e.key === 'ArrowLeft') j = (i - 1 + TAB.length) % TAB.length;
    else if (e.key === 'Home') j = 0;
    else if (e.key === 'End') j = TAB.length - 1;
    else return;
    e.preventDefault();
    setAktif(TAB[j].id);
    refTab.current[TAB[j].id]?.focus();
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold tracking-tight text-white">Poin Tambahan</h1>
        <div role="tablist" aria-label="Menu poin tambahan" className="inline-flex w-full gap-1 rounded-xl bg-white/10 p-1 sm:w-auto">
          {TAB.map((t, i) => {
            const dipilih = aktif === t.id;
            return (
              <button
                key={t.id}
                ref={(el) => {
                  refTab.current[t.id] = el;
                }}
                id={`tab-${t.id}`}
                type="button"
                role="tab"
                aria-selected={dipilih}
                aria-controls={`panel-${t.id}`}
                tabIndex={dipilih ? 0 : -1}
                onClick={() => setAktif(t.id)}
                onKeyDown={(e) => tombol(e, i)}
                className={`flex-1 cursor-pointer rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 sm:flex-none ${
                  dipilih ? 'bg-white text-slate-900' : 'text-slate-200 hover:bg-white/10'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Kedua panel tetap terpasang (hanya disembunyikan) agar isian form tidak hilang saat pindah tab */}
      <div role="tabpanel" id="panel-input" aria-labelledby="tab-input" hidden={aktif !== 'input'}>
        <FormPoin versiKategori={versiKategori} />
      </div>
      <div role="tabpanel" id="panel-kategori" aria-labelledby="tab-kategori" hidden={aktif !== 'kategori'}>
        <KelolaKategori onBerubah={() => setVersiKategori((v) => v + 1)} />
      </div>
    </div>
  );
}