import { supabase } from '@/lib/supabase';

// Halaman petugas memakai klien anon yang sama dengan situs publik.
// Akses baca, ubah, dan hapus karya diatur lewat SQL/RLS di Supabase (lihat catatan di bawah).
// Berkas ini hanya boleh diimpor dari server component atau server action.
export function dbAdmin() {
  return supabase;
}
