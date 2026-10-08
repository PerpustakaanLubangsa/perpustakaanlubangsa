import type { Metadata } from 'next';
import { Feather } from 'lucide-react';
import KaryaList from './components/karya-list';
import JsonLd from './components/json-ld';
import { SITE_NAME, SITE_URL, getKaryaList, hrefKarya, keRingkas } from './data';

// ISR: halaman dibangun ulang di server paling lama tiap 5 menit
export const revalidate = 300;

const TITLE = 'Karya Tulis Anggota';
const DESCRIPTION =
  'Kumpulan karya tulis anggota Perpustakaan Lubangsa: esai, puisi, cerita, dan gagasan yang bisa dibaca siapa saja.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/karya-tulis' },
  openGraph: {
    type: 'website',
    locale: 'id_ID',
    siteName: SITE_NAME,
    title: `${TITLE} | ${SITE_NAME}`,
    description: DESCRIPTION,
    url: '/karya-tulis',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${TITLE} | ${SITE_NAME}`,
    description: DESCRIPTION,
  },
};

export default async function KaryaTulisPage() {
  const { items, gagal } = await getKaryaList();
  const daftar = items.map(keRingkas);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: TITLE,
    description: DESCRIPTION,
    inLanguage: 'id-ID',
    url: `${SITE_URL}/karya-tulis`,
    isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE_URL },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: items.length,
      itemListElement: items.slice(0, 20).map((k, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: `${SITE_URL}${hrefKarya(k)}`,
        name: k.judul,
      })),
    },
  };

  return (
    <>
      <JsonLd data={jsonLd} />

      <section className="w-full bg-gradient-to-b from-blue-600 to-blue-700 text-white">
        <div className="mx-auto max-w-5xl px-4 pb-16 pt-24 text-center sm:px-6 sm:pt-28">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
            <Feather className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight [text-wrap:balance] sm:text-4xl">
            Galeri Karya Tulis
          </h1>
          <p className="mt-2 text-sm text-blue-100 [text-wrap:balance] sm:text-base">
            Inspirasi dan gagasan dari anggota perpustakaan
          </p>
        </div>
      </section>

      <KaryaList karya={daftar} gagal={gagal} />
    </>
  );
}