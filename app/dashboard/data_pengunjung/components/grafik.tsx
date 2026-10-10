'use client';

import type { Butir } from '../konfigurasi';

export type TitikWaktu = { k: string; label: string; n: number; aktif: boolean };

const fmt = (n: number) => n.toLocaleString('id-ID');

export function KartuAngka({ label, nilai, ket }: { label: string; nilai: string; ket?: string }) {
  return (
    <div className="rounded-2xl border border-blue-100 bg-white p-4">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{nilai}</p>
      {ket && <p className="mt-0.5 text-xs text-slate-500">{ket}</p>}
    </div>
  );
}

// Grafik batang vertikal. Tinggi batang dalam px agar tidak bergantung pada tinggi induk.
export function BatangWaktu({
  data,
  bisaKlik,
  onKlik,
}: {
  data: TitikWaktu[];
  bisaKlik: boolean;
  onKlik?: (t: TitikWaktu) => void;
}) {
  const maks = Math.max(1, ...data.map((d) => d.n));
  const rapat = data.length > 14;

  if (data.length === 0 || data.every((d) => d.n === 0)) {
    return <p className="py-10 text-center text-sm text-slate-500">Tidak ada data pada rentang ini.</p>;
  }

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex items-end gap-1.5" style={{ minWidth: data.length * (rapat ? 30 : 52) }}>
        {data.map((t) => (
          <button
            key={t.k}
            type="button"
            disabled={!bisaKlik || t.n === 0}
            onClick={() => onKlik?.(t)}
            aria-label={`${t.label}: ${fmt(t.n)} kunjungan`}
            aria-pressed={t.aktif}
            title={`${t.label}: ${fmt(t.n)} kunjungan`}
            className="flex min-w-0 flex-1 cursor-pointer flex-col items-stretch justify-end rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-default"
          >
            <span className="mb-1 block h-4 text-center text-[10px] font-semibold tabular-nums text-slate-600">
              {t.n > 0 ? fmt(t.n) : ''}
            </span>
            <span
              className={`block w-full rounded-t-md ${t.aktif ? 'bg-blue-800' : 'bg-blue-500'} ${
                bisaKlik && t.n > 0 ? '[@media(hover:hover)]:hover:bg-blue-700' : ''
              }`}
              style={{ height: t.n > 0 ? Math.max(3, Math.round((t.n / maks) * 180)) : 0 }}
            />
            <span
              className={`mt-1.5 block border-t border-slate-200 pt-1 text-center text-[11px] ${
                t.aktif ? 'font-bold text-blue-700' : 'text-slate-500'
              }`}
            >
              {t.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// Daftar batang horizontal; baris bisa diklik untuk memfilter
export function DaftarBatang({
  data,
  total,
  terpilih,
  onPilih,
}: {
  data: Butir[];
  total: number;
  terpilih?: string;
  onPilih?: (k: string) => void;
}) {
  const maks = Math.max(1, ...data.map((d) => d.n));
  if (data.length === 0) return <p className="py-6 text-center text-sm text-slate-500">Tidak ada data.</p>;

  return (
    <ul className="space-y-1.5">
      {data.map((b) => {
        const aktif = terpilih === b.k;
        const persen = total ? (b.n / total) * 100 : 0;
        return (
          <li key={b.k}>
            <button
              type="button"
              disabled={!onPilih}
              onClick={() => onPilih?.(b.k)}
              aria-pressed={aktif}
              className={`relative flex w-full cursor-pointer items-center justify-between gap-3 overflow-hidden rounded-lg border px-3 py-2 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-default ${
                aktif ? 'border-blue-500' : 'border-slate-200 [@media(hover:hover)]:hover:border-blue-300'
              }`}
            >
              <span
                aria-hidden="true"
                className={`absolute inset-y-0 left-0 ${aktif ? 'bg-blue-200' : 'bg-blue-100'}`}
                style={{ width: `${(b.n / maks) * 100}%` }}
              />
              <span className="relative min-w-0 truncate font-medium text-slate-800">{b.k}</span>
              <span className="relative shrink-0 text-xs tabular-nums text-slate-600">
                <b className="text-slate-900">{fmt(b.n)}</b> · {persen.toLocaleString('id-ID', { maximumFractionDigits: 1 })}%
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

const WARNA = ['#2563eb', '#0ea5e9', '#6366f1', '#14b8a6', '#f59e0b', '#ec4899', '#64748b'];

// Donut SVG sederhana dengan legenda yang bisa diklik
export function Donut({
  data,
  total,
  terpilih,
  onPilih,
}: {
  data: Butir[];
  total: number;
  terpilih?: string;
  onPilih?: (k: string) => void;
}) {
  if (data.length === 0 || total === 0) return <p className="py-6 text-center text-sm text-slate-500">Tidak ada data.</p>;

  let kumulatif = 0;
  const irisan = data.map((b, i) => {
    const p = (b.n / total) * 100;
    const s = { b, p, mulai: kumulatif, warna: WARNA[i % WARNA.length] };
    kumulatif += p;
    return s;
  });

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row">
      <div className="relative h-40 w-40 shrink-0">
        <svg viewBox="0 0 42 42" className="h-full w-full -rotate-90" role="img" aria-label="Proporsi kunjungan per jenjang">
          <circle cx="21" cy="21" r="15.9155" fill="none" stroke="#e2e8f0" strokeWidth="6" />
          {irisan.map((s) => (
            <circle
              key={s.b.k}
              cx="21"
              cy="21"
              r="15.9155"
              fill="none"
              stroke={s.warna}
              strokeWidth={terpilih === s.b.k ? 7.5 : 6}
              strokeDasharray={`${s.p} ${100 - s.p}`}
              strokeDashoffset={-s.mulai}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold tabular-nums text-slate-900">{fmt(total)}</span>
          <span className="text-[11px] text-slate-500">kunjungan</span>
        </div>
      </div>

      <ul className="w-full min-w-0 flex-1 space-y-1.5">
        {irisan.map((s) => (
          <li key={s.b.k}>
            <button
              type="button"
              disabled={!onPilih}
              onClick={() => onPilih?.(s.b.k)}
              aria-pressed={terpilih === s.b.k}
              className={`flex w-full cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-default ${
                terpilih === s.b.k ? 'border-blue-500 bg-blue-50' : 'border-slate-200 [@media(hover:hover)]:hover:border-blue-300'
              }`}
            >
              <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: s.warna }} aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate font-medium text-slate-800">{s.b.k}</span>
              <span className="shrink-0 text-xs tabular-nums text-slate-600">
                <b className="text-slate-900">{fmt(s.b.n)}</b> · {s.p.toLocaleString('id-ID', { maximumFractionDigits: 1 })}%
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}