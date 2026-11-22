# Aturan bisnis

Sumber: kode, skema database asli (2026-11-22), dan keterangan pemilik proyek. Ubah di sini bila aturan berubah, supaya AI tidak menebak.

## Peminjaman (sirkulasi)
- Masa pinjam 5 hari: pinjam tgl 1 → batas tgl 5 → tgl 6 sudah terlambat. Denda Rp1.000 per hari terlambat (`FINE_PER_DAY`, `LOAN_DAYS` di `app/dashboard/daftar-peminjam/page.tsx`). Di database: `view_sirkulasi_summary` menghitung terlambat bila `CURRENT_DATE - tgl_pinjam > 4`; `sirkulasi_action_handler` memberi jatuh tempo +4 hari.
- `sirkulasi.status` bernilai `DIPINJAM`. Begitu baris diisi `KEMBALI`, trigger `auto_delete_sirkulasi_kembali` MENGHAPUS barisnya. Tabel `sirkulasi` hanya berisi pinjaman aktif; riwayat pengembalian tidak tersimpan.
- `eksemplar.status`: `Tersedia` atau `Dipinjam`. Saat dipinjam status eksemplar diubah oleh kode (bukan trigger); bila simpan `sirkulasi` gagal, kode mengembalikannya (`app/dashboard/sirkulasi/page.tsx`).
- Sebelum menyimpan, sirkulasi memeriksa pinjaman aktif milik anggota (NIS) tersebut.
- Halaman Peminjam (`/dashboard/daftar-peminjam`) menampilkan buku yang belum kembali, filter "semua" atau "hanya yang terlambat", lengkap dengan hari terlambat dan denda.
- Kunci asing `sirkulasi`: `nis` → `anggota.nis`, `kode_eksemplar` → `eksemplar.kode`; menghapus anggota atau eksemplar ikut menghapus pinjamannya (CASCADE).

## Kunjungan
- Dicatat lewat modal buku tamu (`app/components/visitor-modal.tsx`) ke `data_pengunjung` (`aktivitas`, `judul_buku`, `kategori`, `id_anggota`, `id_buku`, `tanggal_kunjungan`). Nama, nis, kamar, jenjang disalin trigger dari `anggota` bila `id_anggota` ada.
- `anggota.total_baca` dan `total_pinjam` naik bila `aktivitas` mengandung kata "baca"/"pinjam" (tidak peka huruf besar). `total_kunjungan` = `total_baca + total_pinjam`: kunjungan yang bukan baca/pinjam tidak menambah poin. `biblio.jumlah_baca/jumlah_pinjam` naik hanya bila `id_buku` terisi dan `aktivitas` persis `Baca`/`Pinjam`.
- Halaman `/hapus-kunjungan` menghapus catatan; hapus membalik hitungan anggota.

## Poin dan rank
- `total_poin = max(0, total_kunjungan + poin_tambahan)`. `poin_tambahan` = jumlah semua `mutasi_poin` anggota (diatur di `/dashboard/poin`, jenis lewat `kategori_poin`).
- Rank dihitung trigger `trg_func_proses_kalkulasi_anggota()` pada setiap INSERT/UPDATE anggota. Ambang yang sama ada di `app/leaderboard/components/vp-types.ts` (`RANK_LEVELS`) dan HARUS sinkron:
  WARRIOR 0, ELITE 5, MASTER 10, GRANDMASTER 20, EPIC 30, LEGEND 40, MYTHIC 50, HONOR 60, GLORY 80, IMMORTAL 100, ASURA 150, ANUBIS 200, POSEIDON 250, ODIN 300, LUCIFER 350, FALAK 400, GABRIEL 500.
- `anggota.avatar_rank` berisi URL penuh gambar `rank-badges/<RANK>.jpg` (bucket publik), diisi trigger.
- Penurunan poin harian: anggota tanpa aktivitas selama 15 hari dikurangi 5 poin per hari lewat `mutasi_poin` kategori 7 ("Penurunan 15 hari"), masa tenggang data lama sampai 2026-10-11, tidak lebih dari total poin (fungsi `penurunan_poin_harian`). Aktivitas dihitung dari kunjungan dan mutasi poin positif di luar kategori 7 dan 8 (`v_aktivitas_terakhir`). Belum diketahui apakah fungsi ini dijadwalkan.
- Leaderboard: view `leaderboard_anggota` (peringkat keseluruhan dan per jenjang menurut `total_poin`).

## Karya tulis
- Alur: santri mengirim di `/kirim-karya` → status `pending` → petugas mengubah ke `approved` atau `rejected` di `/dashboard/admin_karya` → karya `approved` tampil di `/karya-tulis`.
- Status valid: `pending`, `approved`, `rejected`. `anggota_id` kosong berarti penulis bukan anggota terdaftar (`status_anggota = 'tidak aktif'`). Data anggota (nama, nis, organisasi) disalin dan disinkronkan trigger.
- Slug: trigger `fungsi_sinkronisasi_karya` menetapkan slug = judul-kategori-penulis (huruf kecil, non-alfanumerik jadi `-`) dan menimpa slug dari aplikasi. Slug tidak dijamin unik (lihat `docs/supabase-peta.md`).

## Absensi petugas
- Master: `petugas_master` (nama), `jam_master` (label shift + waktu), `jadwal_detail` (hari, shift, nama).
- Hasil harian: `rekap_absensi` (tanggal, nama, hari, shift, status). Status awal `Hadir`.
- Mengganti nama petugas atau label shift bisa ikut mengubah `jadwal_detail` dan `rekap_absensi` (opsi cascade di Manage Absen); hubungannya lewat teks, tanpa FK.

## Katalog
- `biblio` = judul (bibliografi); `eksemplar` = eksemplar fisik per judul (kode/barcode unik, nomor panggil, lokasi rak berupa nama rak, status). Menghapus `biblio` ikut menghapus eksemplarnya (CASCADE).
- `biblio.topik` dan `daftar_kode` berupa jsonb array. `tahun_terbit` bertipe teks.
- `kategori` memakai rentang kode klasifikasi (`kode_awal`–`kode_akhir`); `data_rak` (tabel) terhubung ke kategori lewat `kategori_id`.
- Pencarian publik memakai RPC `search_biblio` (judul, penulis, topik) dan `suggest_biblio`.

## Hak akses
- Peran `admin` dan `pustakawan` didefinisikan di `app/dashboard/navigation.ts` (admin-only: Poin Tambahan, Manage Absen). Penyaringan menu per peran sudah disiapkan tetapi BELUM dipakai Sidebar (semua menu tampil). Peran belum dibaca dari database (`accounts.role` ada tetapi tidak dipakai kode).
- Kebijakan RLS saat ini sangat terbuka; lihat bagian Keamanan di `docs/supabase-peta.md`.
