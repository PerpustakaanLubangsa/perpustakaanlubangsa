import type { Metadata } from 'next';
import DashboardPengunjung from './components/dashboard-pengunjung';

export const metadata: Metadata = { title: 'Data Pengunjung' };

export default function DataPengunjungPage() {
  return (
    <div className="mx-auto w-full max-w-7xl p-4 sm:p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-white">Data Pengunjung</h1>
        <p className="mt-1 text-sm leading-relaxed text-slate-300">
          Statistik kunjungan perpustakaan dari tahun ke tahun. Klik batang atau baris pada grafik untuk melihat lebih
          rinci, sampai ke data mentah.
        </p>
      </header>
      <DashboardPengunjung />
    </div>
  );
}