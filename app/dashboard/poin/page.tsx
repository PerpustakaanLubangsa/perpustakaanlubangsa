import type { Metadata } from 'next';
import FormPoin from './components/form-poin';

export const metadata: Metadata = { title: 'Poin Tambahan' };

export default function PoinTambahanPage() {
  return (
    <div className="mx-auto w-full max-w-2xl p-4 sm:p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-white">Poin Tambahan</h1>
        <p className="mt-1 text-sm leading-relaxed text-slate-300">
          Cari anggota, tentukan jumlah poin, lalu beri keterangan. Setiap pengisian tercatat sebagai satu mutasi poin.
        </p>
      </header>
      <FormPoin />
    </div>
  );
}