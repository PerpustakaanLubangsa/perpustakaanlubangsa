import type { IconName } from '@fortawesome/fontawesome-svg-core';

/* ───────────────────────── Types ───────────────────────── */

export type UserRole = 'admin' | 'pustakawan';

export interface MenuItem {
  id: number;
  label: string;
  /** Nama ikon FontAwesome Solid tanpa prefix, contoh: 'house-chimney' */
  icon: IconName;
  /** URL final, sudah berformat /dashboard/... */
  page_url: string;
  /** Peran yang boleh melihat menu ini */
  roles: readonly UserRole[];
}

export interface NavGroup {
  /** Kosongkan ('') untuk grup tanpa judul */
  groupName: string;
  items: MenuItem[];
}

/* ───────────────────────── Konstanta peran ───────────────────────── */

const SEMUA: readonly UserRole[] = ['admin', 'pustakawan'];
const ADMIN: readonly UserRole[] = ['admin'];

/* ───────────────────────── Daftar navigasi ─────────────────────────
   Urutan di sini = urutan tampil di sidebar (grup maupun menu).
   Untuk menyembunyikan menu, cukup beri komentar pada barisnya.
   `id` harus unik, tidak harus berurutan.
   ──────────────────────────────────────────────────────────────── */

export const NAVIGATION_GROUPS: NavGroup[] = [
  {
    // Menu yang dipakai sehari-hari
    groupName: 'Utama',
    items: [
      { id: 1, label: 'Beranda', icon: 'house-chimney', page_url: '/dashboard', roles: SEMUA },
      { id: 13, label: 'Sirkulasi', icon: 'retweet', page_url: '/dashboard/sirkulasi', roles: SEMUA },
      { id: 3, label: 'Absensi', icon: 'calendar-check', page_url: '/dashboard/absensi', roles: SEMUA },
      { id: 17, label: 'Anggota', icon: 'users', page_url: '/dashboard/keanggotaan', roles: SEMUA },
      { id: 2, label: 'Cari Buku', icon: 'magnifying-glass', page_url: '/dashboard/cari-buku', roles: SEMUA },
    ],
  },
  {
    // Karya, Admin Karya, dan Poin Tambahan sudah tidak ada di sini
    groupName: 'Koleksi',
    items: [
      { id: 10, label: 'Bibliografi', icon: 'book', page_url: '/dashboard/bibliografi', roles: SEMUA },
      { id: 11, label: 'Manajemen Rak', icon: 'layer-group', page_url: '/dashboard/manajemen_rak', roles: SEMUA },
      { id: 12, label: 'Kategori', icon: 'tags', page_url: '/dashboard/manajemen_kategori', roles: SEMUA },
      { id: 14, label: 'Barcode', icon: 'barcode', page_url: '/dashboard/barcode', roles: SEMUA },
      { id: 15, label: 'Label', icon: 'print', page_url: '/dashboard/label', roles: SEMUA },
    ],
  },
  {
    groupName: 'Karya Tulis',
    items: [
      { id: 18, label: 'Karya', icon: 'pen-nib', page_url: '/dashboard/karya', roles: SEMUA },
      { id: 19, label: 'Admin Karya', icon: 'feather-pointed', page_url: '/dashboard/admin_karya', roles: SEMUA },
      { id: 20, label: 'Poin Tambahan', icon: 'circle-dollar-to-slot', page_url: '/dashboard/poin', roles: ADMIN },
    ],
  },
  {
    groupName: 'Data & Laporan',
    items: [
      { id: 4, label: 'Data Pengunjung', icon: 'users-viewfinder', page_url: '/dashboard/data_pengunjung', roles: SEMUA },
      { id: 16, label: 'Peminjam', icon: 'list-ul', page_url: '/dashboard/daftar-peminjam', roles: SEMUA },
      { id: 6, label: 'Rekapitulasi', icon: 'chart-pie', page_url: '/dashboard/rekap', roles: SEMUA },
    ],
  },
  {
    groupName: 'Audit',
    items: [
      { id: 7, label: 'Scanner', icon: 'qrcode', page_url: '/dashboard/audit-scanner', roles: SEMUA },
      { id: 8, label: 'Hasil Audit', icon: 'square-poll-vertical', page_url: '/dashboard/audit-hasil', roles: SEMUA },
      { id: 9, label: 'Belum Audit', icon: 'folder-minus', page_url: '/dashboard/audit-belum', roles: SEMUA },
    ],
  },
  {
    groupName: 'Sistem',
    items: [
      { id: 5, label: 'Manage Absen', icon: 'user-gear', page_url: '/dashboard/manajemen-absensi', roles: ADMIN },
      { id: 21, label: 'Pendaftaran Pustakawan', icon: 'shield-halved', page_url: '/dashboard/pendaftaran-pustakawan', roles: ADMIN },
      { id: 22, label: 'Feedback', icon: 'comment-dots', page_url: '/dashboard/admin_feedback', roles: ADMIN },
      { id: 23, label: 'Tentang', icon: 'circle-info', page_url: '/dashboard/about', roles: SEMUA },
    ],
  },
];

/* ───────────────────────── Helper ───────────────────────── */

/**
 * Ambil daftar menu.
 * - Tanpa argumen: semua menu ditampilkan.
 * - Dengan `role`: hanya menu yang boleh diakses peran tersebut
 *   (grup yang kosong ikut disembunyikan).
 */
export function getNavigationGroups(role?: UserRole): NavGroup[] {
  if (!role) return NAVIGATION_GROUPS;

  return NAVIGATION_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => item.roles.includes(role)),
  })).filter((group) => group.items.length > 0);
}