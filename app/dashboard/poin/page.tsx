import type { Metadata } from 'next';
import PoinTambahan from './components/poin-tambahan';

export const metadata: Metadata = { title: 'Poin Tambahan' };

export default function PoinTambahanPage() {
  return (
    <div className="mx-auto w-full max-w-6xl p-4 sm:p-5">
      <PoinTambahan />
    </div>
  );
}