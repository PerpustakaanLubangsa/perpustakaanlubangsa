'use client';

import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { Search, Loader2, Users, Plus, Edit3, Trash2, Tags, KeyRound } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { BTN_PRIMARY, BTN_NEUTRAL, BTN_EDIT, BTN_DELETE } from '../bibliografi/components/raised-buttons';
import type {
  JabatanOption,
  Pustakawan,
  PustakawanFormData,
} from './components/pustakawan-form-modal';
import { usePustakawanAktif } from '../pustakawan-aktif';
import { hapusPustakawan } from './actions';
import { LABEL_PERAN, type AkunPustakawan } from './akun-tipe';

// Modal dimuat hanya saat dibutuhkan, bundle awal lebih kecil
const PustakawanFormModal = dynamic(() => import('./components/pustakawan-form-modal'), {
  ssr: false,
});
const JabatanModal = dynamic(() => import('./components/jabatan-modal'), {
  ssr: false,
});
const AkunModal = dynamic(() => import('./components/akun-modal'), {
  ssr: false,
});
const SandiSayaModal = dynamic(() => import('./components/sandi-saya-modal'), {
  ssr: false,
});

const TABLE = 'pustakawan';

/* ───────────────────────── Baris ───────────────────────── */

interface RowProps {
  item: Pustakawan;
  nomor: number;
  /** Akun login pustakawan ini (hanya terbaca oleh super admin; pustakawan biasa hanya melihat akunnya sendiri) */
  akun: AkunPustakawan | undefined;
  /** true = super admin: boleh mengubah, menghapus, dan mengatur akun */
  bisaKelola: boolean;
  /** true = baris ini milik akun yang sedang login */
  milikSaya: boolean;
  onEdit: (item: Pustakawan) => void;
  onDelete: (item: Pustakawan) => void;
  onAkun: (item: Pustakawan) => void;
}

function LencanaAkun({ akun }: { akun: AkunPustakawan | undefined }) {
  if (!akun) return <span className="text-[11px] text-slate-400">Belum ada akun</span>;
  return (
    <span className="flex items-center gap-1.5 min-w-0">
      <span className="text-[11px] font-semibold text-slate-700 truncate">@{akun.username}</span>
      <span
        className={`shrink-0 px-1.5 text-[10px] leading-4 font-bold rounded border ${
          akun.role === 'super_admin'
            ? 'bg-amber-50 text-amber-700 border-amber-200'
            : 'bg-blue-50 text-blue-700 border-blue-100'
        }`}
      >
        {LABEL_PERAN[akun.role]}
      </span>
    </span>
  );
}

const PustakawanRow = memo(function PustakawanRow({
  item,
  nomor,
  akun,
  bisaKelola,
  milikSaya,
  onEdit,
  onDelete,
  onAkun,
}: RowProps) {
  return (
    <div
      tabIndex={bisaKelola ? 0 : -1}
      role={bisaKelola ? 'button' : undefined}
      aria-label={bisaKelola ? `Edit ${item.nama}` : undefined}
      onClick={bisaKelola ? () => onEdit(item) : undefined}
      onKeyDown={(e) => {
        if (!bisaKelola) return;
        // Hanya saat baris sendiri yang fokus, bukan tombol di dalamnya
        if (e.target !== e.currentTarget) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onEdit(item);
        }
      }}
      className={`group grid grid-cols-12 gap-3 items-center px-3 py-1.5 min-h-9 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 ${
        bisaKelola ? 'cursor-pointer hover:bg-blue-50' : ''
      }`}
    >
      <div className="col-span-2 sm:col-span-1">
        <span className="inline-flex min-w-6 h-5 px-1 items-center justify-center rounded bg-blue-600 text-white text-[10px] font-bold tabular-nums leading-none">
          {nomor}
        </span>
      </div>

      <div className="col-span-6 sm:col-span-3 min-w-0">
        <span className="block text-xs font-semibold text-slate-800 truncate group-hover:text-blue-700 transition-colors">
          {item.nama}
          {milikSaya && (
            <span className="ml-1.5 px-1.5 text-[10px] leading-4 font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded align-middle">
              Anda
            </span>
          )}
        </span>
        {/* Di layar sempit jabatan tampil di bawah nama */}
        <span className="block sm:hidden text-[10px] font-medium text-slate-500 truncate">
          {item.jabatan?.nama ?? 'Belum ada jabatan'}
          {akun ? ` · @${akun.username}` : ''}
        </span>
      </div>

      <div className="hidden sm:block sm:col-span-2 min-w-0">
        {item.jabatan ? (
          <span className="inline-block max-w-full px-1.5 text-[10px] leading-4 font-bold bg-blue-50 text-blue-700 border border-blue-100 rounded truncate align-middle">
            {item.jabatan.nama}
          </span>
        ) : (
          <span className="text-[11px] text-slate-400">-</span>
        )}
      </div>

      <div className="hidden sm:block sm:col-span-3 min-w-0">
        <LencanaAkun akun={akun} />
      </div>

      <div className="col-span-4 sm:col-span-3 flex justify-end gap-2 pr-0.5">
        {bisaKelola && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAkun(item);
              }}
              title={akun ? 'Atur Akun dan Kata Sandi' : 'Buat Akun Login'}
              aria-label={`Atur akun ${item.nama}`}
              className={`p-1.5 rounded-md ${BTN_EDIT}`}
            >
              <KeyRound className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(item);
              }}
              title="Edit Pustakawan"
              aria-label={`Edit ${item.nama}`}
              className={`p-1.5 rounded-md ${BTN_EDIT}`}
            >
              <Edit3 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(item);
              }}
              title="Hapus Pustakawan"
              aria-label={`Hapus ${item.nama}`}
              className={`p-1.5 rounded-md ${BTN_DELETE}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
});

function SkeletonRow() {
  return (
    <div className="grid grid-cols-12 gap-3 items-center px-3 py-1.5 min-h-9 animate-pulse">
      <div className="col-span-2 sm:col-span-1">
        <div className="w-7 h-5 rounded bg-blue-100" />
      </div>
      <div className="col-span-6 sm:col-span-3">
        <div className="h-3 w-1/2 rounded bg-blue-100" />
      </div>
      <div className="hidden sm:block sm:col-span-2">
        <div className="h-4 w-20 rounded bg-blue-50" />
      </div>
      <div className="hidden sm:block sm:col-span-3">
        <div className="h-4 w-24 rounded bg-blue-50" />
      </div>
      <div className="col-span-4 sm:col-span-3 flex justify-end gap-2">
        <div className="w-6 h-6 rounded bg-blue-50" />
        <div className="w-6 h-6 rounded bg-blue-50" />
      </div>
    </div>
  );
}

/* ───────────────────────── Halaman ───────────────────────── */

export default function PustakawanPage() {
  const { aktif, akses } = usePustakawanAktif();
  const bisaKelola = akses?.superAdmin ?? false;
  const punyaAkun = !!akses && !akses.lama;

  const [items, setItems] = useState<Pustakawan[]>([]);
  const [akunMap, setAkunMap] = useState<Record<number, AkunPustakawan>>({});
  const [akunTarget, setAkunTarget] = useState<Pustakawan | null>(null);
  const [isSandiOpen, setIsSandiOpen] = useState(false);
  const [jabatanOptions, setJabatanOptions] = useState<JabatanOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isJabatanOpen, setIsJabatanOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<Pustakawan | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    const [pustakawanRes, jabatanRes, akunRes] = await Promise.all([
      supabase
        .from(TABLE)
        .select('id, nama, created_at, jabatan_id, jabatan(nama)')
        .order('nama', { ascending: true })
        .order('id', { ascending: true })
        .limit(1000),
      supabase
        .from('jabatan')
        .select('id, nama, urutan')
        .order('urutan', { ascending: true })
        .order('id', { ascending: true }),
      // RLS: super admin membaca semua akun, pustakawan biasa hanya akunnya sendiri
      supabase.from('pustakawan_akun').select('pustakawan_id, username, role, menu_ids'),
    ]);

    // Tabel akun belum dibuat atau gagal dibaca: daftar pustakawan tetap tampil tanpa info akun
    if (akunRes.error) console.error('Gagal mengambil data akun pustakawan:', akunRes.error);
    const petaAkun: Record<number, AkunPustakawan> = {};
    for (const a of (akunRes.data ?? []) as AkunPustakawan[]) petaAkun[a.pustakawan_id] = a;
    setAkunMap(petaAkun);

    const error = pustakawanRes.error ?? jabatanRes.error;
    if (error) {
      console.error('Gagal mengambil data pustakawan:', error);
      // 42P01/PGRST205: tabel belum ada, 42703: kolom belum ada, PGRST200: relasi belum ada
      const belumSiap = ['42P01', 'PGRST205', '42703', 'PGRST200'].includes(error.code);
      setLoadError(
        belumSiap
          ? 'Tabel pustakawan atau jabatan belum siap di Supabase. Jalankan SQL pembuatan tabelnya lebih dulu.'
          : 'Gagal memuat data pustakawan.'
      );
      setItems([]);
      setJabatanOptions([]);
    } else {
      setItems((pustakawanRes.data ?? []) as unknown as Pustakawan[]);
      setJabatanOptions((jabatanRes.data ?? []) as JabatanOption[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return q
      ? items.filter(
          (p) =>
            p.nama.toLowerCase().includes(q) ||
            (p.jabatan?.nama ?? '').toLowerCase().includes(q)
        )
      : items;
  }, [items, searchQuery]);

  const isSearching = searchQuery.trim() !== '';

  // Jumlah pustakawan per jabatan, untuk peringatan saat menghapus jabatan
  const jabatanUsage = useMemo(() => {
    const map: Record<number, number> = {};
    for (const p of items) {
      if (p.jabatan_id != null) map[p.jabatan_id] = (map[p.jabatan_id] ?? 0) + 1;
    }
    return map;
  }, [items]);

  const handleAdd = useCallback(() => {
    setItemToEdit(null);
    setIsFormOpen(true);
  }, []);

  const handleEdit = useCallback((item: Pustakawan) => {
    setItemToEdit(item);
    setIsFormOpen(true);
  }, []);

  const handleCloseForm = useCallback(() => setIsFormOpen(false), []);
  const handleOpenJabatan = useCallback(() => setIsJabatanOpen(true), []);
  const handleCloseJabatan = useCallback(() => setIsJabatanOpen(false), []);

  const handleAkun = useCallback((item: Pustakawan) => setAkunTarget(item), []);
  const handleCloseAkun = useCallback(() => setAkunTarget(null), []);
  const handleCloseSandi = useCallback(() => setIsSandiOpen(false), []);

  // Lewat server agar akun loginnya ikut terhapus (tidak tersisa akun yatim)
  const handleDelete = useCallback(async (item: Pustakawan) => {
    if (!confirm(`Hapus pustakawan "${item.nama}" beserta akun loginnya? Tindakan ini tidak dapat dibatalkan.`)) {
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();
    const hasil = await hapusPustakawan(session?.access_token ?? '', item.id);
    if (!hasil.ok) {
      alert(hasil.error);
      return;
    }
    setItems((prev) => prev.filter((p) => p.id !== item.id));
    setAkunMap((prev) => {
      const sisa = { ...prev };
      delete sisa[item.id];
      return sisa;
    });
  }, []);

  // Error dilempar kembali agar modal menampilkannya di dalam form
  const handleFormSubmit = async (data: PustakawanFormData) => {
    const { error } = itemToEdit
      ? await supabase.from(TABLE).update(data).eq('id', itemToEdit.id)
      : await supabase.from(TABLE).insert([data]);

    if (error) {
      console.error('Gagal menyimpan data pustakawan:', error);
      throw new Error(
        error.code === '23505'
          ? 'Nama pustakawan sudah ada.'
          : 'Terjadi kesalahan saat menyimpan data pustakawan.'
      );
    }

    await fetchItems();
  };

  const showSkeleton = loading && items.length === 0 && !loadError;
  const showEmpty = !loading && !loadError && filtered.length === 0;

  return (
    // Tanpa background: bg.png dari layout.tsx langsung terlihat
    <main className="min-h-screen text-slate-800">
      <div className="px-12 pt-5 pb-24">
        <div className="w-full max-w-4xl mx-auto space-y-3">
          {/* Header */}
          <div className="bg-white border border-blue-100 rounded-xl px-4 py-3 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base font-black uppercase tracking-tight text-slate-900">
                  Data Pustakawan
                </h1>
                {!loadError && !loading && (
                  <span className="px-1.5 py-0.5 text-[10px] font-black text-blue-600 bg-blue-50 border border-blue-200 rounded tabular-nums">
                    {items.length.toLocaleString('id-ID')} pustakawan
                  </span>
                )}
                {akses && (
                  <span
                    className={`px-1.5 py-0.5 text-[10px] font-black rounded border ${
                      bisaKelola
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-blue-50 text-blue-700 border-blue-100'
                    }`}
                  >
                    Anda: {LABEL_PERAN[akses.role]}
                  </span>
                )}
              </div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">
                {bisaKelola
                  ? 'Daftar pustakawan, akun login, dan akses menu.'
                  : 'Daftar nama dan jabatan pustakawan.'}
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0 flex-wrap justify-end">
              {punyaAkun && (
                <button
                  type="button"
                  onClick={() => setIsSandiOpen(true)}
                  className={`inline-flex items-center justify-center gap-1.5 h-9 px-4 mb-1 text-[11px] font-extrabold uppercase tracking-wider rounded-lg ${bisaKelola ? BTN_NEUTRAL : BTN_PRIMARY}`}
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  Ganti Kata Sandi
                </button>
              )}

              {bisaKelola && (
                <>
                  <button
                    type="button"
                    onClick={handleOpenJabatan}
                    className={`inline-flex items-center justify-center gap-1.5 h-9 px-4 mb-1 text-[11px] font-extrabold uppercase tracking-wider rounded-lg ${BTN_NEUTRAL}`}
                  >
                    <Tags className="h-3.5 w-3.5" />
                    Kelola Jabatan
                  </button>

                  <button
                    type="button"
                    onClick={handleAdd}
                    className={`inline-flex items-center justify-center gap-1.5 h-9 px-4 mb-1 text-[11px] font-extrabold uppercase tracking-wider rounded-lg ${BTN_PRIMARY}`}
                  >
                    <Plus className="h-3.5 w-3.5 stroke-[3]" />
                    Tambah Pustakawan
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Pencarian */}
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 h-4 w-4 text-blue-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama atau jabatan..."
              aria-label="Cari pustakawan"
              className="w-full h-9 pl-10 pr-3 text-xs font-medium bg-white border border-blue-100 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-colors"
            />
          </div>

          {loadError && (
            <div
              role="alert"
              className="bg-white border border-red-200 rounded-xl px-4 py-3 text-xs font-semibold text-red-600"
            >
              {loadError}
            </div>
          )}

          {showEmpty && (
            <div className="mx-auto max-w-md bg-white border border-blue-100 rounded-xl py-8 px-6 flex flex-col items-center text-center">
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-full text-blue-400 mb-3">
                <Users className="h-8 w-8 stroke-[1.5]" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 mb-1">
                {isSearching ? 'Pustakawan Tidak Ditemukan' : 'Belum Ada Pustakawan'}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                {isSearching
                  ? 'Tidak ditemukan nama atau jabatan yang cocok dengan kata kunci tersebut.'
                  : bisaKelola
                    ? 'Klik "Tambah Pustakawan" untuk menambahkan nama pertama.'
                    : 'Belum ada pustakawan yang terdaftar.'}
              </p>
            </div>
          )}

          {(filtered.length > 0 || showSkeleton) && (
            <div className="bg-white border border-blue-100 rounded-xl overflow-hidden">
              <div className="grid grid-cols-12 gap-3 px-3 py-1.5 bg-slate-50 border-b border-blue-100 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                <span className="col-span-2 sm:col-span-1">No</span>
                <span className="col-span-6 sm:col-span-3">Nama</span>
                <span className="hidden sm:block sm:col-span-2">Jabatan</span>
                <span className="hidden sm:block sm:col-span-3">Akun</span>
                <span className="col-span-4 sm:col-span-3 text-right">Aksi</span>
              </div>

              <div className="divide-y divide-blue-50" aria-busy={loading}>
                {showSkeleton
                  ? Array.from({ length: 6 }, (_, i) => <SkeletonRow key={i} />)
                  : filtered.map((item, i) => (
                      <PustakawanRow
                        key={item.id}
                        item={item}
                        nomor={i + 1}
                        akun={akunMap[item.id]}
                        bisaKelola={bisaKelola}
                        milikSaya={aktif?.id === item.id}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onAkun={handleAkun}
                      />
                    ))}
              </div>
            </div>
          )}

          {loading && items.length > 0 && (
            <div className="w-full flex justify-center py-1">
              <div className="bg-white border border-blue-100 rounded-full p-1.5">
                <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
              </div>
            </div>
          )}
        </div>
      </div>

      {isJabatanOpen && (
        <JabatanModal
          jabatanOptions={jabatanOptions}
          usage={jabatanUsage}
          onClose={handleCloseJabatan}
          onChanged={fetchItems}
        />
      )}

      {akunTarget && (
        <AkunModal
          key={akunTarget.id}
          pustakawan={{ id: akunTarget.id, nama: akunTarget.nama }}
          akun={akunMap[akunTarget.id] ?? null}
          onClose={handleCloseAkun}
          onChanged={fetchItems}
        />
      )}

      {isSandiOpen && <SandiSayaModal onClose={handleCloseSandi} />}

      {isFormOpen && (
        <PustakawanFormModal
          pustakawanToEdit={itemToEdit}
          jabatanOptions={jabatanOptions}
          onClose={handleCloseForm}
          onSubmit={handleFormSubmit}
        />
      )}
    </main>
  );
}
