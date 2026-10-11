'use client';

import React, { useEffect, useRef, useState } from 'react';
import { fmt } from './lb-types';

/* Angka berhitung naik (langsung ke DOM, tanpa re-render per frame) */
export function CountUp({ value, lite }: { value: number; lite: boolean }) {
  const ref = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (lite) {
      el.textContent = fmt(value);
      return;
    }
    const dur = 900;
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(Math.round(value * e));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, lite]);

  return <span ref={ref}>{lite ? fmt(value) : '0'}</span>;
}

/* Emblem (fallback perisai biru jika gambar gagal) */
export function Emblem({ src, alt, className = '' }: { src: string | null; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return (
      <svg viewBox="0 0 100 100" className={className} role="img" aria-label={alt}>
        <path
          d="M50 6 L88 20 V50 C88 74 70 90 50 96 C30 90 12 74 12 50 V20 Z"
          fill="#3b82f6"
          stroke="#dbeafe"
          strokeWidth="3"
        />
        <polygon
          points="50,28 56,44 73,45 60,56 64,72 50,63 36,72 40,56 27,45 44,44"
          fill="#eff6ff"
        />
      </svg>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      draggable={false}
      onError={() => setFailed(true)}
      className={`${className} object-contain`}
    />
  );
}