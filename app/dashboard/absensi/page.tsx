'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { CheckCircle2, Clock, Lock, UserCheck, UserX, UserMinus } from 'lucide-react';

/* ───────────────────────── Types ───────────────────────── */

type Status = 'Hadir' | 'Izin' | 'Alpha';

interface JamMaster {
  id: number;
  label: string;
  waktu: string;
  start: number; // menit sejak 00:00
  end: number;
}

interface JadwalDetail {
  id: number;
  hari: string;
  shift: string;
  nama: string;
}

interface RekapEntry {
  id: number | null;
  status: Status;
}

/** Shift yang sedang berjalan + tanggal/hari "milik" shift tersebut */
interface ActiveShift {
  jam: JamMaster;
  tanggal: string; // YYYY-MM-DD
  hariKey: string; // hari ternormalisasi
}

/* ───────────────────────── Helper murni ───────────────────────── */

const CARD = 'bg-white border border-slate-200 shadow-sm';

const NAMA_HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

const pad = (n: number) => String(n).padStart(2, '0');

/** Tanggal lokal "YYYY-MM-DD" (bukan toISOString, supaya tidak geser zona waktu) */
const toDateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const toHHMM = (menit: number) => `${pad(Math.floor(menit / 60))}:${pad(menit % 60)}`;

/** Normalisasi teks untuk pencocokan: huruf kecil, tanpa spasi/tanda baca */
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Normalisasi nama hari (Jum'at → jumat, Ahad → minggu) */
const normHari = (s: string) => {
  const n = norm(s);
  return n === 'ahad' ? 'minggu' : n;
};

/**
 * Baca "waktu" dari jam_master. Format yang dikenali: dua jam di dalam teks,
 * misalnya "08:00 - 10:00", "08.00-10.00", "08:00 s/d 10:00".
 */
function parseWaktu(waktu: string): { start: number; end: number } | null {
  const m = [...waktu.matchAll(/(\d{1,2})\s*[:.]\s*(\d{2})/g)];
  if (m.length < 2) return null;
  const start = Number(m[0][1]) * 60 + Number(m[0][2]);
  const end = Number(m[1][1]) * 60 + Number(m[1][2]);
  if (start === end) return null;
  return { start, end };
}

const rekapKey = (tanggal: string, shift: string, nama: string) =>
  `${tanggal}|${norm(shift)}|${norm(nama)}`;

/**
 * Gaya tombol timbul:
 * - idle   : putih, bayangan tebal di bawah (timbul); hover/ditekan → turun 3px, bayangan hilang
 * - active : status terpilih, warna solid dan permanen tampak terpencet
 * Kelas ditulis utuh (tidak dirangkai) supaya terdeteksi oleh Tailwind.
 */
const STATUS_CONFIG: {
  value: Status;
  icon: typeof UserCheck;
  idle: string;
  active: string;
}[] = [
  {
    value: 'Hadir',
    icon: UserCheck,
    idle: 'bg-white text-blue-700 border-blue-300 shadow-[0_3px_0_0_#93c5fd] enabled:hover:translate-y-[3px] enabled:hover:bg-blue-50 enabled:hover:shadow-[0_0_0_0_#93c5fd] enabled:active:translate-y-[3px] enabled:active:shadow-[0_0_0_0_#93c5fd] focus-visible:ring-blue-400',
    active: 'bg-blue-600 text-white border-blue-700 translate-y-[3px] shadow-[0_0_0_0_#1d4ed8] focus-visible:ring-blue-400',
  },
  {
    value: 'Izin',
    icon: UserMinus,
    idle: 'bg-white text-amber-700 border-amber-300 shadow-[0_3px_0_0_#fcd34d] enabled:hover:translate-y-[3px] enabled:hover:bg-amber-50 enabled:hover:shadow-[0_0_0_0_#fcd34d] enabled:active:translate-y-[3px] enabled:active:shadow-[0_0_0_0_#fcd34d] focus-visible:ring-amber-400',
    active: 'bg-amber-500 text-white border-amber-600 translate-y-[3px] shadow-[0_0_0_0_#b45309] focus-visible:ring-amber-400',
  },
  {
    value: 'Alpha',
    icon: UserX,
    idle: 'bg-white text-red-700 border-red-300 shadow-[0_3px_0_0_#fca5a5] enabled:hover:translate-y-[3px] enabled:hover:bg-red-50 enabled:hover:shadow-[0_0_0_0_#fca5a5] enabled:active:translate-y-[3px] enabled:active:shadow-[0_0_0_0_#fca5a5] focus-visible:ring-red-400',
    active: 'bg-red-500 text-white border-red-600 translate-y-[3px] shadow-[0_0_0_0_#b91c1c] focus-visible:ring-red-400',
  },
];

/* ───────────────────────── Halaman ───────────────────────── */

export default function AbsensiPage() {
  const router = useRouter();

  const [authLoading, setAuthLoading] = useState(true);
  const [now, setNow] = useState<Date>(() => new Date());

  const [jamMaster, setJamMaster] = useState<JamMaster[]>([]);
  const [jadwal, setJadwal] = useState<JadwalDetail[]>([]);
  const [masterLoading, setMasterLoading] = useState(true);

  const [rekap, setRekap] = useState<Record<string, RekapEntry>>({});
  const [rekapLoading, setRekapLoading] = useState(false);

  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  /* Jam berjalan: cek ulang tiap 15 detik agar buka/tutup & pergantian shift otomatis */
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(t);
  }, []);

  /* Ambil jam_master + jadwal_detail (tabel kecil, cukup sekali) */
  useEffect(() => {
    if (authLoading) return;
    let isMounted = true;

    (async () => {
      const [jamRes, jadwalRes] = await Promise.all([
        supabase.from('jam_master').select('id, label, waktu').order('id', { ascending: true }),
        supabase.from('jadwal_detail').select('id, hari, shift, nama').order('id', { ascending: true }),
      ]);
      if (!isMounted) return;

      if (jamRes.error || jadwalRes.error) {
        setError('Gagal memuat jadwal. Coba muat ulang halaman.');
        setMasterLoading(false);
        return;
      }

      const parsed: JamMaster[] = [];
      (jamRes.data ?? []).forEach((j) => {
        const w = parseWaktu(String(j.waktu));
        if (w) parsed.push({ id: j.id, label: j.label, waktu: j.waktu, ...w });
      });

      setJamMaster(parsed);
      setJadwal(jadwalRes.data ?? []);
      setMasterLoading(false);
    })();

    return () => {
      isMounted = false;
    };
  }, [authLoading]);

  /* Shift yang sedang berjalan sekarang (mendukung shift lewat tengah malam) */
  const nowMenit = now.getHours() * 60 + now.getMinutes();
  const hariIniKey = toDateKey(now);

  const activeShifts = useMemo<ActiveShift[]>(() => {
    const hasil: ActiveShift[] = [];

    for (const jam of jamMaster) {
      let offset: number | null = null;

      if (jam.start < jam.end) {
        if (nowMenit >= jam.start && nowMenit < jam.end) offset = 0;
      } else {
        // Lewat tengah malam, mis. 22:00 – 02:00
        if (nowMenit >= jam.start) offset = 0;
        else if (nowMenit < jam.end) offset = -1; // dini hari: shift milik kemarin
      }

      if (offset === null) continue;

      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
      hasil.push({
        jam,
        tanggal: toDateKey(d),
        hariKey: normHari(NAMA_HARI[d.getDay()]),
      });
    }

    return hasil;
    // hariIniKey ikut agar ikut dihitung ulang saat pergantian hari
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jamMaster, nowMenit, hariIniKey]);

  const isOpen = activeShifts.length > 0;

  /* Jam buka berikutnya hari ini (untuk pesan saat tutup) */
  const nextStart = useMemo(() => {
    const berikut = jamMaster
      .filter((j) => j.start > nowMenit)
      .sort((a, b) => a.start - b.start)[0];
    return berikut ? toHHMM(berikut.start) : null;
  }, [jamMaster, nowMenit]);

  /* Ambil rekap_absensi untuk tanggal-tanggal yang sedang aktif */
  const tanggalAktif = useMemo(
    () => Array.from(new Set(activeShifts.map((a) => a.tanggal))).sort().join(','),
    [activeShifts]
  );

  const loadRekap = useCallback(async () => {
    if (!tanggalAktif) {
      setRekap({});
      return;
    }
    setRekapLoading(true);

    const { data, error: err } = await supabase
      .from('rekap_absensi')
      .select('id, tanggal, nama, shift, status')
      .in('tanggal', tanggalAktif.split(','));

    if (err) {
      setError('Gagal memuat data absensi. Coba muat ulang halaman.');
      setRekapLoading(false);
      return;
    }

    const map: Record<string, RekapEntry> = {};
    (data ?? []).forEach((r) => {
      map[rekapKey(r.tanggal, r.shift, r.nama)] = { id: r.id, status: r.status as Status };
    });
    setRekap(map);
    setRekapLoading(false);
  }, [tanggalAktif]);

  useEffect(() => {
    if (authLoading || masterLoading) return;
    loadRekap();
  }, [authLoading, masterLoading, loadRekap]);

  /* Orang yang bertugas per shift aktif */
  const groups = useMemo(
    () =>
      activeShifts.map((a) => ({
        ...a,
        orang: jadwal.filter(
          (j) =>
            normHari(j.hari) === a.hariKey &&
            (norm(j.shift) === norm(a.jam.label) || norm(j.shift) === norm(a.jam.waktu))
        ),
      })),
    [activeShifts, jadwal]
  );

  const totalOrang = groups.reduce((n, g) => n + g.orang.length, 0);

  /* Simpan status (optimistic update, rollback jika gagal) */
  const handleSetStatus = async (tanggal: string, orang: JadwalDetail, status: Status) => {
    if (savingKey !== null) return;

    const key = rekapKey(tanggal, orang.shift, orang.nama);
    const sebelumnya = rekap[key];

    setSavingKey(key);
    setError(null);
    setRekap((prev) => ({ ...prev, [key]: { id: sebelumnya?.id ?? null, status } }));

    let err: { message: string } | null = null;

    if (sebelumnya?.id != null) {
      const res = await supabase.from('rekap_absensi').update({ status }).eq('id', sebelumnya.id);
      err = res.error;
    } else {
      const res = await supabase
        .from('rekap_absensi')
        .insert({
          tanggal,
          nama: orang.nama,
          hari: orang.hari,
          shift: orang.shift,
          status,
        })
        .select('id')
        .single();
      err = res.error;
      if (!res.error && res.data) {
        setRekap((prev) => ({ ...prev, [key]: { id: res.data.id, status } }));
      }
    }

    if (err) {
      setError(`Gagal menyimpan absensi ${orang.nama}.`);
      setRekap((prev) => {
        const next = { ...prev };
        if (sebelumnya) next[key] = sebelumnya;
        else delete next[key];
        return next;
      });
    }
    setSavingKey(null);
  };

  /* ───────────────────────── Render ───────────────────────── */

  if (authLoading || masterLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const tanggalLabel = `${NAMA_HARI[now.getDay()]}, ${now.getDate()} ${now.toLocaleString('id-ID', {
    month: 'long',
  })} ${now.getFullYear()}`;

  return (
    <div className="min-h-screen text-slate-800 flex flex-col font-sans">
      <main className="flex-1 p-6 max-w-4xl w-full mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-white tracking-tight [text-shadow:0_1px_3px_rgba(0,0,0,0.35)]">
              Absensi Pustakawan
            </h2>
            <p className="text-xs text-white font-medium [text-shadow:0_1px_2px_rgba(0,0,0,0.35)]">
              {tanggalLabel}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1.5 rounded-md uppercase tracking-wider border ${
                isOpen
                  ? 'text-blue-700 bg-blue-50 border-blue-200'
                  : 'text-slate-600 bg-slate-100 border-slate-200'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${isOpen ? 'bg-blue-600' : 'bg-slate-400'}`}
              />
              {isOpen ? 'Perpustakaan Buka' : 'Perpustakaan Tutup'}
            </span>
            <span className="flex items-center gap-1 text-[10px] font-bold text-slate-700 bg-white border border-slate-200 px-2.5 py-1.5 rounded-md tracking-wider">
              <Clock className="w-3 h-3" /> {toHHMM(nowMenit)}
            </span>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-700">
            {error}
          </div>
        )}

        {/* TUTUP: tidak ada daftar yang muncul */}
        {!isOpen && (
          <div className={`${CARD} rounded-2xl p-10 flex flex-col items-center text-center gap-3`}>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
              Absensi Belum Dibuka
            </h3>
            <p className="text-xs text-slate-500 font-medium max-w-sm">
              {jamMaster.length === 0
                ? 'Belum ada jam shift yang terbaca dari jam_master.'
                : nextStart
                ? `Absensi dibuka kembali pukul ${nextStart}.`
                : 'Tidak ada shift lagi untuk saat ini. Absensi akan muncul otomatis saat jam shift tiba.'}
            </p>
          </div>
        )}

        {/* BUKA: tampilkan petugas pada shift yang sedang berjalan */}
        {isOpen && (
          <div className={`${CARD} rounded-2xl overflow-hidden`}>
            <div className="p-5 flex items-center justify-between border-b border-slate-200">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                  Shift Sedang Berjalan
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  Tandai kehadiran petugas yang bertugas saat ini
                </p>
              </div>
              <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-md uppercase tracking-wider">
                {totalOrang} Orang
              </span>
            </div>

            {rekapLoading ? (
              <div className="p-10 flex justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
              </div>
            ) : (
              groups.map((g) => (
                <div key={`${g.tanggal}-${g.jam.id}`} className="border-b border-slate-200 last:border-b-0">
                  <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider">
                      {g.jam.label}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
                      <Clock className="w-3 h-3" /> {toHHMM(g.jam.start)} – {toHHMM(g.jam.end)}
                    </span>
                  </div>

                  {g.orang.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500 font-medium">
                      Tidak ada petugas yang dijadwalkan pada shift ini.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-200">
                      {g.orang.map((orang) => {
                        const key = rekapKey(g.tanggal, orang.shift, orang.nama);
                        const status = rekap[key]?.status;
                        const saving = savingKey === key;

                        return (
                          <div
                            key={orang.id}
                            className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-[11px] font-black text-white uppercase shrink-0">
                                {orang.nama.substring(0, 2)}
                              </div>
                              <div className="min-w-0">
                                <span className="text-xs font-black text-slate-900 block truncate">
                                  {orang.nama}
                                </span>
                                <span className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
                                  {orang.hari} · {orang.shift}
                                  {status && (
                                    <span className="flex items-center gap-1 ml-2 text-blue-600 font-bold">
                                      <CheckCircle2 className="w-3 h-3" /> Tercatat
                                    </span>
                                  )}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 pb-[3px]">
                              {STATUS_CONFIG.map(({ value, icon: Icon, idle, active }) => (
                                <button
                                  key={value}
                                  type="button"
                                  disabled={saving}
                                  onClick={() => handleSetStatus(g.tanggal, orang, value)}
                                  aria-pressed={status === value}
                                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-extrabold tracking-wide select-none cursor-pointer transition-all duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60 ${
                                    status === value ? active : idle
                                  }`}
                                >
                                  <Icon className="w-3.5 h-3.5" />
                                  {value}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}