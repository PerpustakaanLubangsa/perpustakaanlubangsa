import type { Metadata } from 'next';
import Link from 'next/link';
import DaftarKarya from './components/daftar-karya';
import { ambilHalaman, hitungPerStatus } from './kueri';
import { tombol } from './tombol';
import { adalahStatus, type StatusKarya } from './tipe';

// Membaca karya pending dan kolom nis, jadi tidak boleh di-cache
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Peninjauan Karya',
  robots: { index: false, follow: false },
};

const HALAMAN_ADMIN = '/dashboard/admin_karya';

const TAB: { status: StatusKarya; label: string }[] = [
  { status: 'pending', label: 'Menunggu' },
  { status: 'approved', label: 'Disetujui' },
  { status: 'rejected', label: 'Ditolak' },
];

type Props = { searchParams: Promise<{ status?: string }> };

export default async function AdminKaryaPage({ searchParams }: Props) {
  const { status: statusQuery } = await searchParams;
  const aktif: StatusKarya = statusQuery && adalahStatus(statusQuery) ? statusQuery : 'pending';

  const [jumlah, halaman] = await Promise.all([hitungPerStatus(), ambilHalaman(aktif, 0)]);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      {/* Panel putih agar judul tetap terbaca di atas latar foto dashboard */}
      <header className="mb-5 rounded-3xl border border-blue-100 bg-white p-5 shadow-sm shadow-blue-900/5 sm:p-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Peninjauan karya</h1>
        <p className="mt-1 text-sm text-slate-600">Setujui karya agar tampil di galeri, atau tolak jika tidak layak.</p>

        <nav aria-label="Filter status" className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-3 pb-1">
          {TAB.map((t) => {
            const dipilih = t.status === aktif;
            return (
              <Link
                key={t.status}
                href={`${HALAMAN_ADMIN}?status=${t.status}`}
                aria-current={dipilih ? 'page' : undefined}
                className={`${dipilih ? tombol.utama : tombol.netral} gap-2`}
              >
                {t.label}
                <span
                  className={`rounded-full px-2 py-0.5 text-xs tabular-nums ${
                    dipilih ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-700'
                  }`}
                >
                  {jumlah[t.status]}
                </span>
              </Link>
            );
          })}
        </nav>
      </header>

      {halaman.gagal ? (
        <div role="alert" className="rounded-3xl border border-red-100 bg-white px-6 py-14 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Gagal memuat karya</h2>
          <p className="mt-2 text-sm text-slate-600">
            Muat ulang halaman. Jika masih gagal, periksa izin akses tabel karya di Supabase dan log server.
          </p>
        </div>
      ) : (
        // key memastikan daftar mulai bersih setiap kali pindah tab
        <DaftarKarya key={aktif} status={aktif} awal={halaman.items} totalAwal={halaman.total} />
      )}
    </div>
  );
}