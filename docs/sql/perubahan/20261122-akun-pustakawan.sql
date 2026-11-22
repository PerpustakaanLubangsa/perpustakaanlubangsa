-- Akun login per pustakawan: peran (super_admin / pustakawan) dan akses menu.
-- Jalankan di Supabase SQL Editor, satu langkah per eksekusi. Aman dijalankan ulang.
-- Prasyarat: tabel public.pustakawan sudah ada.

-- Langkah 1: tabel akun pustakawan (satu pustakawan = satu akun login)
create table if not exists public.pustakawan_akun (
  pustakawan_id bigint primary key references public.pustakawan(id) on delete cascade,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  username text not null,
  role text not null default 'pustakawan',
  menu_ids integer[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pustakawan_akun_role_valid check (role in ('super_admin', 'pustakawan')),
  constraint pustakawan_akun_username_valid check (username ~ '^[a-z0-9._-]{3,30}$')
);

create unique index if not exists pustakawan_akun_username_unik
  on public.pustakawan_akun (lower(username));

-- Langkah 2: fungsi pemeriksa super admin (security definer agar kebijakan RLS tidak rekursif).
-- Akun lama tanpa baris di pustakawan_akun (akun bersama sebelum fitur ini) dianggap super admin.
create or replace function public.adalah_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (select 1 from public.pustakawan_akun where user_id = auth.uid() and role = 'super_admin')
    or not exists (select 1 from public.pustakawan_akun where user_id = auth.uid());
$$;

revoke all on function public.adalah_super_admin() from public;
grant execute on function public.adalah_super_admin() to authenticated;

-- Langkah 3: RLS. Pengguna login hanya boleh MEMBACA barisnya sendiri; super admin membaca semua.
-- Tidak ada kebijakan tulis: semua perubahan lewat server (service role), jadi peran dan akses
-- tidak bisa diubah dari browser.
alter table public.pustakawan_akun enable row level security;

drop policy if exists "pustakawan_akun_baca" on public.pustakawan_akun;
create policy "pustakawan_akun_baca"
  on public.pustakawan_akun
  for select
  to authenticated
  using (user_id = auth.uid() or public.adalah_super_admin());

-- Langkah 4: izin tabel (proyek Supabase baru tidak selalu memberi izin otomatis).
-- authenticated: baca (dibatasi RLS di atas). service_role: dipakai server untuk menulis.
grant select on public.pustakawan_akun to authenticated;
grant all on public.pustakawan_akun to service_role;

-- Langkah 5: server (service_role) juga perlu izin ke tabel pustakawan dan jabatan (hapus pustakawan, cek data)
grant all on public.pustakawan to service_role;
grant all on public.jabatan to service_role;
