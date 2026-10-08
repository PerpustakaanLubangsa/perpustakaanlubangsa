'use client';

import React, {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Loader2, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase'; // ← samakan dengan import di KategoriSelect.tsx
import { BTN_NEUTRAL } from './raised-buttons';

/* ───────────────────────── Types ───────────────────────── */

interface RawRak {
  id: number;
  nama_rak: string;
  kode_awal: string | null;
  huruf_awal: string | null;
  kode_akhir: string | null;
  huruf_akhir: string | null;
  kategori: { nama_kategori: string } | { nama_kategori: string }[] | null;
}

interface RakOption {
  id: number;
  nama_rak: string;
  kategori: string;
  rentang: string;
}

interface Entry {
  key: string;
  value: string;
  title: string;
  subtitle?: string;
  note?: string;
}

interface Pos {
  left: number;
  width: number;
  top?: number;
  bottom?: number;
  maxHeight: number;
}

interface RakSelectProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  /** Dipakai induk agar Esc / klik backdrop tidak ikut menutup modal saat daftar terbuka */
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
  placeholder?: string;
}

/* ───────────────────────── Konstanta ───────────────────────── */

const INPUT_CLS =
  'h-10 px-3 text-sm font-medium bg-white border border-blue-100 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-colors';
const SCROLL_CLS =
  '[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-blue-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-blue-300';

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, '');
const gabung = (kode: string | null, huruf: string | null) => [kode, huruf].filter(Boolean).join(' ');

const formatRentang = (r: RawRak) => {
  const awal = gabung(r.kode_awal, r.huruf_awal);
  const akhir = gabung(r.kode_akhir, r.huruf_akhir);
  if (!awal && !akhir) return '';
  if (!akhir || awal === akhir) return awal;
  if (!awal) return akhir;
  return `${awal} – ${akhir}`;
};

/* ───────────────────────── Komponen ───────────────────────── */

export default function RakSelect({
  id,
  value,
  onChange,
  onOpenChange,
  disabled = false,
  placeholder = 'Pilih rak',
}: RakSelectProps) {
  const [options, setOptions] = useState<RakOption[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [pos, setPos] = useState<Pos | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const mountedRef = useRef(true);
  const listboxId = useId();

  /* ───────────── Ambil daftar rak ───────────── */

  const loadOptions = useCallback(async () => {
    setStatus('loading');
    const { data, error } = await supabase
      .from('data_rak')
      .select('id, nama_rak, kode_awal, huruf_awal, kode_akhir, huruf_akhir, kategori:kategori_id ( nama_kategori )')
      .order('nama_rak', { ascending: true });

    if (!mountedRef.current) return;

    if (error) {
      console.error('Gagal memuat daftar rak:', error);
      setStatus('error');
      return;
    }

    const rows = (data ?? []) as unknown as RawRak[];
    setOptions(
      rows.map((r) => {
        const kat = Array.isArray(r.kategori) ? r.kategori[0] : r.kategori;
        return {
          id: r.id,
          nama_rak: r.nama_rak,
          kategori: kat?.nama_kategori ?? '',
          rentang: formatRentang(r),
        };
      })
    );
    setStatus('ready');
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    loadOptions();
    return () => {
      mountedRef.current = false;
    };
  }, [loadOptions]);

  /* Beri tahu induk saat daftar dibuka / ditutup */
  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);

  /* ───────────── Data turunan ───────────── */

  const selectedOption = useMemo(() => options.find((o) => o.nama_rak === value), [options, value]);

  // Nilai lama (teks bebas dari sebelum ada dropdown) yang tidak ada di daftar rak.
  // Tetap ditampilkan agar tidak hilang diam-diam saat eksemplar lama diedit.
  const isLegacy = status === 'ready' && value !== '' && !selectedOption;

  const entries = useMemo<Entry[]>(() => {
    const q = norm(query);
    const list: Entry[] = [];

    if (!q) {
      list.push({ key: '__none', value: '', title: 'Tanpa rak', subtitle: 'Kosongkan lokasi rak' });
      if (isLegacy) {
        list.push({ key: '__legacy', value, title: value, note: 'Nilai lama, tidak ada di daftar rak' });
      }
    }

    for (const o of options) {
      if (q && !norm(`${o.nama_rak} ${o.kategori} ${o.rentang}`).includes(q)) continue;
      list.push({
        key: String(o.id),
        value: o.nama_rak,
        title: o.nama_rak,
        subtitle: [o.kategori, o.rentang].filter(Boolean).join(' · '),
      });
    }
    return list;
  }, [options, query, value, isLegacy]);

  /* ───────────── Posisi daftar (portal + fixed, agar tidak terpotong overflow modal) ───────────── */

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom - 12;
    const spaceAbove = r.top - 12;
    const up = spaceBelow < 240 && spaceAbove > spaceBelow;
    const maxHeight = Math.max(180, Math.min(340, up ? spaceAbove : spaceBelow));

    const next: Pos = {
      left: r.left,
      width: r.width,
      top: up ? undefined : r.bottom + 6,
      bottom: up ? window.innerHeight - r.top + 6 : undefined,
      maxHeight,
    };

    setPos((prev) =>
      prev &&
      prev.left === next.left &&
      prev.width === next.width &&
      prev.top === next.top &&
      prev.bottom === next.bottom &&
      prev.maxHeight === next.maxHeight
        ? prev
        : next
    );
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, updatePosition]);

  const isShown = open && pos !== null;

  /* Saat daftar tampil: fokus ke pencarian, sorot item terpilih */
  useEffect(() => {
    if (!isShown) return;
    const idx = entries.findIndex((e) => e.value === value);
    setActiveIndex(idx >= 0 ? idx : 0);
    searchRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isShown]);

  /* Item yang disorot selalu terlihat */
  useEffect(() => {
    if (isShown) itemRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, isShown]);

  /* ───────────── Buka / tutup ───────────── */

  const openList = useCallback(() => {
    if (disabled) return;
    setQuery('');
    setActiveIndex(0);
    setOpen(true);
  }, [disabled]);

  const closeList = useCallback((focusTrigger: boolean) => {
    setOpen(false);
    if (focusTrigger) triggerRef.current?.focus();
  }, []);

  /* Klik / sentuh di luar menutup daftar */
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || listRef.current?.contains(t)) return;
      closeList(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open, closeList]);

  const selectEntry = useCallback(
    (entry: Entry) => {
      onChange(entry.value);
      closeList(true);
    },
    [onChange, closeList]
  );

  const handleTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) openList();
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, Math.max(entries.length - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const entry = entries[activeIndex];
      if (entry) selectEntry(entry);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeList(true);
    } else if (e.key === 'Tab') {
      closeList(false);
    }
  };

  /* ───────────── Render ───────────── */

  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        disabled={disabled}
        onClick={() => (open ? closeList(false) : openList())}
        onKeyDown={handleTriggerKeyDown}
        className={`${INPUT_CLS} w-full flex items-center justify-between gap-2 text-left cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed`}
      >
        <span className="min-w-0 flex items-baseline gap-2">
          <span className={`truncate ${value ? 'text-slate-800' : 'text-slate-400'}`}>{value || placeholder}</span>
          {selectedOption?.kategori && (
            <span className="truncate text-[11px] font-medium text-slate-400">{selectedOption.kategori}</span>
          )}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-blue-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {isShown &&
        createPortal(
          <div
            ref={listRef}
            style={{
              position: 'fixed',
              left: pos.left,
              width: pos.width,
              top: pos.top,
              bottom: pos.bottom,
              maxHeight: pos.maxHeight,
            }}
            className="z-[70] flex flex-col bg-white border border-blue-100 rounded-xl shadow-xl overflow-hidden"
          >
            {/* Pencarian */}
            <div className="p-2 bg-blue-50 border-b border-blue-100 shrink-0">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-blue-400 pointer-events-none" />
                <input
                  ref={searchRef}
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setActiveIndex(0);
                  }}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Cari rak, kategori, atau kode..."
                  aria-label="Cari rak"
                  className="w-full h-9 pl-8 pr-3 text-sm font-medium bg-white border border-blue-100 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-colors"
                />
              </div>
            </div>

            {/* Daftar */}
            <div id={listboxId} role="listbox" className={`flex-1 min-h-0 overflow-y-auto p-1 ${SCROLL_CLS}`}>
              {status === 'loading' && (
                <div className="flex items-center justify-center gap-2 p-5 text-xs text-slate-500">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Memuat daftar rak...
                </div>
              )}

              {status === 'error' && (
                <div className="flex flex-col items-center gap-2.5 p-5 text-center">
                  <span className="text-xs text-slate-500">Daftar rak gagal dimuat.</span>
                  <button
                    type="button"
                    onClick={loadOptions}
                    className={`h-8 px-3 text-xs font-bold rounded-lg ${BTN_NEUTRAL}`}
                  >
                    Coba lagi
                  </button>
                </div>
              )}

              {status === 'ready' && options.length === 0 && (
                <div className="p-5 text-center text-xs text-slate-500">Belum ada data rak.</div>
              )}

              {status === 'ready' && options.length > 0 && entries.length === 0 && (
                <div className="p-5 text-center text-xs text-slate-500">Tidak ada rak yang cocok.</div>
              )}

              {status === 'ready' &&
                entries.map((entry, i) => {
                  const selected = entry.value === value;
                  const active = i === activeIndex;

                  return (
                    <button
                      key={entry.key}
                      ref={(el) => {
                        itemRefs.current[i] = el;
                      }}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => selectEntry(entry)}
                      onMouseEnter={() => setActiveIndex(i)}
                      className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-left cursor-pointer transition-colors ${
                        active ? 'bg-blue-100' : selected ? 'bg-blue-50' : ''
                      }`}
                    >
                      <span className="min-w-0">
                        <span
                          className={`block text-sm truncate ${
                            selected ? 'font-bold text-blue-700' : 'font-semibold text-slate-800'
                          }`}
                        >
                          {entry.title}
                        </span>
                        {entry.subtitle && (
                          <span className="block text-[11px] text-slate-500 truncate">{entry.subtitle}</span>
                        )}
                        {entry.note && <span className="block text-[11px] text-amber-600">{entry.note}</span>}
                      </span>
                      {selected && <Check className="h-4 w-4 shrink-0 text-blue-600" />}
                    </button>
                  );
                })}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}