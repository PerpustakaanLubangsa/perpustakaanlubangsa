'use client';

import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Search, Loader2, UserX, Plus, Trash2, ArrowUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Member, MemberFormData } from './components/member-form-modal';

// Modal dimuat hanya saat dibutuhkan, bundle awal lebih kecil
const MemberFormModal = dynamic(() => import('./components/member-form-modal'), {
  ssr: false,
});

/* ───────────────────────── Konstanta ───────────────────────── */

const TABLE = 'anggota';
const ITEMS_PER_PAGE = 24; // habis dibagi 2 dan 3 agar baris terakhir penuh
const MEMBER_COLUMNS =
  'id, created_at, updated_at, nis, nama, jenjang, organisasi, kamar, role, rank, total_kunjungan, total_baca, total_pinjam, poin_tambahan, total_poin, avatar_rank';
const SHOW_SCROLL_TOP_AFTER = 400; // px

const STAT_FIELDS: { label: string; key: keyof Member }[] = [
  { label: 'Kunjungan', key: 'total_kunjungan' },
  { label: 'Dibaca', key: 'total_baca' },
  { label: 'Dipinjam', key: 'total_pinjam' },
  { label: 'Poin', key: 'total_poin' },
];

const PAGE_CSS = `
  @keyframes dots { from { width: 0; } to { width: 1.1em; } }
  .dots { display: inline-block; overflow: hidden; vertical-align: bottom; width: 0; animation: dots 1.2s steps(4, end) infinite; }
  @media (prefers-reduced-motion: reduce) { .dots { animation: none; width: 1.1em; } }
`;

/* ───────────────────────── Helper ───────────────────────── */

// Buang karakter yang merusak sintaks filter .or() PostgREST
const sanitizeSearch = (value: string) =>
  value.replace(/[,()%*\\"]/g, ' ').replace(/\s+/g, ' ').trim();

const normalizeMember = (m: any): Member => ({
  ...m,
  total_kunjungan: m.total_kunjungan ?? 0,
  total_baca: m.total_baca ?? 0,
  total_pinjam: m.total_pinjam ?? 0,
  poin_tambahan: m.poin_tambahan ?? 0,
  total_poin: m.total_poin ?? 0,
});

function initials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0] ?? '')
      .join('')
      .toUpperCase() || '?'
  );
}

const fmtNum = (n: number | null | undefined) => (n ?? 0).toLocaleString('id-ID');

/* ───────────────────────── Komponen kecil ───────────────────────── */

/** Foto dari avatar_rank bila berupa URL/path gambar, selain itu inisial nama */
const Avatar = memo(function Avatar({ src, name }: { src: string | null; name: string }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [src]);

  const usable = !!src && /^(https?:\/\/|\/)/.test(src) && !failed;

  return (
    <div className="w-12 h-12 rounded-xl bg-blue-600 text-white text-sm font-black flex items-center justify-center shrink-0 overflow-hidden">
      {usable ? (
        <img
          src={src!}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        initials(name)
      )}
    </div>
  );
});

interface MemberCardProps {
  member: Member;
  onEdit: (member: Member) => void;
  onDelete: (member: Member) => void;
}

const MemberCard = memo(function MemberCard({ member, onEdit, onDelete }: MemberCardProps) {
  return (
    <div
      tabIndex={0}
      role="button"
      aria-label={`Edit ${member.nama}`}
      onClick={() => onEdit(member)}
      onKeyDown={(e) => {
        // Hanya saat kartu sendiri yang fokus, bukan tombol di dalamnya
        if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onEdit(member);
        }
      }}
      // content-visibility: kartu di luar layar tidak dirender, scroll lebih ringan
      className="group relative flex flex-col cursor-pointer bg-white border border-blue-100 rounded-2xl p-4 transition-[transform,border-color] duration-200 hover:-translate-y-1 hover:border-blue-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 [content-visibility:auto] [contain-intrinsic-size:auto_210px]"
    >
      {/* Tombol hapus: muncul saat hover atau fokus keyboard */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(member);
        }}
        title="Hapus Anggota"
        aria-label={`Hapus ${member.nama}`}
        className="absolute top-3 right-3 p-2 bg-white text-red-500 border border-red-200 rounded-lg opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 hover:bg-red-500 hover:text-white hover:border-red-500 transition-[opacity,background-color,color] duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      <div className="flex items-center gap-3 min-w-0 pr-10">
        <Avatar src={member.avatar_rank} name={member.nama} />
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-slate-800 truncate group-hover:text-blue-700 transition-colors">
            {member.nama}
          </h2>
          <p className="text-[11px] text-slate-500 font-medium truncate tabular-nums">
            NIS {member.nis}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className="px-1.5 py-0.5 text-[10px] font-bold bg-blue-600 text-white border border-blue-600 rounded uppercase tracking-wider">
          {member.jenjang}
        </span>
        <span className="px-1.5 py-0.5 text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100 rounded uppercase tracking-wider">
          {member.role}
        </span>
        {member.rank && (
          <span className="px-1.5 py-0.5 text-[10px] font-bold bg-white text-slate-600 border border-slate-200 rounded uppercase tracking-wider">
            {member.rank}
          </span>
        )}
      </div>

      <p className="mt-2 text-[11px] text-slate-500 font-medium truncate">
        {member.kamar ? `Kamar ${member.kamar}` : 'Kamar -'}
        {member.organisasi ? ` • ${member.organisasi}` : ''}
      </p>

      <dl className="mt-3 pt-3 border-t border-blue-100 grid grid-cols-4 gap-1.5 text-center">
        {STAT_FIELDS.map((s) => (
          <div key={s.key} className="min-w-0">
            <dd className="text-xs font-black text-slate-900 tabular-nums truncate">
              {fmtNum(member[s.key] as number | null)}
            </dd>
            <dt className="text-[9px] font-bold text-slate-400 uppercase tracking-wider truncate">
              {s.label}
            </dt>
          </div>
        ))}
      </dl>
    </div>
  );
});

function SkeletonCard() {
  return (
    <div className="flex flex-col bg-white border border-blue-100 rounded-2xl p-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-blue-100" />
        <div className="space-y-2 flex-1">
          <div className="h-3.5 w-2/3 rounded bg-blue-100" />
          <div className="h-3 w-1/3 rounded bg-blue-50" />
        </div>
      </div>
      <div className="mt-3 flex gap-1.5">
        <div className="h-4 w-10 rounded bg-blue-100" />
        <div className="h-4 w-14 rounded bg-blue-50" />
      </div>
      <div className="mt-2 h-3 w-1/2 rounded bg-blue-50" />
      <div className="mt-3 pt-3 border-t border-blue-100 grid grid-cols-4 gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-7 rounded bg-blue-50" />
        ))}
      </div>
    </div>
  );
}

/* Tombol kembali ke atas: state hanya berubah saat melewati ambang */
const ScrollTopButton = memo(function ScrollTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let ticking = false;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setVisible(window.scrollY > SHOW_SCROLL_TOP_AFTER);
        ticking = false;
      });
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleClick = () => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Kembali ke atas"
      tabIndex={visible ? 0 : -1}
      className={`fixed bottom-6 right-6 z-40 w-11 h-11 flex items-center justify-center rounded-full bg-blue-600 hover:bg-blue-700 text-white border border-blue-700 transition-[opacity,transform,background-color] duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 pointer-events-none'
      }`}
    >
      <ArrowUp className="w-5 h-5 stroke-[2.5]" />
    </button>
  );
});

/* ───────────────────────── Halaman ───────────────────────── */

export default function ManajemenAnggotaPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState<Member | null>(null);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef(0);
  const loadingRef = useRef(false);
  const requestIdRef = useRef(0);
  const searchRef = useRef('');

  // Status "mencari" diturunkan dari state, tidak perlu state terpisah
  const isSearchingUI = searchQuery.trim() !== debouncedSearchQuery;

  /* Debounce pencarian */
  useEffect(() => {
    const value = searchQuery.trim();
    if (value === debouncedSearchQuery) return;

    const delay = value === '' ? 0 : 400;
    const handler = setTimeout(() => setDebouncedSearchQuery(value), delay);
    return () => clearTimeout(handler);
  }, [searchQuery, debouncedSearchQuery]);

  /* Ambil data anggota. requestId mencegah respons lama menimpa respons baru */
  const fetchMembers = useCallback(async (pageNum: number, search: string, reset: boolean) => {
    const reqId = ++requestIdRef.current;
    loadingRef.current = true;
    setLoading(true);

    try {
      const from = pageNum * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      const term = sanitizeSearch(search);

      // Jumlah total hanya dihitung pada halaman pertama
      let query: any = supabase
        .from(TABLE)
        .select(MEMBER_COLUMNS, pageNum === 0 ? { count: 'exact' } : undefined)
        // Urutan stabil (nama, id) supaya halaman berikutnya tidak tumpang tindih
        .order('nama', { ascending: true })
        .order('id', { ascending: true })
        .range(from, to);

      if (term) {
        query = query.or(
          `nama.ilike.%${term}%,nis.ilike.%${term}%,kamar.ilike.%${term}%,organisasi.ilike.%${term}%,jenjang.ilike.%${term}%`
        );
      }

      const { data, error, count } = await query;
      if (error) throw error;
      if (reqId !== requestIdRef.current) return;

      const mapped = (data ?? []).map(normalizeMember);

      pageRef.current = pageNum;
      setMembers((prev) => (reset ? mapped : [...prev, ...mapped]));
      if (pageNum === 0) setTotalCount(count ?? mapped.length);
      setHasMore(mapped.length === ITEMS_PER_PAGE);
    } catch (err) {
      console.error('Gagal mengambil data anggota:', err);
      if (reqId === requestIdRef.current) setHasMore(false);
    } finally {
      if (reqId === requestIdRef.current) {
        loadingRef.current = false;
        setLoading(false);
      }
    }
  }, []);

  /* Muat ulang saat pencarian berubah */
  useEffect(() => {
    searchRef.current = debouncedSearchQuery;
    pageRef.current = 0;
    setHasMore(true);
    fetchMembers(0, debouncedSearchQuery, true);
  }, [debouncedSearchQuery, fetchMembers]);

  /* Infinite scroll: satu observer pada elemen sentinel di bawah grid */
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !loadingRef.current) {
          fetchMembers(pageRef.current + 1, searchRef.current, false);
        }
      },
      { rootMargin: '400px' }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, members.length, fetchMembers]);

  /* ───────────── Handler (stabil agar MemberCard tidak render ulang) ───────────── */

  const handleAddMember = useCallback(() => {
    setMemberToEdit(null);
    setIsFormOpen(true);
  }, []);

  const handleEditMember = useCallback((member: Member) => {
    setMemberToEdit(member);
    setIsFormOpen(true);
  }, []);

  const handleCloseForm = useCallback(() => setIsFormOpen(false), []);

  const handleDeleteMember = useCallback(async (member: Member) => {
    if (
      !confirm(`Hapus anggota "${member.nama}" (NIS ${member.nis})? Tindakan ini tidak dapat dibatalkan.`)
    )
      return;

    try {
      const { error } = await supabase.from(TABLE).delete().eq('id', member.id);
      if (error) throw error;

      setMembers((prev) => prev.filter((m) => m.id !== member.id));
      setTotalCount((c) => (c === null ? c : Math.max(0, c - 1)));
    } catch (err: any) {
      console.error('Gagal menghapus anggota:', err);
      alert(
        err?.code === '23503'
          ? 'Anggota ini masih terhubung dengan data lain sehingga tidak bisa dihapus.'
          : 'Gagal menghapus data anggota dari database.'
      );
    }
  }, []);

  // Error dilempar kembali agar modal menampilkannya di dalam form
  const handleFormSubmit = async (formData: MemberFormData) => {
    try {
      if (memberToEdit) {
        const { data, error } = await supabase
          .from(TABLE)
          .update(formData)
          .eq('id', memberToEdit.id)
          .select(MEMBER_COLUMNS)
          .single();
        if (error) throw error;

        setMembers((prev) =>
          prev.map((m) => (m.id === memberToEdit.id ? normalizeMember(data) : m))
        );
      } else {
        const { data, error } = await supabase
          .from(TABLE)
          .insert([formData])
          .select(MEMBER_COLUMNS)
          .single();
        if (error) throw error;

        setMembers((prev) => [normalizeMember(data), ...prev]);
        setTotalCount((c) => (c === null ? c : c + 1));
      }
    } catch (err: any) {
      console.error('Gagal menyimpan data anggota:', err);
      throw new Error(
        err?.code === '23505'
          ? 'NIS sudah terdaftar pada anggota lain.'
          : 'Terjadi kesalahan saat menyimpan data anggota.'
      );
    }
  };

  const showSkeleton = loading && members.length === 0;
  const showEmpty = !loading && members.length === 0;
  const isSearching = debouncedSearchQuery !== '';

  return (
    // Tanpa background: bg.png dari layout.tsx langsung terlihat
    <main className="min-h-screen text-slate-800">
      <style>{PAGE_CSS}</style>

      <div className="px-4 sm:px-8 lg:px-12 pt-6 pb-24">
        <div className="w-full max-w-6xl mx-auto space-y-6">
          {/* Header: panel putih solid agar teks terbaca di atas gambar */}
          <div className="bg-white border border-blue-100 rounded-2xl px-5 py-4 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-black uppercase tracking-tight text-slate-900">
                  Manajemen Anggota
                </h1>
                {totalCount !== null && (
                  <span className="px-2 py-0.5 text-[10px] font-black text-blue-600 bg-blue-50 border border-blue-200 rounded-md tabular-nums">
                    {totalCount.toLocaleString('id-ID')} anggota
                  </span>
                )}
              </div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mt-1">
                Kelola data santri dan anggota perpustakaan.
              </p>
            </div>

            <button
              type="button"
              onClick={handleAddMember}
              className="inline-flex items-center justify-center gap-2 h-11 px-5 shrink-0 text-xs font-extrabold uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
            >
              <Plus className="h-4 w-4 stroke-[3]" />
              Tambah Anggota
            </button>
          </div>

          {/* Pencarian: bagian dari alur halaman, ikut ter-scroll */}
          <div className="relative flex items-center">
            <Search className="absolute left-4 h-4 w-4 text-blue-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari anggota berdasarkan nama, NIS, kamar, organisasi, atau jenjang..."
              aria-label="Cari anggota"
              className="w-full h-11 pl-11 pr-32 text-sm font-medium bg-white border border-blue-100 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-colors"
            />
            {isSearchingUI && (
              <span className="absolute right-4 text-xs font-semibold text-blue-600 select-none pointer-events-none">
                mencari<span className="dots">...</span>
              </span>
            )}
          </div>

          {showEmpty && (
            <div className="mx-auto max-w-md bg-white border border-blue-100 rounded-2xl py-10 px-6 flex flex-col items-center text-center">
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-full text-blue-400 mb-4">
                <UserX className="h-10 w-10 stroke-[1.5]" />
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-1">
                {isSearching ? 'Anggota Tidak Ditemukan' : 'Belum Ada Anggota'}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                {isSearching
                  ? 'Tidak ditemukan anggota yang cocok dengan pencarian Anda.'
                  : 'Klik "Tambah Anggota" untuk mendaftarkan anggota pertama.'}
              </p>
            </div>
          )}

          {(members.length > 0 || showSkeleton) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {showSkeleton
                ? Array.from({ length: 6 }, (_, i) => <SkeletonCard key={i} />)
                : members.map((member) => (
                    <MemberCard
                      key={member.id}
                      member={member}
                      onEdit={handleEditMember}
                      onDelete={handleDeleteMember}
                    />
                  ))}
            </div>
          )}

          {/* Sentinel infinite scroll */}
          <div ref={sentinelRef} className="h-px" aria-hidden="true" />

          {loading && members.length > 0 && (
            <div className="w-full flex justify-center py-2">
              <div className="bg-white border border-blue-100 rounded-full p-2">
                <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
              </div>
            </div>
          )}
        </div>
      </div>

      <ScrollTopButton />

      {isFormOpen && (
        <MemberFormModal
          isOpen
          memberToEdit={memberToEdit}
          onClose={handleCloseForm}
          onSubmit={handleFormSubmit}
        />
      )}
    </main>
  );
}