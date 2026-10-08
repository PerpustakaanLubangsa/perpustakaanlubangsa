'use client';

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Loader2, Search, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { BTN_EDIT, BTN_FIELD, BTN_NEUTRAL_SM } from './raised-buttons';

/* ───────────────────────── Types ───────────────────────── */

interface KategoriOption {
  id: number;
  nama_kategori: string;
  kode_awal: number | null;
  kode_akhir: number | null;
}

interface KategoriSelectProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

/* ───────────────────────── Helper ───────────────────────── */

const SCROLL_CLS =
  '[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-blue-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-blue-300';

// Kode Dewey ditampilkan 3 digit: 0 -> "000", 97 -> "097"
const pad3 = (n: number) => String(n).padStart(3, '0');

function formatRange(o: Pick<KategoriOption, 'kode_awal' | 'kode_akhir'>): string {
  if (o.kode_awal === null || o.kode_akhir === null) return '';
  return `${pad3(o.kode_awal)} – ${pad3(o.kode_akhir)}`;
}

const normalize = (s: string) => s.trim().toLowerCase();

/**
 * Ubah kata kunci berupa kode klasifikasi menjadi interval kode.
 * "297" -> 297..297, "29" -> 290..299, "2" -> 200..299, "297.1" -> 297..297.
 * Kata kunci bukan angka menghasilkan null (dicari sebagai nama saja).
 */
function parseKodeInterval(q: string): { lo: number; hi: number } | null {
  const m = q.match(/^(\d{1,3})(?:[.,]\d*)?$/);
  if (!m) return null;
  const span = 10 ** (3 - m[1].length);
  const lo = parseInt(m[1], 10) * span;
  return { lo, hi: lo + span - 1 };
}

/**
 * Cari berdasarkan nama (semua kata harus ada) dan/atau kode klasifikasi.
 * Hasil yang cocok lewat kode ditaruh lebih dulu, rentang yang paling sempit paling atas.
 */
function filterKategori(options: KategoriOption[], rawQuery: string): KategoriOption[] {
  const q = normalize(rawQuery);
  if (!q) return options;

  const tokens = q.split(/\s+/);
  const byName = (o: KategoriOption) => {
    const name = o.nama_kategori.toLowerCase();
    return tokens.every((t) => name.includes(t));
  };

  const interval = parseKodeInterval(q);
  if (!interval) return options.filter(byName);

  const byCode = (o: KategoriOption) =>
    o.kode_awal !== null &&
    o.kode_akhir !== null &&
    o.kode_awal <= interval.hi &&
    o.kode_akhir >= interval.lo;

  const codeMatches: KategoriOption[] = [];
  const nameOnly: KategoriOption[] = [];
  for (const o of options) {
    if (byCode(o)) codeMatches.push(o);
    else if (byName(o)) nameOnly.push(o);
  }

  codeMatches.sort(
    (a, b) =>
      (a.kode_akhir as number) - (a.kode_awal as number) -
        ((b.kode_akhir as number) - (b.kode_awal as number)) ||
      (a.kode_awal as number) - (b.kode_awal as number)
  );

  return [...codeMatches, ...nameOnly];
}

/* ───────────────────────── Komponen ───────────────────────── */

export default function KategoriSelect({ id, value, onChange, disabled = false }: KategoriSelectProps) {
  const uid = useId();
  const listId = `${uid}-list`;
  const optionId = (i: number) => `${uid}-opt-${i}`;

  const [options, setOptions] = useState<KategoriOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  /* Muat daftar kategori dari Supabase setiap komponen tampil (modal dibuka) */
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(false);

    (async () => {
      try {
        const { data, error } = await supabase
          .from('kategori')
          .select('id, nama_kategori, kode_awal, kode_akhir')
          .order('kode_awal', { ascending: true, nullsFirst: false })
          .order('nama_kategori', { ascending: true })
          .limit(1000);
        if (error) throw error;
        if (!cancelled) setOptions((data ?? []) as KategoriOption[]);
      } catch (err) {
        console.error('Gagal memuat daftar kategori:', err);
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const results = useMemo(() => filterKategori(options, query), [options, query]);

  const normalizedValue = normalize(value);
  const selectedOption = useMemo(
    () => (normalizedValue ? options.find((o) => normalize(o.nama_kategori) === normalizedValue) ?? null : null),
    [options, normalizedValue]
  );
  const selectedRange = selectedOption ? formatRange(selectedOption) : '';
  // Nilai lama (teks bebas) yang tidak ada di tabel kategori
  const isUnknownValue = Boolean(value) && !loading && !loadError && !selectedOption;

  /* Fokus ke kolom cari saat dropdown dibuka */
  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  /* Tutup saat klik/sentuh di luar */
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  /* Tutup jika form sedang menyimpan */
  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  /* Pastikan opsi aktif selalu terlihat saat navigasi keyboard */
  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [open, activeIndex, results]);

  /* ───────────── Handler ───────────── */

  const openPanel = () => {
    if (disabled) return;
    const idx = selectedOption ? options.findIndex((o) => o.id === selectedOption.id) : 0;
    setQuery('');
    setActiveIndex(idx >= 0 ? idx : 0);
    setOpen(true);
  };

  const closePanel = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const selectOption = (o: KategoriOption) => {
    onChange(o.nama_kategori);
    closePanel();
  };

  const clearValue = () => {
    onChange('');
    triggerRef.current?.focus();
  };

  const onTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowDown' && !open) {
      e.preventDefault();
      openPanel();
    } else if (e.key === 'Escape' && open) {
      // Cegah Esc ikut menutup modal buku
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
    }
  };

  const onSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (results.length) setActiveIndex((i) => (i + 1) % results.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (results.length) setActiveIndex((i) => (i - 1 + results.length) % results.length);
        break;
      case 'Enter': {
        // Wajib dicegah agar tidak mengirim form buku
        e.preventDefault();
        const o = results[activeIndex];
        if (o) selectOption(o);
        break;
      }
      case 'Escape':
        // Cegah Esc ikut menutup modal buku
        e.preventDefault();
        e.stopPropagation();
        closePanel();
        break;
      case 'Tab':
        setOpen(false);
        break;
    }
  };

  const interval = parseKodeInterval(normalize(query));

  return (
    <div ref={wrapperRef}>
      <div className="relative flex items-center gap-2">
        <button
          ref={triggerRef}
          id={id}
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          disabled={disabled}
          onClick={() => (open ? setOpen(false) : openPanel())}
          onKeyDown={onTriggerKeyDown}
          className={`flex-1 min-w-0 h-10 px-3 flex items-center gap-2 text-left text-sm font-medium rounded-xl ${BTN_FIELD}`}
        >
          {value ? (
            <>
              <span className="truncate text-slate-800">{value}</span>
              {selectedRange && (
                <span className="shrink-0 px-1.5 text-[10px] leading-4 font-bold bg-blue-50 text-blue-700 border border-blue-100 rounded tabular-nums">
                  {selectedRange}
                </span>
              )}
              {isUnknownValue && (
                <span className="shrink-0 px-1.5 text-[10px] leading-4 font-bold bg-amber-50 text-amber-700 border border-amber-200 rounded">
                  Tidak ada di daftar
                </span>
              )}
            </>
          ) : (
            <span className="truncate text-slate-400">Pilih kategori buku</span>
          )}
          <ChevronDown
            aria-hidden="true"
            className={`ml-auto h-4 w-4 shrink-0 text-blue-400 transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </button>

        {value && (
          <button
            type="button"
            onClick={clearValue}
            disabled={disabled}
            aria-label="Kosongkan kategori"
            title="Kosongkan kategori"
            className={`h-10 w-10 shrink-0 flex items-center justify-center rounded-xl ${BTN_EDIT}`}
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {open && (
          <div className="absolute left-0 right-0 top-full mt-2 z-30 bg-white border border-blue-200 rounded-xl shadow-lg overflow-hidden">
            {/* Kolom cari */}
            <div className="relative p-2 border-b border-blue-100 bg-blue-50/50">
              <Search className="absolute left-4.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-blue-400 pointer-events-none" />
              <input
                ref={searchRef}
                type="text"
                role="combobox"
                aria-expanded="true"
                aria-controls={listId}
                aria-autocomplete="list"
                aria-activedescendant={results[activeIndex] ? optionId(activeIndex) : undefined}
                aria-label="Cari kategori"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActiveIndex(0);
                }}
                onKeyDown={onSearchKeyDown}
                autoComplete="off"
                placeholder="Cari nama atau kode klasifikasi (contoh: 200)"
                className="w-full h-9 pl-8 pr-3 text-xs font-medium bg-white border border-blue-100 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-colors"
              />
            </div>

            {/* Daftar */}
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-6 text-xs text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                Memuat kategori...
              </div>
            ) : loadError ? (
              <div className="flex flex-col items-center gap-2 py-5 px-4 text-center">
                <p className="text-xs font-semibold text-red-600">Gagal memuat daftar kategori.</p>
                <button
                  type="button"
                  onClick={() => setReloadKey((k) => k + 1)}
                  className={`px-3 py-1.5 text-[11px] font-bold rounded-lg ${BTN_NEUTRAL_SM}`}
                >
                  Coba lagi
                </button>
              </div>
            ) : results.length === 0 ? (
              <p className="py-6 px-4 text-center text-xs text-slate-500">
                {interval
                  ? `Tidak ada kategori yang rentangnya mencakup kode "${query.trim()}".`
                  : options.length === 0
                    ? 'Belum ada kategori. Tambahkan dulu di halaman Manajemen Kategori.'
                    : 'Kategori tidak ditemukan.'}
              </p>
            ) : (
              <ul
                ref={listRef}
                id={listId}
                role="listbox"
                aria-label="Daftar kategori"
                className={`max-h-56 overflow-y-auto py-1 ${SCROLL_CLS}`}
              >
                {results.map((o, i) => {
                  const isSelected = selectedOption?.id === o.id;
                  const isActive = i === activeIndex;
                  const range = formatRange(o);

                  return (
                    <li
                      key={o.id}
                      id={optionId(i)}
                      role="option"
                      aria-selected={isSelected}
                      data-index={i}
                      onMouseEnter={() => setActiveIndex(i)}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => selectOption(o)}
                      className={`flex items-center gap-2 px-3 py-2 text-xs cursor-pointer transition-colors ${
                        isActive ? 'bg-blue-50' : ''
                      }`}
                    >
                      <Check
                        aria-hidden="true"
                        className={`h-3.5 w-3.5 shrink-0 text-blue-600 ${isSelected ? 'opacity-100' : 'opacity-0'}`}
                      />
                      <span
                        className={`min-w-0 flex-1 truncate font-semibold ${
                          isSelected ? 'text-blue-700' : 'text-slate-800'
                        }`}
                      >
                        {o.nama_kategori}
                      </span>
                      {range ? (
                        <span className="shrink-0 px-1.5 text-[10px] leading-4 font-bold bg-blue-50 text-blue-700 border border-blue-100 rounded tabular-nums">
                          {range}
                        </span>
                      ) : (
                        <span className="shrink-0 px-1.5 text-[10px] leading-4 font-bold bg-amber-50 text-amber-700 border border-amber-200 rounded">
                          Belum diatur
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            <p className="sr-only" aria-live="polite">
              {loading ? '' : `${results.length} kategori ditemukan`}
            </p>

            <div className="px-3 py-1.5 border-t border-blue-100 bg-slate-50 text-[10px] font-medium text-slate-500">
              ↑ ↓ pilih · Enter konfirmasi · Esc tutup
            </div>
          </div>
        )}
      </div>

      {isUnknownValue && (
        <p className="mt-1 text-[10px] font-medium text-amber-700">
          Kategori ini belum ada di daftar. Pilih dari daftar agar seragam, atau biarkan jika memang disengaja.
        </p>
      )}
    </div>
  );
}