'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Copy,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserX,
  Users,
  X,
} from 'lucide-react';

/* ───────────────────────── Types ───────────────────────── */

type Status = 'Hadir' | 'Izin' | 'Alpha';
type Tab = 'jadwal' | 'absensi' | 'petugas' | 'jam';

interface Petugas {
  id: number;
  nama: string;
  created_at: string;
}

interface Jam {
  id: number;
  label: string;
  waktu: string;
  created_at: string;
}

interface Jadwal {
  id: number;
  hari: string;
  shift: string;
  nama: string;
}

interface Rekap {
  id: number;
  tanggal: string;
  nama: string;
  hari: string;
  shift: string;
  status: Status;
}

interface AbsenItem {
  key: string;
  shift: string;
  nama: string;
  rekap?: Rekap;
  terjadwal: boolean;
}

type FormState =
  | { type: 'petugas'; id?: number; oldNama?: string; nama: string; cascade: boolean }
  | { type: 'jam'; id?: number; oldLabel?: string; label: string; waktu: string; cascade: boolean };

interface ConfirmState {
  title: string;
  message: string;
  confirmText: string;
  onConfirm: () => Promise<void>;
}

/* ───────────────────────── Konstanta & helper ───────────────────────── */

const CARD = 'bg-white border border-slate-200 shadow-sm';

const HARI = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
const HARI_BY_JS_DAY = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const STATUS_LIST: Status[] = ['Hadir', 'Izin', 'Alpha'];

const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const pad = (n: number) => String(n).padStart(2, '0');
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const cleanName = (s: string) => s.trim().replace(/\s+/g, ' ');

const dateToStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const hariFromTanggal = (t: string) => {
  const [y, m, d] = t.split('-').map(Number);
  return HARI_BY_JS_DAY[new Date(y, m - 1, d).getDay()];
};

const shiftTanggal = (t: string, delta: number) => {
  const [y, m, d] = t.split('-').map(Number);
  return dateToStr(new Date(y, m - 1, d + delta));
};

const formatTanggalPanjang = (t: string) => {
  const [y, m, d] = t.split('-').map(Number);
  return `${hariFromTanggal(t)}, ${d} ${NAMA_BULAN[m - 1]} ${y}`;
};

const formatDibuat = (iso: string) =>
  new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

const must = (err: { message: string } | null) => {
  if (err) throw new Error(err.message);
};

const REKAP_COLS = 'id, tanggal, nama, hari, shift, status';

/** Gaya tombol timbul (kelas ditulis utuh agar terdeteksi Tailwind) */
const BTN_BASE =
  'flex items-center justify-center gap-1.5 rounded-xl border text-xs font-extrabold tracking-wide select-none cursor-pointer transition-all duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-50';

const BTN_IDLE =
  'bg-white text-blue-700 border-blue-300 shadow-[0_3px_0_0_#93c5fd] enabled:hover:translate-y-[3px] enabled:hover:bg-blue-50 enabled:hover:shadow-[0_0_0_0_#93c5fd] enabled:active:translate-y-[3px] enabled:active:shadow-[0_0_0_0_#93c5fd]';

const BTN_ACTIVE =
  'bg-blue-600 text-white border-blue-700 translate-y-[3px] shadow-[0_0_0_0_#1d4ed8]';

const BTN_SOLID =
  'bg-blue-600 text-white border-blue-700 shadow-[0_3px_0_0_#1d4ed8] enabled:hover:translate-y-[3px] enabled:hover:bg-blue-700 enabled:hover:shadow-[0_0_0_0_#1d4ed8] enabled:active:translate-y-[3px] enabled:active:shadow-[0_0_0_0_#1d4ed8]';

const BTN_DANGER_IDLE =
  'bg-white text-red-600 border-red-300 shadow-[0_3px_0_0_#fca5a5] enabled:hover:translate-y-[3px] enabled:hover:bg-red-50 enabled:hover:shadow-[0_0_0_0_#fca5a5] enabled:active:translate-y-[3px] enabled:active:shadow-[0_0_0_0_#fca5a5]';

const BTN_DANGER_SOLID =
  'bg-red-600 text-white border-red-700 shadow-[0_3px_0_0_#b91c1c] enabled:hover:translate-y-[3px] enabled:hover:bg-red-700 enabled:hover:shadow-[0_0_0_0_#b91c1c] enabled:active:translate-y-[3px] enabled:active:shadow-[0_0_0_0_#b91c1c]';

const STATUS_ON: Record<Status, string> = {
  Hadir: 'bg-blue-600 text-white border-blue-700',
  Izin: 'bg-amber-500 text-white border-amber-600',
  Alpha: 'bg-red-600 text-white border-red-700',
};

const STATUS_OFF =
  'bg-white text-slate-600 border-slate-300 hover:bg-slate-50 disabled:hover:bg-white';

const INPUT =
  'w-full h-10 px-3 bg-white border border-blue-100 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 text-xs font-medium rounded-xl text-slate-800 placeholder-slate-400 outline-none transition-colors';

const TH = 'text-[10px] font-black text-slate-500 uppercase tracking-wider';

/* ───────────────────────── Komponen kecil ───────────────────────── */

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`${CARD} w-full max-w-md rounded-2xl p-5`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-black text-slate-900 tracking-tight">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="p-12 text-center text-xs text-slate-500 font-medium">{children}</div>;
}

/* ───────────────────────── Halaman ───────────────────────── */

export default function ManajemenPage() {
  const router = useRouter();

  const [authLoading, setAuthLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('jadwal');

  const [petugas, setPetugas] = useState<Petugas[]>([]);
  const [jam, setJam] = useState<Jam[]>([]);
  const [jadwal, setJadwal] = useState<Jadwal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [busy, setBusy] = useState<string | null>(null);
  const isBusy = busy !== null;
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const [form, setForm] = useState<FormState | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);

  const [searchPetugas, setSearchPetugas] = useState('');
  const [hari, setHari] = useState(() => HARI_BY_JS_DAY[new Date().getDay()]);

  const [tanggal, setTanggal] = useState(() => dateToStr(new Date()));
  const [rekap, setRekap] = useState<Rekap[]>([]);
  const [rekapLoading, setRekapLoading] = useState(false);

  const notify = useCallback((type: 'ok' | 'err', text: string) => setToast({ type, text }), []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  /** Jalankan aksi async dengan penanganan error + penanda sibuk */
  const act = async (key: string, fn: () => Promise<void>, okMsg?: string) => {
    setBusy(key);
    try {
      await fn();
      if (okMsg) notify('ok', okMsg);
    } catch (e) {
      notify('err', e instanceof Error ? e.message : 'Terjadi kesalahan.');
    } finally {
      setBusy(null);
    }
  };

  /* Proteksi halaman */
  useEffect(() => {
    let isMounted = true;
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!isMounted) return;
      if (!session) router.replace('/login');
      else setAuthLoading(false);
    })();
    return () => {
      isMounted = false;
    };
  }, [router]);

  /* Ambil data master */
  const loadMaster = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);

    const [p, j, d] = await Promise.all([
      supabase.from('petugas_master').select('id, nama, created_at').order('nama'),
      supabase.from('jam_master').select('id, label, waktu, created_at').order('id'),
      supabase.from('jadwal_detail').select('id, hari, shift, nama').order('id'),
    ]);

    if (p.error || j.error || d.error) {
      setError('Gagal memuat data. Coba muat ulang halaman.');
      setLoading(false);
      return;
    }

    setPetugas((p.data ?? []) as Petugas[]);
    setJam((j.data ?? []) as Jam[]);
    setJadwal((d.data ?? []) as Jadwal[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    loadMaster();
  }, [authLoading, loadMaster]);

  /* Ambil rekap absensi untuk tanggal terpilih */
  useEffect(() => {
    if (authLoading || tab !== 'absensi') return;
    let cancelled = false;
    (async () => {
      setRekapLoading(true);
      const { data, error: err } = await supabase
        .from('rekap_absensi')
        .select(REKAP_COLS)
        .eq('tanggal', tanggal)
        .order('id');
      if (cancelled) return;
      if (err) {
        setError('Gagal memuat absensi pada tanggal ini.');
        setRekap([]);
      } else {
        setRekap((data ?? []) as Rekap[]);
      }
      setRekapLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, tab, tanggal]);

  /* ───────── Turunan data ───────── */

  const jadwalCountByNama = useMemo(() => {
    const m = new Map<string, number>();
    jadwal.forEach((j) => m.set(norm(j.nama), (m.get(norm(j.nama)) ?? 0) + 1));
    return m;
  }, [jadwal]);

  const jadwalCountByShift = useMemo(() => {
    const m = new Map<string, number>();
    jadwal.forEach((j) => m.set(norm(j.shift), (m.get(norm(j.shift)) ?? 0) + 1));
    return m;
  }, [jadwal]);

  const belumTerjadwal = useMemo(
    () => petugas.filter((p) => !jadwalCountByNama.get(norm(p.nama))).length,
    [petugas, jadwalCountByNama]
  );

  const q = searchPetugas.trim().toLowerCase();
  const petugasFiltered = useMemo(
    () => (q ? petugas.filter((p) => p.nama.toLowerCase().includes(q)) : petugas),
    [petugas, q]
  );

  const jadwalHari = useMemo(
    () => jadwal.filter((j) => norm(j.hari) === norm(hari)),
    [jadwal, hari]
  );

  const jadwalTakDikenal = useMemo(
    () => jadwalHari.filter((j) => !jam.some((x) => norm(x.label) === norm(j.shift))),
    [jadwalHari, jam]
  );

  const absenItems = useMemo<AbsenItem[]>(() => {
    const h = hariFromTanggal(tanggal);
    const used = new Set<number>();
    const items: AbsenItem[] = [];

    jadwal
      .filter((j) => norm(j.hari) === norm(h))
      .forEach((j) => {
        const r = rekap.find(
          (x) => !used.has(x.id) && norm(x.shift) === norm(j.shift) && norm(x.nama) === norm(j.nama)
        );
        if (r) used.add(r.id);
        items.push({ key: `j${j.id}`, shift: j.shift, nama: j.nama, rekap: r, terjadwal: true });
      });

    rekap
      .filter((r) => !used.has(r.id))
      .forEach((r) =>
        items.push({ key: `r${r.id}`, shift: r.shift, nama: r.nama, rekap: r, terjadwal: false })
      );

    const order = (s: string) => {
      const i = jam.findIndex((x) => norm(x.label) === norm(s));
      return i === -1 ? 999 : i;
    };
    return items.sort(
      (a, b) => order(a.shift) - order(b.shift) || a.nama.localeCompare(b.nama, 'id')
    );
  }, [jadwal, rekap, jam, tanggal]);

  const absenSummary = useMemo(() => {
    const s = { Hadir: 0, Izin: 0, Alpha: 0, belum: 0 };
    absenItems.forEach((it) => {
      if (it.rekap) s[it.rekap.status]++;
      else s.belum++;
    });
    return s;
  }, [absenItems]);

  /* ───────── Aksi: Petugas & Jam (form) ───────── */

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;

    if (form.type === 'petugas') {
      const nama = cleanName(form.nama);
      if (!nama) return notify('err', 'Nama petugas wajib diisi.');
      if (petugas.some((p) => p.id !== form.id && norm(p.nama) === norm(nama)))
        return notify('err', 'Nama petugas sudah terdaftar.');

      act(
        'form',
        async () => {
          if (form.id) {
            const r1 = await supabase.from('petugas_master').update({ nama }).eq('id', form.id);
            must(r1.error);
            if (form.oldNama && form.oldNama !== nama) {
              const r2 = await supabase.from('jadwal_detail').update({ nama }).eq('nama', form.oldNama);
              must(r2.error);
              if (form.cascade) {
                const r3 = await supabase.from('rekap_absensi').update({ nama }).eq('nama', form.oldNama);
                must(r3.error);
              }
            }
          } else {
            const r = await supabase.from('petugas_master').insert({ nama });
            must(r.error);
          }
          setForm(null);
          await loadMaster(true);
        },
        form.id ? 'Petugas diperbarui.' : 'Petugas ditambahkan.'
      );
    } else {
      const label = cleanName(form.label);
      const waktu = cleanName(form.waktu);
      if (!label) return notify('err', 'Nama shift wajib diisi.');
      if (!waktu) return notify('err', 'Jam wajib diisi.');
      if (jam.some((j) => j.id !== form.id && norm(j.label) === norm(label)))
        return notify('err', 'Nama shift sudah ada.');

      act(
        'form',
        async () => {
          if (form.id) {
            const r1 = await supabase.from('jam_master').update({ label, waktu }).eq('id', form.id);
            must(r1.error);
            if (form.oldLabel && form.oldLabel !== label) {
              const r2 = await supabase.from('jadwal_detail').update({ shift: label }).eq('shift', form.oldLabel);
              must(r2.error);
              if (form.cascade) {
                const r3 = await supabase.from('rekap_absensi').update({ shift: label }).eq('shift', form.oldLabel);
                must(r3.error);
              }
            }
          } else {
            const r = await supabase.from('jam_master').insert({ label, waktu });
            must(r.error);
          }
          setForm(null);
          await loadMaster(true);
        },
        form.id ? 'Shift diperbarui.' : 'Shift ditambahkan.'
      );
    }
  };

  const askDeletePetugas = (p: Petugas) => {
    const n = jadwalCountByNama.get(norm(p.nama)) ?? 0;
    setConfirm({
      title: 'Hapus petugas?',
      message: `"${p.nama}" akan dihapus beserta ${n} slot jadwalnya. Riwayat absensi yang sudah tercatat tidak ikut dihapus.`,
      confirmText: 'Hapus',
      onConfirm: async () => {
        const r1 = await supabase.from('jadwal_detail').delete().eq('nama', p.nama);
        must(r1.error);
        const r2 = await supabase.from('petugas_master').delete().eq('id', p.id);
        must(r2.error);
        await loadMaster(true);
        notify('ok', 'Petugas dihapus.');
      },
    });
  };

  const askDeleteJam = (j: Jam) => {
    const n = jadwalCountByShift.get(norm(j.label)) ?? 0;
    setConfirm({
      title: 'Hapus shift?',
      message: `"${j.label}" akan dihapus beserta ${n} slot jadwal di dalamnya. Riwayat absensi yang sudah tercatat tidak ikut dihapus.`,
      confirmText: 'Hapus',
      onConfirm: async () => {
        const r1 = await supabase.from('jadwal_detail').delete().eq('shift', j.label);
        must(r1.error);
        const r2 = await supabase.from('jam_master').delete().eq('id', j.id);
        must(r2.error);
        await loadMaster(true);
        notify('ok', 'Shift dihapus.');
      },
    });
  };

  /* ───────── Aksi: Jadwal ───────── */

  const addJadwal = (shift: string, nama: string) => {
    if (!nama) return;
    act(`add-${shift}-${nama}`, async () => {
      if (
        jadwal.some(
          (j) => norm(j.hari) === norm(hari) && norm(j.shift) === norm(shift) && norm(j.nama) === norm(nama)
        )
      )
        throw new Error('Petugas sudah ada di shift ini.');

      const { data, error: err } = await supabase
        .from('jadwal_detail')
        .insert({ hari, shift, nama })
        .select('id, hari, shift, nama')
        .single();
      must(err);
      setJadwal((prev) => [...prev, data as Jadwal]);
    });
  };

  const removeJadwal = (id: number) =>
    act(`del-${id}`, async () => {
      const { error: err } = await supabase.from('jadwal_detail').delete().eq('id', id);
      must(err);
      setJadwal((prev) => prev.filter((j) => j.id !== id));
    });

  const askClearHari = () => {
    const ids = jadwalHari.map((j) => j.id);
    setConfirm({
      title: `Kosongkan jadwal ${hari}?`,
      message: `${ids.length} slot jadwal pada hari ${hari} akan dihapus.`,
      confirmText: 'Kosongkan',
      onConfirm: async () => {
        const { error: err } = await supabase.from('jadwal_detail').delete().in('id', ids);
        must(err);
        setJadwal((prev) => prev.filter((j) => !ids.includes(j.id)));
        notify('ok', `Jadwal ${hari} dikosongkan.`);
      },
    });
  };

  const askCopyHari = (source: string) => {
    if (!source) return;
    const src = jadwal.filter((j) => norm(j.hari) === norm(source));
    if (src.length === 0) return notify('err', `Jadwal ${source} masih kosong.`);
    const targetIds = jadwalHari.map((j) => j.id);

    setConfirm({
      title: `Salin jadwal ${source} ke ${hari}?`,
      message: `${targetIds.length} slot jadwal ${hari} saat ini akan diganti dengan ${src.length} slot dari ${source}.`,
      confirmText: 'Salin',
      onConfirm: async () => {
        if (targetIds.length) {
          const r1 = await supabase.from('jadwal_detail').delete().in('id', targetIds);
          must(r1.error);
        }
        const r2 = await supabase
          .from('jadwal_detail')
          .insert(src.map((j) => ({ hari, shift: j.shift, nama: j.nama })));
        must(r2.error);
        await loadMaster(true);
        notify('ok', `Jadwal disalin dari ${source}.`);
      },
    });
  };

  /* ───────── Aksi: Absensi ───────── */

  const setStatus = (it: AbsenItem, status: Status) =>
    act(`st-${it.key}`, async () => {
      if (it.rekap) {
        if (it.rekap.status === status) return;
        const { error: err } = await supabase
          .from('rekap_absensi')
          .update({ status })
          .eq('id', it.rekap.id);
        must(err);
        setRekap((prev) => prev.map((r) => (r.id === it.rekap!.id ? { ...r, status } : r)));
      } else {
        const { data, error: err } = await supabase
          .from('rekap_absensi')
          .insert({ tanggal, nama: it.nama, hari: hariFromTanggal(tanggal), shift: it.shift, status })
          .select(REKAP_COLS)
          .single();
        must(err);
        setRekap((prev) => [...prev, data as Rekap]);
      }
    });

  const resetStatus = (it: AbsenItem) =>
    act(`rs-${it.key}`, async () => {
      if (!it.rekap) return;
      const { error: err } = await supabase.from('rekap_absensi').delete().eq('id', it.rekap.id);
      must(err);
      setRekap((prev) => prev.filter((r) => r.id !== it.rekap!.id));
    });

  const markAllHadir = () =>
    act(
      'all-hadir',
      async () => {
        const todo = absenItems.filter((it) => !it.rekap);
        if (todo.length === 0) return;
        const { data, error: err } = await supabase
          .from('rekap_absensi')
          .insert(
            todo.map((it) => ({
              tanggal,
              nama: it.nama,
              hari: hariFromTanggal(tanggal),
              shift: it.shift,
              status: 'Hadir',
            }))
          )
          .select(REKAP_COLS);
        must(err);
        setRekap((prev) => [...prev, ...((data ?? []) as Rekap[])]);
      },
      'Semua yang belum diisi ditandai Hadir.'
    );

  /* ───────────────────────── Render ───────────────────────── */

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const stats = [
    { title: 'Petugas', value: petugas.length, sub: 'terdaftar', icon: Users, badge: 'bg-blue-50 text-blue-600 border-blue-200' },
    { title: 'Shift', value: jam.length, sub: 'jam kerja', icon: Clock, badge: 'bg-blue-50 text-blue-600 border-blue-200' },
    { title: 'Slot Jadwal', value: jadwal.length, sub: 'seminggu', icon: CalendarDays, badge: 'bg-blue-50 text-blue-600 border-blue-200' },
    { title: 'Belum Terjadwal', value: belumTerjadwal, sub: 'petugas', icon: UserX, badge: 'bg-amber-50 text-amber-600 border-amber-200' },
  ];

  const tabs: { key: Tab; label: string; icon: typeof Users }[] = [
    { key: 'jadwal', label: 'Jadwal', icon: CalendarDays },
    { key: 'absensi', label: 'Input Absensi', icon: ClipboardCheck },
    { key: 'petugas', label: 'Petugas', icon: Users },
    { key: 'jam', label: 'Jam / Shift', icon: Clock },
  ];

  const hariIni = hariFromTanggal(tanggal);
  const shiftGroups = Array.from(new Set(absenItems.map((i) => i.shift)));

  return (
    <div className="min-h-screen text-slate-800 flex flex-col font-sans">
      <main className="flex-1 p-6 max-w-6xl w-full mx-auto space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-xl font-black text-white tracking-tight [text-shadow:0_1px_3px_rgba(0,0,0,0.35)]">
            Manajemen Absensi
          </h2>
          <p className="text-xs text-white font-medium [text-shadow:0_1px_2px_rgba(0,0,0,0.35)]">
            Kelola petugas, jam kerja, jadwal mingguan, dan koreksi absensi.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-700">
            {error}
          </div>
        )}

        {/* Statistik */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.title} className={`${CARD} p-5 rounded-2xl flex items-start justify-between`}>
              <div className="space-y-1">
                <span className={`${TH} block`}>{s.title}</span>
                <span className="text-2xl font-black text-slate-900 tracking-tight block">
                  {loading ? '–' : s.value}
                </span>
                <span className="text-[10px] text-slate-500 font-medium block">{s.sub}</span>
              </div>
              <div className={`w-10 h-10 border rounded-xl flex items-center justify-center shrink-0 ${s.badge}`}>
                <s.icon className="w-5 h-5" />
              </div>
            </div>
          ))}
        </div>

        {/* Tab */}
        <div className="flex flex-wrap items-center gap-2 pb-[3px]">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              aria-pressed={tab === t.key}
              className={`${BTN_BASE} h-9 px-3 uppercase ${tab === t.key ? BTN_ACTIVE : BTN_IDLE}`}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className={`${CARD} rounded-2xl p-12 flex justify-center`}>
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
          </div>
        ) : (
          <>
            {/* ═════════ TAB JADWAL ═════════ */}
            {tab === 'jadwal' && (
              <div className={`${CARD} rounded-2xl overflow-hidden`}>
                <div className="p-5 border-b border-slate-200 space-y-4">
                  <div className="flex flex-wrap items-center gap-2 pb-[3px]">
                    {HARI.map((h) => {
                      const n = jadwal.filter((j) => norm(j.hari) === norm(h)).length;
                      return (
                        <button
                          key={h}
                          type="button"
                          onClick={() => setHari(h)}
                          aria-pressed={hari === h}
                          className={`${BTN_BASE} h-9 px-3 ${hari === h ? BTN_ACTIVE : BTN_IDLE}`}
                        >
                          {h}
                          <span
                            className={`text-[10px] font-black px-1.5 rounded-md ${
                              hari === h ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-600'
                            }`}
                          >
                            {n}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <span className="text-xs font-bold text-slate-600">
                      Jadwal hari <span className="font-black text-slate-900">{hari}</span>
                    </span>
                    <div className="flex flex-wrap items-center gap-3 pb-[3px]">
                      <div className="relative flex items-center">
                        <Copy className="absolute left-3 w-3 h-3 text-blue-400 pointer-events-none" />
                        <select
                          value=""
                          disabled={isBusy}
                          onChange={(e) => askCopyHari(e.target.value)}
                          aria-label="Salin jadwal dari hari lain"
                          className="h-9 pl-8 pr-3 bg-white border border-blue-100 text-xs font-bold rounded-xl text-slate-700 outline-none cursor-pointer"
                        >
                          <option value="">Salin dari hari...</option>
                          {HARI.filter((h) => h !== hari).map((h) => (
                            <option key={h} value={h}>
                              {h}
                            </option>
                          ))}
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={askClearHari}
                        disabled={isBusy || jadwalHari.length === 0}
                        className={`${BTN_BASE} ${BTN_DANGER_IDLE} h-9 px-3 uppercase`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Kosongkan Hari
                      </button>
                    </div>
                  </div>
                </div>

                {jam.length === 0 ? (
                  <Empty>Belum ada shift. Tambahkan dulu di tab Jam / Shift.</Empty>
                ) : petugas.length === 0 ? (
                  <Empty>Belum ada petugas. Tambahkan dulu di tab Petugas.</Empty>
                ) : (
                  <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {jam.map((j) => {
                      const assigned = jadwalHari.filter((x) => norm(x.shift) === norm(j.label));
                      const available = petugas.filter(
                        (p) => !assigned.some((a) => norm(a.nama) === norm(p.nama))
                      );
                      return (
                        <div key={j.id} className="border border-slate-200 rounded-2xl p-4 space-y-3 bg-slate-50">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="text-xs font-black text-slate-900 truncate">{j.label}</div>
                              <div className="text-[11px] text-slate-500 font-medium">{j.waktu}</div>
                            </div>
                            <span className="text-[10px] font-black px-2 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                              {assigned.length} petugas
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-2 min-h-[30px]">
                            {assigned.length === 0 && (
                              <span className="text-[11px] text-slate-400 font-medium">Belum ada petugas.</span>
                            )}
                            {assigned.map((a) => (
                              <span
                                key={a.id}
                                className="inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-lg bg-white border border-blue-200 text-[11px] font-bold text-slate-800"
                              >
                                {a.nama}
                                <button
                                  type="button"
                                  onClick={() => removeJadwal(a.id)}
                                  disabled={isBusy}
                                  aria-label={`Hapus ${a.nama} dari ${j.label}`}
                                  className="w-5 h-5 flex items-center justify-center rounded-md text-red-500 hover:bg-red-50 cursor-pointer disabled:opacity-50"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            ))}
                          </div>

                          <select
                            value=""
                            disabled={isBusy || available.length === 0}
                            onChange={(e) => addJadwal(j.label, e.target.value)}
                            aria-label={`Tambah petugas ke ${j.label}`}
                            className="w-full h-9 px-3 bg-white border border-blue-100 text-xs font-bold rounded-xl text-slate-700 outline-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <option value="">
                              {available.length === 0 ? 'Semua petugas sudah masuk' : '+ Tambah petugas...'}
                            </option>
                            {available.map((p) => (
                              <option key={p.id} value={p.nama}>
                                {p.nama}
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    })}

                    {jadwalTakDikenal.length > 0 && (
                      <div className="border border-amber-200 rounded-2xl p-4 space-y-3 bg-amber-50 lg:col-span-2">
                        <div className="text-xs font-black text-amber-800">Shift tidak terdaftar</div>
                        <p className="text-[11px] text-amber-700 font-medium">
                          Jadwal berikut memakai nama shift yang tidak ada di Jam / Shift. Hapus atau perbaiki namanya.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {jadwalTakDikenal.map((a) => (
                            <span
                              key={a.id}
                              className="inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-lg bg-white border border-amber-200 text-[11px] font-bold text-slate-800"
                            >
                              {a.nama} · {a.shift}
                              <button
                                type="button"
                                onClick={() => removeJadwal(a.id)}
                                disabled={isBusy}
                                aria-label={`Hapus ${a.nama}`}
                                className="w-5 h-5 flex items-center justify-center rounded-md text-red-500 hover:bg-red-50 cursor-pointer disabled:opacity-50"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ═════════ TAB INPUT ABSENSI ═════════ */}
            {tab === 'absensi' && (
              <div className={`${CARD} rounded-2xl overflow-hidden`}>
                <div className="p-5 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-center gap-2 pb-[3px]">
                    <button
                      type="button"
                      onClick={() => setTanggal((t) => shiftTanggal(t, -1))}
                      aria-label="Hari sebelumnya"
                      className={`${BTN_BASE} ${BTN_IDLE} w-9 h-9`}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <input
                      type="date"
                      value={tanggal}
                      onChange={(e) => e.target.value && setTanggal(e.target.value)}
                      aria-label="Pilih tanggal"
                      className="h-9 px-3 bg-white border border-blue-100 focus:border-blue-400 text-xs font-bold rounded-xl text-slate-800 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setTanggal((t) => shiftTanggal(t, 1))}
                      aria-label="Hari berikutnya"
                      className={`${BTN_BASE} ${BTN_IDLE} w-9 h-9`}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setTanggal(dateToStr(new Date()))}
                      disabled={tanggal === dateToStr(new Date())}
                      className={`${BTN_BASE} ${BTN_SOLID} h-9 px-3 uppercase`}
                    >
                      Hari Ini
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pb-[3px]">
                    <span className="text-xs font-black text-slate-800">{formatTanggalPanjang(tanggal)}</span>
                    <button
                      type="button"
                      onClick={markAllHadir}
                      disabled={isBusy || rekapLoading || absenSummary.belum === 0}
                      className={`${BTN_BASE} ${BTN_SOLID} h-9 px-3 uppercase`}
                    >
                      <ClipboardCheck className="w-3.5 h-3.5" />
                      Semua Hadir
                    </button>
                  </div>
                </div>

                <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-wider">
                  <span className="px-2.5 py-1 rounded-md border bg-blue-50 text-blue-700 border-blue-200">Hadir {absenSummary.Hadir}</span>
                  <span className="px-2.5 py-1 rounded-md border bg-amber-50 text-amber-700 border-amber-200">Izin {absenSummary.Izin}</span>
                  <span className="px-2.5 py-1 rounded-md border bg-red-50 text-red-700 border-red-200">Alpha {absenSummary.Alpha}</span>
                  <span className="px-2.5 py-1 rounded-md border bg-white text-slate-600 border-slate-200">Belum diisi {absenSummary.belum}</span>
                </div>

                {rekapLoading ? (
                  <div className="p-12 flex justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
                  </div>
                ) : absenItems.length === 0 ? (
                  <Empty>Tidak ada jadwal pada hari {hariIni} dan belum ada absensi tercatat.</Empty>
                ) : (
                  <div className="divide-y divide-slate-200">
                    {shiftGroups.map((shift) => {
                      const info = jam.find((x) => norm(x.label) === norm(shift));
                      return (
                        <div key={shift}>
                          <div className="px-5 py-2 bg-slate-50 flex items-center gap-2">
                            <span className="text-[11px] font-black text-slate-800 uppercase tracking-wider">{shift}</span>
                            {info && <span className="text-[11px] text-slate-500 font-medium">· {info.waktu}</span>}
                          </div>
                          {absenItems
                            .filter((it) => it.shift === shift)
                            .map((it) => (
                              <div
                                key={it.key}
                                className="px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-blue-50 transition-colors"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-[11px] font-black text-white uppercase shrink-0">
                                    {it.nama.substring(0, 2)}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="text-xs font-black text-slate-900 truncate">{it.nama}</div>
                                    {!it.terjadwal && (
                                      <div className="text-[10px] font-bold text-amber-600">Di luar jadwal</div>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5">
                                  {STATUS_LIST.map((s) => (
                                    <button
                                      key={s}
                                      type="button"
                                      disabled={isBusy}
                                      onClick={() => setStatus(it, s)}
                                      aria-pressed={it.rekap?.status === s}
                                      className={`h-8 px-3 rounded-lg border text-[11px] font-extrabold cursor-pointer transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                                        it.rekap?.status === s ? STATUS_ON[s] : STATUS_OFF
                                      }`}
                                    >
                                      {s}
                                    </button>
                                  ))}
                                  <button
                                    type="button"
                                    disabled={isBusy || !it.rekap}
                                    onClick={() => resetStatus(it)}
                                    aria-label={`Reset absensi ${it.nama}`}
                                    title="Reset (hapus catatan)"
                                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-300 text-slate-500 hover:bg-red-50 hover:text-red-600 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ═════════ TAB PETUGAS ═════════ */}
            {tab === 'petugas' && (
              <div className={`${CARD} rounded-2xl overflow-hidden`}>
                <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200">
                  <div className="relative flex items-center">
                    <Search className="absolute left-3 w-3 h-3 text-blue-400 pointer-events-none" />
                    <input
                      type="text"
                      value={searchPetugas}
                      onChange={(e) => setSearchPetugas(e.target.value)}
                      placeholder="Cari nama petugas..."
                      aria-label="Cari nama petugas"
                      className="w-full sm:w-64 h-9 pl-8 pr-3 bg-white border border-blue-100 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 text-xs font-medium rounded-xl text-slate-800 placeholder-slate-400 outline-none transition-colors"
                    />
                  </div>
                  <div className="pb-[3px]">
                    <button
                      type="button"
                      onClick={() => setForm({ type: 'petugas', nama: '', cascade: true })}
                      className={`${BTN_BASE} ${BTN_SOLID} h-9 px-3 uppercase`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Tambah Petugas
                    </button>
                  </div>
                </div>

                {petugasFiltered.length === 0 ? (
                  <Empty>{petugas.length === 0 ? 'Belum ada petugas.' : 'Petugas tidak ditemukan.'}</Empty>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className={`bg-slate-50 border-b border-slate-200 ${TH}`}>
                          <th className="px-5 py-3">Petugas</th>
                          <th className="px-3 py-3 text-center">Slot Jadwal</th>
                          <th className="px-3 py-3">Ditambahkan</th>
                          <th className="px-5 py-3 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {petugasFiltered.map((p) => {
                          const n = jadwalCountByNama.get(norm(p.nama)) ?? 0;
                          return (
                            <tr key={p.id} className="hover:bg-blue-50 transition-colors">
                              <td className="px-5 py-3">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-[11px] font-black text-white uppercase shrink-0">
                                    {p.nama.substring(0, 2)}
                                  </div>
                                  <span className="text-xs font-black text-slate-900 truncate">{p.nama}</span>
                                </div>
                              </td>
                              <td className="px-3 py-3 text-center">
                                {n > 0 ? (
                                  <span className="text-xs font-black text-blue-700">{n}</span>
                                ) : (
                                  <span className="inline-block text-[10px] font-bold px-2 py-1 rounded-md border uppercase tracking-wider bg-amber-50 text-amber-700 border-amber-200">
                                    Belum terjadwal
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-3 text-xs font-medium text-slate-600 whitespace-nowrap">
                                {formatDibuat(p.created_at)}
                              </td>
                              <td className="px-5 py-3">
                                <div className="flex items-center justify-end gap-2 pb-[3px]">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setForm({ type: 'petugas', id: p.id, oldNama: p.nama, nama: p.nama, cascade: true })
                                    }
                                    aria-label={`Ubah ${p.nama}`}
                                    className={`${BTN_BASE} ${BTN_IDLE} w-8 h-8`}
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => askDeletePetugas(p)}
                                    aria-label={`Hapus ${p.nama}`}
                                    className={`${BTN_BASE} ${BTN_DANGER_IDLE} w-8 h-8`}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ═════════ TAB JAM / SHIFT ═════════ */}
            {tab === 'jam' && (
              <div className={`${CARD} rounded-2xl overflow-hidden`}>
                <div className="p-5 flex items-center justify-between gap-3 border-b border-slate-200">
                  <span className="text-xs font-bold text-slate-600">
                    Atur nama shift dan jam kerjanya. Urutan mengikuti waktu penambahan.
                  </span>
                  <div className="pb-[3px] shrink-0">
                    <button
                      type="button"
                      onClick={() => setForm({ type: 'jam', label: '', waktu: '', cascade: true })}
                      className={`${BTN_BASE} ${BTN_SOLID} h-9 px-3 uppercase`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Tambah Shift
                    </button>
                  </div>
                </div>

                {jam.length === 0 ? (
                  <Empty>Belum ada shift.</Empty>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className={`bg-slate-50 border-b border-slate-200 ${TH}`}>
                          <th className="px-5 py-3">Shift</th>
                          <th className="px-3 py-3">Jam</th>
                          <th className="px-3 py-3 text-center">Slot Jadwal</th>
                          <th className="px-5 py-3 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {jam.map((j) => (
                          <tr key={j.id} className="hover:bg-blue-50 transition-colors">
                            <td className="px-5 py-3 text-xs font-black text-slate-900">{j.label}</td>
                            <td className="px-3 py-3 text-xs font-bold text-slate-700 whitespace-nowrap">{j.waktu}</td>
                            <td className="px-3 py-3 text-center text-xs font-black text-blue-700">
                              {jadwalCountByShift.get(norm(j.label)) ?? 0}
                            </td>
                            <td className="px-5 py-3">
                              <div className="flex items-center justify-end gap-2 pb-[3px]">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setForm({
                                      type: 'jam',
                                      id: j.id,
                                      oldLabel: j.label,
                                      label: j.label,
                                      waktu: j.waktu,
                                      cascade: true,
                                    })
                                  }
                                  aria-label={`Ubah ${j.label}`}
                                  className={`${BTN_BASE} ${BTN_IDLE} w-8 h-8`}
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => askDeleteJam(j)}
                                  aria-label={`Hapus ${j.label}`}
                                  className={`${BTN_BASE} ${BTN_DANGER_IDLE} w-8 h-8`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* Modal form tambah / ubah */}
      {form && (
        <Modal
          title={
            form.type === 'petugas'
              ? form.id ? 'Ubah Petugas' : 'Tambah Petugas'
              : form.id ? 'Ubah Shift' : 'Tambah Shift'
          }
          onClose={() => !isBusy && setForm(null)}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {form.type === 'petugas' ? (
              <>
                <div className="space-y-1.5">
                  <label htmlFor="f-nama" className={`${TH} block`}>Nama petugas</label>
                  <input
                    id="f-nama"
                    autoFocus
                    type="text"
                    value={form.nama}
                    onChange={(e) => setForm({ ...form, nama: e.target.value })}
                    placeholder="Contoh: Budi Santoso"
                    className={INPUT}
                  />
                </div>
                {form.id && (
                  <label className="flex items-start gap-2 text-[11px] font-medium text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.cascade}
                      onChange={(e) => setForm({ ...form, cascade: e.target.checked })}
                      className="mt-0.5 accent-blue-600"
                    />
                    Ikut ubah nama di riwayat absensi (agar rekap tidak terpecah). Jadwal selalu ikut diubah.
                  </label>
                )}
              </>
            ) : (
              <>
                <div className="space-y-1.5">
                  <label htmlFor="f-label" className={`${TH} block`}>Nama shift</label>
                  <input
                    id="f-label"
                    autoFocus
                    type="text"
                    value={form.label}
                    onChange={(e) => setForm({ ...form, label: e.target.value })}
                    placeholder="Contoh: Shift 1"
                    className={INPUT}
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="f-waktu" className={`${TH} block`}>Jam</label>
                  <input
                    id="f-waktu"
                    type="text"
                    value={form.waktu}
                    onChange={(e) => setForm({ ...form, waktu: e.target.value })}
                    placeholder="Contoh: 07.30 - 12.00"
                    className={INPUT}
                  />
                </div>
                {form.id && (
                  <label className="flex items-start gap-2 text-[11px] font-medium text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.cascade}
                      onChange={(e) => setForm({ ...form, cascade: e.target.checked })}
                      className="mt-0.5 accent-blue-600"
                    />
                    Ikut ubah nama shift di riwayat absensi. Jadwal selalu ikut diubah.
                  </label>
                )}
              </>
            )}

            <div className="flex items-center justify-end gap-2 pt-1 pb-[3px]">
              <button
                type="button"
                onClick={() => setForm(null)}
                disabled={isBusy}
                className={`${BTN_BASE} ${BTN_IDLE} h-9 px-4 uppercase`}
              >
                Batal
              </button>
              <button type="submit" disabled={isBusy} className={`${BTN_BASE} ${BTN_SOLID} h-9 px-4 uppercase`}>
                {busy === 'form' ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal konfirmasi */}
      {confirm && (
        <Modal title={confirm.title} onClose={() => !isBusy && setConfirm(null)}>
          <p className="text-xs font-medium text-slate-600 leading-relaxed">{confirm.message}</p>
          <div className="flex items-center justify-end gap-2 pt-4 pb-[3px]">
            <button
              type="button"
              onClick={() => setConfirm(null)}
              disabled={isBusy}
              className={`${BTN_BASE} ${BTN_IDLE} h-9 px-4 uppercase`}
            >
              Batal
            </button>
            <button
              type="button"
              disabled={isBusy}
              onClick={() =>
                act('confirm', async () => {
                  await confirm.onConfirm();
                  setConfirm(null);
                })
              }
              className={`${BTN_BASE} ${BTN_DANGER_SOLID} h-9 px-4 uppercase`}
            >
              {busy === 'confirm' ? 'Memproses...' : confirm.confirmText}
            </button>
          </div>
        </Modal>
      )}

      {/* Toast */}
      {toast && (
        <div
          role="status"
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] px-4 py-2.5 rounded-xl border text-xs font-bold shadow-lg ${
            toast.type === 'ok'
              ? 'bg-blue-600 text-white border-blue-700'
              : 'bg-red-600 text-white border-red-700'
          }`}
        >
          {toast.text}
        </div>
      )}
    </div>
  );
}