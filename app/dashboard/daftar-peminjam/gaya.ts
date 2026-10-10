// Kartu solid: tanpa transparansi dan tanpa blur agar ringan di perangkat low-end
export const CARD = 'bg-white border border-slate-200 shadow-sm';
export const BADGE = 'bg-blue-50 text-blue-600 border border-blue-200';

// Tombol: kotak sudut sedikit bulat, timbul lewat bayangan solid (tanpa blur),
// dan turun seperti ditekan saat di-hover (mouse), disentuh, atau diklik.
const dasarTombol =
  'inline-flex cursor-pointer touch-manipulation select-none items-center justify-center gap-1.5 rounded-lg border px-4 py-2 text-xs font-extrabold uppercase tracking-wider transition-[transform,box-shadow] duration-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 [@media(hover:hover)]:hover:translate-y-1 [@media(hover:hover)]:hover:shadow-none active:translate-y-1 active:shadow-none';

export const tombolUtama = `${dasarTombol} border-blue-800 bg-blue-600 text-white shadow-[0_4px_0_0_#1e40af]`;
export const tombolSekunder = `${dasarTombol} border-slate-300 bg-white text-slate-700 shadow-[0_4px_0_0_#cbd5e1]`;
export const tombolKecil = '!px-2.5 !py-1.5 !text-[10px]';

// Animasi kata judul: hanya opacity + transform (dipercepat GPU, murah)
export const ANIMASI_CSS = `
  @keyframes word-in {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .word-in {
    opacity: 0;
    animation: word-in 0.25s ease-out forwards;
  }
  @media (prefers-reduced-motion: reduce) {
    .word-in { opacity: 1; animation: none; }
  }
`;