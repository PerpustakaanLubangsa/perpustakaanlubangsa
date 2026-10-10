import type { Metadata } from 'next';
import DaftarPeminjam from './components/daftar-peminjam';

export const metadata: Metadata = { title: 'Daftar Peminjam' };

export default function DaftarPeminjamPage() {
  return <DaftarPeminjam />;
}