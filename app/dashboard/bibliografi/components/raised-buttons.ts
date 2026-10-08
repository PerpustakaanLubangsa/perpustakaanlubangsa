/**
 * Gaya tombol timbul (raised) yang dipakai bersama.
 * Hover = tombol turun seperti ditekan. Klik atau sentuh (:active) = tertekan penuh.
 * Tombol nonaktif tidak bereaksi terhadap pointer, jadi tetap tampak timbul.
 */
const BASE =
  'select-none cursor-pointer touch-manipulation [-webkit-tap-highlight-color:transparent] transition-[transform,box-shadow,background-color,color,border-color] duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 disabled:opacity-60 disabled:pointer-events-none';

// Tombol utama (biru), tebal 4px
export const BTN_PRIMARY = `${BASE} text-white bg-blue-600 border border-blue-700 shadow-[0_4px_0_0_#1e40af] hover:translate-y-[3px] hover:shadow-[0_1px_0_0_#1e40af] active:translate-y-1 active:shadow-none`;

// Tombol utama ukuran kecil, tebal 3px
export const BTN_PRIMARY_SM = `${BASE} text-white bg-blue-600 border border-blue-700 shadow-[0_3px_0_0_#1e40af] hover:translate-y-0.5 hover:shadow-[0_1px_0_0_#1e40af] active:translate-y-[3px] active:shadow-none`;

// Tombol netral (putih), tebal 4px
export const BTN_NEUTRAL = `${BASE} text-slate-600 bg-white border border-slate-300 shadow-[0_4px_0_0_#cbd5e1] hover:translate-y-[3px] hover:shadow-[0_1px_0_0_#cbd5e1] hover:text-blue-700 hover:border-blue-300 active:translate-y-1 active:shadow-none`;

// Tombol netral ukuran kecil, tebal 2px
export const BTN_NEUTRAL_SM = `${BASE} text-slate-600 bg-white border border-slate-300 shadow-[0_2px_0_0_#cbd5e1] hover:translate-y-px hover:shadow-[0_1px_0_0_#cbd5e1] hover:text-blue-700 hover:border-blue-300 active:translate-y-0.5 active:shadow-none`;

// Tombol ikon biru (edit, tutup), tebal 2px
export const BTN_EDIT = `${BASE} text-blue-600 bg-white border border-blue-200 shadow-[0_2px_0_0_#bfdbfe] hover:translate-y-0.5 hover:shadow-none hover:bg-blue-600 hover:text-white hover:border-blue-700 active:translate-y-0.5 active:shadow-none`;

// Tombol ikon merah (hapus), tebal 2px
export const BTN_DELETE = `${BASE} text-red-500 bg-white border border-red-200 shadow-[0_2px_0_0_#fecaca] hover:translate-y-0.5 hover:shadow-none hover:bg-red-500 hover:text-white hover:border-red-600 active:translate-y-0.5 active:shadow-none`;

// Tombol ikon sangat kecil (hapus tag topik), tebal 1px
export const BTN_TAG_REMOVE = `${BASE} text-blue-400 bg-white border border-blue-200 shadow-[0_1px_0_0_#bfdbfe] hover:translate-y-px hover:shadow-none hover:text-blue-700 active:translate-y-px active:shadow-none`;

// Pemicu dropdown (tampil seperti kolom isian), tetap tertekan saat dropdown terbuka
export const BTN_FIELD = `${BASE} bg-white border border-blue-100 shadow-[0_2px_0_0_#dbeafe] hover:translate-y-px hover:shadow-[0_1px_0_0_#dbeafe] hover:border-blue-300 active:translate-y-0.5 active:shadow-none aria-expanded:translate-y-0.5 aria-expanded:shadow-none aria-expanded:border-blue-400 aria-expanded:ring-2 aria-expanded:ring-blue-500/20`;