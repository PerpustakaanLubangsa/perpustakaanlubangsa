-- Izinkan pengguna login menambah, mengubah, dan menghapus jabatan dari aplikasi.
-- Prasyarat: 20261122-pustakawan-jabatan.sql sudah dijalankan. Satu langkah per eksekusi.

-- Langkah 1: hapus kebijakan baca-saja
drop policy "jabatan_login_baca" on public.jabatan;

-- Langkah 2: kebijakan baru, pengguna login boleh semua operasi
create policy "jabatan_login_semua"
  on public.jabatan
  for all
  to authenticated
  using (true)
  with check (true);
