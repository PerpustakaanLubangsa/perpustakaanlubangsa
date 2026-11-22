-- Jabatan pustakawan (pilihan dropdown). Jalankan di Supabase SQL Editor, satu langkah per eksekusi.
-- Prasyarat: tabel public.pustakawan sudah dibuat (20261122-pustakawan.sql).

-- Langkah 1: tabel daftar jabatan
create table public.jabatan (
  id integer generated always as identity primary key,
  nama text not null,
  urutan integer not null default 0,
  created_at timestamptz not null default now(),
  constraint jabatan_nama_tidak_kosong check (length(btrim(nama)) > 0)
);

create unique index jabatan_nama_unik on public.jabatan (lower(btrim(nama)));

-- Langkah 2: isi awal (ubah sesuai struktur pengurus bila perlu)
insert into public.jabatan (nama, urutan) values
  ('Ketua', 1),
  ('Wakil Ketua', 2),
  ('Sekretaris', 3),
  ('Bendahara', 4),
  ('Anggota', 5);

-- Langkah 3: RLS, pengguna login hanya boleh membaca (perubahan daftar lewat SQL Editor)
alter table public.jabatan enable row level security;

create policy "jabatan_login_baca"
  on public.jabatan
  for select
  to authenticated
  using (true);

-- Langkah 4: kolom jabatan di tabel pustakawan
alter table public.pustakawan
  add column jabatan_id integer references public.jabatan(id) on delete set null;
