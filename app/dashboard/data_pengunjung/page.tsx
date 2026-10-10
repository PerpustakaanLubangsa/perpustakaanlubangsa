import type { Metadata } from 'next';
import PenjelajahPengunjung from './components/penjelajah-pengunjung';

export const metadata: Metadata = { title: 'Data Pengunjung' };

export default function DataPengunjungPage() {
  return (
    <div className="mx-auto w-full max-w-6xl p-4 sm:p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-white">Data Pengunjung</h1>
        <p className="mt-1 text-sm leading-relaxed text-slate-300">
          Buka folder tahun, bulan, dan minggu sampai ke data mentah. Di setiap level Anda bisa menampilkan grafik,
          lalu mengunduhnya sebagai gambar atau Excel.
        </p>
      </header>
      <PenjelajahPengunjung />
    </div>
  );
}