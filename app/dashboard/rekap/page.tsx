'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Search,
  UserCheck,
  UserMinus,
  UserX,
  Users,
} from 'lucide-react';

/* ───────────────────────── Types ───────────────────────── */

type Status = 'Hadir' | 'Izin' | 'Alpha';
type Tab = 'petugas' | 'riwayat';
type FilterStatus = 'Semua' | Status;

interface RekapRow {
  id: number;
  tanggal: string; // YYYY-MM-DD
  nama: string;
  hari: string;
  shift: string;
  status: Status;
}

interface PetugasSummary {
  key: string;
  nama: string;
  hadir: number;
  izin: number;
  alpha: number;
  total: number; // = hadir + izin + alpha
  persenHadir: number;
  persenIzin: number;
  persenAlpha: number;
}

/* ───────────────────────── Konstanta & helper ───────────────────────── */

const CARD = 'bg-white border border-slate-200 shadow-sm';

const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const PAGE_SIZE = 25;
const FETCH_SIZE = 1000; // batas default Supabase per permintaan

const pad = (n: number) => String(n).padStart(2, '0');

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Hitung persentase Hadir / Izin / Alpha dari jumlah ketiga keterangan.
 * Memakai metode sisa terbesar agar ketiganya selalu berjumlah tepat 100%.
 */
const hitungPersen = (hadir: number, izin: number, alpha: number): [number, number, number] => {
  const total = hadir + izin + alpha;
  if (total === 0) return [0, 0, 0];

  const raw = [hadir, izin, alpha].map((v) => (v * 100) / total);
  const hasil = raw.map(Math.floor);
  let sisa = 100 - hasil.reduce((a, b) => a + b, 0);

  const urutan = raw
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac);

  for (const { i } of urutan) {
    if (sisa <= 0) break;
    hasil[i]++;
    sisa--;
  }

  return [hasil[0], hasil[1], hasil[2]];
};

/** "2026-10-07" → "7 Okt 2026" (tanpa new Date, supaya tidak geser zona waktu) */
const formatTanggal = (t: string) => {
  const [y, m, d] = t.split('-').map(Number);
  return `${d} ${NAMA_BULAN[m - 1].substring(0, 3)} ${y}`;
};

const monthRange = (year: number, month: number) => {
  const start = `${year}-${pad(month + 1)}-01`;
  const ny = month === 11 ? year + 1 : year;
  const nm = month === 11 ? 0 : month + 1;
  const end = `${ny}-${pad(nm + 1)}-01`;
  return { start, end };
};

/** Gaya tombol timbul (kelas ditulis utuh agar terdeteksi Tailwind) */
const BTN_BASE =
  'flex items-center justify-center gap-1.5 rounded-xl border text-xs font-extrabold tracking-wide select-none cursor-pointer transition-all duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-50';

const BTN_IDLE =
  'bg-white text-blue-700 border-blue-300 shadow-[0_3px_0_0_#93c5fd] enabled:hover:translate-y-[3px] enabled:hover:bg-blue-50 enabled:hover:shadow-[0_0_0_0_#93c5fd] enabled:active:translate-y-[3px] enabled:active:shadow-[0_0_0_0_#93c5fd]';

const BTN_ACTIVE =
  'bg-blue-600 text-white border-blue-700 translate-y-[3px] shadow-[0_0_0_0_#1d4ed8]';

const BTN_SOLID =
  'bg-blue-600 text-white border-blue-700 shadow-[0_3px_0_0_#1d4ed8] enabled:hover:translate-y-[3px] enabled:hover:bg-blue-700 enabled:hover:shadow-[0_0_0_0_#1d4ed8] enabled:active:translate-y-[3px] enabled:active:shadow-[0_0_0_0_#1d4ed8]';

const STATUS_BADGE: Record<Status, string> = {
  Hadir: 'bg-blue-50 text-blue-700 border-blue-200',
  Izin: 'bg-amber-50 text-amber-700 border-amber-200',
  Alpha: 'bg-red-50 text-red-700 border-red-200',
};

const STATS_CONFIG: {
  key: 'total' | 'hadir' | 'izin' | 'alpha';
  title: string;
  icon: typeof Users;
  badge: string;
}[] = [
  { key: 'total', title: 'Total Absensi', icon: Users, badge: 'bg-blue-50 text-blue-600 border-blue-200' },
  { key: 'hadir', title: 'Hadir', icon: UserCheck, badge: 'bg-blue-50 text-blue-600 border-blue-200' },
  { key: 'izin', title: 'Izin', icon: UserMinus, badge: 'bg-amber-50 text-amber-600 border-amber-200' },
  { key: 'alpha', title: 'Alpha', icon: UserX, badge: 'bg-red-50 text-red-600 border-red-200' },
];

/* ───────────────────────── Helper ekspor Excel ───────────────────────── */

const XL = {
  primary: 'FF1D4ED8',
  white: 'FFFFFFFF',
  zebra: 'FFF8FAFC',
  border: 'FFCBD5E1',
  text: 'FF0F172A',
  muted: 'FF64748B',
  totalBg: 'FFDBEAFE',
};

const XL_STATUS: Record<Status, { bg: string; fg: string }> = {
  Hadir: { bg: 'FFDBEAFE', fg: 'FF1D4ED8' },
  Izin: { bg: 'FFFEF3C7', fg: 'FFB45309' },
  Alpha: { bg: 'FFFEE2E2', fg: 'FFB91C1C' },
};

const xlBorder = {
  top: { style: 'thin' as const, color: { argb: XL.border } },
  left: { style: 'thin' as const, color: { argb: XL.border } },
  bottom: { style: 'thin' as const, color: { argb: XL.border } },
  right: { style: 'thin' as const, color: { argb: XL.border } },
};

async function saveWorkbook(wb: { xlsx: { writeBuffer: () => Promise<ArrayBuffer> } }, filename: string) {
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ───────────────────────── Halaman ───────────────────────── */

export default function RekapPage() {
  const router = useRouter();

  const [authLoading, setAuthLoading] = useState(true);

  const today = useMemo(() => new Date(), []);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const [rows, setRows] = useState<RekapRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const [tab, setTab] = useState<Tab>('petugas');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('Semua');
  const [visible, setVisible] = useState(PAGE_SIZE);

  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();

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

  /* Ambil data satu bulan (dipecah per 1000 baris agar tidak terpotong) */
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { start, end } = monthRange(year, month);
    const all: RekapRow[] = [];

    for (let from = 0; ; from += FETCH_SIZE) {
      const { data, error: err } = await supabase
        .from('rekap_absensi')
        .select('id, tanggal, nama, hari, shift, status')
        .gte('tanggal', start)
        .lt('tanggal', end)
        .order('tanggal', { ascending: false })
        .order('id', { ascending: false })
        .range(from, from + FETCH_SIZE - 1);

      if (err) {
        setError('Gagal memuat rekapitulasi. Coba muat ulang halaman.');
        setRows([]);
        setLoading(false);
        return;
      }

      all.push(...((data ?? []) as RekapRow[]));
      if (!data || data.length < FETCH_SIZE) break;
    }

    setRows(all);
    setLoading(false);
  }, [year, month]);

  useEffect(() => {
    if (authLoading) return;
    loadData();
  }, [authLoading, loadData]);

  /* Reset paginasi saat filter berubah */
  useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [search, filterStatus, tab, year, month]);

  /* Navigasi bulan */
  const goPrev = () => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else setMonth((m) => m - 1);
  };
  const goNext = () => {
    if (isCurrentMonth) return;
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else setMonth((m) => m + 1);
  };
  const goNow = () => {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
  };

  /* Ringkasan keseluruhan: total = Hadir + Izin + Alpha */
  const totals = useMemo(() => {
    const t = { total: 0, hadir: 0, izin: 0, alpha: 0 };
    rows.forEach((r) => {
      if (r.status === 'Hadir') t.hadir++;
      else if (r.status === 'Izin') t.izin++;
      else if (r.status === 'Alpha') t.alpha++;
    });
    t.total = t.hadir + t.izin + t.alpha;
    return t;
  }, [rows]);

  const persenTotal = useMemo(() => {
    const [hadir, izin, alpha] = hitungPersen(totals.hadir, totals.izin, totals.alpha);
    return { hadir, izin, alpha };
  }, [totals]);

  /* Ringkasan per petugas: persentase dari jumlah Hadir + Izin + Alpha petugas itu sendiri */
  const petugas = useMemo<PetugasSummary[]>(() => {
    const map = new Map<string, PetugasSummary>();

    rows.forEach((r) => {
      const key = norm(r.nama);
      let p = map.get(key);
      if (!p) {
        p = {
          key,
          nama: r.nama,
          hadir: 0,
          izin: 0,
          alpha: 0,
          total: 0,
          persenHadir: 0,
          persenIzin: 0,
          persenAlpha: 0,
        };
        map.set(key, p);
      }
      if (r.status === 'Hadir') p.hadir++;
      else if (r.status === 'Izin') p.izin++;
      else if (r.status === 'Alpha') p.alpha++;
    });

    const list = Array.from(map.values());
    list.forEach((p) => {
      p.total = p.hadir + p.izin + p.alpha;
      const [ph, pi, pa] = hitungPersen(p.hadir, p.izin, p.alpha);
      p.persenHadir = ph;
      p.persenIzin = pi;
      p.persenAlpha = pa;
    });
    return list.sort((a, b) => a.nama.localeCompare(b.nama, 'id'));
  }, [rows]);

  const q = search.trim().toLowerCase();

  const petugasFiltered = useMemo(
    () => (q ? petugas.filter((p) => p.nama.toLowerCase().includes(q)) : petugas),
    [petugas, q]
  );

  const riwayatFiltered = useMemo(
    () =>
      rows.filter(
        (r) =>
          (filterStatus === 'Semua' || r.status === filterStatus) &&
          (!q || r.nama.toLowerCase().includes(q))
      ),
    [rows, filterStatus, q]
  );

  /* Ekspor Excel sesuai tab yang sedang dibuka */
  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);

    try {
      const ExcelJS = (await import('exceljs')).default;
      const wb = new ExcelJS.Workbook();
      wb.creator = 'Sistem Absensi Perpustakaan';
      wb.created = new Date();

      const periodeLabel = `${NAMA_BULAN[month]} ${year}`;
      const periodeFile = `${NAMA_BULAN[month]}-${year}`;
      const dicetak = new Date().toLocaleString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      const HEADER_ROW = 5;

      /** Judul + info periode di bagian atas sheet */
      const buildTitle = (
        ws: import('exceljs').Worksheet,
        title: string,
        colCount: number,
        filterInfo: string
      ) => {
        ws.mergeCells(1, 1, 1, colCount);
        const t = ws.getCell(1, 1);
        t.value = title;
        t.font = { name: 'Calibri', size: 16, bold: true, color: { argb: XL.primary } };
        t.alignment = { vertical: 'middle', horizontal: 'left' };
        ws.getRow(1).height = 28;

        ws.mergeCells(2, 1, 2, colCount);
        const p = ws.getCell(2, 1);
        p.value = `Periode: ${periodeLabel}`;
        p.font = { name: 'Calibri', size: 11, bold: true, color: { argb: XL.text } };

        ws.mergeCells(3, 1, 3, colCount);
        const i = ws.getCell(3, 1);
        i.value = `${filterInfo}Dicetak: ${dicetak}`;
        i.font = { name: 'Calibri', size: 10, italic: true, color: { argb: XL.muted } };
      };

      /** Baris header tabel */
      const buildHeader = (
        ws: import('exceljs').Worksheet,
        headers: string[],
        leftAlignedCols: number[]
      ) => {
        const row = ws.getRow(HEADER_ROW);
        headers.forEach((h, idx) => {
          const c = row.getCell(idx + 1);
          c.value = h;
          c.font = { name: 'Calibri', size: 11, bold: true, color: { argb: XL.white } };
          c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: XL.primary } };
          c.border = xlBorder;
          c.alignment = {
            vertical: 'middle',
            horizontal: leftAlignedCols.includes(idx + 1) ? 'left' : 'center',
            wrapText: true,
          };
        });
        row.height = 24;
      };

      const filterParts: string[] = [];
      if (q) filterParts.push(`Pencarian: "${search.trim()}"`);

      if (tab === 'petugas') {
        /* ───────── Sheet: Per Petugas ───────── */
        const ws = wb.addWorksheet('Per Petugas', {
          views: [{ state: 'frozen', ySplit: HEADER_ROW, showGridLines: false }],
          pageSetup: {
            orientation: 'landscape',
            paperSize: 9,
            fitToPage: true,
            fitToWidth: 1,
            fitToHeight: 0,
          },
        });

        const headers = [
          'No',
          'Nama Petugas',
          'Hadir',
          'Izin',
          'Alpha',
          'Total',
          '% Hadir',
          '% Izin',
          '% Alpha',
        ];
        ws.columns = [
          { width: 6 },
          { width: 34 },
          { width: 10 },
          { width: 10 },
          { width: 10 },
          { width: 10 },
          { width: 11 },
          { width: 11 },
          { width: 11 },
        ];

        buildTitle(
          ws,
          'Rekapitulasi Absensi Petugas Perpustakaan',
          headers.length,
          filterParts.length ? `${filterParts.join(' | ')}  •  ` : ''
        );
        buildHeader(ws, headers, [2]);

        const firstData = HEADER_ROW + 1;

        petugasFiltered.forEach((p, idx) => {
          const row = ws.getRow(firstData + idx);
          row.values = [
            idx + 1,
            p.nama,
            p.hadir,
            p.izin,
            p.alpha,
            p.total,
            p.persenHadir / 100,
            p.persenIzin / 100,
            p.persenAlpha / 100,
          ];

          row.eachCell({ includeEmpty: true }, (cell, col) => {
            if (col > headers.length) return;
            cell.border = xlBorder;
            cell.font = { name: 'Calibri', size: 11, color: { argb: XL.text } };
            cell.alignment = { vertical: 'middle', horizontal: col === 2 ? 'left' : 'center' };
            if (idx % 2 === 1) {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: XL.zebra } };
            }
          });

          row.getCell(2).font = { name: 'Calibri', size: 11, bold: true, color: { argb: XL.text } };

          // Hadir, Izin, Alpha (jumlah)
          row.getCell(3).font = { name: 'Calibri', size: 11, bold: true, color: { argb: XL_STATUS.Hadir.fg } };
          row.getCell(4).font = { name: 'Calibri', size: 11, bold: true, color: { argb: XL_STATUS.Izin.fg } };
          row.getCell(5).font = { name: 'Calibri', size: 11, bold: true, color: { argb: XL_STATUS.Alpha.fg } };

          // % Hadir, % Izin, % Alpha
          const pctCols: { col: number; fg: string }[] = [
            { col: 7, fg: XL_STATUS.Hadir.fg },
            { col: 8, fg: XL_STATUS.Izin.fg },
            { col: 9, fg: XL_STATUS.Alpha.fg },
          ];
          pctCols.forEach(({ col, fg }) => {
            const c = row.getCell(col);
            c.numFmt = '0%';
            c.font = { name: 'Calibri', size: 11, bold: true, color: { argb: fg } };
          });

          row.height = 20;
        });

        const lastData = firstData + petugasFiltered.length - 1;

        /* Baris total */
        const sum = petugasFiltered.reduce(
          (a, p) => ({
            hadir: a.hadir + p.hadir,
            izin: a.izin + p.izin,
            alpha: a.alpha + p.alpha,
          }),
          { hadir: 0, izin: 0, alpha: 0 }
        );
        const sumTotal = sum.hadir + sum.izin + sum.alpha;
        const [sumPh, sumPi, sumPa] = hitungPersen(sum.hadir, sum.izin, sum.alpha);

        const totalRowNo = lastData + 1;
        const totalRow = ws.getRow(totalRowNo);
        ws.mergeCells(totalRowNo, 1, totalRowNo, 2);
        totalRow.getCell(1).value = 'TOTAL';
        totalRow.getCell(3).value = { formula: `SUM(C${firstData}:C${lastData})`, result: sum.hadir };
        totalRow.getCell(4).value = { formula: `SUM(D${firstData}:D${lastData})`, result: sum.izin };
        totalRow.getCell(5).value = { formula: `SUM(E${firstData}:E${lastData})`, result: sum.alpha };
        totalRow.getCell(6).value = {
          formula: `SUM(C${totalRowNo}:E${totalRowNo})`,
          result: sumTotal,
        };
        totalRow.getCell(7).value = sumPh / 100;
        totalRow.getCell(8).value = sumPi / 100;
        totalRow.getCell(9).value = sumPa / 100;
        [7, 8, 9].forEach((c) => {
          totalRow.getCell(c).numFmt = '0%';
        });

        for (let col = 1; col <= headers.length; col++) {
          const cell = totalRow.getCell(col);
          cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: XL.primary } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: XL.totalBg } };
          cell.border = {
            ...xlBorder,
            top: { style: 'medium', color: { argb: XL.primary } },
          };
          cell.alignment = { vertical: 'middle', horizontal: col === 1 ? 'left' : 'center' };
        }
        totalRow.height = 22;

        ws.autoFilter = {
          from: { row: HEADER_ROW, column: 1 },
          to: { row: HEADER_ROW, column: headers.length },
        };
        ws.pageSetup.printTitlesRow = `${HEADER_ROW}:${HEADER_ROW}`;

        await saveWorkbook(wb, `rekap-petugas-${periodeFile}.xlsx`);
      } else {
        /* ───────── Sheet: Riwayat Harian ───────── */
        const ws = wb.addWorksheet('Riwayat Harian', {
          views: [{ state: 'frozen', ySplit: HEADER_ROW, showGridLines: false }],
          pageSetup: {
            orientation: 'portrait',
            paperSize: 9,
            fitToPage: true,
            fitToWidth: 1,
            fitToHeight: 0,
          },
        });

        const headers = ['No', 'Tanggal', 'Hari', 'Shift', 'Nama Petugas', 'Status'];
        ws.columns = [
          { width: 6 },
          { width: 14 },
          { width: 12 },
          { width: 14 },
          { width: 34 },
          { width: 12 },
        ];

        if (filterStatus !== 'Semua') filterParts.push(`Status: ${filterStatus}`);

        buildTitle(
          ws,
          'Riwayat Harian Absensi Petugas Perpustakaan',
          headers.length,
          filterParts.length ? `${filterParts.join(' | ')}  •  ` : ''
        );
        buildHeader(ws, headers, [5]);

        const firstData = HEADER_ROW + 1;

        riwayatFiltered.forEach((r, idx) => {
          const [y, m, d] = r.tanggal.split('-').map(Number);
          const row = ws.getRow(firstData + idx);
          // Date UTC agar tanggal di Excel tidak bergeser karena zona waktu
          row.values = [idx + 1, new Date(Date.UTC(y, m - 1, d)), r.hari, r.shift, r.nama, r.status];

          row.eachCell({ includeEmpty: true }, (cell, col) => {
            if (col > headers.length) return;
            cell.border = xlBorder;
            cell.font = { name: 'Calibri', size: 11, color: { argb: XL.text } };
            cell.alignment = { vertical: 'middle', horizontal: col === 5 ? 'left' : 'center' };
            if (idx % 2 === 1) {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: XL.zebra } };
            }
          });

          row.getCell(2).numFmt = 'dd mmm yyyy';
          row.getCell(5).font = { name: 'Calibri', size: 11, bold: true, color: { argb: XL.text } };

          const st = XL_STATUS[r.status];
          if (st) {
            const sc = row.getCell(6);
            sc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: st.bg } };
            sc.font = { name: 'Calibri', size: 11, bold: true, color: { argb: st.fg } };
          }
          row.height = 20;
        });

        ws.autoFilter = {
          from: { row: HEADER_ROW, column: 1 },
          to: { row: HEADER_ROW, column: headers.length },
        };
        ws.pageSetup.printTitlesRow = `${HEADER_ROW}:${HEADER_ROW}`;

        await saveWorkbook(wb, `rekap-riwayat-${periodeFile}.xlsx`);
      }
    } catch {
      setError('Gagal mengekspor file Excel. Silakan coba lagi.');
    } finally {
      setExporting(false);
    }
  };

  /* ───────────────────────── Render ───────────────────────── */

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const exportDisabled =
    loading ||
    exporting ||
    (tab === 'petugas' ? petugasFiltered.length === 0 : riwayatFiltered.length === 0);

  return (
    <div className="min-h-screen text-slate-800 flex flex-col font-sans">
      <main className="flex-1 p-6 max-w-6xl w-full mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-white tracking-tight [text-shadow:0_1px_3px_rgba(0,0,0,0.35)]">
              Rekapitulasi Absensi
            </h2>
            <p className="text-xs text-white font-medium [text-shadow:0_1px_2px_rgba(0,0,0,0.35)]">
              Ringkasan kehadiran petugas perpustakaan per bulan.
            </p>
          </div>

          {/* Pemilih bulan */}
          <div className="flex items-center gap-2 pb-[3px]">
            <button
              type="button"
              onClick={goPrev}
              aria-label="Bulan sebelumnya"
              className={`${BTN_BASE} ${BTN_IDLE} w-9 h-9`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1.5 h-9 px-3 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-800 uppercase tracking-wider min-w-[150px] justify-center">
              <CalendarDays className="w-3.5 h-3.5 text-blue-600" />
              {NAMA_BULAN[month]} {year}
            </div>

            <button
              type="button"
              onClick={goNext}
              disabled={isCurrentMonth}
              aria-label="Bulan berikutnya"
              className={`${BTN_BASE} ${BTN_IDLE} w-9 h-9`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={goNow}
              disabled={isCurrentMonth}
              className={`${BTN_BASE} ${BTN_SOLID} h-9 px-3 uppercase`}
            >
              Bulan Ini
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-700">
            {error}
          </div>
        )}

        {/* Kartu statistik */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {STATS_CONFIG.map((s) => (
            <div key={s.key} className={`${CARD} p-5 rounded-2xl flex items-start justify-between`}>
              <div className="space-y-1">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                  {s.title}
                </span>
                <span className="text-2xl font-black text-slate-900 tracking-tight block">
                  {loading ? '–' : totals[s.key]}
                </span>
                <span className="text-[10px] text-slate-500 font-medium block">
                  {s.key === 'total'
                    ? `Kehadiran ${loading ? '–' : persenTotal.hadir}%`
                    : `${loading ? 0 : persenTotal[s.key]}% dari total`}
                </span>
              </div>
              <div
                className={`w-10 h-10 border rounded-xl flex items-center justify-center shrink-0 ${s.badge}`}
              >
                <s.icon className="w-5 h-5" />
              </div>
            </div>
          ))}
        </div>

        {/* Panel utama */}
        <div className={`${CARD} rounded-2xl overflow-hidden`}>
          {/* Toolbar */}
          <div className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200">
            <div className="flex items-center gap-2 pb-[3px]">
              <button
                type="button"
                onClick={() => setTab('petugas')}
                aria-pressed={tab === 'petugas'}
                className={`${BTN_BASE} h-9 px-3 uppercase ${tab === 'petugas' ? BTN_ACTIVE : BTN_IDLE}`}
              >
                Per Petugas
              </button>
              <button
                type="button"
                onClick={() => setTab('riwayat')}
                aria-pressed={tab === 'riwayat'}
                className={`${BTN_BASE} h-9 px-3 uppercase ${tab === 'riwayat' ? BTN_ACTIVE : BTN_IDLE}`}
              >
                Riwayat Harian
              </button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3 pb-[3px]">
              <div className="relative flex items-center">
                <Search className="absolute left-3 w-3 h-3 text-blue-400 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari nama petugas..."
                  aria-label="Cari nama petugas"
                  className="w-full sm:w-56 h-9 pl-8 pr-3 bg-white border border-blue-100 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 text-xs font-medium rounded-xl text-slate-800 placeholder-slate-400 outline-none transition-colors"
                />
              </div>

              <button
                type="button"
                onClick={handleExport}
                disabled={exportDisabled}
                className={`${BTN_BASE} ${BTN_SOLID} h-9 px-3 uppercase`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                {exporting ? 'Mengekspor...' : 'Ekspor Excel'}
              </button>
            </div>
          </div>

          {/* Filter status (hanya untuk riwayat) */}
          {tab === 'riwayat' && (
            <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center gap-2 pb-[15px]">
              {(['Semua', 'Hadir', 'Izin', 'Alpha'] as FilterStatus[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilterStatus(f)}
                  aria-pressed={filterStatus === f}
                  className={`${BTN_BASE} h-8 px-3 ${filterStatus === f ? BTN_ACTIVE : BTN_IDLE}`}
                >
                  {f}
                </button>
              ))}
            </div>
          )}

          {/* Isi */}
          {loading ? (
            <div className="p-12 flex justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
            </div>
          ) : rows.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500 font-medium">
              Belum ada data absensi pada {NAMA_BULAN[month]} {year}.
            </div>
          ) : tab === 'petugas' ? (
            petugasFiltered.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500 font-medium">
                Petugas tidak ditemukan.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                      <th className="px-5 py-3">Petugas</th>
                      <th className="px-3 py-3 text-center">Hadir</th>
                      <th className="px-3 py-3 text-center">Izin</th>
                      <th className="px-3 py-3 text-center">Alpha</th>
                      <th className="px-3 py-3 text-center">Total</th>
                      <th className="px-5 py-3 min-w-[240px]">Persentase</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {petugasFiltered.map((p) => (
                      <tr key={p.key} className="hover:bg-blue-50 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-[11px] font-black text-white uppercase shrink-0">
                              {p.nama.substring(0, 2)}
                            </div>
                            <span className="text-xs font-black text-slate-900 truncate">
                              {p.nama}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center text-xs font-black text-blue-700">
                          {p.hadir}
                        </td>
                        <td className="px-3 py-3 text-center text-xs font-black text-amber-600">
                          {p.izin}
                        </td>
                        <td className="px-3 py-3 text-center text-xs font-black text-red-600">
                          {p.alpha}
                        </td>
                        <td className="px-3 py-3 text-center text-xs font-black text-slate-800">
                          {p.total}
                        </td>
                        <td className="px-5 py-3">
                          <div className="space-y-1.5">
                            {/* Bar bertingkat: Hadir | Izin | Alpha, dihitung dari total ketiganya */}
                            <div
                              className="flex h-2 rounded-full bg-slate-100 overflow-hidden"
                              role="img"
                              aria-label={`Hadir ${p.persenHadir}%, Izin ${p.persenIzin}%, Alpha ${p.persenAlpha}%`}
                            >
                              <div className="h-full bg-blue-600" style={{ width: `${p.persenHadir}%` }} />
                              <div className="h-full bg-amber-500" style={{ width: `${p.persenIzin}%` }} />
                              <div className="h-full bg-red-500" style={{ width: `${p.persenAlpha}%` }} />
                            </div>
                            <div className="flex items-center gap-3 text-[11px] font-black">
                              <span className="text-blue-700">Hadir {p.persenHadir}%</span>
                              <span className="text-amber-600">Izin {p.persenIzin}%</span>
                              <span className="text-red-600">Alpha {p.persenAlpha}%</span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : riwayatFiltered.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500 font-medium">
              Tidak ada data yang cocok dengan filter.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                      <th className="px-5 py-3">Tanggal</th>
                      <th className="px-3 py-3">Hari</th>
                      <th className="px-3 py-3">Shift</th>
                      <th className="px-3 py-3">Petugas</th>
                      <th className="px-5 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {riwayatFiltered.slice(0, visible).map((r) => (
                      <tr key={r.id} className="hover:bg-blue-50 transition-colors">
                        <td className="px-5 py-3 text-xs font-bold text-slate-800 whitespace-nowrap">
                          {formatTanggal(r.tanggal)}
                        </td>
                        <td className="px-3 py-3 text-xs font-medium text-slate-600">{r.hari}</td>
                        <td className="px-3 py-3 text-xs font-medium text-slate-600">{r.shift}</td>
                        <td className="px-3 py-3 text-xs font-black text-slate-900">{r.nama}</td>
                        <td className="px-5 py-3">
                          <span
                            className={`inline-block text-[10px] font-bold px-2.5 py-1 rounded-md border uppercase tracking-wider ${
                              STATUS_BADGE[r.status] ?? 'bg-slate-50 text-slate-600 border-slate-200'
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 pb-[19px]">
                <span className="text-[11px] text-slate-500 font-medium">
                  Menampilkan {Math.min(visible, riwayatFiltered.length)} dari{' '}
                  {riwayatFiltered.length} data
                </span>
                {visible < riwayatFiltered.length && (
                  <button
                    type="button"
                    onClick={() => setVisible((v) => v + PAGE_SIZE)}
                    className={`${BTN_BASE} ${BTN_IDLE} h-9 px-4 uppercase`}
                  >
                    Tampilkan Lebih Banyak
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}