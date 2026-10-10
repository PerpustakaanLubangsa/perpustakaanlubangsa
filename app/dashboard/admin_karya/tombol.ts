// Tombol "timbul": kotak bersudut lengkung dengan bayangan solid (tanpa blur) di bawahnya.
// Tombol turun menutup bayangannya seperti ditekan saat di-hover (perangkat dengan mouse),
// disentuh, atau diklik (:active). Hover dibatasi ke perangkat yang benar-benar punya hover
// agar di layar sentuh tombol tidak "menempel" dalam keadaan tertekan setelah disentuh.
const dasar =
  'inline-flex select-none touch-manipulation cursor-pointer items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold [-webkit-tap-highlight-color:transparent] transition-[transform,box-shadow,background-color] duration-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 motion-reduce:transition-none [@media(hover:hover)]:hover:translate-y-1 [@media(hover:hover)]:hover:shadow-none active:translate-y-1 active:shadow-none';

export const tombol = {
  utama: `${dasar} border-blue-800 bg-blue-600 text-white shadow-[0_4px_0_0_#1e40af]`,
  netral: `${dasar} border-slate-300 bg-white text-slate-700 shadow-[0_4px_0_0_#cbd5e1] [@media(hover:hover)]:hover:bg-slate-50`,
  bahaya: `${dasar} border-red-300 bg-white text-red-600 shadow-[0_4px_0_0_#fecaca] [@media(hover:hover)]:hover:bg-red-50`,
};