-- Definisi view (schema public), diambil dari Supabase pada 2026-11-22. Hanya referensi.

create or replace view public.data_pengunjung_summary_v as
SELECT min((id)::text) AS id,
    nama,
    kamar,
    count(*) AS total_kunjungan,
    count(*) FILTER (WHERE (aktivitas ~~* 'baca'::text)) AS total_baca,
    count(*) FILTER (WHERE (aktivitas ~~* 'pinjam'::text)) AS total_pinjam,
    string_agg(judul_buku, ', '::text ORDER BY judul_buku) AS daftar_judul_buku
   FROM data_pengunjung
  GROUP BY nama, kamar;

create or replace view public.leaderboard_anggota as
SELECT id,
    nis,
    nama,
    jenjang,
    kamar,
    rank AS rank_nama,
    total_kunjungan,
    total_baca,
    total_pinjam,
    total_poin,
    avatar_rank,
    rank() OVER (ORDER BY COALESCE(total_poin, 0) DESC) AS peringkat,
    rank() OVER (PARTITION BY jenjang ORDER BY COALESCE(total_poin, 0) DESC) AS peringkat_jenjang
   FROM anggota a;

create or replace view public.v_aktivitas_terakhir as
WITH akt AS (
         SELECT data_pengunjung.id_anggota AS anggota_id,
            max(data_pengunjung.tanggal_kunjungan) AS tgl
           FROM data_pengunjung
          WHERE (data_pengunjung.id_anggota IS NOT NULL)
          GROUP BY data_pengunjung.id_anggota
        UNION ALL
         SELECT mutasi_poin.anggota_id,
            max(((mutasi_poin.created_at AT TIME ZONE 'Asia/Jakarta'::text))::date) AS max
           FROM mutasi_poin
          WHERE ((mutasi_poin.poin > 0) AND ((mutasi_poin.kategori_id IS NULL) OR (mutasi_poin.kategori_id <> ALL (ARRAY[(7)::bigint, (8)::bigint]))))
          GROUP BY mutasi_poin.anggota_id
        ), terakhir AS (
         SELECT akt.anggota_id,
            max(akt.tgl) AS tgl
           FROM akt
          GROUP BY akt.anggota_id
        )
 SELECT a.id AS anggota_id,
    a.nama,
    a.total_poin,
    COALESCE(t.tgl, ((a.created_at AT TIME ZONE 'Asia/Jakarta'::text))::date) AS tanggal_aktif_terakhir
   FROM (anggota a
     LEFT JOIN terakhir t ON ((t.anggota_id = a.id)));

create or replace view public.view_buku_dibaca_per_anggota as
SELECT id_anggota,
    nis,
    nama,
    judul_buku,
    count(*) AS total_dibaca
   FROM data_pengunjung
  WHERE ((judul_buku IS NOT NULL) AND (judul_buku <> ''::text))
  GROUP BY id_anggota, nis, nama, judul_buku;

create or replace view public.view_kategori_per_anggota as
SELECT id_anggota,
    nis,
    nama,
    kategori,
    count(*) AS total_kategori
   FROM data_pengunjung
  WHERE ((kategori IS NOT NULL) AND (kategori <> ''::text))
  GROUP BY id_anggota, nis, nama, kategori;

create or replace view public.view_library_dashboard_summary as
SELECT ( SELECT (count(*))::integer AS count
           FROM data_pengunjung
          WHERE ((EXTRACT(month FROM data_pengunjung.tanggal_kunjungan) = EXTRACT(month FROM CURRENT_DATE)) AND (EXTRACT(year FROM data_pengunjung.tanggal_kunjungan) = EXTRACT(year FROM CURRENT_DATE)))) AS hadir_bulan_ini,
    ( SELECT (count(*))::integer AS count
           FROM sirkulasi) AS total_pinjam,
    ( SELECT (count(*))::integer AS count
           FROM eksemplar) AS total_koleksi;

create or replace view public.view_log_bulanan as
WITH grouped_data AS (
         SELECT to_char((data_pengunjung.tanggal_kunjungan)::timestamp with time zone, 'YYYY-MM'::text) AS periode,
            data_pengunjung.kategori,
            data_pengunjung.jenjang,
            data_pengunjung.aktivitas,
            count(*) AS jml
           FROM data_pengunjung
          GROUP BY (to_char((data_pengunjung.tanggal_kunjungan)::timestamp with time zone, 'YYYY-MM'::text)), data_pengunjung.kategori, data_pengunjung.jenjang, data_pengunjung.aktivitas
        ), total_pencatatan AS (
         SELECT to_char((data_pengunjung.tanggal_kunjungan)::timestamp with time zone, 'YYYY-MM'::text) AS periode,
            count(data_pengunjung.id) AS total_pengunjung
           FROM data_pengunjung
          GROUP BY (to_char((data_pengunjung.tanggal_kunjungan)::timestamp with time zone, 'YYYY-MM'::text))
        )
 SELECT periode,
    total_pengunjung,
    ( SELECT jsonb_object_agg(COALESCE(g.kategori, 'Tidak Diketahui'::text), g.jml) AS jsonb_object_agg
           FROM grouped_data g
          WHERE ((g.periode = t.periode) AND (g.kategori IS NOT NULL))) AS rincian_kategori,
    ( SELECT jsonb_object_agg(COALESCE(g.jenjang, 'Tidak Diketahui'::text), g.jml) AS jsonb_object_agg
           FROM grouped_data g
          WHERE ((g.periode = t.periode) AND (g.jenjang IS NOT NULL))) AS rincian_jenjang,
    ( SELECT jsonb_object_agg(COALESCE(g.aktivitas, 'Tidak Diketahui'::text), g.jml) AS jsonb_object_agg
           FROM grouped_data g
          WHERE ((g.periode = t.periode) AND (g.aktivitas IS NOT NULL))) AS rincian_aktivitas
   FROM total_pencatatan t
  ORDER BY periode DESC;

create or replace view public.view_log_harian as
SELECT tanggal_kunjungan AS periode,
    count(id) AS total_pengunjung,
    ( SELECT jsonb_object_agg(COALESCE(s.kategori, 'Tidak Diketahui'::text), s.jml) AS jsonb_object_agg
           FROM ( SELECT dp2.kategori,
                    count(*) AS jml
                   FROM data_pengunjung dp2
                  WHERE (dp2.tanggal_kunjungan = dp.tanggal_kunjungan)
                  GROUP BY dp2.kategori) s) AS rincian_kategori,
    ( SELECT jsonb_object_agg(COALESCE(s.jenjang, 'Tidak Diketahui'::text), s.jml) AS jsonb_object_agg
           FROM ( SELECT dp2.jenjang,
                    count(*) AS jml
                   FROM data_pengunjung dp2
                  WHERE (dp2.tanggal_kunjungan = dp.tanggal_kunjungan)
                  GROUP BY dp2.jenjang) s) AS rincian_jenjang,
    ( SELECT jsonb_object_agg(COALESCE(s.aktivitas, 'Tidak Diketahui'::text), s.jml) AS jsonb_object_agg
           FROM ( SELECT dp2.aktivitas,
                    count(*) AS jml
                   FROM data_pengunjung dp2
                  WHERE (dp2.tanggal_kunjungan = dp.tanggal_kunjungan)
                  GROUP BY dp2.aktivitas) s) AS rincian_aktivitas
   FROM data_pengunjung dp
  GROUP BY tanggal_kunjungan
  ORDER BY tanggal_kunjungan DESC;

create or replace view public.view_log_mingguan as
WITH grouped_data AS (
         SELECT to_char((data_pengunjung.tanggal_kunjungan)::timestamp with time zone, 'IYYY-"W"IW'::text) AS periode,
            data_pengunjung.kategori,
            data_pengunjung.jenjang,
            data_pengunjung.aktivitas,
            count(*) AS jml
           FROM data_pengunjung
          GROUP BY (to_char((data_pengunjung.tanggal_kunjungan)::timestamp with time zone, 'IYYY-"W"IW'::text)), data_pengunjung.kategori, data_pengunjung.jenjang, data_pengunjung.aktivitas
        ), total_pencatatan AS (
         SELECT to_char((data_pengunjung.tanggal_kunjungan)::timestamp with time zone, 'IYYY-"W"IW'::text) AS periode,
            count(data_pengunjung.id) AS total_pengunjung
           FROM data_pengunjung
          GROUP BY (to_char((data_pengunjung.tanggal_kunjungan)::timestamp with time zone, 'IYYY-"W"IW'::text))
        )
 SELECT periode,
    total_pengunjung,
    ( SELECT jsonb_object_agg(COALESCE(g.kategori, 'Tidak Diketahui'::text), g.jml) AS jsonb_object_agg
           FROM grouped_data g
          WHERE ((g.periode = t.periode) AND (g.kategori IS NOT NULL))) AS rincian_kategori,
    ( SELECT jsonb_object_agg(COALESCE(g.jenjang, 'Tidak Diketahui'::text), g.jml) AS jsonb_object_agg
           FROM grouped_data g
          WHERE ((g.periode = t.periode) AND (g.jenjang IS NOT NULL))) AS rincian_jenjang,
    ( SELECT jsonb_object_agg(COALESCE(g.aktivitas, 'Tidak Diketahui'::text), g.jml) AS jsonb_object_agg
           FROM grouped_data g
          WHERE ((g.periode = t.periode) AND (g.aktivitas IS NOT NULL))) AS rincian_aktivitas
   FROM total_pencatatan t
  ORDER BY periode DESC;

create or replace view public.view_log_tahunan as
WITH grouped_data AS (
         SELECT to_char((data_pengunjung.tanggal_kunjungan)::timestamp with time zone, 'YYYY'::text) AS periode,
            data_pengunjung.kategori,
            data_pengunjung.jenjang,
            data_pengunjung.aktivitas,
            count(*) AS jml
           FROM data_pengunjung
          GROUP BY (to_char((data_pengunjung.tanggal_kunjungan)::timestamp with time zone, 'YYYY'::text)), data_pengunjung.kategori, data_pengunjung.jenjang, data_pengunjung.aktivitas
        ), total_pencatatan AS (
         SELECT to_char((data_pengunjung.tanggal_kunjungan)::timestamp with time zone, 'YYYY'::text) AS periode,
            count(data_pengunjung.id) AS total_pengunjung
           FROM data_pengunjung
          GROUP BY (to_char((data_pengunjung.tanggal_kunjungan)::timestamp with time zone, 'YYYY'::text))
        )
 SELECT periode,
    total_pengunjung,
    ( SELECT jsonb_object_agg(COALESCE(g.kategori, 'Tidak Diketahui'::text), g.jml) AS jsonb_object_agg
           FROM grouped_data g
          WHERE ((g.periode = t.periode) AND (g.kategori IS NOT NULL))) AS rincian_kategori,
    ( SELECT jsonb_object_agg(COALESCE(g.jenjang, 'Tidak Diketahui'::text), g.jml) AS jsonb_object_agg
           FROM grouped_data g
          WHERE ((g.periode = t.periode) AND (g.jenjang IS NOT NULL))) AS rincian_jenjang,
    ( SELECT jsonb_object_agg(COALESCE(g.aktivitas, 'Tidak Diketahui'::text), g.jml) AS jsonb_object_agg
           FROM grouped_data g
          WHERE ((g.periode = t.periode) AND (g.aktivitas IS NOT NULL))) AS rincian_aktivitas
   FROM total_pencatatan t
  ORDER BY periode DESC;

create or replace view public.view_pengunjung_hari_ini as
SELECT id,
    id_anggota AS anggota_id,
    nama,
    nis,
    jenjang,
    kamar,
    aktivitas,
    kategori,
    judul_buku,
    tanggal_kunjungan,
    created_at
   FROM data_pengunjung
  WHERE (tanggal_kunjungan = CURRENT_DATE);

create or replace view public.view_profil_anggota as
SELECT id,
    nis,
    nama,
    organisasi,
    kamar,
    rank,
    avatar_rank,
    total_poin,
    total_kunjungan,
    poin_tambahan,
    total_pinjam,
    total_baca
   FROM anggota;

create or replace view public.view_sirkulasi_summary as
SELECT count(id) FILTER (WHERE (status = 'DIPINJAM'::text)) AS peminjam_aktif,
    count(id) FILTER (WHERE (status = 'KEMBALI'::text)) AS histori_peminjaman,
    count(id) FILTER (WHERE ((status = 'DIPINJAM'::text) AND (tgl_kembali IS NULL) AND ((CURRENT_DATE - tgl_pinjam) > 4))) AS jumlah_keterlambatan
   FROM sirkulasi;

create or replace view public.view_statistik_pengunjung_bulanan as
SELECT (EXTRACT(month FROM tanggal_kunjungan))::integer AS bulan,
    count(id) AS total_kunjungan
   FROM data_pengunjung
  WHERE (EXTRACT(year FROM tanggal_kunjungan) = EXTRACT(year FROM CURRENT_DATE))
  GROUP BY ((EXTRACT(month FROM tanggal_kunjungan))::integer)
  ORDER BY ((EXTRACT(month FROM tanggal_kunjungan))::integer);

create or replace view public.view_total_buku_populer as
SELECT judul_buku,
    kategori,
    count(id) AS total_dibaca
   FROM data_pengunjung
  WHERE ((judul_buku IS NOT NULL) AND (judul_buku <> ''::text))
  GROUP BY judul_buku, kategori
  ORDER BY (count(id)) DESC;
