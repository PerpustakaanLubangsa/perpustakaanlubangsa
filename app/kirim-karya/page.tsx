import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import FormKirimKarya from './components/form-kirim-karya';
import { tombolSekunder } from './components/gaya';
import { SITE_NAME } from '../karya-tulis/data';

const TITLE = 'Kirim Karya';
const DESCRIPTION =
  'Anggota Perpustakaan Lubangsa dapat mengirim esai, puisi, cerita, atau gagasan untuk ditampilkan di galeri karya tulis.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/kirim-karya' },
  openGraph: {
    type: 'website',
    locale: 'id_ID',
    siteName: SITE_NAME,
    title: `${TITLE} | ${SITE_NAME}`,
    description: DESCRIPTION,
    url: '/kirim-karya',
  },
};

export default function KirimKaryaPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-12 pt-24 sm:px-6 sm:pb-16 sm:pt-28">
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 [text-wrap:balance] sm:text-4xl">
          Kirim karya Anda
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600 sm:text-base">
          Halaman ini khusus anggota perpustakaan. Cari nama Anda di daftar anggota, lalu tulis karya Anda. Karya akan
          ditinjau petugas sebelum tampil di galeri.
        </p>
      </header>

      <FormKirimKarya />

      <div className="mt-8">
        <Link href="/karya-tulis" className={`${tombolSekunder} gap-1.5 !px-4 !py-2`}>
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Lihat galeri karya
        </Link>
      </div>
    </div>
  );
}