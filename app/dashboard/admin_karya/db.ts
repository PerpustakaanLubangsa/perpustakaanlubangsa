import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

// Halaman petugas memakai klien anon yang sama dengan situs publik.
// Akses baca, ubah, dan hapus karya diatur lewat SQL/RLS di Supabase (lihat catatan di bawah).
// Berkas ini hanya boleh diimpor dari server component atau server action.
export function dbAdmin() {
  return supabase;
}

// Klien untuk menambah karya yang langsung berstatus approved. Jika SUPABASE_SERVICE_ROLE_KEY
// tersedia (hanya di server) kunci itu dipakai agar tidak terhalang RLS, sama seperti form publik.
// Jika tidak, dipakai klien anon dan RLS harus mengizinkan insert dengan status 'approved'.
export function dbTulis() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const kunci = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && kunci) return createClient(url, kunci, { auth: { persistSession: false } });
  return supabase;
}