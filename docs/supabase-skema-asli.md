# Skema asli Supabase (schema public)

Diambil langsung dari database pada 2026-11-22 lewat `docs/sql/00-ambil-skema.sql`. Ini sumber kebenaran untuk kolom dan relasi.
Peta yang lebih mudah dibaca ada di `docs/supabase-peta.md`. Isi lengkap fungsi, view, dan kebijakan ada di `docs/sql/dump/` (jangan dibaca kecuali perlu mengubahnya).
Perbarui berkas ini setiap struktur berubah (ambil ulang kueri 1, 2b, dan 4).

## Tabel dan view (kueri 1)

### accounts (tabel)
- id uuid NOT NULL
- email text NOT NULL
- full_name text
- username text
- role text DEFAULT 'user'::text
- status_akun text DEFAULT 'active'::text
- created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
- UNIQUE (email)
- PRIMARY KEY (id)
- FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE

### allowed_admins (tabel)
- id uuid NOT NULL DEFAULT gen_random_uuid()
- username text NOT NULL
- password text NOT NULL
- role text NOT NULL
- created_at timestamp with time zone DEFAULT now()
- UNIQUE (username)
- PRIMARY KEY (id)

### anggota (tabel)
- id uuid NOT NULL DEFAULT gen_random_uuid()
- created_at timestamp with time zone DEFAULT now()
- updated_at timestamp with time zone DEFAULT now()
- nis text NOT NULL
- nama text NOT NULL
- jenjang text NOT NULL
- organisasi text
- kamar text
- role text NOT NULL DEFAULT 'anggota'::text
- rank text DEFAULT 'Warrior'::text
- total_kunjungan integer DEFAULT 0
- total_baca integer DEFAULT 0
- total_pinjam integer DEFAULT 0
- poin_tambahan integer DEFAULT 0
- total_poin integer DEFAULT 0
- avatar_rank text
- terakhir_aktif timestamp with time zone
- UNIQUE (nis)
- PRIMARY KEY (id)

### biblio (tabel)
- id uuid NOT NULL DEFAULT gen_random_uuid()
- judul text NOT NULL
- penulis text
- isbn_issn text
- penerbit text
- tahun_terbit text
- deskripsi_fisik text
- sampul_url text
- abstrak text
- topik jsonb DEFAULT '[]'::jsonb
- kategori text
- created_at timestamp with time zone DEFAULT now()
- updated_at timestamp with time zone DEFAULT now()
- jumlah_baca integer DEFAULT 0
- jumlah_pinjam integer DEFAULT 0
- daftar_kode jsonb DEFAULT '[]'::jsonb
- total_interaksi integer DEFAULT (COALESCE(jumlah_baca, 0) + COALESCE(jumlah_pinjam, 0))
- UNIQUE (id)
- PRIMARY KEY (id)

### data_pengunjung (tabel)
- id uuid NOT NULL DEFAULT gen_random_uuid()
- nama text
- kamar text
- jenjang text
- judul_buku text
- kategori text
- aktivitas text
- tanggal_kunjungan date
- created_at timestamp with time zone DEFAULT now()
- id_anggota uuid
- nis text
- id_buku uuid
- PRIMARY KEY (id)
- FOREIGN KEY (id_anggota) REFERENCES anggota(id) ON DELETE SET NULL
- FOREIGN KEY (id_buku) REFERENCES biblio(id) ON DELETE SET NULL

### data_pengunjung_summary_v (view)
- id text
- nama text
- kamar text
- total_kunjungan bigint
- total_baca bigint
- total_pinjam bigint
- daftar_judul_buku text

### data_rak (tabel)
- id integer NOT NULL
- nama_rak text NOT NULL
- kategori_id integer
- kode_awal text
- huruf_awal text
- kode_akhir text
- huruf_akhir text
- created_at timestamp with time zone NOT NULL DEFAULT now()
- UNIQUE (nama_rak)
- PRIMARY KEY (id)
- FOREIGN KEY (kategori_id) REFERENCES kategori(id) ON UPDATE CASCADE ON DELETE SET NULL

### eksemplar (tabel)
- id uuid NOT NULL DEFAULT gen_random_uuid()
- biblio_id uuid
- kode text NOT NULL
- nomor_panggil text
- lokasi_rak text
- status text DEFAULT 'Tersedia'::text
- created_at timestamp with time zone DEFAULT now()
- UNIQUE (kode)
- PRIMARY KEY (id)
- FOREIGN KEY (biblio_id) REFERENCES biblio(id) ON DELETE CASCADE

### feedback (tabel)
- id uuid NOT NULL DEFAULT gen_random_uuid()
- nama text NOT NULL
- pesan text NOT NULL
- is_liked boolean DEFAULT false
- created_at timestamp with time zone DEFAULT now()
- PRIMARY KEY (id)

### jadwal_detail (tabel)
- id bigint NOT NULL
- hari text NOT NULL
- shift text NOT NULL
- nama text NOT NULL
- created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
- PRIMARY KEY (id)

### jam_master (tabel)
- id bigint NOT NULL
- label text NOT NULL
- waktu text NOT NULL
- created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
- PRIMARY KEY (id)

### karya (tabel)
- id uuid NOT NULL DEFAULT gen_random_uuid()
- anggota_id uuid
- kategori character varying(50) NOT NULL
- judul text NOT NULL
- isi text NOT NULL
- dibuat_pada timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
- foto_url text
- penulis character varying(255)
- slug text
- status text NOT NULL DEFAULT 'pending'::text
- nis text
- organisasi text
- status_anggota text NOT NULL DEFAULT 'aktif'::text
- nama_anggota text
- PRIMARY KEY (id)
- FOREIGN KEY (anggota_id) REFERENCES anggota(id) ON DELETE SET NULL

### kategori (tabel)
- id integer NOT NULL DEFAULT nextval('kategori_id_seq'::regclass)
- nama_kategori text NOT NULL
- created_at timestamp with time zone DEFAULT now()
- kode_awal smallint
- kode_akhir smallint
- PRIMARY KEY (id)

### kategori_poin (tabel)
- id bigint NOT NULL
- nama text NOT NULL
- keterangan text
- created_at timestamp with time zone NOT NULL DEFAULT now()
- UNIQUE (nama)
- PRIMARY KEY (id)

### leaderboard_anggota (view)
- id uuid
- nis text
- nama text
- jenjang text
- kamar text
- rank_nama text
- total_kunjungan integer
- total_baca integer
- total_pinjam integer
- total_poin integer
- avatar_rank text
- peringkat bigint
- peringkat_jenjang bigint

### mutasi_poin (tabel)
- id bigint NOT NULL
- anggota_id uuid NOT NULL
- poin integer NOT NULL
- keterangan text
- created_at timestamp with time zone NOT NULL DEFAULT now()
- kategori_id bigint
- PRIMARY KEY (id)
- FOREIGN KEY (anggota_id) REFERENCES anggota(id) ON DELETE CASCADE
- FOREIGN KEY (kategori_id) REFERENCES kategori_poin(id) ON DELETE SET NULL

### navigasi_menu (tabel)
- id integer NOT NULL DEFAULT nextval('navigasi_menu_id_seq'::regclass)
- label character varying(50) NOT NULL
- icon character varying(100)
- page_url character varying(100)
- grup character varying(50)
- urutan integer DEFAULT 0
- role_akses character varying(20)[] DEFAULT '{admin,pustakawan}'::character varying[]
- is_active boolean DEFAULT true
- created_at timestamp with time zone DEFAULT now()
- PRIMARY KEY (id)

### pendaftaran (tabel)
- id bigint NOT NULL
- id_anggota uuid
- seksi character varying(255) NOT NULL
- simpan boolean NOT NULL DEFAULT false
- created_at timestamp with time zone DEFAULT now()
- PRIMARY KEY (id)
- FOREIGN KEY (id_anggota) REFERENCES anggota(id) ON DELETE CASCADE

### petugas_master (tabel)
- id bigint NOT NULL
- nama text NOT NULL
- created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
- PRIMARY KEY (id)

### punishment (tabel)
- id uuid NOT NULL DEFAULT gen_random_uuid()
- anggota_id uuid
- nama text NOT NULL
- poin integer DEFAULT 0
- alasan text
- created_at timestamp with time zone DEFAULT now()
- PRIMARY KEY (id)
- FOREIGN KEY (anggota_id) REFERENCES anggota(id) ON DELETE CASCADE

### rak (tabel)
- id integer NOT NULL DEFAULT nextval('rak_id_seq'::regclass)
- nama_rak text NOT NULL
- kode_klasifikasi text
- created_at timestamp with time zone DEFAULT now()
- nomor_urut integer
- PRIMARY KEY (id)

### rekap_absensi (tabel)
- id bigint NOT NULL
- tanggal date NOT NULL DEFAULT CURRENT_DATE
- nama text NOT NULL
- hari text NOT NULL
- shift text NOT NULL
- status text NOT NULL
- created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
- PRIMARY KEY (id)

### sirkulasi (tabel)
- id bigint NOT NULL
- created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
- tgl_pinjam date DEFAULT CURRENT_DATE
- tgl_kembali date
- nis text NOT NULL
- nama_anggota text
- kode_eksemplar text NOT NULL
- judul_buku text
- status text DEFAULT 'DIPINJAM'::text
- member_id uuid
- biblio_id uuid
- kamar text
- penulis text
- PRIMARY KEY (id)
- FOREIGN KEY (nis) REFERENCES anggota(nis) ON DELETE CASCADE
- FOREIGN KEY (biblio_id) REFERENCES biblio(id) ON DELETE SET NULL
- FOREIGN KEY (kode_eksemplar) REFERENCES eksemplar(kode) ON DELETE CASCADE
- FOREIGN KEY (member_id) REFERENCES anggota(id) ON DELETE SET NULL

### status_pendaftaran (tabel)
- id integer NOT NULL DEFAULT 1
- dibuka boolean NOT NULL DEFAULT false
- PRIMARY KEY (id)

### v_aktivitas_terakhir (view)
- anggota_id uuid
- nama text
- total_poin integer
- tanggal_aktif_terakhir date

### view_buku_dibaca_per_anggota (view)
- id_anggota uuid
- nis text
- nama text
- judul_buku text
- total_dibaca bigint

### view_kategori_per_anggota (view)
- id_anggota uuid
- nis text
- nama text
- kategori text
- total_kategori bigint

### view_library_dashboard_summary (view)
- hadir_bulan_ini integer
- total_pinjam integer
- total_koleksi integer

### view_log_bulanan (view)
- periode text
- total_pengunjung bigint
- rincian_kategori jsonb
- rincian_jenjang jsonb
- rincian_aktivitas jsonb

### view_log_harian (view)
- periode date
- total_pengunjung bigint
- rincian_kategori jsonb
- rincian_jenjang jsonb
- rincian_aktivitas jsonb

### view_log_mingguan (view)
- periode text
- total_pengunjung bigint
- rincian_kategori jsonb
- rincian_jenjang jsonb
- rincian_aktivitas jsonb

### view_log_tahunan (view)
- periode text
- total_pengunjung bigint
- rincian_kategori jsonb
- rincian_jenjang jsonb
- rincian_aktivitas jsonb

### view_pengunjung_hari_ini (view)
- id uuid
- anggota_id uuid
- nama text
- nis text
- jenjang text
- kamar text
- aktivitas text
- kategori text
- judul_buku text
- tanggal_kunjungan date
- created_at timestamp with time zone

### view_profil_anggota (view)
- id uuid
- nis text
- nama text
- organisasi text
- kamar text
- rank text
- avatar_rank text
- total_poin integer
- total_kunjungan integer
- poin_tambahan integer
- total_pinjam integer
- total_baca integer

### view_sirkulasi_summary (view)
- peminjam_aktif bigint
- histori_peminjaman bigint
- jumlah_keterlambatan bigint

### view_statistik_pengunjung_bulanan (view)
- bulan integer
- total_kunjungan bigint

### view_total_buku_populer (view)
- judul_buku text
- kategori text
- total_dibaca bigint

## RLS (ringkasan dari kueri 2)

Daftar penuh: `docs/sql/dump/rls-kebijakan.txt`. "publik" = role `public` (mencakup anon dan login). Tabel `punishment` dan `status_pendaftaran` tidak punya kebijakan (status RLS-nya belum diambil).

| Tabel | RLS | Jumlah kebijakan | Siapa bisa apa (tanpa syarat) |
|---|---|---|---|
| `accounts` | AKTIF | 2 | publik: SELECT/INSERT/UPDATE/DELETE |
| `allowed_admins` | AKTIF | 3 | publik: SELECT/INSERT/UPDATE/DELETE |
| `anggota` | AKTIF | 5 | publik: SELECT/INSERT/UPDATE/DELETE; anon: SELECT/UPDATE |
| `biblio` | AKTIF | 16 | publik: SELECT/INSERT/UPDATE/DELETE; login: SELECT/INSERT/UPDATE/DELETE; anon: SELECT/UPDATE/DELETE |
| `data_pengunjung` | AKTIF | 5 | publik: SELECT/INSERT/UPDATE/DELETE; anon: SELECT/INSERT |
| `data_rak` | AKTIF | 1 | anon: SELECT/INSERT/UPDATE/DELETE |
| `eksemplar` | AKTIF | 18 | publik: SELECT/INSERT/UPDATE/DELETE; login: SELECT/INSERT/UPDATE/DELETE; anon: SELECT/DELETE |
| `feedback` | AKTIF | 3 | publik: SELECT/INSERT/UPDATE/DELETE |
| `jadwal_detail` | AKTIF | 4 | anon: SELECT/INSERT/UPDATE/DELETE; publik: SELECT/INSERT/UPDATE/DELETE |
| `jam_master` | AKTIF | 4 | anon: SELECT/INSERT/UPDATE/DELETE; publik: SELECT/INSERT/UPDATE/DELETE |
| `karya` | mati | 3 | anon: SELECT/UPDATE/DELETE |
| `kategori` | AKTIF | 2 | publik: SELECT/INSERT/UPDATE/DELETE; anon: SELECT |
| `kategori_poin` | AKTIF | 5 | anon: SELECT; login: SELECT/INSERT/UPDATE/DELETE |
| `mutasi_poin` | AKTIF | 3 | anon: SELECT/INSERT/UPDATE |
| `navigasi_menu` | AKTIF | 1 | (bersyarat) |
| `pendaftaran` | AKTIF | 7 | anon: SELECT/INSERT/DELETE; publik: SELECT/INSERT/DELETE |
| `petugas_master` | AKTIF | 4 | anon: SELECT/INSERT/UPDATE/DELETE; publik: SELECT/INSERT/UPDATE/DELETE |
| `rak` | AKTIF | 1 | publik: SELECT/INSERT/UPDATE/DELETE |
| `rekap_absensi` | AKTIF | 2 | anon: SELECT/INSERT/UPDATE/DELETE; publik: SELECT/INSERT/UPDATE/DELETE |
| `sirkulasi` | AKTIF | 5 | publik: SELECT/INSERT/UPDATE/DELETE |

## Trigger (kueri 4)

- **anggota**
  - `trg_anggota_kalkulasi_otomatis` BEFORE INSERT/UPDATE → `trg_func_proses_kalkulasi_anggota()` (hitung total_poin, rank, avatar_rank)
  - `trg_terakhir_aktif` BEFORE UPDATE → `isi_terakhir_aktif()` (isi terakhir_aktif bila total_kunjungan/baca/pinjam naik)
  - `update_anggota_modtime` BEFORE UPDATE → `update_modified_column()`
  - `trg_sync_karya_dari_anggota` AFTER INSERT/UPDATE OF nama, nis, organisasi → `sync_karya_dari_anggota()`
  - `trg_sync_pengunjung_dari_anggota` AFTER UPDATE OF nama, nis, kamar, jenjang → `sync_pengunjung_dari_anggota()`
  - `trg_karya_tidak_aktif` BEFORE DELETE → `tandai_karya_tidak_aktif()` (karya anggota yang dihapus jadi 'tidak aktif')
- **biblio**: `update_biblio_modtime` BEFORE UPDATE → `update_modified_column()`
- **data_pengunjung**
  - `trg_isi_pengunjung_dari_anggota` BEFORE INSERT/UPDATE OF id_anggota → `isi_pengunjung_dari_anggota()` (salin nama, nis, kamar, jenjang dari anggota)
  - `trg_sync_statistik_buku` AFTER INSERT/UPDATE/DELETE → `sync_statistik_buku()` (jumlah_baca / jumlah_pinjam di biblio, lewat id_buku)
  - `trigger_update_statistik_anggota` AFTER INSERT/DELETE → `fungsi_update_statistik_dan_rank()` (hitung total_baca, total_pinjam, total_kunjungan anggota)
- **karya**
  - `trg_isi_karya_dari_anggota` BEFORE INSERT/UPDATE OF anggota_id → `isi_karya_dari_anggota()` (isi nama_anggota, nis, organisasi, status_anggota, penulis)
  - `trigger_karya_bi_bu` BEFORE INSERT/UPDATE OF judul, kategori, anggota_id → `fungsi_sinkronisasi_karya()` (isi penulis bila kosong dan MENIMPA slug = judul-kategori-penulis)
- **mutasi_poin**: `trg_mutasi_poin_changes` AFTER INSERT/UPDATE/DELETE → `trg_func_hitung_poin_tambahan()` (poin_tambahan anggota = jumlah semua mutasi)
- **sirkulasi**: `trigger_auto_delete_kembali` AFTER INSERT/UPDATE OF status → `auto_delete_sirkulasi_kembali()` (baris berstatus KEMBALI langsung DIHAPUS)

## Isi fungsi dan view

- Fungsi: `docs/sql/dump/fungsi.sql` (75 fungsi aplikasi, fungsi bahasa C bawaan pg_trgm dibuang).
- View: `docs/sql/dump/view.sql` (15 view).
- Belum diambil: status RLS tiap tabel (kueri 2b), indeks (kueri 6), bucket storage (kueri 7), jadwal pg_cron.
