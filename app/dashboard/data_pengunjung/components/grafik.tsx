'use client';

import type { Butir, TitikWaktu } from '../konfigurasi';

const fmt = (n: number) => n.toLocaleString('id-ID');
const WARNA = ['#2563eb', '#0ea5e9', '#6366f1', '#14b8a6', '#f59e0b', '#ec4899', '#64748b'];

export function KartuAngka({ label, nilai }: { label: string; nilai: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-0.5 text-xl font-bold tabular-nums text-slate-900">{nilai}</p>
    </div>
  );
}

// Batang vertikal. Tinggi dalam px agar tidak bergantung pada tinggi induk.
export function BatangWaktu({ data }: { data: TitikWaktu[] }) {
  const maks = Math.max(1, ...data.map((d) => d.n));
  const rapat = data.length > 14;

  if (data.length === 0 || data.every((d) => d.n === 0)) {
    return <p className="py-10 text-center text-sm text-slate-500">Tidak ada data pada lokasi ini.</p>;
  }

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex items-end gap-1.5" style={{ minWidth: data.length * (rapat ? 30 : 52) }}>
        {data.map((t) => (
          <div
            key={t.k}
            title={`${t.label}: ${fmt(t.n)} kunjungan`}
            className="flex min-w-0 flex-1 flex-col items-stretch justify-end"
          >
            <span className="mb-1 block h-4 text-center text-[10px] font-semibold tabular-nums text-slate-600">
              {t.n > 0 ? fmt(t.n) : ''}
            </span>
            <span
              className="block w-full rounded-t-md bg-blue-500"
              style={{ height: t.n > 0 ? Math.max(3, Math.round((t.n / maks) * 180)) : 0 }}
            />
            <span className="mt-1.5 block border-t border-slate-200 pt-1 text-center text-[11px] text-slate-500">
              {t.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Perbandingan dengan batang horizontal
export function DaftarBatang({ data, total }: { data: Butir[]; total: number }) {
  const maks = Math.max(1, ...data.map((d) => d.n));
  if (data.length === 0) return <p className="py-6 text-center text-sm text-slate-500">Tidak ada data.</p>;

  return (
    <ul className="space-y-1.5">
      {data.map((b) => (
        <li
          key={b.k}
          className="relative flex items-center justify-between gap-3 overflow-hidden rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          <span
            aria-hidden="true"
            className="absolute inset-y-0 left-0 bg-blue-100"
            style={{ width: `${(b.n / maks) * 100}%` }}
          />
          <span className="relative min-w-0 truncate font-medium text-slate-800">{b.k}</span>
          <span className="relative shrink-0 text-xs tabular-nums text-slate-600">
            <b className="text-slate-900">{fmt(b.n)}</b> ·{' '}
            {(total ? (b.n / total) * 100 : 0).toLocaleString('id-ID', { maximumFractionDigits: 1 })}%
          </span>
        </li>
      ))}
    </ul>
  );
}

// Donut SVG sederhana dengan legenda
export function Donut({ data, total, label }: { data: Butir[]; total: number; label: string }) {
  if (data.length === 0 || total === 0) {
    return <p className="py-6 text-center text-sm text-slate-500">Tidak ada data.</p>;
  }

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
        <svg viewBox="0 0 42 42" className="h-full w-full -rotate-90" role="img" aria-label={label}>
          <circle cx="21" cy="21" r="15.9155" fill="none" stroke="#e2e8f0" strokeWidth="6" />
          {irisan.map((s) => (
            <circle
              key={s.b.k}
              cx="21"
              cy="21"
              r="15.9155"
              fill="none"
              stroke={s.warna}
              strokeWidth="6"
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
          <li key={s.b.k} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm">
            <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: s.warna }} aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate font-medium text-slate-800">{s.b.k}</span>
            <span className="shrink-0 text-xs tabular-nums text-slate-600">
              <b className="text-slate-900">{fmt(s.b.n)}</b> ·{' '}
              {s.p.toLocaleString('id-ID', { maximumFractionDigits: 1 })}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}