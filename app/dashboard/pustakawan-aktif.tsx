'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
} from 'react';
import { Loader2, Search, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { rapikanMenuIds, type AksesMenu } from './navigation';
import type { PeranAkun } from './pustakawan/akun-tipe';

/* ───────────────────────── Konteks pustakawan yang sedang bertugas ───────────────────────── */

export interface PustakawanAktif {
  id: number;
  nama: string;
  jabatan: string | null;
}

export interface AksesPengguna extends AksesMenu {
  /** Peran akun yang sedang login */
  role: PeranAkun;
  /** true = akun lama tanpa data pustakawan (akun bersama): akses penuh dan masih memakai layar "Masuk sebagai" */
  lama: boolean;
  /** Username akun (tanpa @lubangsa.com), null untuk akun lama */
  username: string | null;
}

interface PustakawanAktifValue {
  /** Pustakawan yang bertugas: otomatis dari akun, atau dipilih di layar "Masuk sebagai" untuk akun lama */
  aktif: PustakawanAktif | null;
  /** Buka lagi layar pilihan untuk berganti pustakawan (hanya akun lama) */
  ganti: () => void;
  /** Akses menu akun yang sedang login. null selama belum selesai dimuat */
  akses: AksesPengguna | null;
}

const PustakawanAktifContext = createContext<PustakawanAktifValue>({
  aktif: null,
  ganti: () => {},
  akses: null,
});

export const usePustakawanAktif = () => useContext(PustakawanAktifContext);

interface Pilihan {
  id: number;
  nama: string;
  jabatan: { nama: string } | null;
}

type Fase = 'cek' | 'pilih' | 'siap';

// Baris akun milik pengguna yang login (RLS hanya mengizinkan membaca barisnya sendiri)
interface BarisAkunSaya {
  pustakawan_id: number;
  username: string;
  role: PeranAkun;
  menu_ids: number[] | null;
  pustakawan: { nama: string; jabatan: { nama: string } | null } | null;
}

const AKSES_LAMA: AksesPengguna = {
  superAdmin: true,
  menuIds: [],
  role: 'super_admin',
  lama: true,
  username: null,
};

// Tombol timbul bersama (lihat docs/gaya-ui.md)
const INPUT_CLASS =
  'w-full h-10 pl-10 pr-3 text-sm font-medium bg-white border border-blue-100 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-colors';

const inisial = (nama: string) =>
  nama
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((k) => k[0]?.toUpperCase() ?? '')
    .join('');

/* ───────────────────────── Layar pilihan ───────────────────────── */

function LayarPilih({
  daftar,
  memuat,
  gagal,
  aktifId,
  onPilih,
  onLewati,
  onBatal,
}: {
  daftar: Pilihan[];
  memuat: boolean;
  gagal: boolean;
  aktifId: number | null;
  onPilih: (p: Pilihan) => void;
  onLewati: () => void;
  /** Hanya ada saat berganti pustakawan (sudah ada yang aktif) */
  onBatal: (() => void) | null;
}) {
  const uid = useId();
  const [cari, setCari] = useState('');
  const [sel, setSel] = useState(0); // indeks baris yang disorot (panah + Enter)

  const tersaring = useMemo(() => {
    const q = cari.trim().toLowerCase();
    if (!q) return daftar;
    return daftar.filter(
      (p) =>
        p.nama.toLowerCase().includes(q) ||
        (p.jabatan?.nama ?? '').toLowerCase().includes(q)
    );
  }, [daftar, cari]);

  const jumlah = tersaring.length;
  const idx = jumlah === 0 ? -1 : Math.min(sel, jumlah - 1);

  // Pencarian berubah: sorotan kembali ke baris pertama
  useEffect(() => {
    setSel(0);
  }, [cari]);

  // Daftar siap: sorot pustakawan yang sedang aktif (saat berganti), jika tidak ada baris pertama
  useEffect(() => {
    const i = daftar.findIndex((p) => p.id === aktifId);
    setSel(i >= 0 ? i : 0);
  }, [daftar, aktifId]);

  // Sorotan yang bergerak lewat keyboard ikut digulirkan ke dalam layar
  useEffect(() => {
    if (idx < 0) return;
    document.getElementById(`${uid}-opt-${idx}`)?.scrollIntoView({ block: 'nearest' });
  }, [idx, uid]);

  // Kunci scroll halaman
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Keyboard: panah atas/bawah memilih (berputar), Enter masuk, Esc batal saat berganti
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (onBatal) onBatal();
        return;
      }
      if (memuat || jumlah === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSel((idx + 1) % jumlah);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSel((idx - 1 + jumlah) % jumlah);
      } else if (e.key === 'Enter') {
        // Tombol lain (Batal, Lanjutkan tanpa memilih) memakai Enter bawaan browser
        if ((e.target as HTMLElement | null)?.closest('button')) return;
        e.preventDefault();
        onPilih(tersaring[idx]);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [memuat, jumlah, idx, tersaring, onPilih, onBatal]);

  const kosong = !memuat && daftar.length === 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Masuk sebagai"
        className="w-full max-w-md max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden"
      >
        <div className="flex items-center gap-3 p-5 border-b border-slate-200 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">
              Masuk sebagai
            </h2>
            <p className="text-[11px] text-slate-500 font-medium">
              Pilih nama pustakawan yang bertugas
            </p>
          </div>
          {onBatal && (
            <button
              type="button"
              onClick={onBatal}
              className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 hover:text-blue-700 transition-colors"
            >
              Batal
            </button>
          )}
        </div>

        {daftar.length > 8 && (
          <div className="relative flex items-center px-5 pt-4 shrink-0">
            <Search className="absolute left-8 h-4 w-4 text-blue-400 pointer-events-none" />
            <input
              type="text"
              value={cari}
              onChange={(e) => setCari(e.target.value)}
              autoFocus
              autoComplete="off"
              placeholder="Cari nama atau jabatan..."
              aria-label="Cari pustakawan"
              className={INPUT_CLASS}
            />
          </div>
        )}

        <div
          role="listbox"
          aria-label="Daftar pustakawan"
          className="p-5 overflow-y-auto min-h-0 space-y-2"
        >
          {memuat && (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
            </div>
          )}

          {!memuat &&
            tersaring.map((p, i) => (
              <button
                key={p.id}
                id={`${uid}-opt-${i}`}
                type="button"
                role="option"
                aria-selected={i === idx}
                // Fokus keyboard dipegang oleh panah + Enter, bukan Tab antar baris
                tabIndex={-1}
                onClick={() => onPilih(p)}
                onMouseMove={() => setSel(i)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-colors focus:outline-none ${
                  i === idx
                    ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-500/20'
                    : 'bg-white border-blue-100'
                }`}
              >
                <span className="w-9 h-9 rounded-full bg-blue-600 text-white text-[11px] font-black flex items-center justify-center shrink-0">
                  {inisial(p.nama)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-slate-900 truncate">{p.nama}</span>
                  <span className="block text-[11px] font-medium text-slate-500 truncate">
                    {p.jabatan?.nama ?? 'Belum ada jabatan'}
                  </span>
                </span>
                {p.id === aktifId && (
                  <span className="shrink-0 px-1.5 text-[10px] leading-4 font-bold bg-blue-100 text-blue-700 border border-blue-200 rounded">
                    Aktif
                  </span>
                )}
              </button>
            ))}

          {!memuat && daftar.length > 0 && jumlah === 0 && (
            <p className="py-4 text-center text-xs text-slate-500">
              Tidak ada nama yang cocok.
            </p>
          )}

          {(kosong || gagal) && (
            <div className="py-2 text-center space-y-3">
              <p className="text-xs font-semibold text-slate-600">
                {gagal
                  ? 'Gagal memuat daftar pustakawan.'
                  : 'Belum ada data pustakawan. Tambahkan lewat menu Pustakawan.'}
              </p>
              <button
                type="button"
                onClick={onLewati}
                className="h-9 px-4 text-[11px] font-extrabold uppercase tracking-wider rounded-lg text-white bg-blue-600 border border-blue-700 shadow-[0_3px_0_0_#1e40af] hover:translate-y-0.5 hover:shadow-[0_1px_0_0_#1e40af] active:translate-y-[3px] active:shadow-none transition-[transform,box-shadow] duration-100"
              >
                Lanjutkan tanpa memilih
              </button>
            </div>
          )}
        </div>

        {!memuat && jumlah > 0 && (
          <div className="px-5 py-2.5 border-t border-slate-200 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0">
            ↑ ↓ pilih · Enter masuk
          </div>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────── Provider (dipasang di layout dashboard) ───────────────────────── */

export function PustakawanAktifProvider({ children }: { children: React.ReactNode }) {
  const [fase, setFase] = useState<Fase>('cek');
  const [aktif, setAktif] = useState<PustakawanAktif | null>(null);
  const [akses, setAkses] = useState<AksesPengguna | null>(null);
  const [daftar, setDaftar] = useState<Pilihan[]>([]);
  const [memuat, setMemuat] = useState(false);
  const [gagal, setGagal] = useState(false);

  const muatDaftar = useCallback(async () => {
    setMemuat(true);
    setGagal(false);

    const { data, error } = await supabase
      .from('pustakawan')
      .select('id, nama, jabatan(nama)')
      .order('nama', { ascending: true })
      .order('id', { ascending: true })
      .limit(1000);

    if (error) {
      console.error('Gagal memuat daftar pustakawan:', error);
      setGagal(true);
      setDaftar([]);
    } else {
      setDaftar((data ?? []) as unknown as Pilihan[]);
    }
    setMemuat(false);
  }, []);

  // Setiap kali dashboard dimuat (baru login maupun sesi lama): minta pilih pustakawan.
  // Berpindah halaman di dalam dashboard tidak memuat ulang layout, jadi tidak ditanya lagi.
  useEffect(() => {
    let batal = false;
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      // Tanpa sesi, Sidebar yang mengalihkan ke /login
      if (batal || !session) return;

      // Akun individu: nama pustakawan, peran, dan akses menu diambil dari akunnya sendiri
      const { data, error } = await supabase
        .from('pustakawan_akun')
        .select('pustakawan_id, username, role, menu_ids, pustakawan(nama, jabatan(nama))')
        .eq('user_id', session.user.id)
        .maybeSingle();
      if (batal) return;

      const baris = data as unknown as BarisAkunSaya | null;

      if (baris) {
        const superAdmin = baris.role === 'super_admin';
        setAkses({
          superAdmin,
          menuIds: rapikanMenuIds(baris.menu_ids ?? []),
          role: baris.role,
          lama: false,
          username: baris.username,
        });
        setAktif({
          id: baris.pustakawan_id,
          nama: baris.pustakawan?.nama ?? baris.username,
          jabatan: baris.pustakawan?.jabatan?.nama ?? null,
        });
        setFase('siap');
        return;
      }

      if (error) {
        // 42P01/PGRST205: tabel akun belum dibuat, jadi aplikasi tetap berjalan seperti sebelumnya
        const belumSiap = ['42P01', 'PGRST205', 'PGRST200'].includes(error.code);
        console.error('Gagal memuat akses akun:', error);
        if (!belumSiap) {
          // Gagal sungguhan: akses dibatasi ke menu wajib, bukan dibuka penuh
          setAkses({ superAdmin: false, menuIds: rapikanMenuIds([]), role: 'pustakawan', lama: false, username: null });
          setFase('siap');
          return;
        }
      }

      // Akun lama (belum punya data pustakawan): akses penuh + pilih nama seperti biasa
      setAkses(AKSES_LAMA);
      setFase('pilih');
      await muatDaftar();
    })();
    return () => {
      batal = true;
    };
  }, [muatDaftar]);

  const ganti = useCallback(() => {
    setFase('pilih');
    muatDaftar();
  }, [muatDaftar]);

  const pilih = useCallback((p: Pilihan) => {
    setAktif({ id: p.id, nama: p.nama, jabatan: p.jabatan?.nama ?? null });
    setFase('siap');
  }, []);

  const lewati = useCallback(() => setFase('siap'), []);
  const batal = useCallback(() => setFase('siap'), []);

  const value = useMemo(() => ({ aktif, ganti, akses }), [aktif, ganti, akses]);

  return (
    <PustakawanAktifContext.Provider value={value}>
      {children}
      {fase === 'pilih' && (
        <LayarPilih
          daftar={daftar}
          memuat={memuat}
          gagal={gagal}
          aktifId={aktif?.id ?? null}
          onPilih={pilih}
          onLewati={lewati}
          onBatal={aktif ? batal : null}
        />
      )}
    </PustakawanAktifContext.Provider>
  );
}
