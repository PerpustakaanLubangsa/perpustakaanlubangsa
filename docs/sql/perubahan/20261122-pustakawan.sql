-- Data pustakawan (nama saja). Jalankan di Supabase SQL Editor, satu langkah per eksekusi.

-- Langkah 1: buat tabel
create table public.pustakawan (
  id bigint generated always as identity primary key,
  nama text not null,
  created_at timestamptz not null default now(),
  constraint pustakawan_nama_tidak_kosong check (length(btrim(nama)) > 0)
);

-- Langkah 2: nama tidak boleh kembar (huruf besar/kecil dan spasi tepi diabaikan)
create unique index pustakawan_nama_unik on public.pustakawan (lower(btrim(nama)));

-- Langkah 3: aktifkan RLS
alter table public.pustakawan enable row level security;

-- Langkah 4: hanya pengguna yang sudah login yang boleh membaca dan mengelola
create policy "pustakawan_login_semua"
  on public.pustakawan
  for all
  to authenticated
  using (true)
  with check (true);
