'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  Camera,
  CameraOff,
  CheckCircle2,
  CircleHelp,
  Copy,
  Inbox,
  ScanLine,
  Undo2,
  Volume2,
  VolumeX,
  XCircle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

/* =====================================================================
   KONFIGURASI
   ===================================================================== */

const COLUMNS = 'id, kode, nomor_panggil, lokasi_rak, status_audit, biblio:biblio_id(judul, penulis)';
const MAX_LOG = 100;
const DEBOUNCE_MS = 2500; // kode yang sama dalam rentang ini diabaikan (kamera membaca berulang)

// Auto Enter: kode dikirim otomatis setelah tidak ada ketikan baru selama jeda ini.
// Naikkan jika scanner Anda lambat dan kode sering terpotong; turunkan agar lebih responsif.
const AUTO_ENTER_MS = 200;
const AUTO_ENTER_MIN_LEN = 3; // kode lebih pendek dari ini tidak dikirim otomatis
const AUTO_ENTER_KEY = 'audit-scanner:auto-enter';

// Nilai disimpan huruf kecil; warna di halaman Hasil Audit menyesuaikan dari katanya.
const STATUS_OPTIONS = [
  { value: 'ditemukan', label: 'Ditemukan', aktif: 'bg-emerald-600 text-white border-emerald-600' },
  { value: 'salah rak', label: 'Salah Rak', aktif: 'bg-amber-500 text-white border-amber-500' },
  { value: 'rusak', label: 'Rusak', aktif: 'bg-red-600 text-white border-red-600' },
] as const;

type Jenis = 'baru' | 'diperbarui' | 'duplikat' | 'tidak-ada' | 'gagal';

interface Catatan {
  key: string;
  waktu: Date;
  jenis: Jenis;
  kode: string;
  id?: string;
  judul?: string;
  penulis?: string;
  nomorPanggil?: string;
  lokasiRak?: string;
  statusAudit?: string; // status yang tercatat sekarang
  sebelumnya?: string; // status sebelum dipindai
  pesan?: string;
  dibatalkan?: boolean;
}

const TITLE = 'Scanner Audit';
const SUBTITLE = 'Pindai barcode eksemplar untuk mencatat hasil audit koleksi.';

/* =====================================================================
   GAYA
   ===================================================================== */

const CARD = 'bg-white border border-slate-200 shadow-sm';
const BADGE = 'bg-blue-50 text-blue-600 border border-blue-200';

const dasarTombol =
  'inline-flex cursor-pointer touch-manipulation select-none items-center justify-center gap-1.5 rounded-lg border px-4 py-2 text-xs font-extrabold uppercase tracking-wider transition-[transform,box-shadow] duration-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 [@media(hover:hover)]:hover:translate-y-1 [@media(hover:hover)]:hover:shadow-none active:translate-y-1 active:shadow-none';

const tombolUtama = `${dasarTombol} border-blue-800 bg-blue-600 text-white shadow-[0_4px_0_0_#1e40af]`;
const tombolSekunder = `${dasarTombol} border-slate-300 bg-white text-slate-700 shadow-[0_4px_0_0_#cbd5e1]`;
const tombolKecil = '!px-2.5 !py-1.5 !text-[10px]';

const JENIS_INFO: Record<Jenis, { label: string; kelas: string; panel: string }> = {
  baru: {
    label: 'Tercatat',
    kelas: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    panel: 'bg-emerald-50 border-emerald-300',
  },
  diperbarui: {
    label: 'Diperbarui',
    kelas: 'bg-blue-50 text-blue-700 border-blue-200',
    panel: 'bg-blue-50 border-blue-300',
  },
  duplikat: {
    label: 'Sudah diaudit',
    kelas: 'bg-amber-50 text-amber-700 border-amber-200',
    panel: 'bg-amber-50 border-amber-300',
  },
  'tidak-ada': {
    label: 'Tidak ditemukan',
    kelas: 'bg-red-50 text-red-700 border-red-200',
    panel: 'bg-red-50 border-red-300',
  },
  gagal: {
    label: 'Gagal',
    kelas: 'bg-red-50 text-red-700 border-red-200',
    panel: 'bg-red-50 border-red-300',
  },
};

/* =====================================================================
   HELPER
   ===================================================================== */

function rapikan(status: string) {
  const t = status.replace(/[_-]+/g, ' ').trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

const fmt = (n: number) => n.toLocaleString('id-ID');

const jam = (d: Date) =>
  d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

function IkonJenis({ jenis, className }: { jenis: Jenis; className?: string }) {
  if (jenis === 'baru' || jenis === 'diperbarui') return <CheckCircle2 className={className} />;
  if (jenis === 'duplikat') return <Copy className={className} />;
  if (jenis === 'tidak-ada') return <CircleHelp className={className} />;
  return <XCircle className={className} />;
}

/* =====================================================================
   KOMPONEN KECIL
   ===================================================================== */

function StatCard({ label, value, kelas }: { label: string; value: number; kelas: string }) {
  return (
    <div className={`rounded-xl border px-3 py-2 min-w-0 ${kelas}`}>
      <p className="text-[10px] font-black uppercase tracking-wider truncate">{label}</p>
      <p className="text-lg font-black leading-tight">{fmt(value)}</p>
    </div>
  );
}

function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
        checked ? 'bg-blue-600 border-blue-700' : 'bg-slate-200 border-slate-300'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

/* =====================================================================
   HALAMAN
   ===================================================================== */

export default function ScannerAuditPage() {
  const router = useRouter();

  const [authReady, setAuthReady] = useState(false);

  // Input & mode
  const [kodeInput, setKodeInput] = useState('');
  const [mode, setMode] = useState<string>(STATUS_OPTIONS[0].value);
  const [suara, setSuara] = useState(true);
  const [autoEnter, setAutoEnter] = useState(false);
  const [sibuk, setSibuk] = useState(0);

  // Kamera
  const [cameraOn, setCameraOn] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);

  // Riwayat sesi
  const [log, setLog] = useState<Catatan[]>([]);

  const mounted = useRef(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const recent = useRef<Record<string, number>>({});
  const modeRef = useRef(mode);
  const suaraRef = useRef(suara);
  const audioRef = useRef<AudioContext | null>(null);
  const prosesRef = useRef<(kode: string) => void>(() => {});

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);
  useEffect(() => {
    suaraRef.current = suara;
  }, [suara]);

  useEffect(() => {
    document.title = TITLE;
    mounted.current = true;
    // Pulihkan pilihan Auto Enter terakhir
    try {
      if (localStorage.getItem(AUTO_ENTER_KEY) === '1') setAutoEnter(true);
    } catch {
      // penyimpanan tidak tersedia: abaikan
    }
    return () => {
      mounted.current = false;
      audioRef.current?.close().catch(() => {});
    };
  }, []);

  // Proteksi halaman
  useEffect(() => {
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!mounted.current) return;
      if (!session) router.replace('/login');
      else setAuthReady(true);
    })();
  }, [router]);

  // Fokus otomatis ke kolom input (hanya di perangkat dengan mouse, supaya keyboard HP tidak muncul sendiri)
  const fokus = useCallback(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches) {
      inputRef.current?.focus();
    }
  }, []);

  useEffect(() => {
    if (authReady) fokus();
  }, [authReady, fokus]);

  const ubahAutoEnter = (v: boolean) => {
    setAutoEnter(v);
    try {
      localStorage.setItem(AUTO_ENTER_KEY, v ? '1' : '0');
    } catch {
      // penyimpanan tidak tersedia: abaikan
    }
    fokus();
  };

  /* ---------- Bunyi ---------- */
  const bip = useCallback((ok: boolean) => {
    if (!suaraRef.current) return;
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return;
      if (!audioRef.current) audioRef.current = new Ctx();
      const ctx = audioRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = ok ? 1000 : 300;
      gain.gain.value = 0.08;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + (ok ? 0.12 : 0.3));
    } catch {
      // bunyi tidak wajib
    }
  }, []);

  /* ---------- Proses satu kode ---------- */
  const tambahLog = (c: Omit<Catatan, 'key' | 'waktu'>) =>
    setLog((prev) =>
      [{ ...c, key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, waktu: new Date() }, ...prev].slice(
        0,
        MAX_LOG,
      ),
    );

  const prosesKode = useCallback(
    async (raw: string) => {
      const kode = raw.trim();
      if (!kode) return;

      const now = Date.now();
      if (recent.current[kode] && now - recent.current[kode] < DEBOUNCE_MS) return;
      recent.current[kode] = now;

      const statusBaru = modeRef.current;
      setSibuk((n) => n + 1);

      try {
        const { data, error } = await supabase.from('eksemplar').select(COLUMNS).eq('kode', kode).limit(1);
        if (error) throw error;
        if (!mounted.current) return;

        const row: any = data?.[0];
        if (!row) {
          tambahLog({ jenis: 'tidak-ada', kode, pesan: 'Kode ini tidak terdaftar di data eksemplar.' });
          bip(false);
          return;
        }

        const b = Array.isArray(row.biblio) ? row.biblio[0] : row.biblio;
        const dasar = {
          id: row.id as string,
          kode: (row.kode as string) ?? kode,
          judul: b?.judul ?? '-',
          penulis: b?.penulis ?? '',
          nomorPanggil: row.nomor_panggil ?? '',
          lokasiRak: row.lokasi_rak ?? '',
        };
        const lama = String(row.status_audit ?? '').trim();

        if (lama && lama === statusBaru) {
          tambahLog({ ...dasar, jenis: 'duplikat', statusAudit: lama, pesan: 'Eksemplar ini sudah diaudit sebelumnya.' });
          bip(false);
          return;
        }

        const { error: upErr } = await supabase
          .from('eksemplar')
          .update({ status_audit: statusBaru })
          .eq('id', row.id);
        if (upErr) throw upErr;
        if (!mounted.current) return;

        tambahLog({
          ...dasar,
          jenis: lama ? 'diperbarui' : 'baru',
          statusAudit: statusBaru,
          sebelumnya: lama,
          pesan: lama ? `Status diubah dari "${rapikan(lama)}".` : undefined,
        });
        bip(true);
      } catch (err: any) {
        if (!mounted.current) return;
        // izinkan dipindai ulang segera setelah gagal
        delete recent.current[kode];
        tambahLog({ jenis: 'gagal', kode, pesan: err?.message || 'Gagal menyimpan hasil audit.' });
        bip(false);
      } finally {
        if (mounted.current) setSibuk((n) => Math.max(0, n - 1));
      }
    },
    [bip],
  );

  useEffect(() => {
    prosesRef.current = prosesKode;
  }, [prosesKode]);

  /* ---------- Kirim dari input / scanner USB ---------- */
  const kirim = (e: React.FormEvent) => {
    e.preventDefault();
    const kode = kodeInput;
    setKodeInput('');
    prosesKode(kode);
    fokus();
  };

  /* ---------- Auto Enter: kirim otomatis saat ketikan berhenti ---------- */
  useEffect(() => {
    if (!autoEnter) return;
    const kode = kodeInput.trim();
    if (kode.length < AUTO_ENTER_MIN_LEN) return;

    const t = setTimeout(() => {
      setKodeInput('');
      prosesKode(kode);
      fokus();
    }, AUTO_ENTER_MS);

    // Ada ketikan baru (atau Enter ditekan): hitung ulang jedanya
    return () => clearTimeout(t);
  }, [autoEnter, kodeInput, prosesKode, fokus]);

  /* ---------- Urungkan ---------- */
  const urungkan = async (c: Catatan) => {
    if (!c.id || c.dibatalkan) return;
    try {
      const { error } = await supabase
        .from('eksemplar')
        .update({ status_audit: c.sebelumnya ? c.sebelumnya : null })
        .eq('id', c.id);
      if (error) throw error;
      if (!mounted.current) return;
      delete recent.current[c.kode];
      setLog((prev) => prev.map((x) => (x.key === c.key ? { ...x, dibatalkan: true } : x)));
    } catch (err: any) {
      if (mounted.current) {
        setLog((prev) =>
          prev.map((x) => (x.key === c.key ? { ...x, pesan: err?.message || 'Gagal mengurungkan.' } : x)),
        );
      }
    }
  };

  /* ---------- Kamera ---------- */
  useEffect(() => {
    if (!cameraOn) return;

    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setInterval> | undefined;
    let batal = false;

    (async () => {
      try {
        const BD = (window as any).BarcodeDetector;
        if (!BD) {
          setCamError(
            'Browser ini belum mendukung pemindaian kamera. Gunakan Chrome di Android/desktop, atau pakai scanner barcode / ketik kode manual.',
          );
          setCameraOn(false);
          return;
        }
        if (!navigator.mediaDevices?.getUserMedia) {
          setCamError('Kamera tidak tersedia. Pastikan halaman dibuka lewat HTTPS.');
          setCameraOn(false);
          return;
        }

        const detector = new BD({ formats: ['code_128', 'code_39', 'ean_13', 'qr_code'] });
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        if (batal) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        const v = videoRef.current;
        if (!v) return;
        v.srcObject = stream;
        await v.play();

        timer = setInterval(async () => {
          if (v.readyState < 2) return;
          try {
            const hasil = await detector.detect(v);
            if (hasil?.[0]?.rawValue) prosesRef.current(hasil[0].rawValue);
          } catch {
            // frame gagal dibaca: lewati
          }
        }, 300);
      } catch (err: any) {
        if (batal) return;
        setCamError(
          err?.name === 'NotAllowedError'
            ? 'Izin kamera ditolak. Aktifkan izin kamera di pengaturan browser.'
            : 'Kamera tidak bisa dibuka.',
        );
        setCameraOn(false);
      }
    })();

    return () => {
      batal = true;
      if (timer) clearInterval(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [cameraOn]);

  const toggleKamera = () => {
    setCamError(null);
    setCameraOn((v) => !v);
  };

  /* ---------- Turunan ---------- */
  const aktif = log.filter((c) => !c.dibatalkan);
  const jumlahTercatat = aktif.filter((c) => c.jenis === 'baru' || c.jenis === 'diperbarui').length;
  const jumlahDuplikat = aktif.filter((c) => c.jenis === 'duplikat').length;
  const jumlahBermasalah = aktif.filter((c) => c.jenis === 'tidak-ada' || c.jenis === 'gagal').length;
  const terakhir = log[0];

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-slate-800 flex flex-col font-sans">
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        {/* Judul halaman */}
        <div>
          <h2 className="text-xl font-black text-white tracking-tight [text-shadow:0_1px_3px_rgba(0,0,0,0.35)]">
            {TITLE}
          </h2>
          <p className="text-xs text-white font-medium [text-shadow:0_1px_2px_rgba(0,0,0,0.35)]">{SUBTITLE}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ===== KIRI: pemindai ===== */}
          <div className={`${CARD} rounded-2xl overflow-hidden lg:col-span-5 min-w-0`}>
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Pemindai</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Pilih status, lalu pindai barcode</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSuara((v) => !v)}
                  aria-pressed={suara}
                  aria-label={suara ? 'Matikan suara' : 'Nyalakan suara'}
                  className={`${tombolSekunder} ${tombolKecil}`}
                >
                  {suara ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
                  {suara ? 'Suara' : 'Senyap'}
                </button>
              </div>

              {/* Pilih status yang dicatat */}
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                  Status yang dicatat
                </p>
                <div role="group" aria-label="Status audit" className="grid grid-cols-3 gap-2">
                  {STATUS_OPTIONS.map((o) => {
                    const active = mode === o.value;
                    return (
                      <button
                        key={o.value}
                        type="button"
                        onClick={() => {
                          setMode(o.value);
                          fokus();
                        }}
                        aria-pressed={active}
                        className={`px-2 py-2 rounded-lg border text-[11px] font-extrabold uppercase tracking-wider transition-colors cursor-pointer ${
                          active ? o.aktif : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {o.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Auto Enter */}
              <div
                className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
                  autoEnter ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="min-w-0">
                  <p className="text-[11px] font-black text-slate-900 uppercase tracking-wider">Auto Enter</p>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {autoEnter
                      ? 'Kode dikirim otomatis saat ketikan berhenti.'
                      : 'Nyalakan jika scanner tidak mengirim Enter.'}
                  </p>
                </div>
                <Switch checked={autoEnter} onChange={ubahAutoEnter} label="Auto Enter" />
              </div>

              {/* Input kode */}
              <form onSubmit={kirim}>
                <label htmlFor="kode-scan" className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                  Kode eksemplar
                </label>
                <div className="relative mt-1.5">
                  <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-600 pointer-events-none" />
                  <input
                    id="kode-scan"
                    ref={inputRef}
                    type="text"
                    value={kodeInput}
                    onChange={(e) => setKodeInput(e.target.value)}
                    placeholder={
                      autoEnter ? 'Tembak barcode, terkirim otomatis' : 'Tembak barcode atau ketik kode, lalu Enter'
                    }
                    autoComplete="off"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                    enterKeyHint="send"
                    className="block w-full pl-9 pr-3 py-3 text-base sm:text-sm font-bold tracking-wider bg-blue-50 border border-blue-100 rounded-xl text-slate-900 placeholder-slate-500 placeholder:font-medium placeholder:tracking-normal focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition-colors"
                  />
                </div>
                {autoEnter && (
                  <p className="mt-1.5 text-[11px] text-amber-700 font-medium">
                    Saat Auto Enter menyala, mengetik manual dengan jeda lebih dari {AUTO_ENTER_MS / 1000} detik akan
                    terkirim sebelum selesai.
                  </p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button type="submit" disabled={!kodeInput.trim()} className={tombolUtama}>
                    <ScanLine className="w-3.5 h-3.5" />
                    Catat
                  </button>
                  <button
                    type="button"
                    onClick={toggleKamera}
                    aria-pressed={cameraOn}
                    className={tombolSekunder}
                  >
                    {cameraOn ? <CameraOff className="w-3.5 h-3.5" /> : <Camera className="w-3.5 h-3.5" />}
                    {cameraOn ? 'Tutup Kamera' : 'Kamera'}
                  </button>
                </div>
              </form>

              {camError && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-medium text-red-700"
                >
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{camError}</span>
                </div>
              )}

              {cameraOn && (
                <div className="relative overflow-hidden rounded-xl border border-slate-300 bg-black aspect-[4/3]">
                  <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
                  <div className="pointer-events-none absolute inset-x-6 top-1/2 h-0.5 -translate-y-1/2 bg-red-500/80 shadow-[0_0_8px_rgba(239,68,68,0.9)]" />
                </div>
              )}
            </div>
          </div>

          {/* ===== KANAN: hasil & riwayat ===== */}
          <div className="lg:col-span-7 min-w-0 space-y-6">
            {/* Hasil terakhir */}
            <div
              role="status"
              aria-live="polite"
              className={`rounded-2xl border-2 p-5 shadow-sm ${
                terakhir ? JENIS_INFO[terakhir.jenis].panel : 'bg-white border-slate-200'
              }`}
            >
              {!terakhir ? (
                <div className="py-6 flex flex-col items-center text-center gap-3">
                  <div className={`w-12 h-12 ${BADGE} rounded-xl flex items-center justify-center`}>
                    <ScanLine className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900">Siap memindai</p>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                      Hasil pindaian terakhir akan tampil di sini.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-4">
                  <div
                    className={`w-12 h-12 shrink-0 rounded-xl border flex items-center justify-center ${JENIS_INFO[terakhir.jenis].kelas}`}
                  >
                    <IkonJenis jenis={terakhir.jenis} className="w-6 h-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-[10px] font-black border rounded-md px-2 py-1 tracking-wider uppercase ${JENIS_INFO[terakhir.jenis].kelas}`}
                      >
                        {terakhir.dibatalkan ? 'Dibatalkan' : JENIS_INFO[terakhir.jenis].label}
                      </span>
                      {terakhir.statusAudit && (
                        <span className="text-[10px] font-black text-slate-700 bg-white border border-slate-200 rounded-md px-2 py-1 tracking-wider uppercase">
                          {rapikan(terakhir.statusAudit)}
                        </span>
                      )}
                      {sibuk > 0 && <span className="text-[11px] text-slate-500 font-medium">Memproses...</span>}
                    </div>
                    <p className="mt-2 text-lg font-black text-slate-900 tracking-widest break-all">{terakhir.kode}</p>
                    {terakhir.judul && (
                      <p className="text-sm font-black text-slate-900 leading-snug">{terakhir.judul}</p>
                    )}
                    {(terakhir.penulis || terakhir.nomorPanggil || terakhir.lokasiRak) && (
                      <p className="text-[11px] text-slate-600 font-medium">
                        {[
                          terakhir.penulis,
                          terakhir.nomorPanggil && `No. panggil ${terakhir.nomorPanggil}`,
                          terakhir.lokasiRak && `Rak ${terakhir.lokasiRak}`,
                        ]
                          .filter(Boolean)
                          .join(' • ')}
                      </p>
                    )}
                    {terakhir.pesan && (
                      <p className="mt-1 text-[11px] text-slate-700 font-semibold">{terakhir.pesan}</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Riwayat sesi */}
            <div className={`${CARD} rounded-2xl overflow-hidden`}>
              <div className="p-5 space-y-4 border-b border-slate-200">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Riwayat Sesi</h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Hanya pindaian sejak halaman ini dibuka • terbaru di atas
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <StatCard label="Tercatat" value={jumlahTercatat} kelas="bg-emerald-50 text-emerald-700 border-emerald-200" />
                  <StatCard label="Duplikat" value={jumlahDuplikat} kelas="bg-amber-50 text-amber-700 border-amber-200" />
                  <StatCard label="Bermasalah" value={jumlahBermasalah} kelas="bg-red-50 text-red-700 border-red-200" />
                </div>
              </div>

              <div className="divide-y divide-slate-200 max-h-[50vh] overflow-y-auto">
                {log.length === 0 ? (
                  <div className="px-5 py-12 flex flex-col items-center text-center gap-3">
                    <div className={`w-12 h-12 ${BADGE} rounded-xl flex items-center justify-center`}>
                      <Inbox className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900">Belum ada pindaian</p>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                        Hasil audit hari ini bisa dilihat di halaman Hasil Audit.
                      </p>
                    </div>
                  </div>
                ) : (
                  log.map((c) => {
                    const bisaUrung = !!c.id && (c.jenis === 'baru' || c.jenis === 'diperbarui') && !c.dibatalkan;
                    return (
                      <div
                        key={c.key}
                        className={`flex items-center gap-3 px-5 py-3 ${c.dibatalkan ? 'opacity-50' : ''}`}
                      >
                        <IkonJenis
                          jenis={c.jenis}
                          className={`w-4 h-4 shrink-0 ${
                            c.jenis === 'baru' || c.jenis === 'diperbarui'
                              ? 'text-emerald-600'
                              : c.jenis === 'duplikat'
                                ? 'text-amber-600'
                                : 'text-red-600'
                          }`}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-black text-slate-900 truncate">{c.judul || c.kode}</p>
                          <p className="text-[11px] text-slate-500 font-medium truncate">
                            {c.kode} • {jam(c.waktu)}
                            {c.pesan ? ` • ${c.pesan}` : ''}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 text-[10px] font-black border rounded-md px-2 py-1 tracking-wider uppercase ${JENIS_INFO[c.jenis].kelas}`}
                        >
                          {c.dibatalkan
                            ? 'Dibatalkan'
                            : c.statusAudit
                              ? rapikan(c.statusAudit)
                              : JENIS_INFO[c.jenis].label}
                        </span>
                        {bisaUrung && (
                          <button
                            type="button"
                            onClick={() => urungkan(c)}
                            aria-label={`Urungkan ${c.kode}`}
                            className={`${tombolSekunder} ${tombolKecil}`}
                          >
                            <Undo2 className="w-3 h-3" />
                            Urungkan
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}