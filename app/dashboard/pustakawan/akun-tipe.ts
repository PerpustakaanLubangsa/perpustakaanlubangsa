/* Tipe dan aturan akun pustakawan, dipakai halaman (client) dan server action. */

export type PeranAkun = 'super_admin' | 'pustakawan';

export const LABEL_PERAN: Record<PeranAkun, string> = {
  super_admin: 'Super Admin',
  pustakawan: 'Pustakawan',
};

/** Baris tabel pustakawan_akun (yang boleh dibaca browser) */
export interface AkunPustakawan {
  pustakawan_id: number;
  username: string;
  role: PeranAkun;
  menu_ids: number[];
}

/** Masukan dari modal akun ke server action */
export interface MasukanAkun {
  pustakawanId: number;
  username: string;
  role: PeranAkun;
  menuIds: number[];
  /** Kosong saat mengubah akun = kata sandi tidak diubah. Wajib saat membuat akun. */
  password: string;
}

export type HasilAksi = { ok: true } | { ok: false; error: string };

export const DOMAIN_EMAIL = 'lubangsa.com';
export const POLA_USERNAME = /^[a-z0-9._-]{3,30}$/;
export const MIN_PASSWORD = 8;
