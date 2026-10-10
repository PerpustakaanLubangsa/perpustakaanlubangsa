import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import {
  Accessibility,
  ArrowRight,
  BookOpen,
  CalendarDays,
  CircleCheck,
  ClipboardCheck,
  Clock,
  Code,
  Database,
  Download,
  Feather,
  FileText,
  Globe,
  Languages,
  Layers,
  Palette,
  PenLine,
  QrCode,
  Save,
  Search,
  ShieldCheck,
  Star,
  Tag,
  UserRound,
  Users,
  Zap,
  type LucideIcon,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Tentang Sistem',
  robots: { index: false, follow: false },
};

type Ikon = LucideIcon;

const panel = 'rounded-3xl border border-blue-100 bg-white shadow-sm shadow-blue-900/5';

const KEUNGGULAN: { ikon: Ikon; judul: string; isi: string }[] = [
  {
    ikon: Layers,
    judul: 'Arsitektur Modern',
    isi: 'Menggunakan kombinasi teknologi terbaru agar sistem selalu responsif dan bebas dari kendala sistem lama (legacy error).',
  },
  {
    ikon: ShieldCheck,
    judul: 'Keandalan Data',
    isi: 'Pengelolaan basis data yang presisi untuk memastikan data sirkulasi dan keanggotaan santri selalu akurat secara real-time.',
  },
];

const KONTRIBUTOR = [
  'Roni Firdaus',
  'Ainor Rosiki',
  'Achmed Sayfi',
  'Khairul Yaqin',
  'A. Mundzir AR',
  'Moh. Mosleh',
  'Muhammad Hady',
  'Ach. Khalid',
];

const TEKNOLOGI: { ikon: Ikon; nama: string; peran: string }[] = [
  {
    ikon: Globe,
    nama: 'Next.js',
    peran: 'Kerangka kerja web (App Router) untuk halaman yang cepat dan diolah di server.',
  },
  {
    ikon: Code,
    nama: 'React & TypeScript',
    peran: 'Antarmuka interaktif dengan pengetikan data yang ketat untuk mencegah galat.',
  },
  {
    ikon: Database,
    nama: 'Supabase (PostgreSQL)',
    peran: 'Basis data untuk data sirkulasi, keanggotaan santri, dan karya tulis.',
  },
  {
    ikon: Palette,
    nama: 'Tailwind CSS',
    peran: 'Gaya tampilan yang konsisten dan responsif di ponsel maupun desktop.',
  },
  {
    ikon: FileText,
    nama: 'React PDF',
    peran: 'Pembuatan berkas PDF karya tulis yang bisa diunduh pembaca.',
  },
];

const MODUL_PETUGAS: { ikon: Ikon; nama: string; isi: string }[] = [
  { ikon: QrCode, nama: 'Barcode', isi: 'Pembuatan dan pengelolaan barcode koleksi.' },
  { ikon: Tag, nama: 'Label', isi: 'Pencetakan label untuk koleksi perpustakaan.' },
  { ikon: Feather, nama: 'Karya', isi: 'Galeri karya tulis anggota di dalam dashboard.' },
  { ikon: ClipboardCheck, nama: 'Admin Karya', isi: 'Peninjauan, penyuntingan, dan persetujuan karya yang dikirim.' },
  { ikon: Star, nama: 'Poin Tambahan', isi: 'Pengelolaan poin tambahan untuk anggota.' },
  { ikon: Users, nama: 'Data Pengunjung', isi: 'Pencatatan dan rekap kunjungan ke perpustakaan.' },
  { ikon: BookOpen, nama: 'Peminjam', isi: 'Pengelolaan data peminjaman buku oleh santri.' },
];

const HALAMAN_PUBLIK: { ikon: Ikon; nama: string; rute: string; isi: string }[] = [
  { ikon: Search, nama: 'Pencarian Buku', rute: '/', isi: 'Cari koleksi buku perpustakaan.' },
  { ikon: Feather, nama: 'Karya Tulis', rute: '/karya-tulis', isi: 'Galeri esai, puisi, dan cerita anggota.' },
  { ikon: PenLine, nama: 'Kirim Karya', rute: '/kirim-karya', isi: 'Formulir untuk santri maupun non-santri.' },
];

// Gaya kartu fitur berwarna-warni dalam keluarga biru
const GAYA_FITUR = {
  putih: {
    kartu: 'border border-blue-100 bg-white',
    ikon: 'bg-blue-600 text-white',
    judul: 'text-slate-900',
    isi: 'text-slate-600',
  },
  langit: {
    kartu: 'border border-sky-200 bg-sky-100',
    ikon: 'bg-sky-600 text-white',
    judul: 'text-sky-950',
    isi: 'text-sky-900/80',
  },
  biru: {
    kartu: 'border border-blue-200 bg-blue-100',
    ikon: 'bg-blue-700 text-white',
    judul: 'text-blue-950',
    isi: 'text-blue-900/80',
  },
} as const;

// Huruf awal nama, dengan melewati singkatan gelar seperti "A." atau "Moh."
const inisial = (nama: string) => {
  const kata = nama.split(' ').filter((k) => !k.endsWith('.'));
  return (kata[0] ?? nama).charAt(0).toUpperCase();
};

function BarisInfo({
  ikon: Ikon,
  label,
  besar = false,
  children,
}: {
  ikon: Ikon;
  label: string;
  besar?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-6 ${besar ? 'py-6' : 'py-4'}`}>
      <dt className="flex items-center gap-2 text-sm font-medium text-slate-500 sm:w-48 sm:shrink-0">
        <Ikon className="h-4 w-4 text-blue-500" aria-hidden="true" />
        {label}
      </dt>
      <dd
        className={
          besar
            ? 'text-2xl font-bold tracking-tight text-slate-900 [text-wrap:balance] sm:text-3xl'
            : 'text-sm font-semibold text-slate-900'
        }
      >
        {children}
      </dd>
    </div>
  );
}

function KartuFitur({
  ikon: Ikon,
  judul,
  isi,
  gaya,
}: {
  ikon: Ikon;
  judul: string;
  isi: string;
  gaya: keyof typeof GAYA_FITUR;
}) {
  const g = GAYA_FITUR[gaya];
  return (
    <article className={`rounded-2xl p-5 transition-transform duration-200 hover:-translate-y-0.5 ${g.kartu}`}>
      <span className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${g.ikon}`}>
        <Ikon className="h-5 w-5" strokeWidth={1.9} aria-hidden="true" />
      </span>
      <h3 className={`text-sm font-bold tracking-tight ${g.judul}`}>{judul}</h3>
      <p className={`mt-1.5 text-xs leading-relaxed ${g.isi}`}>{isi}</p>
    </article>
  );
}

export default function AboutPage() {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      {/* Bagian bernuansa putih memakai panel agar tetap terbaca di atas latar foto dashboard */}
      <header className={`${panel} p-6 sm:p-8`}>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 [text-wrap:balance] sm:text-3xl">
          Sistem Perpustakaan Lubangsa
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
          Infrastruktur kelola data modern yang dirancang kokoh, cepat, dan siap berkembang untuk jangka panjang.
        </p>
      </header>

      <section aria-label="Keunggulan sistem" className="grid gap-5 sm:grid-cols-2">
        {KEUNGGULAN.map(({ ikon: Ikon, judul, isi }) => (
          <article key={judul} className={`${panel} p-6`}>
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <Ikon className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
            </div>
            <h2 className="text-base font-semibold tracking-tight text-slate-900">{judul}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{isi}</p>
          </article>
        ))}
      </section>

      <section aria-labelledby="judul-info" className={`${panel} p-6 sm:p-8`}>
        <h2 id="judul-info" className="mb-5 text-lg font-bold tracking-tight text-slate-900">
          Informasi Sistem Detail
        </h2>

        <dl className="divide-y divide-blue-100 border-y border-blue-100">
          <BarisInfo ikon={CalendarDays} label="Tanggal Rilis">
            <time dateTime="2026-01-01">01 Januari 2026</time>
          </BarisInfo>

          <BarisInfo ikon={UserRound} label="Dibuat oleh" besar>
            Adlan Madjied Ridho
          </BarisInfo>

          <BarisInfo ikon={CircleCheck} label="Status Lingkungan">
            <span className="inline-flex flex-wrap items-center gap-x-2 rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
              Production Stable
              <span className="font-normal text-emerald-700/80">(Siap Pakai &amp; Stabil)</span>
            </span>
          </BarisInfo>

          <BarisInfo ikon={Globe} label="Kerangka Kerja">
            Next.js (App Router)
          </BarisInfo>

          <BarisInfo ikon={Database} label="Basis Data">
            PostgreSQL melalui Supabase
          </BarisInfo>

          <BarisInfo ikon={Languages} label="Bahasa Antarmuka">
            Bahasa Indonesia
          </BarisInfo>

          <BarisInfo ikon={Clock} label="Zona Waktu">
            Asia/Jakarta (WIB)
          </BarisInfo>
        </dl>

        <h3 className="mt-7 text-sm font-semibold uppercase tracking-wide text-slate-500">Kontributor Sistem</h3>
        <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
          {KONTRIBUTOR.map((nama) => (
            <li
              key={nama}
              className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5"
            >
              <span
                aria-hidden="true"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700"
              >
                {inisial(nama)}
              </span>
              <span className="text-sm font-medium text-slate-800">{nama}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="judul-teknologi" className={`${panel} p-6 sm:p-8`}>
        <div className="mb-5">
          <h2 id="judul-teknologi" className="text-lg font-bold tracking-tight text-slate-900">
            Teknologi di Balik Sistem
          </h2>
          <p className="mt-1 text-sm text-slate-600">Teknologi yang menjalankan sistem ini.</p>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {TEKNOLOGI.map(({ ikon: Ikon, nama, peran }) => (
            <li key={nama} className="flex items-start gap-3 rounded-2xl border border-slate-200 p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Ikon className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">{nama}</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">{peran}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* ---------- Modul Sistem: panel biru tua dengan kartu kaca ---------- */}
      <section
        aria-labelledby="judul-modul"
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900 p-6 text-white shadow-lg shadow-blue-900/25 sm:p-8"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.18] [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:22px_22px]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full [background:radial-gradient(circle,rgba(56,189,248,0.40),transparent_68%)]"
        />

        <div className="relative">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-200">Dashboard petugas</p>
          <h2 id="judul-modul" className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            Modul Sistem
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-blue-100">
            Tujuh modul yang dipakai petugas setiap hari untuk mengelola perpustakaan.
          </p>

          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {MODUL_PETUGAS.map(({ ikon: Ikon, nama, isi }, i) => (
              <li
                key={nama}
                className="group flex items-start gap-4 rounded-2xl bg-white/10 p-4 ring-1 ring-white/20 transition-colors duration-200 hover:bg-white/[0.16] sm:last:col-span-2"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-blue-700 shadow-sm transition-transform duration-200 group-hover:-rotate-6 group-hover:scale-105">
                  <Ikon className="h-5 w-5" strokeWidth={1.9} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-sm font-bold tracking-tight">{nama}</p>
                    <span aria-hidden="true" className="font-mono text-xs font-semibold text-sky-200/80">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-blue-100">{isi}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------- Situs Publik: panel biru muda dengan bingkai peramban ---------- */}
      <section
        aria-labelledby="judul-publik"
        className="grid items-center gap-6 rounded-3xl border border-sky-200 bg-gradient-to-br from-sky-100 via-blue-100 to-blue-200 p-6 shadow-sm shadow-blue-900/5 sm:p-8 md:grid-cols-5"
      >
        <div className="md:col-span-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-700">Terbuka untuk pengunjung</p>
          <h2 id="judul-publik" className="mt-1 text-2xl font-bold tracking-tight text-blue-950 sm:text-3xl">
            Situs Publik
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-blue-900/80">
            Tiga halaman yang bisa dibuka siapa saja untuk mencari buku, membaca karya, dan mengirim tulisan.
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-lg shadow-blue-900/10 md:col-span-3">
          <div className="flex items-center gap-3 border-b border-blue-100 bg-blue-50 px-4 py-2.5" aria-hidden="true">
            <div className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-300" />
              <span className="h-2.5 w-2.5 rounded-full bg-sky-300" />
              <span className="h-2.5 w-2.5 rounded-full bg-blue-200" />
            </div>
            <span className="rounded-full bg-white px-3 py-0.5 text-[11px] font-medium text-slate-500 ring-1 ring-blue-100">
              Perpustakaan Lubangsa
            </span>
          </div>

          <ul className="divide-y divide-blue-100">
            {HALAMAN_PUBLIK.map(({ ikon: Ikon, nama, rute, isi }) => (
              <li key={rute}>
                <Link
                  href={rute}
                  target="_blank"
                  className="group flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-blue-50 focus-visible:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
                    <Ikon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-sm font-semibold text-slate-900">{nama}</span>
                      <code className="rounded-md bg-blue-50 px-1.5 py-0.5 font-mono text-[11px] text-blue-700 ring-1 ring-blue-100">
                        {rute}
                      </code>
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-600">{isi}</span>
                  </span>
                  <ArrowRight
                    className="h-4 w-4 shrink-0 text-blue-400 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-700"
                    aria-hidden="true"
                  />
                  <span className="sr-only">(buka di tab baru)</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------- Fitur Unggulan: bento berwarna-warni ---------- */}
      <section aria-labelledby="judul-fitur" className="rounded-3xl border border-blue-200 bg-blue-50 p-5 shadow-sm shadow-blue-900/5 sm:p-6">
        <div className="mb-5 px-1">
          <h2 id="judul-fitur" className="text-lg font-bold tracking-tight text-blue-950 sm:text-xl">
            Fitur Unggulan
          </h2>
          <p className="mt-1 text-sm text-blue-900/70">Hal-hal yang dirancang agar sistem nyaman dipakai.</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {/* Kartu utama: alur peninjauan karya */}
          <article className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-700 to-blue-900 p-6 text-white transition-transform duration-200 hover:-translate-y-0.5 sm:col-span-2">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-20 -right-16 h-52 w-52 rounded-full [background:radial-gradient(circle,rgba(56,189,248,0.35),transparent_68%)]"
            />
            <div className="relative">
              <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-white text-blue-700">
                <ClipboardCheck className="h-5 w-5" strokeWidth={1.9} aria-hidden="true" />
              </span>
              <h3 className="text-base font-bold tracking-tight">Peninjauan sebelum terbit</h3>
              <p className="mt-1.5 max-w-md text-xs leading-relaxed text-blue-100">
                Karya yang dikirim berstatus menunggu dan baru tampil di galeri setelah disetujui petugas.
              </p>

              <ol className="mt-5 flex flex-wrap items-center gap-2" aria-label="Alur karya">
                {['Dikirim', 'Ditinjau petugas', 'Tampil di galeri'].map((langkah, i) => (
                  <li key={langkah} className="flex items-center gap-2">
                    {i > 0 && <ArrowRight className="h-3.5 w-3.5 text-sky-200" aria-hidden="true" />}
                    <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold ring-1 ring-white/25">
                      {langkah}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </article>

          <KartuFitur
            ikon={Download}
            judul="Unduh sebagai PDF"
            isi="Setiap karya dapat diunduh dalam bentuk PDF lengkap dengan halaman sampul."
            gaya="putih"
          />

          <KartuFitur
            ikon={Search}
            judul="Mudah ditemukan"
            isi="Setiap halaman karya memiliki metadata dan data terstruktur agar mudah ditemukan mesin pencari."
            gaya="langit"
          />
          <KartuFitur
            ikon={Accessibility}
            judul="Ramah akses"
            isi="Mendukung navigasi keyboard, pembaca layar, dan tampilan yang nyaman di ponsel."
            gaya="putih"
          />
          <KartuFitur
            ikon={Save}
            judul="Draf otomatis"
            isi="Tulisan di formulir kirim karya tersimpan otomatis di perangkat sehingga tidak hilang saat halaman tertutup."
            gaya="biru"
          />

          <article className="flex items-center gap-4 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-800 p-5 text-white transition-transform duration-200 hover:-translate-y-0.5 sm:col-span-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-blue-700">
              <Zap className="h-5 w-5" strokeWidth={1.9} aria-hidden="true" />
            </span>
            <div>
              <h3 className="text-sm font-bold tracking-tight">Ringan dan segar</h3>
              <p className="mt-1 text-xs leading-relaxed text-blue-100">
                Halaman publik dibangun ulang secara berkala sehingga tetap cepat dibuka dan isinya terbarui.
              </p>
            </div>
          </article>
        </div>
      </section>

      <footer className="pb-2 pt-1 text-center">
        <p className="inline-block rounded-full bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 shadow-sm">
          &copy; 2026 Lubangsa Library System. All rights reserved.
        </p>
      </footer>
    </div>
  );
}