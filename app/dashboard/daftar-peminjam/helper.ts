import { DAY_MS, FINE_PER_DAY, LOAN_DAYS, type Loan } from './konfigurasi';

export function toDate(value: unknown): Date | null {
  if (!value) return null;
  const s = String(value);
  // "YYYY-MM-DD" dibaca sebagai tanggal lokal agar tidak bergeser zona waktu
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  const d = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function toISODate(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function diffDays(a: Date, b: Date): number {
  return Math.round((startOfDay(a).getTime() - startOfDay(b).getTime()) / DAY_MS);
}

/** Tanggal terlambat jika tgl_pinjam <= hari ini - LOAN_DAYS */
export function lateCutoff(today: Date): string {
  return toISODate(addDays(today, -LOAN_DAYS));
}

/** Ubah satu baris sirkulasi menjadi data peminjam */
export function mapRow(row: any, today: Date): Loan | null {
  const tglPinjam = toDate(row.tgl_pinjam);
  if (!tglPinjam) return null;

  // Batas kembali = hari ke-5 (tgl pinjam + 4 hari)
  const jatuhTempo = addDays(tglPinjam, LOAN_DAYS - 1);
  const selisih = diffDays(today, jatuhTempo);
  const hariTerlambat = Math.max(0, selisih);

  return {
    id: row.id,
    nama: row.nama_anggota ?? '-',
    nis: row.nis ?? '-',
    kamar: row.kamar ?? '-',
    judul: row.judul_buku ?? '-',
    penulis: row.penulis ?? '',
    kode: row.kode_eksemplar ?? '-',
    tglPinjam,
    jatuhTempo,
    hariTerlambat,
    sisaHari: Math.max(0, -selisih),
    denda: hariTerlambat * FINE_PER_DAY,
  };
}

export function statusText(l: Loan): string {
  if (l.hariTerlambat > 0) return `Terlambat ${l.hariTerlambat} hari`;
  if (l.sisaHari === 0) return 'Batas hari ini';
  return `Sisa ${l.sisaHari} hari`;
}

export function initials(name: string): string {
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