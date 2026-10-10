'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, RefreshCw } from 'lucide-react';
import type { Scope } from '../konfigurasi';
import { tombolSekunder, tombolUtama } from '../gaya';

interface ActionMenuProps {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  variant: 'light' | 'solid';
  busy: boolean;
  disabled: boolean;
  borrowedCount: number | null;
  lateCount: number | null;
  onSelect: (scope: Scope) => void;
}

// Tombol aksi dengan pilihan (Semua / Terlambat saja)
export default function ActionMenu({
  label,
  icon: Icon,
  variant,
  busy,
  disabled,
  borrowedCount,
  lateCount,
  onSelect,
}: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const options: { scope: Scope; text: string; count: number | null }[] = [
    { scope: 'all', text: 'Semua peminjam', count: borrowedCount },
    { scope: 'late', text: 'Hanya yang terlambat', count: lateCount },
  ];

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled || busy}
        aria-haspopup="menu"
        aria-expanded={open}
        className={variant === 'solid' ? tombolUtama : tombolSekunder}
      >
        {busy ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Icon className="w-3.5 h-3.5" />}
        {busy ? 'Memproses...' : label}
        {!busy && <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-64 z-30 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden"
        >
          {options.map((opt) => (
            <button
              key={opt.scope}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onSelect(opt.scope);
              }}
              className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors cursor-pointer"
            >
              <span>{opt.text}</span>
              <span className="text-[10px] font-black text-blue-600 bg-blue-50 border border-blue-200 rounded-md px-1.5 py-0.5">
                {opt.count === null ? '–' : opt.count.toLocaleString('id-ID')}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}