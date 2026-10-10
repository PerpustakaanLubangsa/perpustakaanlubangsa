import React from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export const kelasInput =
  'w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 aria-[invalid=true]:border-red-400 aria-[invalid=true]:focus:ring-red-400';

export const tombolUtama =
  'inline-flex cursor-pointer touch-manipulation select-none items-center justify-center gap-2 rounded-lg border border-blue-800 bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-[0_4px_0_0_#1e40af] transition-[transform,box-shadow] duration-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-70 [@media(hover:hover)]:hover:translate-y-1 [@media(hover:hover)]:hover:shadow-none active:translate-y-1 active:shadow-none';

export const tombolSekunder =
  'inline-flex cursor-pointer touch-manipulation select-none items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 shadow-[0_4px_0_0_#cbd5e1] transition-[transform,box-shadow] duration-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-70 [@media(hover:hover)]:hover:translate-y-1 [@media(hover:hover)]:hover:shadow-none active:translate-y-1 active:shadow-none';

export const tombolSekunderBesar =
  'inline-flex cursor-pointer touch-manipulation select-none items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 shadow-[0_4px_0_0_#cbd5e1] transition-[transform,box-shadow] duration-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-70 [@media(hover:hover)]:hover:translate-y-1 [@media(hover:hover)]:hover:shadow-none active:translate-y-1 active:shadow-none';

export const tombolBahaya =
  'inline-flex cursor-pointer touch-manipulation select-none items-center justify-center gap-1.5 rounded-lg border border-red-800 bg-red-600 px-4 py-1.5 text-xs font-semibold text-white shadow-[0_4px_0_0_#991b1b] transition-[transform,box-shadow] duration-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-70 [@media(hover:hover)]:hover:translate-y-1 [@media(hover:hover)]:hover:shadow-none active:translate-y-1 active:shadow-none';

export const POIN_MAKS = 10000;
export const KETERANGAN_MAKS = 200;

export type Pesan = { tipe: 'sukses' | 'gagal'; teks: string } | null;

export function Bidang({
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

export function KotakPesan({ pesan }: { pesan: Pesan }) {
  return (
    <div aria-live="polite" className="empty:hidden">
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
  );
}