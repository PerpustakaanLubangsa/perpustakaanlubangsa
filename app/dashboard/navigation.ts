import type { IconName } from '@fortawesome/fontawesome-svg-core';

/* ───────────────────────── Types ───────────────────────── */

export type UserRole = 'admin' | 'pustakawan';

/** Akses menu satu pengguna: super admin melihat semua, selain itu hanya menu pilihan */
export interface AksesMenu {
  superAdmin: boolean;
  menuIds: readonly number[];
}

export interface MenuItem {
  id: number;
  label: string;
  /** Nama ikon FontAwesome Solid tanpa prefix, contoh: 'house-chimney' */
  icon: IconName;
  /** URL final, sudah berformat /dashboard/... */
  page_url: string;
  /** Peran bawaan untuk pustakawan baru: 'pustakawan' = tercentang awal, hanya 'admin' = tidak.
   *  Akses sebenarnya ditentukan super admin per pustakawan (lihat AksesMenu). */
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
      { id: 24, label: 'Ringkasan', icon: 'chart-line', page_url: '/dashboard/ringkasan', roles: SEMUA },
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
    groupName: 'Sistem',
    items: [
      { id: 5, label: 'Manage Absen', icon: 'user-gear', page_url: '/dashboard/manajemen-absensi', roles: ADMIN },
      { id: 25, label: 'Pustakawan', icon: 'id-badge', page_url: '/dashboard/pustakawan', roles: SEMUA },
      { id: 23, label: 'Tentang', icon: 'circle-info', page_url: '/dashboard/about', roles: SEMUA },
    ],
  },
];

/* ───────────────────────── Helper ───────────────────────── */

/** Menu yang selalu bisa dibuka semua pengguna: Beranda (1) dan Pustakawan (25, untuk ganti kata sandi) */
export const MENU_WAJIB: readonly number[] = [1, 25];

/** Daftar datar semua menu */
export const SEMUA_MENU: MenuItem[] = NAVIGATION_GROUPS.flatMap((g) => g.items);

/** Menu yang tercentang awal untuk pustakawan baru (menu non-admin) */
export const MENU_BAWAAN: number[] = SEMUA_MENU.filter((m) => m.roles.includes('pustakawan')).map(
  (m) => m.id
);

/** Buang id yang tidak dikenal dan pastikan menu wajib selalu ada */
export function rapikanMenuIds(ids: readonly number[]): number[] {
  const dikenal = new Set(SEMUA_MENU.map((m) => m.id));
  const hasil = new Set<number>(MENU_WAJIB);
  for (const id of ids) if (dikenal.has(id)) hasil.add(id);
  return [...hasil].sort((a, b) => a - b);
}

/**
 * Ambil daftar menu.
 * - Tanpa argumen atau super admin: semua menu.
 * - Pustakawan biasa: hanya menu yang dicentang super admin (+ menu wajib);
 *   grup yang kosong ikut disembunyikan.
 */
export function getNavigationGroups(akses?: AksesMenu): NavGroup[] {
  if (!akses || akses.superAdmin) return NAVIGATION_GROUPS;

  const boleh = new Set<number>([...MENU_WAJIB, ...akses.menuIds]);
  return NAVIGATION_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => boleh.has(item.id)),
  })).filter((group) => group.items.length > 0);
}

/** Apakah alamat halaman boleh dibuka. Alamat dashboard yang tidak ada di daftar menu ditolak untuk non-super admin. */
export function bolehBukaHalaman(pathname: string, akses: AksesMenu): boolean {
  if (akses.superAdmin) return true;

  const path = pathname.replace(/\/+$/, '') || '/';
  if (path === '/dashboard') return true;

  // Cocokkan dengan menu terpanjang yang menjadi awalan alamat
  let cocok: MenuItem | null = null;
  for (const item of SEMUA_MENU) {
    if (item.page_url === '/dashboard') continue;
    if (path === item.page_url || path.startsWith(`${item.page_url}/`)) {
      if (!cocok || item.page_url.length > cocok.page_url.length) cocok = item;
    }
  }
  if (!cocok) return false;
  return MENU_WAJIB.includes(cocok.id) || akses.menuIds.includes(cocok.id);
}
