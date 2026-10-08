import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import KaryaAksi from '../components/karya-aksi';
import GambarKarya from '../components/gambar-karya';
import IsiKarya from '../components/isi-karya';
import JsonLd from '../components/json-ld';
import {
  SITE_NAME,
  SITE_URL,
  dekode,
  formatTanggal,
  getKaryaBySegmen,
  getKaryaList,
  getKaryaTerkait,
  hrefKarya,
  ringkas,
  segmenKarya,
} from '../data';

export const revalidate = 300;

type Props = { params: Promise<{ slug: string }> };

// Bangun semua halaman karya lebih dulu agar klik terasa instan
export async function generateStaticParams() {
  const { items } = await getKaryaList();
  return items.map((k) => ({ slug: segmenKarya(k) }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const karya = await getKaryaBySegmen(dekode(slug));

  if (!karya) {
    return { title: 'Karya tidak ditemukan', robots: { index: false, follow: false } };
  }

  const penulis = karya.penulis || 'Anonim';
  const deskripsi = ringkas(karya.isi, 160);
  const path = hrefKarya(karya);
  const gambar = karya.foto_url ? [{ url: karya.foto_url, alt: karya.judul }] : undefined;

  return {
    title: karya.judul,
    description: deskripsi,
    authors: [{ name: penulis }],
    alternates: { canonical: path },
    openGraph: {
      type: 'article',
      locale: 'id_ID',
      siteName: SITE_NAME,
      title: karya.judul,
      description: deskripsi,
      url: path,
      publishedTime: karya.dibuat_pada,
      authors: [penulis],
      section: karya.kategori,
      images: gambar,
    },
    twitter: {
      card: gambar ? 'summary_large_image' : 'summary',
      title: karya.judul,
      description: deskripsi,
      images: karya.foto_url ? [karya.foto_url] : undefined,
    },
  };
}

export default async function DetailKaryaPage({ params }: Props) {
  const { slug } = await params;
  const segmen = dekode(slug);
  const karya = await getKaryaBySegmen(segmen);
  if (!karya) notFound();

  // Alamat lewat ID dialihkan permanen ke alamat slug agar tidak ada duplikat di mesin pencari
  if (karya.slug && segmen !== karya.slug) permanentRedirect(hrefKarya(karya));

  const terkait = await getKaryaTerkait(karya.kategori, karya.id);
  const penulis = karya.penulis || 'Anonim';
  const url = `${SITE_URL}${hrefKarya(karya)}`;
  // Puisi dan sejenisnya lebih rapi rata kiri karena baris dan baitnya disengaja
  const rataKiri = /puisi|sajak|syair|pantun|lirik/i.test(karya.kategori);

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: karya.judul,
      description: ringkas(karya.isi, 160),
      inLanguage: 'id-ID',
      datePublished: karya.dibuat_pada,
      dateModified: karya.dibuat_pada,
      articleSection: karya.kategori,
      wordCount: karya.isi.split(/\s+/).filter(Boolean).length,
      mainEntityOfPage: { '@type': 'WebPage', '@id': url },
      author: { '@type': 'Person', name: penulis },
      publisher: {
        '@type': 'Organization',
        name: SITE_NAME,
        logo: { '@type': 'ImageObject', url: `${SITE_URL}/logo.png` },
      },
      ...(karya.foto_url ? { image: [karya.foto_url] } : {}),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Beranda', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: 'Karya Tulis', item: `${SITE_URL}/karya-tulis` },
        { '@type': 'ListItem', position: 3, name: karya.judul, item: url },
      ],
    },
  ];

  return (
    <>
      <JsonLd data={jsonLd} />

      <div className="mx-auto w-full max-w-3xl px-4 pb-8 pt-24 sm:px-6 sm:pb-12 sm:pt-28">
        <nav aria-label="Breadcrumb" className="mb-6 text-xs sm:text-sm text-slate-500">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link href="/" className="hover:text-blue-700 transition-colors">
                Beranda
              </Link>
            </li>
            <ChevronRight className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
            <li>
              <Link href="/karya-tulis" className="hover:text-blue-700 transition-colors">
                Karya Tulis
              </Link>
            </li>
            <ChevronRight className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
            <li aria-current="page" className="max-w-[16rem] truncate font-medium text-slate-700">
              {karya.judul}
            </li>
          </ol>
        </nav>

        <article
          lang="id"
          className="overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-sm shadow-blue-900/5"
        >
          {karya.foto_url && (
            <figure className="bg-blue-50">
              <GambarKarya
                src={karya.foto_url}
                alt={karya.judul}
                prioritas
                className="mx-auto h-auto max-h-[560px] w-full object-contain"
              />
            </figure>
          )}

          <div className="px-5 py-8 sm:px-10 sm:py-10">
            <header>
              <span className="inline-block rounded-md bg-blue-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-blue-700">
                {karya.kategori}
              </span>

              <h1 className="mt-3 text-2xl font-bold leading-tight tracking-tight text-slate-900 [text-wrap:balance] sm:text-4xl">
                {karya.judul}
              </h1>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-y border-blue-100 py-4">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700"
                    aria-hidden="true"
                  >
                    {penulis.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{penulis}</p>
                    <time dateTime={karya.dibuat_pada} className="text-xs text-slate-500">
                      {formatTanggal(karya.dibuat_pada, 'panjang')}
                    </time>
                  </div>
                </div>

                <KaryaAksi judul={karya.judul} path={hrefKarya(karya)} />
              </div>
            </header>

            <div className="mt-8">
              <IsiKarya isi={karya.isi} rataKiri={rataKiri} />
            </div>
          </div>
        </article>

        <div className="mt-8 flex justify-start">
          <Link
            href="/karya-tulis"
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            Semua karya
          </Link>
        </div>

        {terkait.length > 0 && (
          <section aria-labelledby="judul-terkait" className="mt-12">
            <h2 id="judul-terkait" className="mb-4 text-lg font-bold tracking-tight text-slate-900">
              Karya {karya.kategori} lainnya
            </h2>
            <ul className="grid gap-3 sm:grid-cols-3">
              {terkait.map((t) => (
                <li key={t.id}>
                  <Link
                    href={hrefKarya(t)}
                    className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-900/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-slate-900 transition-colors group-hover:text-blue-700">
                      {t.judul}
                    </h3>
                    <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-slate-600">
                      {ringkas(t.isi, 140)}
                    </p>
                    <span className="mt-3 text-xs font-medium text-slate-500">{t.penulis || 'Anonim'}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  );
}