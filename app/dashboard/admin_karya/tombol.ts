// Tombol "timbul": punya bayangan tebal di bawah. Saat kursor di atasnya tombol terangkat,
// saat diklik atau disentuh (:active) tombol turun menutup bayangannya seperti ditekan.
const dasar =
  'inline-flex select-none touch-manipulation cursor-pointer items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold [-webkit-tap-highlight-color:transparent] transition-[transform,box-shadow,background-color,color,border-color] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 motion-reduce:transition-none';

export const tombol = {
  utama: `${dasar} bg-blue-600 text-white shadow-[0_4px_0_0_#1e3a8a] hover:-translate-y-0.5 hover:bg-blue-500 hover:shadow-[0_6px_0_0_#1e3a8a] active:translate-y-1 active:bg-blue-700 active:shadow-[0_0_0_0_#1e3a8a]`,
  netral: `${dasar} border border-slate-200 bg-white text-slate-700 shadow-[0_4px_0_0_#cbd5e1] hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 hover:shadow-[0_6px_0_0_#cbd5e1] active:translate-y-1 active:bg-blue-100 active:shadow-[0_0_0_0_#cbd5e1]`,
  bahaya: `${dasar} border border-red-200 bg-white text-red-600 shadow-[0_4px_0_0_#fecaca] hover:-translate-y-0.5 hover:bg-red-50 hover:shadow-[0_6px_0_0_#fecaca] active:translate-y-1 active:bg-red-100 active:shadow-[0_0_0_0_#fecaca]`,
};