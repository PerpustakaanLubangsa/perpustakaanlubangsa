'use client';

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  Search,
  User,
  UserCheck,
  Barcode,
  BookOpen,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import ResultCard, { type MemberResult, type BookSearchResult } from './components/ResultCard';

/* ───────────────────────── Types ───────────────────────── */

// Info pinjaman aktif milik anggota (dipakai agar tidak perlu query ulang)
interface ActiveLoan {
  transactionId: number;
  dueDate: string | null; // YYYY-MM-DD
  nis: string;
}

// Info buku yang sedang dipinjam, ditampilkan di hasil pencarian anggota
interface MemberLoanInfo {
  kode: string;
  judul: string;
}

type MemberSuggestion = MemberResult & { loan?: MemberLoanInfo };

type NoticeType = 'success' | 'error';
type Notice = { type: NoticeType; text: string } | null;

/* Bentuk baris dari Supabase */
interface AnggotaRow {
  id: string | number;
  nis: string;
  nama: string;
  jenjang: string;
  organisasi: string | null;
  kamar: string | null;
  role: string;
  rank: string | null;
}

interface SirkulasiLoanRow {
  nis: string;
  kode_eksemplar: string;
  judul_buku: string | null;
}

interface BiblioInfo {
  judul?: string | null;
  penulis?: string | null;
}

interface EksemplarRow {
  id: string | number;
  kode: string;
  status: string | null;
  lokasi_rak: string | null;
  biblio_id: string | number | null;
  biblio: BiblioInfo | BiblioInfo[] | null;
}

interface EksemplarDetailRow {
  id: string | number;
  status: string | null;
  lokasi_rak: string | null;
  biblio: BiblioInfo | BiblioInfo[] | null;
}

/* ───────────────────────── Konstanta & helper ───────────────────────── */

const LOAN_DAYS = 5;
const NOTICE_MS = 3500;
const SEARCH_DEBOUNCE_MS = 300;
const DAY_MS = 86_400_000;
const MEMBER_COLUMNS = 'id, nis, nama, jenjang, organisasi, kamar, role, rank';
const MEMBER_LIMIT = 8;
const SKELETON_ROWS = 3;

// Kesalahan yang sudah "diharapkan" (aturan bisnis / data tidak tersimpan):
// cukup tampil sebagai notifikasi, tidak memicu error di console.
class UserFacingError extends Error {}

const reportError = (label: string, err: unknown) => {
  if (err instanceof UserFacingError) console.warn(label, err.message);
  else console.error(label, err);
};

const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const startOfDay = (date: Date): Date => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

// Format YYYY-MM-DD berdasarkan waktu lokal
const formatDateToISO = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// Parse YYYY-MM-DD sebagai tanggal lokal (new Date('YYYY-MM-DD') dibaca UTC dan bisa meleset sehari)
const parseISODate = (value: string): Date => {
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
};

// Jumlah hari keterlambatan (0 jika belum lewat tempo)
const getOverdueDays = (due: Date): number =>
  Math.max(0, Math.round((startOfDay(new Date()).getTime() - startOfDay(due).getTime()) / DAY_MS));

const errMessage = (err: unknown): string =>
  err instanceof Error
    ? err.message
    : typeof err === 'object' && err && 'message' in err
    ? String((err as { message: unknown }).message)
    : String(err);

// Buang karakter yang merusak sintaks filter .or() PostgREST
const sanitizeSearch = (value: string) =>
  value.replace(/[,()%*\\"]/g, ' ').replace(/\s+/g, ' ').trim();

const isAvailableStatus = (status?: string | null) => {
  const s = status?.toLowerCase();
  return s === 'tersedia' || s === 'available';
};

const firstOf = <T,>(value: T | T[] | null | undefined): T | null =>
  Array.isArray(value) ? value[0] ?? null : value ?? null;

const toMember = (m: AnggotaRow): MemberSuggestion => ({
  id: String(m.id),
  nis: m.nis,
  nama: m.nama,
  jenjang: m.jenjang,
  organisasi: m.organisasi || undefined,
  kamar: m.kamar || undefined,
  role: m.role,
  rank: m.rank || 'Warrior',
});

/* ───────────────────────── Query Supabase ───────────────────────── */

/**
 * Cari anggota berdasarkan nama / NIS, dan juga berdasarkan buku yang sedang
 * dipinjam (judul atau kode eksemplar). Setiap hasil dilengkapi info pinjaman aktif.
 * Hasil yang cocok persis (NIS / kode eksemplar) diletakkan paling atas.
 */
const fetchMembers = async (term: string): Promise<MemberSuggestion[]> => {
  const [identityRes, loanMatchRes] = await Promise.all([
    supabase
      .from('anggota')
      .select(MEMBER_COLUMNS)
      .or(`nama.ilike.%${term}%,nis.ilike.%${term}%`)
      .limit(MEMBER_LIMIT),
    supabase
      .from('sirkulasi')
      .select('nis')
      .eq('status', 'DIPINJAM')
      .or(`judul_buku.ilike.%${term}%,kode_eksemplar.ilike.%${term}%`)
      .limit(MEMBER_LIMIT),
  ]);

  if (identityRes.error) throw identityRes.error;
  if (loanMatchRes.error) {
    console.warn('Gagal mencari berdasarkan buku yang dipinjam:', errMessage(loanMatchRes.error));
  }

  const members = ((identityRes.data ?? []) as AnggotaRow[]).map(toMember);

  // Anggota yang cocok lewat buku pinjaman tetapi belum ada di hasil nama/NIS
  const known = new Set(members.map((m) => m.nis));
  const extraNis = Array.from(
    new Set(((loanMatchRes.data ?? []) as { nis: string }[]).map((l) => l.nis))
  ).filter((nis) => !known.has(nis));

  if (extraNis.length > 0) {
    const { data: extra, error: extraError } = await supabase
      .from('anggota')
      .select(MEMBER_COLUMNS)
      .in('nis', extraNis);

    if (extraError) {
      console.warn('Gagal memuat anggota peminjam:', errMessage(extraError));
    } else {
      members.push(...((extra ?? []) as AnggotaRow[]).map(toMember));
    }
  }

  if (members.length === 0) return members;

  // Ambil pinjaman aktif semua anggota hasil (1 anggota = 1 buku)
  const { data: loans, error: loanError } = await supabase
    .from('sirkulasi')
    .select('nis, kode_eksemplar, judul_buku')
    .eq('status', 'DIPINJAM')
    .in(
      'nis',
      members.map((m) => m.nis)
    )
    .order('created_at', { ascending: false });

  if (loanError) {
    console.warn('Gagal memeriksa status pinjaman anggota:', errMessage(loanError));
    return members;
  }

  const loanByNis = new Map<string, MemberLoanInfo>();
  for (const l of (loans ?? []) as SirkulasiLoanRow[]) {
    if (!loanByNis.has(l.nis)) {
      loanByNis.set(l.nis, { kode: l.kode_eksemplar, judul: l.judul_buku || 'Tanpa Judul' });
    }
  }

  const withLoans = members.map<MemberSuggestion>((m) => {
    const loan = loanByNis.get(m.nis);
    return loan ? { ...m, isBorrowing: true, loan } : { ...m, isBorrowing: false };
  });

  // Cocok persis (NIS / kode eksemplar yang dipinjam) → paling atas
  const lowered = term.toLowerCase();
  const rank = (m: MemberSuggestion) =>
    m.nis.toLowerCase() === lowered || m.loan?.kode.toLowerCase() === lowered ? 0 : 1;
  return withLoans.sort((a, b) => rank(a) - rank(b));
};

const fetchBooks = async (term: string): Promise<BookSearchResult[]> => {
  const { data: matchedBiblios, error: biblioError } = await supabase
    .from('biblio')
    .select('id')
    .or(`judul.ilike.%${term}%,penulis.ilike.%${term}%`)
    .limit(10);

  if (biblioError) throw biblioError;

  const ids = ((matchedBiblios ?? []) as { id: string }[]).map((b) => b.id);
  let orConditions = `kode.ilike.%${term}%`;
  if (ids.length > 0) orConditions += `,biblio_id.in.(${ids.join(',')})`;

  const { data, error } = await supabase
    .from('eksemplar')
    .select(
      `
      id,
      kode,
      status,
      lokasi_rak,
      biblio_id,
      biblio (
        judul,
        penulis
      )
    `
    )
    .or(orConditions)
    .limit(8);

  if (error) throw error;

  const books = ((data ?? []) as unknown as EksemplarRow[]).map((item) => {
    const info = firstOf(item.biblio);
    return {
      id: String(item.id),
      biblio_id: item.biblio_id ? String(item.biblio_id) : '',
      barcode: item.kode,
      title: info?.judul || 'Tanpa Judul',
      author: info?.penulis || 'Anonim',
      status: item.status || 'Tersedia',
      lokasi_rak: item.lokasi_rak || undefined,
    };
  });

  // Kode cocok persis dulu, lalu buku yang tersedia
  const lowered = term.toLowerCase();
  const score = (b: BookSearchResult) =>
    (b.barcode.toLowerCase() === lowered ? 2 : 0) + (isAvailableStatus(b.status) ? 1 : 0);
  return books.sort((a, b) => score(b) - score(a));
};

/* ───────────────────────── Skeleton loading ───────────────────────── */

const MemberSkeletonRow = () => (
  <div className="p-2.5 rounded-xl flex justify-between items-center gap-3 my-0.5 animate-pulse">
    <div className="flex items-center gap-3 min-w-0 flex-1">
      <div className="w-8 h-8 rounded-full bg-blue-100 shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 w-2/5 rounded bg-slate-200" />
        <div className="h-2.5 w-3/5 rounded bg-blue-100" />
      </div>
    </div>
    <div className="h-4 w-14 rounded-md bg-blue-100 shrink-0" />
  </div>
);

const BookSkeletonRow = () => (
  <div className="p-2.5 rounded-xl flex justify-between items-center gap-3 my-0.5 animate-pulse">
    <div className="flex-1 space-y-1.5">
      <div className="h-3 w-3/5 rounded bg-slate-200" />
      <div className="h-2.5 w-4/5 rounded bg-blue-100" />
    </div>
    <div className="h-4 w-14 rounded bg-blue-100 shrink-0" />
  </div>
);

const SearchSkeleton = ({ variant }: { variant: 'member' | 'book' }) => (
  <div role="status" aria-label="Memuat hasil pencarian" aria-busy="true">
    {Array.from({ length: SKELETON_ROWS }).map((_, i) =>
      variant === 'member' ? <MemberSkeletonRow key={i} /> : <BookSkeletonRow key={i} />
    )}
  </div>
);

/* ───────────────────────── Baris hasil (memoized) ───────────────────────── */

// Petunjuk pada item yang sedang tersorot
const EnterHint = () => (
  <span className="flex items-center gap-1 text-[10px] font-bold text-white shrink-0">
    <kbd className="bg-white/20 border border-white/40 px-1.5 py-0.5 rounded font-mono">↵ Enter</kbd>
    <span className="hidden sm:inline">untuk memilih</span>
  </span>
);

const MemberItem = memo(function MemberItem({
  member,
  index,
  selected,
  onPick,
  onHover,
}: {
  member: MemberSuggestion;
  index: number;
  selected: boolean;
  onPick: (m: MemberSuggestion) => void;
  onHover: (index: number) => void;
}) {
  return (
    <div
      data-idx={index}
      onClick={() => onPick(member)}
      onMouseEnter={() => onHover(index)}
      aria-selected={selected}
      className={`p-2.5 rounded-xl cursor-pointer flex justify-between items-center gap-3 text-xs border transition-colors my-0.5 ${
        selected
          ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
          : 'border-transparent text-slate-800 hover:bg-blue-50'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 ${
            selected
              ? 'bg-white/20 border-white/30 text-white'
              : 'bg-blue-50 border-blue-100 text-blue-500'
          }`}
        >
          <User className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="font-bold truncate">{member.nama}</p>
          <p
            className={`text-[10px] font-mono font-semibold ${
              selected ? 'text-blue-100' : 'text-blue-600'
            }`}
          >
            NIS: {member.nis} {member.jenjang ? `• ${member.jenjang}` : ''}
          </p>
          {member.loan && (
            <p
              className={`mt-0.5 flex items-center gap-1 text-[10px] min-w-0 ${
                selected ? 'text-white' : 'text-slate-600'
              }`}
            >
              <BookOpen className={`h-3 w-3 shrink-0 ${selected ? 'text-blue-100' : 'text-blue-500'}`} />
              <span className="truncate font-semibold">{member.loan.judul}</span>
              <span className={`shrink-0 ${selected ? 'text-blue-200' : 'text-slate-400'}`}>•</span>
              <span
                className={`shrink-0 font-mono font-semibold ${
                  selected ? 'text-blue-100' : 'text-blue-600'
                }`}
              >
                {member.loan.kode}
              </span>
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {selected && <EnterHint />}
        {member.isBorrowing && (
          <span
            className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md font-bold ${
              selected ? 'bg-white text-blue-700' : 'bg-blue-600 text-white'
            }`}
          >
            <BookOpen className="h-3 w-3" />
            Meminjam
          </span>
        )}
        <span
          className={`text-[10px] border px-2 py-0.5 rounded-md font-bold ${
            selected
              ? 'bg-blue-500 text-white border-blue-300'
              : 'bg-blue-50 text-blue-700 border-blue-200'
          }`}
        >
          {member.rank}
        </span>
      </div>
    </div>
  );
});

const BookItem = memo(function BookItem({
  book,
  index,
  selected,
  onPick,
  onHover,
}: {
  book: BookSearchResult;
  index: number;
  selected: boolean;
  onPick: (b: BookSearchResult) => void;
  onHover: (index: number) => void;
}) {
  const available = isAvailableStatus(book.status);
  const active = selected && available;

  return (
    <div
      data-idx={index}
      onClick={() => onPick(book)}
      onMouseEnter={() => {
        if (available) onHover(index);
      }}
      aria-disabled={!available}
      aria-selected={active}
      className={`p-2.5 rounded-xl flex justify-between items-center gap-3 text-xs border transition-colors my-0.5 ${
        !available
          ? 'bg-slate-50 border-transparent text-slate-400 cursor-not-allowed'
          : active
          ? 'bg-blue-600 border-blue-600 text-white shadow-sm cursor-pointer'
          : 'border-transparent text-slate-800 hover:bg-blue-50 cursor-pointer'
      }`}
    >
      <div className="min-w-0">
        <p className="font-bold truncate">{book.title}</p>
        <p className={`text-[10px] truncate ${active ? 'text-blue-100' : 'text-slate-500'}`}>
          Kode:{' '}
          <span className={`font-mono font-semibold ${active ? 'text-white' : 'text-blue-600'}`}>
            {book.barcode}
          </span>{' '}
          • Penulis: {book.author}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {active && <EnterHint />}
        <span
          className={`text-[10px] px-2 py-0.5 rounded border font-bold ${
            !available
              ? 'bg-red-50 text-red-600 border-red-200'
              : active
              ? 'bg-white text-blue-700 border-white'
              : 'bg-blue-50 text-blue-700 border-blue-200'
          }`}
        >
          {book.status}
        </span>
      </div>
    </div>
  );
});

/* ───────────────────────── Smart search ───────────────────────── */

interface SmartSearchInputProps {
  selectedMember: MemberResult | null;
  onSelectMember: (member: MemberResult | null) => void;
  onSelectBook: (book: BookSearchResult, loan?: ActiveLoan) => void;
  onNotice: (type: NoticeType, text: string) => void;
  disabled?: boolean;
}

function SmartSearchInput({
  selectedMember,
  onSelectMember,
  onSelectBook,
  onNotice,
  disabled = false,
}: SmartSearchInputProps) {
  const [query, setQuery] = useState('');
  const [memberSuggestions, setMemberSuggestions] = useState<MemberSuggestion[]>([]);
  const [bookSuggestions, setBookSuggestions] = useState<BookSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchReqRef = useRef(0);

  const list = selectedMember ? bookSuggestions : memberSuggestions;

  // Indeks item yang boleh disorot/dipilih (buku yang tidak tersedia dilewati)
  const selectable = useMemo<number[]>(
    () =>
      selectedMember
        ? bookSuggestions.flatMap((b, i) => (isAvailableStatus(b.status) ? [i] : []))
        : memberSuggestions.map((_, i) => i),
    [selectedMember, bookSuggestions, memberSuggestions]
  );

  /* Setiap hasil baru muncul: sorot item paling atas agar bisa langsung di-Enter */
  useEffect(() => {
    setSelectedIndex(selectable.length > 0 ? selectable[0] : -1);
  }, [selectable]);

  /* Bersihkan input & hasil setiap anggota berganti / dibatalkan */
  useEffect(() => {
    searchReqRef.current++;
    setQuery('');
    setMemberSuggestions([]);
    setBookSuggestions([]);
    setSelectedIndex(-1);
  }, [selectedMember]);

  /* Fokus ke input saat anggota berganti dan saat input aktif kembali setelah proses */
  useEffect(() => {
    if (!disabled) inputRef.current?.focus();
  }, [selectedMember, disabled]);

  /* Scroll ke item yang disorot */
  useEffect(() => {
    if (selectedIndex < 0) return;
    dropdownRef.current
      ?.querySelector<HTMLElement>(`[data-idx="${selectedIndex}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  /* Pilih anggota + cek pinjaman aktif (jika ada, langsung buka kartu hasil) */
  const handleSelectMember = useCallback(
    async (member: MemberResult) => {
      setIsLoading(true);
      try {
        const { data: activeLoan, error } = await supabase
          .from('sirkulasi')
          .select('id, kode_eksemplar, judul_buku, biblio_id, tgl_kembali')
          .eq('nis', member.nis)
          .eq('status', 'DIPINJAM')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        // Gagal memeriksa pinjaman: jangan lanjut agar tidak terjadi pinjaman ganda
        if (error) {
          console.error('Error checking active loan:', error);
          onNotice('error', 'Gagal memeriksa pinjaman anggota: ' + errMessage(error));
          return;
        }

        onSelectMember(member);
        setQuery('');
        setMemberSuggestions([]);
        setSelectedIndex(-1);

        if (activeLoan) {
          // Data eksemplar & penulis diambil terpisah (sirkulasi tidak punya kolom penulis / relasi ke eksemplar)
          const { data: eksRaw } = await supabase
            .from('eksemplar')
            .select('id, status, lokasi_rak, biblio ( penulis )')
            .eq('kode', activeLoan.kode_eksemplar)
            .maybeSingle();

          const eks = eksRaw as unknown as EksemplarDetailRow | null;
          const biblioInfo = firstOf(eks?.biblio);

          onSelectBook(
            {
              id: eks?.id ? String(eks.id) : '',
              biblio_id: activeLoan.biblio_id ? String(activeLoan.biblio_id) : '',
              barcode: activeLoan.kode_eksemplar,
              title: activeLoan.judul_buku || 'Tanpa Judul',
              author: biblioInfo?.penulis || 'Anonim',
              status: eks?.status || 'Dipinjam',
              lokasi_rak: eks?.lokasi_rak || undefined,
            },
            {
              transactionId: activeLoan.id as number,
              dueDate: (activeLoan.tgl_kembali as string | null) ?? null,
              nis: member.nis,
            }
          );
        }
      } catch (err) {
        console.error('Error handling member selection:', err);
        onNotice('error', 'Gagal memilih anggota: ' + errMessage(err));
      } finally {
        setIsLoading(false);
      }
    },
    [onSelectMember, onSelectBook, onNotice]
  );

  /* Pilih buku + validasi status */
  const handleSelectBook = useCallback(
    (book: BookSearchResult) => {
      if (!isAvailableStatus(book.status)) {
        onNotice('error', `Buku "${book.title}" tidak dapat dipilih. Status saat ini: ${book.status}`);
        return;
      }
      onSelectBook(book);
      setQuery('');
      setBookSuggestions([]);
      setSelectedIndex(-1);
    },
    [onSelectBook, onNotice]
  );

  /* Enter tanpa sorotan: cari langsung (tanpa menunggu debounce) agar scanner barcode bekerja */
  const submitQuery = async () => {
    const term = sanitizeSearch(query);
    if (!term) return;

    const reqId = ++searchReqRef.current;
    setIsLoading(true);

    try {
      if (!selectedMember) {
        const results = await fetchMembers(term);
        if (reqId !== searchReqRef.current) return;

        const lowered = term.toLowerCase();
        const match =
          results.find(
            (m) => m.nis.toLowerCase() === lowered || m.loan?.kode.toLowerCase() === lowered
          ) ?? (results.length === 1 ? results[0] : undefined);

        if (match) {
          await handleSelectMember(match);
        } else if (results.length === 0) {
          onNotice('error', `Anggota "${term}" tidak ditemukan.`);
        } else {
          setMemberSuggestions(results);
        }
      } else {
        const results = await fetchBooks(term);
        if (reqId !== searchReqRef.current) return;

        const match =
          results.find((b) => b.barcode.toLowerCase() === term.toLowerCase()) ??
          (results.length === 1 ? results[0] : undefined);

        if (match) {
          handleSelectBook(match);
        } else if (results.length === 0) {
          onNotice('error', `Buku dengan kode/judul "${term}" tidak ditemukan.`);
        } else {
          setBookSuggestions(results);
        }
      }
    } catch (err) {
      console.error('Error submit pencarian:', errMessage(err));
      onNotice('error', 'Pencarian gagal: ' + errMessage(err));
    } finally {
      if (reqId === searchReqRef.current) setIsLoading(false);
    }
  };

  /* Pindah sorotan ke item berikutnya/sebelumnya yang bisa dipilih (berputar) */
  const moveSelection = (dir: 1 | -1) => {
    if (isLoading || selectable.length === 0) return;
    setSelectedIndex((prev) => {
      const pos = selectable.indexOf(prev);
      if (pos === -1) return dir === 1 ? selectable[0] : selectable[selectable.length - 1];
      return selectable[(pos + dir + selectable.length) % selectable.length];
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        moveSelection(1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        moveSelection(-1);
        break;
      case 'Enter': {
        e.preventDefault();
        // Saat skeleton tampil, hasil lama bisa usang: jangan dipilih
        if (!isLoading && selectedIndex >= 0 && list[selectedIndex]) {
          if (!selectedMember) handleSelectMember(memberSuggestions[selectedIndex]);
          else handleSelectBook(bookSuggestions[selectedIndex]);
        } else {
          submitQuery();
        }
        break;
      }
      case 'Escape':
        if (selectedMember) {
          onSelectMember(null);
        } else {
          setMemberSuggestions([]);
          setBookSuggestions([]);
        }
        break;
    }
  };

  /* Pencarian ke Supabase (debounce + abaikan respons usang) */
  useEffect(() => {
    const term = sanitizeSearch(query);

    if (!term) {
      searchReqRef.current++;
      setMemberSuggestions([]);
      setBookSuggestions([]);
      setIsLoading(false);
      return;
    }

    // Langsung tampilkan skeleton begitu pengguna mulai mengetik (sebelum debounce selesai)
    setIsLoading(true);
    setSelectedIndex(-1);

    const timer = setTimeout(async () => {
      const reqId = ++searchReqRef.current;

      try {
        if (!selectedMember) {
          const results = await fetchMembers(term);
          if (reqId !== searchReqRef.current) return;
          setMemberSuggestions(results);
        } else {
          const results = await fetchBooks(term);
          if (reqId !== searchReqRef.current) return;
          setBookSuggestions(results);
        }
      } catch (err) {
        console.error('Error fetching search results:', errMessage(err));
        if (reqId === searchReqRef.current) {
          setMemberSuggestions([]);
          setBookSuggestions([]);
        }
      } finally {
        if (reqId === searchReqRef.current) setIsLoading(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query, selectedMember]);

  const showDropdown = !disabled && (list.length > 0 || isLoading);

  return (
    <div className="relative w-full">
      {/* Dropdown hasil: muncul di atas input */}
      {showDropdown && (
        <div
          ref={dropdownRef}
          role="listbox"
          className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-blue-100 rounded-2xl p-2 shadow-md z-50 max-h-72 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-blue-200 [&::-webkit-scrollbar-thumb]:rounded-full"
        >
          {isLoading ? (
            <SearchSkeleton variant={selectedMember ? 'book' : 'member'} />
          ) : !selectedMember ? (
            memberSuggestions.map((m, i) => (
              <MemberItem
                key={m.id}
                member={m}
                index={i}
                selected={i === selectedIndex}
                onPick={handleSelectMember}
                onHover={setSelectedIndex}
              />
            ))
          ) : (
            bookSuggestions.map((b, i) => (
              <BookItem
                key={b.id}
                book={b}
                index={i}
                selected={i === selectedIndex}
                onPick={handleSelectBook}
                onHover={setSelectedIndex}
              />
            ))
          )}
        </div>
      )}

      {/* Bar input utama */}
      <div className="bg-white border border-blue-100 rounded-2xl p-2 shadow-md flex flex-wrap sm:flex-nowrap items-center gap-2">
        {selectedMember && (
          <div className="flex items-center gap-2.5 bg-blue-50 border border-blue-200 rounded-xl px-3 py-1.5 shrink-0">
            <div className="flex items-center gap-1.5">
              <UserCheck className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-bold text-slate-900">{selectedMember.nama}</span>
              <span className="text-[10px] text-blue-600 font-mono font-semibold">({selectedMember.nis})</span>
            </div>

            <button
              type="button"
              onClick={() => onSelectMember(null)}
              title="Batal pilih anggota (Tekan ESC)"
              className="flex items-center gap-1.5 bg-white hover:bg-red-500 text-red-500 hover:text-white border border-red-200 hover:border-red-500 px-2 py-0.5 rounded-lg text-[11px] font-bold transition-colors ml-1 cursor-pointer"
            >
              <span>Batal</span>
              <kbd className="bg-red-50 text-red-500 text-[9px] px-1 rounded border border-red-200 font-mono">ESC</kbd>
            </button>
          </div>
        )}

        <div className="flex-1 min-w-[200px] flex items-center gap-2 bg-white border border-blue-100 rounded-xl px-3 py-1.5 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-500/20 transition-colors">
          {selectedMember ? (
            <Barcode className="h-4 w-4 text-blue-500 shrink-0" />
          ) : (
            <Search className="h-4 w-4 text-blue-500 shrink-0" />
          )}
          <input
            ref={inputRef}
            type="text"
            aria-label={selectedMember ? 'Cari buku atau scan barcode' : 'Cari anggota atau buku yang dipinjam'}
            placeholder={
              disabled
                ? 'Selesaikan transaksi sebelumnya...'
                : selectedMember
                ? 'Scan Barcode / Cari Judul Buku...'
                : 'Cari Nama / NIS Anggota / Buku yang Dipinjam...'
            }
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            autoFocus
            autoComplete="off"
            className="flex-1 bg-transparent text-sm font-medium text-slate-800 placeholder-slate-400 outline-none h-8 disabled:cursor-not-allowed"
          />
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Halaman ───────────────────────── */

export default function SirkulasiPage() {
  const [selectedMember, setSelectedMember] = useState<MemberResult | null>(null);
  const [selectedBook, setSelectedBook] = useState<BookSearchResult | null>(null);
  const [activeTransactionId, setActiveTransactionId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  // Default jatuh tempo: +5 hari dari hari ini
  const [dueDateObj, setDueDateObj] = useState<Date>(() => addDays(new Date(), LOAN_DAYS));

  // Kunci transaksi yang sedang/sudah diproses: mencegah INSERT ganda (mis. Strict Mode)
  const processedKeyRef = useRef<string | null>(null);
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dueDateFormatted = dueDateObj.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const overdueDays = getOverdueDays(dueDateObj);

  /* Notifikasi: menggantikan alert() yang memblokir halaman */
  const showNotice = useCallback((type: NoticeType, text: string) => {
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    setNotice({ type, text });
    noticeTimerRef.current = setTimeout(() => setNotice(null), NOTICE_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    };
  }, []);

  const handleReset = useCallback(() => {
    processedKeyRef.current = null;
    setSelectedMember(null);
    setSelectedBook(null);
    setActiveTransactionId(null);
    setDueDateObj(addDays(new Date(), LOAN_DAYS));
  }, []);

  const handleSelectMember = useCallback(
    (member: MemberResult | null) => {
      if (!member) {
        handleReset();
        return;
      }
      setSelectedMember(member);
    },
    [handleReset]
  );

  // Pilih buku. Jika `loan` diberikan, transaksi aktif langsung dimuat tanpa query ulang.
  const handleSelectBook = useCallback((book: BookSearchResult, loan?: ActiveLoan) => {
    if (loan) {
      processedKeyRef.current = `${loan.nis}|${book.barcode}`;
      setActiveTransactionId(loan.transactionId);
      setDueDateObj(loan.dueDate ? parseISODate(loan.dueDate) : addDays(new Date(), LOAN_DAYS));
    } else {
      processedKeyRef.current = null;
      setActiveTransactionId(null);
      setDueDateObj(addDays(new Date(), LOAN_DAYS));
    }
    setSelectedBook(book);
  }, []);

  /* ESC membatalkan transaksi saat input terkunci (kartu hasil tampil) */
  useEffect(() => {
    if (!selectedBook) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) handleReset();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedBook, loading, handleReset]);

  /* Otomatis catat peminjaman baru (atau muat transaksi aktif yang sama) */
  useEffect(() => {
    if (!selectedMember || !selectedBook) return;

    const key = `${selectedMember.nis}|${selectedBook.barcode}`;
    if (processedKeyRef.current === key) return;
    processedKeyRef.current = key;

    // Pastikan hasil masih relevan (pilihan belum diganti atau di-reset)
    const isCurrent = () => processedKeyRef.current === key;

    (async () => {
      setLoading(true);

      try {
        // 1) Batas 1 buku per anggota: periksa pinjaman aktif milik anggota ini
        const { data: existingLoan, error: existingError } = await supabase
          .from('sirkulasi')
          .select('id, kode_eksemplar, tgl_kembali')
          .eq('nis', selectedMember.nis)
          .eq('status', 'DIPINJAM')
          .limit(1)
          .maybeSingle();

        if (existingError) throw existingError;
        if (!isCurrent()) return;

        if (existingLoan) {
          // Buku yang sama: muat saja transaksinya
          if (existingLoan.kode_eksemplar === selectedBook.barcode) {
            setActiveTransactionId(existingLoan.id as number);
            if (existingLoan.tgl_kembali) setDueDateObj(parseISODate(existingLoan.tgl_kembali as string));
            return;
          }
          throw new UserFacingError(
            `${selectedMember.nama} masih meminjam buku lain (kode ${existingLoan.kode_eksemplar}). Satu anggota hanya boleh meminjam 1 buku.`
          );
        }

        // 2) Cek ulang status eksemplar langsung dari database (hasil pencarian bisa usang)
        const { data: eks, error: eksError } = await supabase
          .from('eksemplar')
          .select('id, biblio_id, status')
          .eq('kode', selectedBook.barcode)
          .maybeSingle();

        if (eksError) throw eksError;
        if (!isCurrent()) return;
        if (!eks) throw new UserFacingError('Eksemplar tidak ditemukan.');
        if (!isAvailableStatus(eks.status as string | null)) {
          throw new UserFacingError(`Buku tidak tersedia (status: ${eks.status ?? '-'}).`);
        }

        // 3) "Klaim" eksemplar: update hanya jika statusnya masih sama (cegah dua petugas meminjam buku yang sama)
        const { data: claimed, error: claimError } = await supabase
          .from('eksemplar')
          .update({ status: 'Dipinjam' })
          .eq('kode', selectedBook.barcode)
          .eq('status', eks.status as string)
          .select('id');

        if (claimError) throw claimError;
        if (!claimed || claimed.length === 0) {
          throw new UserFacingError('Status buku baru saja berubah. Silakan pilih ulang.');
        }

        // 4) Catat peminjaman
        const today = new Date();
        const dueDate = addDays(today, LOAN_DAYS);

        const payload: Record<string, unknown> = {
          nis: selectedMember.nis,
          nama_anggota: selectedMember.nama,
          kode_eksemplar: selectedBook.barcode,
          judul_buku: selectedBook.title,
          kamar: selectedMember.kamar || null,
          tgl_pinjam: formatDateToISO(today),
          tgl_kembali: formatDateToISO(dueDate),
          status: 'DIPINJAM',
        };
        if (selectedMember.id) payload.member_id = selectedMember.id;
        if (eks.biblio_id) payload.biblio_id = eks.biblio_id;

        const { data: inserted, error: insertError } = await supabase
          .from('sirkulasi')
          .insert([payload])
          .select('id')
          .single();

        if (insertError) {
          // Kembalikan status eksemplar agar tidak "nyangkut" sebagai Dipinjam
          await supabase
            .from('eksemplar')
            .update({ status: eks.status as string })
            .eq('kode', selectedBook.barcode);
          throw insertError;
        }

        if (!isCurrent()) return;
        setDueDateObj(dueDate);
        setActiveTransactionId(inserted.id as number);
        showNotice('success', 'Peminjaman berhasil dicatat.');
      } catch (err) {
        reportError('Error proses peminjaman:', err);
        if (isCurrent()) {
          // Buka kunci & lepas buku agar bisa dipilih ulang (kartu tanpa transaksi tidak ditampilkan)
          processedKeyRef.current = null;
          setSelectedBook(null);
          setActiveTransactionId(null);
        }
        showNotice('error', err instanceof UserFacingError ? err.message : 'Gagal mencatat peminjaman: ' + errMessage(err));
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedMember, selectedBook, showNotice]);

  /* Perpanjang (+5 hari; bila sudah lewat tempo, dihitung dari hari ini) */
  const handleRenew = useCallback(async () => {
    if (!activeTransactionId) {
      showNotice('error', 'Tidak ada transaksi aktif yang dapat diperpanjang.');
      return;
    }

    setLoading(true);
    try {
      const base = getOverdueDays(dueDateObj) > 0 ? new Date() : dueDateObj;
      const newDueDate = addDays(base, LOAN_DAYS);

      const { data, error } = await supabase
        .from('sirkulasi')
        .update({ tgl_kembali: formatDateToISO(newDueDate) })
        .eq('id', activeTransactionId)
        .eq('status', 'DIPINJAM')
        .select('id');

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new UserFacingError(
          'Perpanjangan tidak tersimpan di database (kemungkinan izin update tabel sirkulasi belum diatur).'
        );
      }

      setDueDateObj(newDueDate);
      showNotice('success', 'Peminjaman buku berhasil diperpanjang!');
    } catch (err) {
      reportError('Error perpanjang:', err);
      showNotice('error', err instanceof UserFacingError ? err.message : 'Gagal memperpanjang peminjaman: ' + errMessage(err));
    } finally {
      setLoading(false);
    }
  }, [activeTransactionId, dueDateObj, showNotice]);

  /* Pengembalian */
  const handleReturn = useCallback(async () => {
    if (!activeTransactionId || !selectedBook) {
      showNotice('error', 'Tidak ada transaksi aktif untuk dikembalikan.');
      return;
    }

    setLoading(true);
    try {
      const { data, error: sirkulasiError } = await supabase
        .from('sirkulasi')
        .update({ status: 'KEMBALI' })
        .eq('id', activeTransactionId)
        .eq('status', 'DIPINJAM')
        .select('id');

      if (sirkulasiError) throw sirkulasiError;
      if (!data || data.length === 0) {
        throw new UserFacingError(
          'Pengembalian tidak tersimpan di database (kemungkinan izin update tabel sirkulasi belum diatur).'
        );
      }

      const { error: eksemplarError } = await supabase
        .from('eksemplar')
        .update({ status: 'Tersedia' })
        .eq('kode', selectedBook.barcode);
      if (eksemplarError) {
        console.warn('Status sirkulasi terupdate, tetapi gagal mengupdate status eksemplar:', eksemplarError);
      }

      handleReset();
      showNotice('success', 'Buku berhasil dikembalikan!');
    } catch (err) {
      reportError('Error pengembalian:', err);
      showNotice('error', err instanceof UserFacingError ? err.message : 'Gagal memproses pengembalian: ' + errMessage(err));
    } finally {
      setLoading(false);
    }
  }, [activeTransactionId, selectedBook, handleReset, showNotice]);

  return (
    // Tanpa background: bg.png dari layout.tsx langsung terlihat
    <div className="relative min-h-screen w-full flex flex-col justify-between px-4 sm:px-12 pt-6 pb-6 select-none text-slate-800">
      {/* Notifikasi: panel putih solid */}
      {notice && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed top-6 right-6 z-50 flex items-center gap-2.5 max-w-sm px-4 py-3 bg-white rounded-xl border text-xs font-bold shadow-sm ${
            notice.type === 'success' ? 'border-blue-200 text-blue-700' : 'border-red-200 text-red-600'
          }`}
        >
          {notice.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-600" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
          )}
          <span>{notice.text}</span>
        </div>
      )}

      {/* Area kartu hasil (tengah) */}
      <div className="w-full max-w-2xl mx-auto my-auto z-10 space-y-4">
        {loading && (
          <div className="mx-auto w-fit flex items-center gap-2 bg-white border border-blue-100 rounded-full px-4 py-2 text-xs font-bold text-blue-700">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            Memproses...
          </div>
        )}

        {selectedMember && selectedBook && activeTransactionId !== null && (
          <ResultCard
            member={selectedMember}
            book={selectedBook}
            dueDate={dueDateFormatted}
            overdueDays={overdueDays}
            onRenew={handleRenew}
            onReturn={handleReturn}
            onReset={handleReset}
            isLoading={loading}
          />
        )}
      </div>

      {/* Input pencarian otomatis (terkunci selama proses / saat kartu transaksi tampil) */}
      <div className="w-full max-w-2xl mx-auto z-20 mt-auto">
        <SmartSearchInput
          selectedMember={selectedMember}
          onSelectMember={handleSelectMember}
          onSelectBook={handleSelectBook}
          onNotice={showNotice}
          disabled={loading || selectedBook !== null}
        />
      </div>
    </div>
  );
}