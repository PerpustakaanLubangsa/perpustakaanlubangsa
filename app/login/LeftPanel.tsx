'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

/* Daftar kalimat yang diketik bergantian (dibuat di luar komponen agar stabil) */
const PHRASES = [
  'Selamat datang, Pustakawan.',
  'Kelola koleksi buku dengan mudah.',
  'Catat kunjungan, pantau peringkat.',
  'Perpustakaan Lubangsa, tempat ilmu bertumbuh.',
];

const TYPE_SPEED = 90; // ms per huruf saat mengetik
const DELETE_SPEED = 40; // ms per huruf saat menghapus
const HOLD_FULL = 4500; // jeda saat kalimat sudah lengkap (waktu baca)
const HOLD_EMPTY = 800; // jeda sebelum kalimat berikutnya
const REDUCED_HOLD = 5000; // ganti kalimat tanpa animasi (reduced motion)

/* Kursor berkedip */
function Caret() {
  return (
    <span className="lp-caret ml-1 inline-block h-[0.85em] w-[3px] translate-y-[0.1em] rounded-full bg-cyan-300" />
  );
}

/* Animasi mengetik: ketik -> tahan -> hapus -> kalimat berikutnya */
function Typewriter({ phrases }: { phrases: string[] }) {
  const [index, setIndex] = useState(0);
  const [text, setText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setReduced(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
  }, []);

  useEffect(() => {
    const full = phrases[index];

    // Reduced motion: tanpa mengetik, kalimat langsung tampil lalu bergantian
    if (reduced) {
      setText(full);
      const t = setTimeout(() => setIndex((i) => (i + 1) % phrases.length), REDUCED_HOLD);
      return () => clearTimeout(t);
    }

    let delay = deleting ? DELETE_SPEED : TYPE_SPEED;
    if (!deleting && text === full) delay = HOLD_FULL;
    else if (deleting && text === '') delay = HOLD_EMPTY;

    const t = setTimeout(() => {
      if (!deleting && text === full) {
        setDeleting(true);
      } else if (deleting && text === '') {
        setDeleting(false);
        setIndex((i) => (i + 1) % phrases.length);
      } else {
        setText(deleting ? full.slice(0, text.length - 1) : full.slice(0, text.length + 1));
      }
    }, delay);

    return () => clearTimeout(t);
  }, [text, deleting, index, reduced, phrases]);

  return (
    <h1
      className="inline-grid text-left text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight"
      style={{ textShadow: '0 2px 12px rgba(2,6,23,.7)' }}
    >
      {/* Kalimat penuh (tak terlihat) mengunci lebar blok agar tetap di tengah & tidak bergeser */}
      <span aria-hidden="true" className="invisible col-start-1 row-start-1">
        {phrases[index]}
        <Caret />
      </span>
      {/* Teks yang sedang diketik, ditumpuk di atasnya */}
      <span aria-hidden="true" className="col-start-1 row-start-1">
        {text}
        <Caret />
      </span>
      {/* Untuk screen reader */}
      <span className="sr-only">{phrases[index]}</span>
    </h1>
  );
}

export default function LeftPanel() {
  return (
    <div className="hidden md:flex md:w-1/2 lg:w-3/5 bg-slate-950 p-12 md:pr-16 flex-col justify-between relative overflow-hidden select-none">
      <style>{`
        @keyframes lp-blink{0%,49%{opacity:1}50%,100%{opacity:0}}
        .lp-caret{animation:lp-blink 1s step-end infinite}
        @media (prefers-reduced-motion: reduce){
          .lp-caret{animation:none}
        }
      `}</style>

      {/* ============================================================ */}
      {/* BACKGROUND IMAGE + LAPISAN GELAP (agar teks terbaca)         */}
      {/* ============================================================ */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <img
          src="/bg.png"
          alt="Background"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-950/55 to-slate-950/80" />
      </div>

      {/* Grid Garis Tipis Halus di atas gambar */}
      <div className="absolute inset-0 z-0 opacity-[0.03] bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:32px_32px]" />

      {/* ============================================================ */}
      {/* TOMBOL KEMBALI (pojok kiri atas)                             */}
      {/* ============================================================ */}
      <Link
        href="/"
        aria-label="Kembali ke halaman utama"
        className="group absolute left-6 top-6 z-20 inline-flex items-center gap-2 rounded-xl border border-white/20 bg-slate-950/40 px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-slate-100 transition-colors duration-200 hover:border-blue-400/60 hover:bg-blue-500/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
      >
        <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
        Kembali
      </Link>

      {/* ============================================================ */}
      {/* TEKS TENGAH (animasi mengetik)                               */}
      {/* ============================================================ */}
      <div className="relative z-10 flex flex-1 items-center justify-center px-4">
        <div className="flex max-w-xl flex-col items-center text-center">
          <p
            className="mb-5 text-[11px] font-bold uppercase tracking-[0.35em] text-blue-100"
            style={{ textShadow: '0 1px 8px rgba(2,6,23,.8)' }}
          >
            Sistem Informasi Perpustakaan
          </p>
          {/* tinggi minimum agar layout tidak melompat saat kalimat berganti */}
          <div className="flex min-h-[8rem] items-center justify-center">
            <Typewriter phrases={PHRASES} />
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* FOOTER                                                       */}
      {/* ============================================================ */}
      <div className="relative z-10 flex items-center justify-between border-t border-white/10 pt-4 text-[10px] font-bold uppercase tracking-widest text-slate-300">
        <span>PERPUSTAKAAN LUBANGSA</span>
        <span className="opacity-70 font-medium">EST. 2026</span>
      </div>

    </div>
  );
}