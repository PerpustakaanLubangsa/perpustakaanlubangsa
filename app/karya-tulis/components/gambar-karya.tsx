'use client';

import React, { useState } from 'react';

interface GambarKaryaProps {
  src: string;
  alt: string;
  className?: string;
  /** true untuk gambar di bagian atas halaman (dimuat lebih dulu, membantu LCP) */
  prioritas?: boolean;
  /** Ditampilkan jika gambar gagal dimuat */
  fallback?: React.ReactNode;
}

export default function GambarKarya({ src, alt, className, prioritas = false, fallback = null }: GambarKaryaProps) {
  const [rusak, setRusak] = useState(false);

  if (rusak) return <>{fallback}</>;

  return (
    <img
      src={src}
      alt={alt}
      loading={prioritas ? 'eager' : 'lazy'}
      fetchPriority={prioritas ? 'high' : 'auto'}
      decoding="async"
      onError={() => setRusak(true)}
      className={className}
    />
  );
}