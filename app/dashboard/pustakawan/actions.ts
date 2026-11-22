'use server';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { rapikanMenuIds } from '../navigation';
import {
  DOMAIN_EMAIL,
  MIN_PASSWORD,
  POLA_USERNAME,
  type HasilAksi,
  type MasukanAkun,
} from './akun-tipe';

/*
 * Aksi server untuk akun pustakawan. Memakai SUPABASE_SERVICE_ROLE_KEY (hanya di server)
 * karena membuat akun dan mengatur kata sandi orang lain tidak bisa dilakukan dari browser.
 * Setiap aksi memeriksa dulu token sesi pemanggil dan memastikan ia super admin.
 */

const ROLE_ADA_DI_PILIHAN = ['super_admin', 'pustakawan'];

function klienAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const kunci = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !kunci) return null;
  return createClient(url, kunci, { auth: { autoRefreshToken: false, persistSession: false } });
}

// Peran di dalam kunci JWT (anon / service_role); kunci format baru (sb_secret_...) bukan JWT
function perankunci(): string | null {
  const kunci = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (kunci.startsWith('sb_secret_')) return 'service_role';
  if (kunci.startsWith('sb_publishable_')) return 'anon';
  try {
    const payload = JSON.parse(Buffer.from(kunci.split('.')[1] ?? '', 'base64url').toString('utf8'));
    return typeof payload.role === 'string' ? payload.role : null;
  } catch {
    return null;
  }
}

type Pemeriksaan =
  | { ok: true; admin: SupabaseClient; userId: string }
  | { ok: false; error: string };

// Pemanggil harus super admin. Akun lama (tanpa baris pustakawan_akun) dianggap super admin
// agar super admin pertama bisa dibuat; hapus akun bersama lama setelah semua akun individu siap.
async function pastikanSuperAdmin(token: string): Promise<Pemeriksaan> {
  const admin = klienAdmin();
  if (!admin) {
    return {
      ok: false,
      error: 'SUPABASE_SERVICE_ROLE_KEY belum diatur di server (.env.local / Vercel).',
    };
  }
  if (!token) return { ok: false, error: 'Sesi tidak valid. Silakan login ulang.' };

  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return { ok: false, error: 'Sesi tidak valid. Silakan login ulang.' };

  const { data: akun, error: errAkun } = await admin
    .from('pustakawan_akun')
    .select('role')
    .eq('user_id', data.user.id)
    .maybeSingle();
  if (errAkun) {
    console.error('Gagal memeriksa peran:', errAkun);
    const tabelHilang = ['42P01', 'PGRST205'].includes(errAkun.code);
    if (errAkun.code === '42501') {
      const peran = perankunci();
      return {
        ok: false,
        error:
          peran && peran !== 'service_role'
            ? `SUPABASE_SERVICE_ROLE_KEY berisi kunci "${peran}", bukan service_role. Ganti dengan kunci service_role dari Supabase (Project Settings > API) lalu restart server.`
            : 'Kunci service_role tidak punya izin ke tabel pustakawan_akun. Jalankan SQL grant di Supabase: grant all on public.pustakawan_akun to service_role;',
      };
    }
    return {
      ok: false,
      error: tabelHilang
        ? 'Tabel pustakawan_akun tidak terbaca server. Jalankan di SQL Editor: notify pgrst, \'reload schema\'; lalu coba lagi.'
        : `Gagal memeriksa peran (${errAkun.code || 'tanpa kode'}): ${errAkun.message}`,
    };
  }
  if (akun && akun.role !== 'super_admin') {
    return { ok: false, error: 'Hanya super admin yang boleh melakukan ini.' };
  }
  return { ok: true, admin, userId: data.user.id };
}

async function jumlahSuperAdminLain(admin: SupabaseClient, pustakawanId: number): Promise<number> {
  const { count } = await admin
    .from('pustakawan_akun')
    .select('pustakawan_id', { count: 'exact', head: true })
    .eq('role', 'super_admin')
    .neq('pustakawan_id', pustakawanId);
  return count ?? 0;
}

function pesanAuth(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('already') || m.includes('registered') || m.includes('exists')) {
    return 'Username sudah dipakai akun login lain di Supabase (mungkin akun bersama lama). Pakai username lain, atau hapus akun lama itu di Authentication > Users.';
  }
  if (m.includes('password')) return `Kata sandi ditolak: ${message}`;
  return `Gagal menyimpan akun di Supabase Auth: ${message || 'tanpa pesan'}`;
}

/** Buat akun baru atau ubah akun pustakawan (username, peran, akses menu, kata sandi) */
export async function simpanAkunPustakawan(token: string, input: MasukanAkun): Promise<HasilAksi> {
  const cek = await pastikanSuperAdmin(token);
  if (!cek.ok) return cek;
  const { admin } = cek;

  const username = String(input.username ?? '').trim().toLowerCase();
  const password = String(input.password ?? '');
  const pustakawanId = Number(input.pustakawanId);

  if (!Number.isInteger(pustakawanId)) return { ok: false, error: 'Pustakawan tidak valid.' };
  if (!POLA_USERNAME.test(username)) {
    return {
      ok: false,
      error: 'Username 3-30 karakter: huruf kecil, angka, titik, garis bawah, atau strip.',
    };
  }
  if (!ROLE_ADA_DI_PILIHAN.includes(input.role)) return { ok: false, error: 'Peran tidak valid.' };
  if (password && password.length < MIN_PASSWORD) {
    return { ok: false, error: `Kata sandi minimal ${MIN_PASSWORD} karakter.` };
  }

  const { data: pustakawan, error: errPustakawan } = await admin
    .from('pustakawan')
    .select('id, nama')
    .eq('id', pustakawanId)
    .maybeSingle();
  if (errPustakawan) {
    console.error('Gagal membaca pustakawan:', errPustakawan);
    return { ok: false, error: `Gagal membaca data pustakawan (${errPustakawan.code || 'tanpa kode'}): ${errPustakawan.message}` };
  }
  if (!pustakawan) return { ok: false, error: 'Data pustakawan tidak ditemukan.' };

  const email = `${username}@${DOMAIN_EMAIL}`;
  const menuIds = rapikanMenuIds(Array.isArray(input.menuIds) ? input.menuIds.map(Number) : []);

  const { data: akunLama, error: errAkunLama } = await admin
    .from('pustakawan_akun')
    .select('user_id, username, role')
    .eq('pustakawan_id', pustakawanId)
    .maybeSingle();
  if (errAkunLama) {
    console.error('Gagal membaca akun pustakawan:', errAkunLama);
    return { ok: false, error: `Gagal membaca akun (${errAkunLama.code || 'tanpa kode'}): ${errAkunLama.message}` };
  }

  /* ── Akun baru ── */
  if (!akunLama) {
    if (!password) return { ok: false, error: 'Kata sandi wajib diisi untuk akun baru.' };

    const { data: dibuat, error: errBuat } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: pustakawan.nama, username },
    });
    if (errBuat || !dibuat.user) {
      console.error('Gagal membuat akun:', errBuat);
      return { ok: false, error: pesanAuth(errBuat?.message ?? '') };
    }

    const { error: errSimpan } = await admin.from('pustakawan_akun').insert({
      pustakawan_id: pustakawanId,
      user_id: dibuat.user.id,
      username,
      role: input.role,
      menu_ids: menuIds,
    });
    if (errSimpan) {
      console.error('Gagal menyimpan akun pustakawan:', errSimpan);
      // Batalkan akun login agar tidak ada akun yatim yang bisa masuk
      await admin.auth.admin.deleteUser(dibuat.user.id);
      return {
        ok: false,
        error: errSimpan.code === '23505' ? 'Username sudah dipakai pustakawan lain.' : `Gagal menyimpan akun pustakawan (${errSimpan.code || 'tanpa kode'}): ${errSimpan.message}`,
      };
    }
    return { ok: true };
  }

  /* ── Ubah akun ── */
  if (akunLama.role === 'super_admin' && input.role !== 'super_admin') {
    if ((await jumlahSuperAdminLain(admin, pustakawanId)) === 0) {
      return { ok: false, error: 'Minimal harus ada satu super admin.' };
    }
  }

  const perubahanAuth: { email?: string; password?: string; email_confirm?: boolean } = {};
  if (username !== akunLama.username) {
    perubahanAuth.email = email;
    perubahanAuth.email_confirm = true;
  }
  if (password) perubahanAuth.password = password;

  if (Object.keys(perubahanAuth).length > 0) {
    const { error: errAuth } = await admin.auth.admin.updateUserById(akunLama.user_id, perubahanAuth);
    if (errAuth) {
      console.error('Gagal mengubah akun login:', errAuth);
      return { ok: false, error: pesanAuth(errAuth.message) };
    }
  }

  const { error: errUbah } = await admin
    .from('pustakawan_akun')
    .update({ username, role: input.role, menu_ids: menuIds, updated_at: new Date().toISOString() })
    .eq('pustakawan_id', pustakawanId);
  if (errUbah) {
    console.error('Gagal mengubah akun pustakawan:', errUbah);
    return {
      ok: false,
      error: errUbah.code === '23505' ? 'Username sudah dipakai akun lain.' : 'Gagal mengubah akun pustakawan.',
    };
  }

  // Tabel accounts bawaan (diisi trigger) ikut disamakan; gagal di sini tidak menggagalkan aksi
  if (username !== akunLama.username) {
    await admin.from('accounts').update({ email, username }).eq('id', akunLama.user_id);
  }
  return { ok: true };
}

/** Hapus akun login pustakawan (data nama pustakawan tetap ada) */
export async function hapusAkunPustakawan(token: string, pustakawanId: number): Promise<HasilAksi> {
  const cek = await pastikanSuperAdmin(token);
  if (!cek.ok) return cek;
  const { admin, userId } = cek;

  const { data: akun } = await admin
    .from('pustakawan_akun')
    .select('user_id, role')
    .eq('pustakawan_id', pustakawanId)
    .maybeSingle();
  if (!akun) return { ok: true };

  if (akun.user_id === userId) return { ok: false, error: 'Akun yang sedang dipakai tidak bisa dihapus.' };
  if (akun.role === 'super_admin' && (await jumlahSuperAdminLain(admin, pustakawanId)) === 0) {
    return { ok: false, error: 'Minimal harus ada satu super admin.' };
  }

  // Baris pustakawan_akun dan accounts ikut terhapus (ON DELETE CASCADE)
  const { error } = await admin.auth.admin.deleteUser(akun.user_id);
  if (error) {
    console.error('Gagal menghapus akun login:', error);
    return { ok: false, error: 'Gagal menghapus akun login.' };
  }
  return { ok: true };
}

/** Hapus pustakawan beserta akun loginnya (agar tidak tersisa akun yatim yang masih bisa masuk) */
export async function hapusPustakawan(token: string, pustakawanId: number): Promise<HasilAksi> {
  const cek = await pastikanSuperAdmin(token);
  if (!cek.ok) return cek;

  const hasilAkun = await hapusAkunPustakawan(token, pustakawanId);
  if (!hasilAkun.ok) return hasilAkun;

  const { error } = await cek.admin.from('pustakawan').delete().eq('id', pustakawanId);
  if (error) {
    console.error('Gagal menghapus pustakawan:', error);
    return { ok: false, error: 'Gagal menghapus data pustakawan dari database.' };
  }
  return { ok: true };
}
