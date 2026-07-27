'use client';

import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { library } from '@fortawesome/fontawesome-svg-core';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { createClient } from '@supabase/supabase-js'; // Sesuaikan import client Supabase kamu

library.add(fas);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface MemberResult {
  id: string;
  nis: string;
  nama: string;
  jenjang: string;
  organisasi?: string;
  kamar?: string;
  role: string;
  rank?: string;
  foto?: string;
}

export interface BookSearchResult {
  id: string; // ID eksemplar
  biblio_id: string;
  barcode: string; // eksemplar.kode
  title: string; // biblio.judul
  author: string; // biblio.penulis
  status: string; // eksemplar.status
  lokasi_rak?: string;
}

interface SmartSearchInputProps {
  selectedMember: MemberResult | null;
  onSelectMember: (member: MemberResult | null) => void;
  onSelectBook: (book: BookSearchResult) => void;
  disabled?: boolean;
}

export default function SmartSearchInput({
  selectedMember,
  onSelectMember,
  onSelectBook,
  disabled = false,
}: SmartSearchInputProps) {
  const [query, setQuery] = useState('');
  const [memberSuggestions, setMemberSuggestions] = useState<MemberResult[]>([]);
  const [bookSuggestions, setBookSuggestions] = useState<BookSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Reset indeks sorotan setiap kali daftar hasil pencarian berubah
  useEffect(() => {
    setSelectedIndex(-1);
  }, [memberSuggestions, bookSuggestions]);

  // Fokus kembali ke input saat status anggota berubah
  useEffect(() => {
    inputRef.current?.focus();
  }, [selectedMember]);

  // Auto-scroll ke item yang sedang disorot menggunakan tombol panah (jika diperlukan container luar)
  useEffect(() => {
    if (selectedIndex >= 0 && dropdownRef.current) {
      const activeElement = dropdownRef.current.children[selectedIndex + (isLoading ? 1 : 0)] as HTMLElement;
      if (activeElement) {
        activeElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex, isLoading]);

  // Handler Navigasi Keyboard (Panah Atas/Bawah, Enter, ESC)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const listLength = !selectedMember ? memberSuggestions.length : bookSuggestions.length;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (listLength > 0) {
        setSelectedIndex((prev) => (prev < listLength - 1 ? prev + 1 : 0));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (listLength > 0) {
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : listLength - 1));
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0) {
        if (!selectedMember && memberSuggestions[selectedIndex]) {
          handleSelectMember(memberSuggestions[selectedIndex]);
        } else if (selectedMember && bookSuggestions[selectedIndex]) {
          handleSelectBook(bookSuggestions[selectedIndex]);
        }
      }
    } else if (e.key === 'Escape') {
      if (selectedMember) {
        onSelectMember(null);
        setQuery('');
      } else {
        setMemberSuggestions([]);
        setBookSuggestions([]);
      }
    }
  };

  const handleSelectMember = (member: MemberResult) => {
    onSelectMember(member);
    setQuery('');
    setMemberSuggestions([]);
    setSelectedIndex(-1);
  };

  const handleSelectBook = (book: BookSearchResult) => {
    onSelectBook(book);
    setQuery('');
    setBookSuggestions([]);
    setSelectedIndex(-1);
  };

  // Query Pencarian ke Database Supabase
  useEffect(() => {
    if (!query.trim()) {
      setMemberSuggestions([]);
      setBookSuggestions([]);
      return;
    }

    const searchData = async () => {
      setIsLoading(true);
      try {
        if (!selectedMember) {
          // --- 1. CARI ANGGOTA (Tabel 'anggota') ---
          const { data, error } = await supabase
            .from('anggota')
            .select('id, nis, nama, jenjang, organisasi, kamar, role, rank, foto')
            .or(`nama.ilike.%${query}%,nis.ilike.%${query}%`)
            .limit(8);

          if (error) {
            console.error('Supabase Anggota Error:', error.message || error);
            throw error;
          }

          if (data) {
            const mappedMembers: MemberResult[] = data.map((m: any) => ({
              id: m.id,
              nis: m.nis,
              nama: m.nama,
              jenjang: m.jenjang,
              organisasi: m.organisasi || undefined,
              kamar: m.kamar || undefined,
              role: m.role,
              rank: m.rank || 'Warrior',
              foto: m.foto || undefined,
            }));
            setMemberSuggestions(mappedMembers);
          }
        } else {
          // --- 2. CARI BUKU (Tabel 'eksemplar' & 'biblio') ---
          const { data: matchedBiblios } = await supabase
            .from('biblio')
            .select('id')
            .or(`judul.ilike.%${query}%,penulis.ilike.%${query}%`)
            .limit(10);

          const matchedBiblioIds = matchedBiblios?.map((b) => b.id) || [];

          let orConditions = `kode.ilike.%${query}%`;
          if (matchedBiblioIds.length > 0) {
            orConditions += `,biblio_id.in.(${matchedBiblioIds.join(',')})`;
          }

          const { data, error } = await supabase
            .from('eksemplar')
            .select(`
              id,
              kode,
              status,
              lokasi_rak,
              biblio_id,
              biblio (
                judul,
                penulis
              )
            `)
            .or(orConditions)
            .limit(8);

          if (error) {
            console.error('Supabase Eksemplar Error:', error.message || error);
            throw error;
          }

          if (data) {
            const mappedBooks: BookSearchResult[] = data.map((item: any) => ({
              id: item.id,
              biblio_id: item.biblio_id,
              barcode: item.kode,
              title: item.biblio?.judul || 'Tanpa Judul',
              author: item.biblio?.penulis || 'Anonim',
              status: item.status || 'Tersedia',
              lokasi_rak: item.lokasi_rak || undefined,
            }));

            setBookSuggestions(mappedBooks);
          }
        }
      } catch (err: any) {
        console.error('Error fetching search results:', err?.message || JSON.stringify(err) || err);
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(() => {
      searchData();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [query, selectedMember]);

  return (
    <div className="relative w-full">
      {/* Dropdown Hasil Pencarian (Melayang Ke Atas - Tanpa Batasan Tinggi) */}
      {!disabled && (memberSuggestions.length > 0 || bookSuggestions.length > 0 || isLoading) && (
        <div
          ref={dropdownRef}
          className="absolute bottom-full left-0 right-0 mb-2 bg-slate-950/95 backdrop-blur-md border border-slate-800 rounded-2xl p-2 shadow-2xl z-50"
        >
          {/* Indicator Loading */}
          {isLoading && (
            <div className="p-3 text-center text-xs text-cyan-400 animate-pulse flex items-center justify-center gap-2">
              <FontAwesomeIcon icon={['fas', 'spinner']} className="animate-spin" />
              <span>Mencari data...</span>
            </div>
          )}

          {/* Hasil Pencarian Anggota */}
          {!selectedMember &&
            !isLoading &&
            memberSuggestions.map((m, index) => {
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={m.id}
                  onClick={() => handleSelectMember(m)}
                  className={`p-2.5 rounded-xl cursor-pointer flex justify-between items-center text-xs transition-colors my-0.5 ${
                    isSelected
                      ? 'bg-cyan-500/30 border border-cyan-500/50 text-white'
                      : 'hover:bg-cyan-500/20 text-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {m.foto ? (
                      <img src={m.foto} alt={m.nama} className="w-7 h-7 rounded-full object-cover" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 text-[10px]">
                        <FontAwesomeIcon icon={['fas', 'user']} />
                      </div>
                    )}
                    <div>
                      <p className="font-bold">{m.nama}</p>
                      <p className="text-[10px] text-cyan-400 font-mono">
                        NIS: {m.nis} {m.jenjang ? `• ${m.jenjang}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-800 px-2 py-0.5 rounded-md font-semibold">
                      {m.rank}
                    </span>
                  </div>
                </div>
              );
            })}

          {/* Hasil Pencarian Buku */}
          {selectedMember &&
            !isLoading &&
            bookSuggestions.map((b, index) => {
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={b.id}
                  onClick={() => handleSelectBook(b)}
                  className={`p-2.5 rounded-xl cursor-pointer flex justify-between items-center text-xs transition-colors my-0.5 ${
                    isSelected
                      ? 'bg-cyan-500/30 border border-cyan-500/50 text-white'
                      : 'hover:bg-cyan-500/20 text-slate-100'
                  }`}
                >
                  <div>
                    <p className="font-bold">{b.title}</p>
                    <p className="text-[10px] text-slate-400">
                      Kode: <span className="text-cyan-400 font-mono">{b.barcode}</span> • Penulis: {b.author}
                    </p>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                      b.status?.toLowerCase() === 'tersedia' || b.status?.toLowerCase() === 'available'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    {b.status}
                  </span>
                </div>
              );
            })}
        </div>
      )}

      {/* Bar Input Utama */}
      <div className="bg-slate-950/90 backdrop-blur-xl border border-slate-800/90 rounded-2xl p-2 shadow-2xl flex flex-wrap sm:flex-nowrap items-center gap-2">
        {/* Chips Anggota Terpilih */}
        {selectedMember && (
          <div className="flex items-center gap-2.5 bg-cyan-950/80 border border-cyan-500/40 rounded-xl px-3 py-1.5 shadow-md">
            <div className="flex items-center gap-1.5">
              <FontAwesomeIcon icon={['fas', 'user-check']} className="text-cyan-400 text-xs" />
              <span className="text-xs font-bold text-slate-100">{selectedMember.nama}</span>
              <span className="text-[10px] text-cyan-300/80 font-mono">({selectedMember.nis})</span>
            </div>

            <button
              onClick={() => onSelectMember(null)}
              className="flex items-center gap-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-lg text-[11px] font-semibold transition-all ml-1"
              title="Batal pilih anggota (Tekan ESC)"
            >
              <span>Batal</span>
              <kbd className="bg-slate-900/80 text-rose-200 text-[9px] px-1 py-0.2 rounded border border-rose-500/20 font-mono">
                ESC
              </kbd>
            </button>
          </div>
        )}

        {/* Input Text Utama */}
        <div className="flex-1 flex items-center gap-2 bg-slate-900/80 border border-slate-800/80 rounded-xl px-3 py-1.5 focus-within:border-cyan-500/50 transition-all">
          <FontAwesomeIcon
            icon={selectedMember ? ['fas', 'barcode'] : ['fas', 'id-card']}
            className="text-cyan-400 w-4 h-4"
          />
          <input
            ref={inputRef}
            type="text"
            placeholder={
              disabled
                ? 'Selesaikan transaksi sebelumnya...'
                : selectedMember
                ? 'Scan Barcode / Cari Judul Buku...'
                : 'Cari Nama / NIS Anggota...'
            }
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            className="flex-1 bg-transparent text-xs text-slate-100 placeholder-slate-400 outline-none h-8 disabled:cursor-not-allowed"
            autoFocus
          />
        </div>
      </div>
    </div>
  );
}