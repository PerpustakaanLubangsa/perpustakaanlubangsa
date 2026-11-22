# Peta Supabase

Status: berdasarkan skema asli yang diambil 2026-11-22. Kolom lengkap ada di `docs/supabase-skema-asli.md`; isi fungsi/view/kebijakan di `docs/sql/dump/` (baca hanya bila perlu mengubahnya).

## Koneksi
- Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (publik, terlihat di browser), `SUPABASE_SERVICE_ROLE_KEY` (rahasia, hanya server), `NEXT_PUBLIC_SITE_URL` (opsional). Nilai ada di `.env.local` dan Vercel, tidak pernah dibagikan.
- `lib/supabase.ts`: klien tunggal (anon key). `app/page.tsx` dan `visitor-modal.tsx` membuat klien sendiri dari env yang sama.
- `app/kirim-karya/actions.ts` (`'use server'`): memakai service role bila ada (melewati RLS), bila tidak memakai klien anon.

## Auth
- Login: `signInWithPassword` dengan email `<username>@lubangsa.com` (`app/login/RightForm.tsx`). Tabel `accounts` (id = `auth.users.id`, kolom role/status_akun) diisi fungsi `handle_new_user()`; trigger-nya kemungkinan di `auth.users` (tidak ikut dump schema public).
- Akun individu pustakawan: tabel `pustakawan_akun` (`pustakawan_id` PK → `pustakawan` CASCADE, `user_id` unik → `auth.users` CASCADE, `username`, `role` `super_admin`/`pustakawan`, `menu_ids` integer[] = id menu di `navigation.ts`). RLS: pengguna login hanya membaca barisnya sendiri, super admin membaca semua (`adalah_super_admin()`, SECURITY DEFINER; akun tanpa baris dianggap super admin = akun bersama lama). Tidak ada kebijakan tulis: semua tulis lewat `app/dashboard/pustakawan/actions.ts` (service role, memeriksa token dan peran pemanggil).
- Dashboard: `pustakawan-aktif.tsx` memuat baris akun sendiri; tanpa baris = akun lama (akses penuh + layar pilih nama). `gerbang-akses.tsx` memblokir halaman di luar `menu_ids`. Ini pembatas tampilan, bukan RLS data lain. Ganti kata sandi sendiri: `supabase.auth.updateUser` (verifikasi kata sandi lama). Peran `accounts.role` tidak dipakai.

## Tabel yang dipakai aplikasi ini
`anggota` adalah pusat; hampir semua tabel merujuk ke sini.

| Tabel | Fungsi | Relasi penting |
|---|---|---|
| `anggota` | santri/pemustaka; rank dan poin dihitung trigger | dirujuk `data_pengunjung.id_anggota` (SET NULL), `mutasi_poin.anggota_id` (CASCADE), `karya.anggota_id` (SET NULL), `sirkulasi.nis` → `anggota.nis` (CASCADE) dan `sirkulasi.member_id` (SET NULL) |
| `biblio` | judul/bibliografi; `topik` dan `daftar_kode` berupa jsonb array; `total_interaksi` kolom turunan | dirujuk `eksemplar.biblio_id` (CASCADE), `sirkulasi.biblio_id`, `data_pengunjung.id_buku` (SET NULL) |
| `eksemplar` | eksemplar fisik; `kode` unik; `status` `Tersedia`/`Dipinjam`; `lokasi_rak` berupa teks nama rak | `sirkulasi.kode_eksemplar` → `eksemplar.kode` (CASCADE) |
| `sirkulasi` | pinjaman yang SEDANG berjalan (baris KEMBALI otomatis dihapus, lihat trigger) | FK ke anggota (nis, member_id), biblio, eksemplar |
| `data_pengunjung` | log kunjungan/baca/pinjam; nama, nis, kamar, jenjang disalin trigger dari anggota | `id_anggota`, `id_buku` |
| `kategori` | klasifikasi buku, rentang `kode_awal`–`kode_akhir` (smallint) | dirujuk `data_rak.kategori_id` |
| `data_rak` | rak (TABEL, bukan view); `kode_awal/akhir` bertipe text | `kategori_id` → `kategori` |
| `karya` | karya tulis santri | `anggota_id` (SET NULL) |
| `mutasi_poin` | riwayat poin tambahan (positif/negatif) | `anggota_id`, `kategori_id` → `kategori_poin` |
| `kategori_poin` | jenis mutasi poin (`nama` unik) | id 7 = "Penurunan 15 hari"; id 8 ikut dikecualikan dari penghitungan "aktif" |
| `petugas_master`, `jam_master`, `jadwal_detail`, `rekap_absensi` | absensi petugas | terhubung lewat teks nama/shift, tanpa FK |

## Tabel di database yang tidak dipakai kode ini
`accounts`, `allowed_admins`, `feedback`, `pendaftaran`, `punishment`, `rak`, `status_pendaftaran`, `navigasi_menu` (menu kini di `navigation.ts`). Kemungkinan milik aplikasi lain di proyek Supabase yang sama. Jangan diubah atau dihapus tanpa konfirmasi.

## View
`leaderboard_anggota` (peringkat total dan per jenjang), `view_profil_anggota`, `v_aktivitas_terakhir` (dipakai penurunan poin), `view_log_harian/mingguan/bulanan/tahunan`, `view_pengunjung_hari_ini`, `view_sirkulasi_summary`, `view_library_dashboard_summary`, `view_statistik_pengunjung_bulanan`, `view_total_buku_populer`, `view_buku_dibaca_per_anggota`, `view_kategori_per_anggota`, `data_pengunjung_summary_v`. Definisi: `docs/sql/dump/view.sql`.

## RPC yang dipanggil kode
| Fungsi | Argumen | Hasil | Dipakai di |
|---|---|---|---|
| `search_biblio` | `q`, `lim`=60 | baris `biblio` (cari judul, penulis, topik; urut judul cocok lalu `jumlah_pinjam`) | `app/page.tsx` |
| `suggest_biblio` | `q`, `lim`=3 | (`teks`, `tipe`: judul/penulis/topik) | `hero-search.tsx` |
| `get_daily_visitors` | `p_days`=30 | (`tanggal`, `total`), zona Asia/Jakarta | beranda dashboard |
| `folder_pengunjung` | `p_tahun`, `p_bulan` | json `[{k,n,unik}]` | penjelajah data pengunjung |
| `statistik_pengunjung` | `p_dari`, `p_sampai`, `p_granularitas` | json (ringkasan, tren, aktivitas, kategori, jenjang, nama, buku) | panel grafik |
| `opsi_data_pengunjung` | (tanpa argumen) | seharusnya json `{jenjang, kategori, aktivitas}` | `data-pengunjung.tsx` |

**TEMUAN:** `opsi_data_pengunjung` tidak ada di dump fungsi. Panggilannya gagal dan hanya dicatat ke console, sehingga filter opsi di halaman Data Pengunjung kosong. Perlu dibuat, atau dipastikan ada di schema lain.

## Alur data lewat trigger (penting sebelum mengubah logika)
1. **Kunjungan baru** (`data_pengunjung` INSERT): `isi_pengunjung_dari_anggota` menyalin nama/nis/kamar/jenjang → `sync_statistik_buku` menambah `biblio.jumlah_baca/jumlah_pinjam` (lewat `id_buku`, cocok persis `aktivitas` = `Baca`/`Pinjam`) → `fungsi_update_statistik_dan_rank` menambah `anggota.total_baca/total_pinjam` bila `aktivitas ILIKE '%baca%'`/`'%pinjam%'` dan menetapkan `total_kunjungan = total_baca + total_pinjam`. Kunjungan tanpa `id_anggota` tidak mengubah statistik anggota. DELETE membalik hitungan.
2. **Poin dan rank**: perubahan `mutasi_poin` → `poin_tambahan = SUM(poin)` → UPDATE anggota → trigger `trg_func_proses_kalkulasi_anggota`: `total_poin = max(0, total_kunjungan + poin_tambahan)`, `rank`, dan `avatar_rank` (URL bucket `rank-badges/<RANK>.jpg`). Ambang rank ada di `docs/aturan-bisnis.md`.
3. **Sirkulasi**: baris dengan `status = 'KEMBALI'` langsung dihapus oleh `auto_delete_sirkulasi_kembali`. Tabel hanya berisi pinjaman aktif, jadi tidak ada histori peminjaman.
4. **Karya**: `fungsi_sinkronisasi_karya` (BEFORE INSERT/UPDATE judul/kategori/anggota_id) mengisi `penulis` bila kosong dan MENIMPA `slug` = judul-kategori-penulis (huruf kecil). Slug berakhiran acak dari kode aplikasi (`buatSlug`) jadi ikut tertimpa, dan tidak ada UNIQUE pada `karya.slug`: karya dengan judul, kategori, dan penulis sama berbagi slug.
5. **Anggota berubah**: nama/nis/organisasi disinkronkan ke `karya`; nama/nis/kamar/jenjang ke `data_pengunjung`; anggota dihapus → karyanya ditandai `status_anggota = 'tidak aktif'`.
6. **Penurunan poin harian**: fungsi `penurunan_poin_harian(p_hari)` menambah `mutasi_poin` negatif (kategori 7) untuk anggota tidak aktif. Belum diketahui apakah dijadwalkan (pg_cron tidak ikut dump).

## Fungsi yang ada tetapi tidak dipanggil kode ini
- Trigger function yang TIDAK terpasang di schema public: `fungsi_kurangi_statistik_anggota`, `fungsi_update_statistik_anggota`, `hitung_umur_dan_status_karya`, `otomatis_isi_profil_karya`, `protect_user_role`, `set_active_background`, `sinkronisasi_eksemplar_ke_biblio`, `sinkronisasi_link_rank`, `sinkronisasi_statistik_anggota`, `sync_eksemplar_status_on_circulation`, `sync_status_jsonb_from_sirkulasi`, `tentukan_rank_dan_avatar_anggota`, `trg_func_sinkronisasi_total_kunjungan`, `update_pendaftaran_updated_at`. (`handle_new_user` kemungkinan terpasang di `auth.users`.)
- Merujuk tabel yang tidak ada (rusak bila dipanggil): `add_klasifikasi`, `update_klasifikasi`, `delete_klasifikasi` (`klasifikasi_ddc`); `ambil_karya_paging`, `hapus_karya_kedaluwarsa`, `insert_karya_koran`, `kirim_karya_dan_foto` (`karya_koran_lubangsa`); `login_admin_lubangsa` (`akun_koran_lubangsa`); `get_library_stats` (`stats_aktivitas_harian`, `total_koleksi_buku`); `get_post_by_slug_or_id` (`posts`).
- Fungsi lain yang berjalan tetapi tidak dipakai kode ini: `sirkulasi_action_handler` (CONFIRM/EXTEND/RETURN; jatuh tempo +4 hari), `sirkulasi_search_handler`, `search_sirkulasi_book/member`, `get_catalog`, `get_bibliografi`, `get_book_detail`, `get_biblio_detail`, `get_pemustaka`, `manage_pemustaka` (menulis `anggota.password` yang tidak ada), `upsert_full_biblio`, `delete_biblio_full/_v2`, `increment_stat`, `get_reader_rankings`, `get_user_achievement`, `get_all_feedback`, `submit_feedback`, `submit_kunjungan_guestbook`, `search_anggota_guestbook`, `search_buku_guestbook`, `pindah_rak`, `insert_admin/update_admin/delete_admin`, `check_admin_login`, `verify_admin_login`, `get_library_summary_stats`, `get_monthly_library_stats`.
- Jangan menghapus fungsi di atas tanpa konfirmasi pengguna; bisa dipakai aplikasi lain.

## Storage
- Bucket publik `rank-badges` (`<RANK>.jpg`, dipakai `lb-rank-list.tsx` dan trigger rank). Daftar bucket lain belum diambil. `karya.foto_url` dan `anggota.avatar_rank` berupa URL teks.

## Keamanan — temuan dari kebijakan RLS
Anon key terlihat di browser, jadi kebijakan RLS adalah satu-satunya pagar. Kondisi sekarang (ringkasan di `docs/supabase-skema-asli.md`):
1. Hampir semua tabel punya kebijakan "Allow all operations for public" (`USING true`, `CHECK true`): siapa pun yang tahu URL + anon key bisa membaca, mengubah, dan menghapus `anggota`, `sirkulasi`, `biblio`, `eksemplar`, `data_pengunjung`, `rekap_absensi`, dan lainnya. `mutasi_poin` terbuka untuk anon (baca/tambah/ubah), jadi poin bisa dimanipulasi. `karya` RLS-nya mati.
2. `allowed_admins` (kolom `password`) dan `accounts` (kolom `role`) juga terbuka penuh untuk publik. `check_admin_login` membandingkan password sebagai teks polos, sedangkan `verify_admin_login` memakai hash (`crypt`): dua cara yang tidak konsisten. `protect_user_role` tidak terpasang di trigger mana pun di schema public.
3. Menyempitkan kebijakan akan memutus fitur yang kini memakai anon key (pemeriksaan login dashboard hanya di browser). Perbaikan harus bertahap dan diuji; jangan mengubah RLS tanpa persetujuan pengguna.
