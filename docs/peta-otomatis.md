# Peta otomatis proyek

> Dibuat oleh `tools/peta.py` pada 2026-11-22. Jangan edit tangan; hasilnya ditimpa setiap `zipit` atau `updateit`.
> Dipakai AI sebagai pengganti membaca seluruh kode: cari halaman/tabel di sini, lalu minta hanya berkas yang perlu diubah.

## Teknologi (dari package.json)

next 16.2.10, react 19.2.4, tailwindcss ^4, @supabase/supabase-js ^2.110.2, typescript ^5

Pustaka lain: @fortawesome/fontawesome-svg-core, @fortawesome/free-solid-svg-icons, @fortawesome/react-fontawesome, @react-pdf/renderer, chart.js, exceljs, jsbarcode, lucide-react, react-chartjs-2, sharp

## Halaman

| URL | Berkas | Baris | Data |
|---|---|---|---|
| `/` | `app/page.tsx` | 742 | client; tabel: biblio, eksemplar; rpc: search_biblio |
| `/dashboard` | `app/dashboard/page.tsx` | 10 |  |
| `/dashboard/about` | `app/dashboard/about/page.tsx` | 488 |  |
| `/dashboard/absensi` | `app/dashboard/absensi/page.tsx` | 495 | client; tabel: jadwal_detail, jam_master, rekap_absensi |
| `/dashboard/admin_karya` | `app/dashboard/admin_karya/page.tsx` | 76 |  |
| `/dashboard/barcode` | `app/dashboard/barcode/page.tsx` | 752 | client; tabel: biblio, eksemplar |
| `/dashboard/bibliografi` | `app/dashboard/bibliografi/page.tsx` | 601 | client; tabel: biblio, eksemplar |
| `/dashboard/cari-buku` | `app/dashboard/cari-buku/page.tsx` | 369 | client; tabel: biblio |
| `/dashboard/daftar-peminjam` | `app/dashboard/daftar-peminjam/page.tsx` | 1295 | client; tabel: eksemplar |
| `/dashboard/data_pengunjung` | `app/dashboard/data_pengunjung/page.tsx` | 19 |  |
| `/dashboard/keanggotaan` | `app/dashboard/keanggotaan/page.tsx` | 531 | client |
| `/dashboard/label` | `app/dashboard/label/page.tsx` | 728 | client; tabel: biblio, eksemplar |
| `/dashboard/manajemen-absensi` | `app/dashboard/manajemen-absensi/page.tsx` | 1315 | client; tabel: jadwal_detail, jam_master, petugas_master, rekap_absensi |
| `/dashboard/manajemen_kategori` | `app/dashboard/manajemen_kategori/page.tsx` | 688 | client |
| `/dashboard/manajemen_rak` | `app/dashboard/manajemen_rak/page.tsx` | 533 | client; tabel: eksemplar, kategori |
| `/dashboard/poin` | `app/dashboard/poin/page.tsx` | 12 |  |
| `/dashboard/pustakawan` | `app/dashboard/pustakawan/page.tsx` | 537 | client; tabel: jabatan, pustakawan_akun |
| `/dashboard/rekap` | `app/dashboard/rekap/page.tsx` | 939 | client; tabel: rekap_absensi |
| `/dashboard/ringkasan` | `app/dashboard/ringkasan/page.tsx` | 792 | client; tabel: sirkulasi; rpc: get_daily_visitors |
| `/dashboard/sirkulasi` | `app/dashboard/sirkulasi/page.tsx` | 1174 | client; tabel: anggota, biblio, eksemplar, sirkulasi |
| `/hapus-kunjungan` | `app/hapus-kunjungan/page.tsx` | 496 | client; tabel: data_pengunjung |
| `/karya-tulis` | `app/karya-tulis/page.tsx` | 78 |  |
| `/karya-tulis/[slug]` | `app/karya-tulis/[slug]/page.tsx` | 231 |  |
| `/kirim-karya` | `app/kirim-karya/page.tsx` | 49 |  |
| `/leaderboard` | `app/leaderboard/page.tsx` | 206 | client |
| `/login` | `app/login/page.tsx` | 19 |  |

## Route handler (API / PDF)

- `/karya-tulis/[slug]/pdf` → `app/karya-tulis/[slug]/pdf/route.tsx` (210 baris)

## Berkas pendukung per folder

Format: `berkas` (baris) — komentar pembuka / data yang dipakai.

**app/**
- `layout.tsx` (127) — Ganti dengan domain asli, atau set NEXT_PUBLIC_SITE_URL di .env
- `manifest.ts` (22)
- `robots.ts` (15) — app/robots.ts
- `sitemap.ts` (11) — app/sitemap.ts

**app/components/**
- `InstallPrompt.tsx` (83) — client
- `ServiceWorkerRegister.tsx` (16) — client
- `book-detail-modal.tsx` (536) — Lama peminjaman (hari). Pinjam tgl 1 -> jatuh tempo tgl 5, tgl 6 sudah terlambat. — client; tabel: anggota, eksemplar, sirkulasi
- `hero-search.tsx` (609) — client; rpc: suggest_biblio
- `i-VisitorProfileModal.tsx` (1169) — client
- `visitor-modal.tsx` (1078) — client; tabel: anggota, biblio, data_pengunjung, kategori

**app/dashboard/**
- `Sidebar.tsx` (762) — client
- `gerbang-akses.tsx` (57) — Membatasi halaman dashboard sesuai akses menu akun. — client
- `layout.tsx` (29)
- `navigation.ts` (146) — ───────────────────────── Types ─────────────────────────
- `pustakawan-aktif.tsx` (430) — ───────────────────────── Konteks pustakawan yang sedang bertugas ───────────────────────── — client; tabel: pustakawan, pustakawan_akun

**app/dashboard/admin_karya/**
- `actions.ts` (241) — Login dan sidebar sudah ditangani di tempat lain, jadi tidak ada pemeriksaan sesi di sini. — server-action; tabel: anggota, karya
- `db.ts` (19) — Halaman petugas memakai klien anon yang sama dengan situs publik.
- `kueri.ts` (69) — Berkas ini hanya dipakai di server (page.tsx dan actions.ts). — tabel: karya
- `slug.ts` (16) — Salinan buatSlug dari kirim-karya/actions.ts (berkas 'use server' tidak bisa mengekspor fungsi biasa
- `tipe.ts` (44) — Jumlah karya yang dimuat per halaman. Kecil agar halaman tetap ringan.
- `tombol.ts` (12) — Tombol "timbul": kotak bersudut lengkung dengan bayangan solid (tanpa blur) di bawahnya.

**app/dashboard/admin_karya/components/**
- `aksi-karya.tsx` (109) — client
- `daftar-karya.tsx` (224) — client
- `editor-karya.tsx` (259) — client
- `tambah-karya.tsx` (257) — client

**app/dashboard/bibliografi/components/**
- `EksemplarFormModal.tsx` (345) — ───────────────────────── Types ───────────────────────── — client
- `KategoriSelect.tsx` (422) — ───────────────────────── Types ───────────────────────── — client; tabel: kategori
- `RakSelect.tsx` (437) — ───────────────────────── Types ───────────────────────── — client; tabel: data_rak
- `book-form-modal.tsx` (700) — ───────────────────────── Types ───────────────────────── — client
- `raised-buttons.ts` (31) — Gaya tombol timbul (raised) yang dipakai bersama.

**app/dashboard/data_pengunjung/**
- `ekspor.ts` (131)
- `gambar.ts` (157) — Gambar PNG digambar langsung di canvas (tanpa library), jadi hasilnya sama di semua perangkat
- `konfigurasi.ts` (179) — tabel: data_pengunjung

**app/dashboard/data_pengunjung/components/**
- `data-mentah.tsx` (204) — client
- `data-pengunjung.tsx` (468) — client; tabel: data_pengunjung; rpc: opsi_data_pengunjung
- `grafik.tsx` (133) — Batang vertikal. Tinggi dalam px agar tidak bergantung pada tinggi induk. — client
- `panel-grafik.tsx` (170) — client; rpc: statistik_pengunjung
- `penjelajah-pengunjung.tsx` (335) — client; rpc: folder_pengunjung

**app/dashboard/keanggotaan/components/**
- `member-form-modal.tsx` (400) — ───────────────────────── Types (dipakai juga oleh halaman) ───────────────────────── — client

**app/dashboard/manajemen_kategori/components/**
- `kategori-form-modal.tsx` (330) — ───────────────────────── Types (dipakai juga oleh halaman) ───────────────────────── — client

**app/dashboard/manajemen_rak/components/**
- `rak-form-modal.tsx` (411) — ───────────────────────── Types (dipakai juga oleh halaman) ───────────────────────── — client; tabel: kategori

**app/dashboard/poin/components/**
- `anggota-bermutasi.tsx` (338) — client; tabel: anggota, kategori_poin
- `dua-kolom.tsx` (100) — Elemen yang menggulung halaman: induk terdekat ber-overflow auto/scroll, atau dokumen itu sendiri. — client
- `edit-mutasi.tsx` (269) — client; tabel: mutasi_poin
- `form-poin.tsx` (279) — Naik saat riwayat diubah dari tab lain, supaya riwayat di sini dimuat ulang. — client; tabel: anggota, kategori_poin, mutasi_poin
- `kelola-kategori.tsx` (349) — client; tabel: kategori_poin
- `pilih-anggota.tsx` (216) — client; tabel: anggota
- `poin-tambahan.tsx` (91) — Naik setiap kali kategori berubah, supaya dropdown di form ikut diperbarui — client
- `riwayat-poin.tsx` (366) — Naikkan angka ini untuk memuat ulang daftar dari awal (mis. setelah poin baru disimpan). — client; tabel: mutasi_poin
- `ui.tsx` (79)

**app/dashboard/pustakawan/**
- `actions.ts` (272) — Aksi server untuk akun pustakawan. Memakai SUPABASE_SERVICE_ROLE_KEY (hanya di server) — server-action; tabel: accounts, pustakawan, pustakawan_akun
- `akun-tipe.ts` (33) — Tipe dan aturan akun pustakawan, dipakai halaman (client) dan server action.

**app/dashboard/pustakawan/components/**
- `akun-modal.tsx` (380) — null = pustakawan ini belum punya akun login — client
- `jabatan-modal.tsx` (320) — Jumlah pustakawan per jabatan (kunci: id jabatan) — client
- `pustakawan-form-modal.tsx` (210) — ───────────────────────── Types (dipakai juga oleh halaman) ───────────────────────── — client
- `sandi-saya-modal.tsx` (230) — Ganti kata sandi akun sendiri. Dipakai semua pustakawan, tidak butuh hak super admin. — client

**app/dashboard/sirkulasi/components/**
- `ResultCard.tsx` (371) — ───────────────────────── Types (dipakai bersama page.tsx) ───────────────────────── — client

**app/karya-tulis/**
- `data.ts` (154) — null untuk karya dari non-santri (tidak terhubung ke tabel anggota) — tabel: anggota, karya
- `layout.tsx` (5)

**app/karya-tulis/[slug]/**
- `loading.tsx` (26)

**app/karya-tulis/components/**
- `gambar-karya.tsx` (31) — true untuk gambar di bagian atas halaman (dimuat lebih dulu, membantu LCP) — client
- `isi-karya.tsx` (32) — true untuk puisi/syair: baris dan bait dipertahankan, rata kiri
- `json-ld.tsx` (9) — Data terstruktur untuk mesin pencari (schema.org). Karakter "<" di-escape agar aman dari injeksi.
- `karya-aksi.tsx` (69) — Cadangan jika akses clipboard ditolak — client
- `karya-list.tsx` (261) — client
- `karya-shell.tsx` (204) — Sesuaikan dengan alamat halaman/form pengiriman karya Anda — client

**app/kirim-karya/**
- `actions.ts` (150) — Jika SUPABASE_SERVICE_ROLE_KEY tersedia (hanya di server), pakai itu agar pencarian anggota — server-action; tabel: anggota, karya
- `konfigurasi.ts` (39) — Pengaturan halaman kirim karya. Sesuaikan bagian bertanda "SESUAIKAN" dengan database Anda.
- `layout.tsx` (5)

**app/kirim-karya/components/**
- `form-kirim-karya.tsx` (264) — client
- `gaya.ts` (8) — Gaya tombol bersama: kotak bersudut sedikit bulat, tampak timbul lewat bayangan solid (tanpa blur),
- `pilih-anggota.tsx` (198) — Dropdown pencarian anggota: hasil dibatasi (BATAS.hasilMaks) dan pencarian ditunda (debounce). — client

**app/leaderboard/components/**
- `VisitorProfileModal.tsx` (306) — client
- `vp-charts.tsx` (169) — Chart SVG/CSS ringan, animasi hanya transform + opacity — client
- `vp-data.ts` (182) — tabel: anggota, data_pengunjung, kategori
- `vp-emblem.tsx` (46) — client
- `vp-mutasi-poin.tsx` (363) — Kartu mutasi poin bergaya folder. — client; tabel: kategori_poin, mutasi_poin
- `vp-paging.tsx` (94) — Buang karakter yang punya arti khusus di filter PostgREST / pola ilike
- `vp-reveal.tsx` (118) — Scroll reveal (IntersectionObserver, hanya transform + opacity) — client
- `vp-riwayat.tsx` (124) — Kartu riwayat kunjungan (data_pengunjung): tinggi tetap, scroll di dalam, pencarian, muat lebih bany — client; tabel: data_pengunjung
- `vp-types.ts` (163) — Tipe, konstanta, dan util kecil untuk profil pengunjung
- `vp-ui.tsx` (233) — ---------- Tombol: satu-satunya elemen yang timbul. Sudut bulat; turun saat disentuh/diklik -------- — client

**app/leaderboard/components2/**
- `lb-atoms.tsx` (69) — Angka berhitung naik (langsung ke DOM, tanpa re-render per frame) — client
- `lb-data.ts` (131) — Semua logika data leaderboard: pencarian (debounce), halaman pertama, muat lebih banyak, statistik j — client
- `lb-podium.tsx` (186) — client
- `lb-rank-list.tsx` (75) — Gambar rank disimpan trigger di bucket rank-badges dengan nama NAMA_RANK.jpg (huruf kapital) — client
- `lb-row.tsx` (135) — ---------- Baris peringkat ---------- — client
- `lb-sidebar.tsx` (152) — client
- `lb-styles.ts` (22)
- `lb-types.ts` (49) — Satu definisi kolom agar header & baris selalu sejajar

**app/login/**
- `LeftPanel.tsx` (154) — Daftar kalimat yang diketik bergantian (dibuat di luar komponen agar stabil) — client
- `RightForm.tsx` (169) — Ref untuk Auto Focus pada input username — client

**lib/**
- `supabase.ts` (10)

## Tabel Supabase → berkas yang memakainya

- **accounts** (1): `app/dashboard/pustakawan/actions.ts`
- **anggota** (10): `app/components/book-detail-modal.tsx`, `app/components/visitor-modal.tsx`, `app/dashboard/admin_karya/actions.ts`, `app/dashboard/poin/components/anggota-bermutasi.tsx`, `app/dashboard/poin/components/form-poin.tsx`, `app/dashboard/poin/components/pilih-anggota.tsx`, `app/dashboard/sirkulasi/page.tsx`, `app/karya-tulis/data.ts`, `app/kirim-karya/actions.ts`, `app/leaderboard/components/vp-data.ts`
- **biblio** (7): `app/components/visitor-modal.tsx`, `app/dashboard/barcode/page.tsx`, `app/dashboard/bibliografi/page.tsx`, `app/dashboard/cari-buku/page.tsx`, `app/dashboard/label/page.tsx`, `app/dashboard/sirkulasi/page.tsx`, `app/page.tsx`
- **data_pengunjung** (6): `app/components/visitor-modal.tsx`, `app/dashboard/data_pengunjung/components/data-pengunjung.tsx`, `app/dashboard/data_pengunjung/konfigurasi.ts`, `app/hapus-kunjungan/page.tsx`, `app/leaderboard/components/vp-data.ts`, `app/leaderboard/components/vp-riwayat.tsx`
- **data_rak** (1): `app/dashboard/bibliografi/components/RakSelect.tsx`
- **eksemplar** (8): `app/components/book-detail-modal.tsx`, `app/dashboard/barcode/page.tsx`, `app/dashboard/bibliografi/page.tsx`, `app/dashboard/daftar-peminjam/page.tsx`, `app/dashboard/label/page.tsx`, `app/dashboard/manajemen_rak/page.tsx`, `app/dashboard/sirkulasi/page.tsx`, `app/page.tsx`
- **jabatan** (1): `app/dashboard/pustakawan/page.tsx`
- **jadwal_detail** (2): `app/dashboard/absensi/page.tsx`, `app/dashboard/manajemen-absensi/page.tsx`
- **jam_master** (2): `app/dashboard/absensi/page.tsx`, `app/dashboard/manajemen-absensi/page.tsx`
- **karya** (4): `app/dashboard/admin_karya/actions.ts`, `app/dashboard/admin_karya/kueri.ts`, `app/karya-tulis/data.ts`, `app/kirim-karya/actions.ts`
- **kategori** (5): `app/components/visitor-modal.tsx`, `app/dashboard/bibliografi/components/KategoriSelect.tsx`, `app/dashboard/manajemen_rak/components/rak-form-modal.tsx`, `app/dashboard/manajemen_rak/page.tsx`, `app/leaderboard/components/vp-data.ts`
- **kategori_poin** (4): `app/dashboard/poin/components/anggota-bermutasi.tsx`, `app/dashboard/poin/components/form-poin.tsx`, `app/dashboard/poin/components/kelola-kategori.tsx`, `app/leaderboard/components/vp-mutasi-poin.tsx`
- **mutasi_poin** (4): `app/dashboard/poin/components/edit-mutasi.tsx`, `app/dashboard/poin/components/form-poin.tsx`, `app/dashboard/poin/components/riwayat-poin.tsx`, `app/leaderboard/components/vp-mutasi-poin.tsx`
- **petugas_master** (1): `app/dashboard/manajemen-absensi/page.tsx`
- **pustakawan** (2): `app/dashboard/pustakawan-aktif.tsx`, `app/dashboard/pustakawan/actions.ts`
- **pustakawan_akun** (3): `app/dashboard/pustakawan-aktif.tsx`, `app/dashboard/pustakawan/actions.ts`, `app/dashboard/pustakawan/page.tsx`
- **rekap_absensi** (3): `app/dashboard/absensi/page.tsx`, `app/dashboard/manajemen-absensi/page.tsx`, `app/dashboard/rekap/page.tsx`
- **sirkulasi** (3): `app/components/book-detail-modal.tsx`, `app/dashboard/ringkasan/page.tsx`, `app/dashboard/sirkulasi/page.tsx`

## RPC (fungsi database) → berkas

- **folder_pengunjung**: `app/dashboard/data_pengunjung/components/penjelajah-pengunjung.tsx`
- **get_daily_visitors**: `app/dashboard/ringkasan/page.tsx`
- **opsi_data_pengunjung**: `app/dashboard/data_pengunjung/components/data-pengunjung.tsx`
- **search_biblio**: `app/page.tsx`
- **statistik_pengunjung**: `app/dashboard/data_pengunjung/components/panel-grafik.tsx`
- **suggest_biblio**: `app/components/hero-search.tsx`

## Variabel lingkungan (hanya nama, nilai ada di .env.local)

- `NEXT_PUBLIC_SITE_URL`: `app/karya-tulis/data.ts`, `app/layout.tsx`, `app/robots.ts`, `app/sitemap.ts`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: `app/components/visitor-modal.tsx`, `app/hapus-kunjungan/page.tsx`, `app/leaderboard/components/vp-data.ts`, `app/page.tsx`, `lib/supabase.ts`
- `NEXT_PUBLIC_SUPABASE_URL`: `app/components/visitor-modal.tsx`, `app/dashboard/admin_karya/db.ts`, `app/dashboard/pustakawan/actions.ts`, `app/hapus-kunjungan/page.tsx`, `app/kirim-karya/actions.ts`, `app/leaderboard/components/vp-data.ts`, `app/leaderboard/components2/lb-rank-list.tsx`, `app/page.tsx`, `lib/supabase.ts`
- `SUPABASE_SERVICE_ROLE_KEY`: `app/dashboard/admin_karya/db.ts`, `app/dashboard/pustakawan/actions.ts`, `app/kirim-karya/actions.ts`
