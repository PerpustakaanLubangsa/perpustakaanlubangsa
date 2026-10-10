// Gaya tombol bersama: kotak bersudut sedikit bulat, tampak timbul lewat bayangan solid (tanpa blur),
// dan turun seperti ditekan saat di-hover (perangkat dengan mouse), disentuh, atau diklik.
const dasar =
  'inline-flex cursor-pointer touch-manipulation select-none items-center justify-center gap-2 rounded-lg border px-6 py-2.5 text-sm font-semibold transition-[transform,box-shadow,background-color] duration-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-70 [@media(hover:hover)]:hover:translate-y-1 [@media(hover:hover)]:hover:shadow-none active:translate-y-1 active:shadow-none';

export const tombolUtama = `${dasar} border-blue-800 bg-blue-600 text-white shadow-[0_4px_0_0_#1e40af]`;

export const tombolSekunder = `${dasar} border-slate-300 bg-white text-slate-700 shadow-[0_4px_0_0_#cbd5e1] [@media(hover:hover)]:hover:bg-slate-50`;