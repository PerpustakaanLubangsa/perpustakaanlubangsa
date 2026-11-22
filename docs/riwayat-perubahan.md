# Riwayat perubahan

Terbaru di atas. Format: tanggal, 1–3 baris, berkas utama, SQL bila ada.

## 2026-11-22 (akun dan peran pustakawan)
- Tiap pustakawan bisa punya akun login sendiri (username + kata sandi) dengan peran `super_admin` atau `pustakawan`. Super admin membuat akun, mengubah/mengatur kata sandi pustakawan lain, dan mencentang akses menu per pustakawan (Beranda dan Pustakawan selalu aktif). Semua pustakawan bisa mengganti kata sandinya sendiri lewat tombol "Ganti Kata Sandi" di halaman Pustakawan. Menu yang tidak diizinkan disembunyikan dan halamannya diblokir (`gerbang-akses.tsx`).
- Akun individu otomatis "Masuk sebagai" namanya sendiri (tanpa layar pilih). Akun lama tanpa data pustakawan tetap berjalan seperti sebelumnya: akses penuh + layar pilih nama.
- Perubahan akun lewat server action (`SUPABASE_SERVICE_ROLE_KEY` wajib ada di server). Pembatasan menu hanya di tampilan; RLS tabel lain tidak diubah.
- Berkas: `app/dashboard/pustakawan/{page.tsx,actions.ts,akun-tipe.ts,components/akun-modal.tsx,components/sandi-saya-modal.tsx}`, `app/dashboard/{navigation.ts,pustakawan-aktif.tsx,gerbang-akses.tsx,layout.tsx,Sidebar.tsx}`.
- SQL: `docs/sql/perubahan/20261122-akun-pustakawan.sql` (jalankan SQL dulu, baru kode).

## 2026-11-22 (masuk sebagai)
- Setiap dashboard dimuat (baru login maupun sesi lama), layar "Masuk sebagai" meminta memilih nama pustakawan dari tabel `pustakawan`. Pilihan hanya di memori (tidak disimpan), jadi muat ulang halaman atau keluar-masuk dashboard bertanya lagi; berpindah halaman di dalam dashboard tidak. Nama terpilih tampil di profil sidebar, ada tombol "Ganti Pustakawan". Tersedia lewat `usePustakawanAktif()` di `app/dashboard/pustakawan-aktif.tsx` bila halaman lain butuh.
- Bila daftar kosong atau gagal dimuat, ada tombol "Lanjutkan tanpa memilih" agar dashboard tidak terkunci.
- Berkas: `app/dashboard/pustakawan-aktif.tsx`, `app/dashboard/layout.tsx`, `app/dashboard/Sidebar.tsx`. Tanpa SQL baru.
- Layar "Masuk sebagai" bisa dipakai dengan keyboard: panah atas/bawah memindahkan sorotan (berputar), Enter masuk sebagai nama yang disorot; Tab hanya melewati kolom cari dan tombol lain.

## 2026-11-22 (kelola jabatan)
- Tombol "Kelola Jabatan" di halaman Data Pustakawan membuka modal untuk tambah, ubah nama, dan hapus jabatan. Menghapus jabatan mengosongkan jabatan pustakawan terkait (FK `ON DELETE SET NULL`). Kebijakan RLS `jabatan` diganti dari baca-saja menjadi semua operasi untuk pengguna login.
- Berkas: `app/dashboard/pustakawan/page.tsx`, `app/dashboard/pustakawan/components/jabatan-modal.tsx`, `app/dashboard/pustakawan/components/pustakawan-form-modal.tsx`.
- SQL: `docs/sql/perubahan/20261122-jabatan-kelola.sql` (jalankan SQL dulu, baru kode).

## 2026-11-22 (jabatan pustakawan)
- Data Pustakawan kini punya jabatan, dipilih lewat dropdown di modal. Tabel baru `jabatan` (daftar pilihan, diisi awal: Ketua, Wakil Ketua, Sekretaris, Bendahara, Anggota; RLS baca saja untuk pengguna login) dan kolom `pustakawan.jabatan_id` (FK, boleh kosong, ON DELETE SET NULL).
- Berkas: `app/dashboard/pustakawan/page.tsx`, `app/dashboard/pustakawan/components/pustakawan-form-modal.tsx`.
- SQL: `docs/sql/perubahan/20261122-pustakawan-jabatan.sql` (jalankan SQL dulu, baru kode).

## 2026-11-22 (data pustakawan)
- Halaman baru `/dashboard/pustakawan` (Data Pustakawan: nama saja; tambah, edit, hapus, cari) dan menu "Pustakawan" di grup Sistem (id 25). Tabel baru `pustakawan` (RLS: hanya pengguna login). Tabel `petugas_master` (absensi petugas) tidak diubah dan belum terhubung.
- Berkas: `app/dashboard/pustakawan/page.tsx`, `app/dashboard/pustakawan/components/pustakawan-form-modal.tsx`, `app/dashboard/navigation.ts`.
- SQL: `docs/sql/perubahan/20261122-pustakawan.sql` (jalankan SQL dulu, baru kode).

## 2026-11-22 (beranda dan ringkasan)
- Beranda `/dashboard` kini hanya ucapan selamat datang (teks besar di tengah). Isi beranda lama (grafik pengunjung, kartu statistik, peminjaman terbaru, koleksi) dipindah ke halaman baru `/dashboard/ringkasan`, dan menu "Ringkasan" ditambahkan di sidebar grup Utama (id 24).
- Berkas: `app/dashboard/page.tsx`, `app/dashboard/ringkasan/page.tsx`, `app/dashboard/navigation.ts`.

## 2026-11-22 (hapus tirai)
- Animasi pembuka tirai terbelah di beranda pustakawan dihapus; konten dashboard langsung tampil (animasi naik dan garis grafik tetap, jedanya dipangkas).
- Berkas: `app/dashboard/page.tsx`.

## 2026-11-22 (skema asli)
- Skema asli Supabase diambil dan disimpan; `supabase-peta.md` dan `aturan-bisnis.md` ditulis ulang dari skema asli (koreksi: sirkulasi menghapus baris KEMBALI, sirkulasi punya FK, `data_rak` adalah tabel). Temuan: RPC `opsi_data_pengunjung` tidak ada, RLS hampir terbuka penuh, slug karya ditimpa trigger.
- `zipit konteks` tidak lagi menyertakan `docs/sql/dump/` (hemat limit); sertakan manual bila perlu.
- Berkas: `docs/supabase-*.md`, `docs/aturan-bisnis.md`, `docs/sql/dump/*`, `tools/zipit.sh`, `docs/PANDUAN_AI.md`.

## 2026-11-22
- Dipasang sistem pembaruan via zip: `zipit` (ekspor), `updateit` (terapkan), panduan AI, peta Supabase, dan peta otomatis.
- Berkas: `docs/*`, `tools/*`, `AGENTS.md`.
