-- Dump fungsi database (schema public), diambil dari Supabase pada 2026-11-22.
-- Fungsi bawaan ekstensi pg_trgm (bahasa C) sengaja dibuang. Hanya referensi: edit lewat docs/sql/perubahan/.

CREATE OR REPLACE FUNCTION public.add_klasifikasi(p_kode text, p_nama text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    INSERT INTO klasifikasi_ddc (kode_ddc, nama_kategori)
    VALUES (p_kode, p_nama);
END;
$function$;

CREATE OR REPLACE FUNCTION public.ambil_karya_paging(p_search text DEFAULT ''::text, p_kategori text DEFAULT 'SEMUA'::text, p_limit integer DEFAULT 10, p_offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, created_at timestamp with time zone, nama_penulis text, judul_karya text, kategori_karya text, isi_karya text, bio_penulis text, gambar_url text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    k.id,
    k.created_at,
    k.nama_penulis,
    k.judul_karya,
    k.kategori_karya,
    k.isi_karya,
    k.bio_penulis,
    k.gambar_url
  FROM karya_koran_lubangsa k
  WHERE 
    -- Logika Pencarian (Nama Penulis atau Judul Karya)
    (p_search = '' OR k.nama_penulis ILIKE '%' || p_search || '%' OR k.judul_karya ILIKE '%' || p_search || '%')
    AND
    -- Logika Penyaringan Kategori
    (p_kategori = 'SEMUA' OR k.kategori_karya = p_kategori)
  -- Urutkan dari yang paling baru
  ORDER BY k.created_at DESC
  -- Batasan Paging untuk Infinite Scroll
  LIMIT p_limit
  OFFSET p_offset;
END;
$function$;

CREATE OR REPLACE FUNCTION public.auto_delete_sirkulasi_kembali()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Cek apakah status diubah atau diinput menjadi 'KEMBALI'
  IF NEW.status = 'KEMBALI' THEN
    DELETE FROM sirkulasi WHERE id = NEW.id;
    RETURN NULL; -- Menghentikan proses Simpan/Update biasa karena baris sudah dihapus
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_admin_login(p_username text, p_password text)
 RETURNS TABLE(status boolean, user_role text, display_name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        TRUE, 
        role, 
        username
    FROM allowed_admins
    WHERE username = p_username 
      AND password = p_password -- Catatan: Disarankan menggunakan hashing di produksi
    LIMIT 1;

    -- Jika tidak ditemukan, kembalikan status false
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::TEXT;
    END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_admin(target_user text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    DELETE FROM public.allowed_admins WHERE username = target_user;
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_biblio_full(p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    -- 1. Hapus semua eksemplar yang terhubung dengan ID bibliografi tersebut
    DELETE FROM public.eksemplar 
    WHERE biblio_id = p_id;

    -- 2. Hapus data utama di tabel bibliografi
    DELETE FROM public.biblio 
    WHERE id = p_id;

    -- Jika terjadi error di tengah jalan, PostgreSQL akan melakukan ROLLBACK otomatis
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_biblio_v2(p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    -- Karena sudah ON DELETE CASCADE, eksemplar otomatis ikut terhapus
    DELETE FROM public.biblio WHERE id = p_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_feedback_by_id(p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  DELETE FROM feedback WHERE id = p_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_klasifikasi(p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    DELETE FROM klasifikasi_ddc WHERE id = p_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.folder_pengunjung(p_tahun integer DEFAULT NULL::integer, p_bulan integer DEFAULT NULL::integer)
 RETURNS json
 LANGUAGE sql
 STABLE
AS $function$
  select coalesce(json_agg(json_build_object('k', k, 'n', n, 'unik', unik) order by k), '[]'::json)
  from (
    select
      case
        when p_tahun is null then extract(year from tanggal_kunjungan)::int
        when p_bulan is null then extract(month from tanggal_kunjungan)::int
        else least(5, (extract(day from tanggal_kunjungan)::int - 1) / 7 + 1)
      end as k,
      count(*) as n,
      count(distinct coalesce(id_anggota::text, nullif(nis, ''), nullif(nama, ''))) as unik
    from data_pengunjung
    where tanggal_kunjungan is not null
      and (
        p_tahun is null
        or (
          tanggal_kunjungan >= make_date(p_tahun, coalesce(p_bulan, 1), 1)
          and tanggal_kunjungan < (
            make_date(p_tahun, coalesce(p_bulan, 1), 1)
            + case when p_bulan is null then interval '1 year' else interval '1 month' end
          )::date
        )
      )
    group by 1
  ) t;
$function$;

CREATE OR REPLACE FUNCTION public.fungsi_kurangi_statistik_anggota()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Mengurangi jumlah jika data kunjungan dihapus
    IF OLD.anggota_id IS NOT NULL THEN
        UPDATE anggota
        SET 
            total_kunjungan = GREATEST(0, total_kunjungan - 1),
            total_baca = GREATEST(0, total_baca - (CASE WHEN OLD.aktivitas ILIKE '%baca%' THEN 1 ELSE 0 END)),
            total_pinjam = GREATEST(0, total_pinjam - (CASE WHEN OLD.aktivitas ILIKE '%pinjam%' THEN 1 ELSE 0 END))
        WHERE id = OLD.anggota_id;
    END IF;
    RETURN OLD;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fungsi_sinkronisasi_karya()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF TG_TABLE_NAME = 'karya' THEN
        IF NEW.penulis IS NULL OR btrim(NEW.penulis) = '' THEN
            NEW.penulis := NEW.nama_anggota;
        END IF;

        NEW.slug := LOWER(
            REGEXP_REPLACE(
                CONCAT(NEW.judul, '-', NEW.kategori, '-', NEW.penulis),
                '[^a-zA-Z0-9]+', '-', 'g'
            )
        );
    END IF;
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fungsi_update_statistik_anggota()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Jika data pengunjung baru memiliki anggota_id
    IF NEW.anggota_id IS NOT NULL THEN
        UPDATE anggota
        SET 
            total_kunjungan = total_kunjungan + 1,
            total_baca = total_baca + (CASE WHEN NEW.aktivitas ILIKE '%baca%' THEN 1 ELSE 0 END),
            total_pinjam = total_pinjam + (CASE WHEN NEW.aktivitas ILIKE '%pinjam%' THEN 1 ELSE 0 END)
        WHERE id = NEW.anggota_id;
    END IF;
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fungsi_update_statistik_dan_rank()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_baca integer;
    v_pinjam integer;
    v_kunjungan integer;
    v_poin_tambahan integer;
    v_total_poin integer;
    v_rank text;
BEGIN
    -- 1. Perbarui total_baca dan total_pinjam di tabel anggota menggunakan NEW.id_anggota / OLD.id_anggota
    IF (TG_OP = 'INSERT') THEN
        UPDATE anggota SET 
            total_baca = total_baca + (CASE WHEN NEW.aktivitas ILIKE '%baca%' THEN 1 ELSE 0 END),
            total_pinjam = total_pinjam + (CASE WHEN NEW.aktivitas ILIKE '%pinjam%' THEN 1 ELSE 0 END)
        WHERE id = NEW.id_anggota  -- <-- Diubah dari anggota_id menjadi id_anggota
        RETURNING total_baca, total_pinjam, poin_tambahan INTO v_baca, v_pinjam, v_poin_tambahan;
        
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE anggota SET 
            total_baca = GREATEST(0, total_baca - (CASE WHEN OLD.aktivitas ILIKE '%baca%' THEN 1 ELSE 0 END)),
            total_pinjam = GREATEST(0, total_pinjam - (CASE WHEN OLD.aktivitas ILIKE '%pinjam%' THEN 1 ELSE 0 END))
        WHERE id = OLD.id_anggota  -- <-- Diubah dari anggota_id menjadi id_anggota
        RETURNING total_baca, total_pinjam, poin_tambahan INTO v_baca, v_pinjam, v_poin_tambahan;
    END IF;

    -- 2. KALKULASI MATEMATIKA BERUNTUN
    v_kunjungan := COALESCE(v_baca, 0) + COALESCE(v_pinjam, 0);
    v_total_poin := v_kunjungan + COALESCE(v_poin_tambahan, 0);

    -- 3. LOGIKA GAMIFIKASI RANK BERDASARKAN TOTAL POIN
    IF v_total_poin >= 100 THEN v_rank := 'IMMORTAL';
    ELSIF v_total_poin >= 80 THEN v_rank := 'GLORY';
    ELSIF v_total_poin >= 60 THEN v_rank := 'HONOR';
    ELSIF v_total_poin >= 50 THEN v_rank := 'MYTHIC';
    ELSIF v_total_poin >= 40 THEN v_rank := 'LEGEND';
    ELSIF v_total_poin >= 30 THEN v_rank := 'EPIC';
    ELSIF v_total_poin >= 20 THEN v_rank := 'GRANDMASTER';
    ELSIF v_total_poin >= 10 THEN v_rank := 'MASTER';
    ELSIF v_total_poin >= 5  THEN v_rank := 'ELITE';
    ELSE v_rank := 'WARRIOR';
    END IF;

    -- 4. Sinkronisasikan hasil kalkulasi akhir ke tabel anggota
    UPDATE anggota 
    SET 
        total_kunjungan = v_kunjungan,
        total_poin = v_total_poin,
        rank = v_rank,
        avatar_rank = v_rank
    WHERE id = COALESCE(NEW.id_anggota, OLD.id_anggota); -- <-- Diubah dari anggota_id menjadi id_anggota

    RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_all_feedback()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    result JSON;
BEGIN
    SELECT json_agg(f ORDER BY created_at DESC)
    INTO result
    FROM public.feedback f;
    
    RETURN COALESCE(result, '[]'::json);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_biblio_detail(p_id uuid)
 RETURNS TABLE(biblio_data jsonb, eksemplar_data jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  return query
  select
    jsonb_build_object(
      'id', b.id, 'judul', b.judul, 'penulis', b.penulis, 'penerbit', b.penerbit,
      'tahun_terbit', b.tahun_terbit, 'isbn_issn', b.isbn_issn, 'kategori', b.kategori,
      'deskripsi_fisik', b.deskripsi_fisik, 'sampul_url', b.sampul_url,
      'abstrak', b.abstrak, 'topik', b.topik
    ) as biblio_data,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', e.id, 'kode', e.kode, 'nomor_panggil', e.nomor_panggil,
          'lokasi_rak', e.lokasi_rak, 'status', e.status
        )
      ) filter (where e.id is not null),
      '[]'::jsonb
    ) as eksemplar_data
  from public.biblio b
  left join public.eksemplar e on e.biblio_id = b.id
  where b.id = p_id
  group by b.id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_bibliografi(p_search text DEFAULT ''::text, p_limit integer DEFAULT 15, p_offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, judul text, penulis text, sampul_url text, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        b.id, 
        b.judul, 
        b.penulis, 
        b.sampul_url, 
        b.updated_at
    FROM public.biblio b
    WHERE 
        (p_search = '') OR 
        (b.judul ILIKE '%' || p_search || '%') OR 
        (b.penulis ILIKE '%' || p_search || '%')
    -- Urutan utama: Waktu perubahan/input terbaru di paling atas
    -- Urutan kedua: Jika waktu sama (mass insert), gunakan ID sebagai penentu
    ORDER BY b.updated_at DESC, b.id DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_book_detail(book_id uuid)
 RETURNS TABLE(id uuid, judul text, penulis text, penerbit text, isbn_issn text, tahun_terbit text, kategori text, deskripsi_fisik text, abstrak text, sampul_url text, topik jsonb, eksemplar jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        b.id, 
        COALESCE(b.judul, 'Tanpa Judul'), 
        COALESCE(b.penulis, 'ANONIM'), 
        COALESCE(b.penerbit, '-'), 
        COALESCE(b.isbn_issn, '-'), 
        COALESCE(b.tahun_terbit, '-'),
        COALESCE(b.kategori, '-'),
        COALESCE(b.deskripsi_fisik, '-'),
        COALESCE(b.abstrak, 'Tidak ada deskripsi.'), 
        b.sampul_url,
        b.topik,
        (SELECT jsonb_agg(jsonb_build_object(
            'kode', COALESCE(e.kode, '-'),
            'lokasi_rak', COALESCE(e.lokasi_rak, 'UMUM'),
            'nomor_panggil', COALESCE(e.nomor_panggil, '-'),
            'status', COALESCE(e.status, 'Tersedia')
         )) 
         FROM eksemplar e 
         WHERE e.biblio_id = b.id) as eksemplar
    FROM biblio b
    WHERE b.id = book_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_catalog(search_query text DEFAULT ''::text, page_size integer DEFAULT 18, page_number integer DEFAULT 0)
 RETURNS TABLE(id uuid, judul text, penulis text, sampul_url text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        b.id, 
        b.judul, 
        b.penulis, 
        b.sampul_url
    FROM biblio b
    WHERE 
        (search_query = '' OR 
         b.judul ILIKE '%' || search_query || '%' OR 
         b.penulis ILIKE '%' || search_query || '%')
    ORDER BY 
        -- Prioritas 1: Ada sampul (NOT NULL dan bukan string kosong)
        (CASE 
            WHEN b.sampul_url IS NOT NULL AND b.sampul_url <> '' THEN 1 
            ELSE 2 
         END) ASC,
        -- Prioritas 2: Tanggal terbaru
        b.created_at DESC
    LIMIT page_size
    OFFSET (page_number * page_size);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_daily_visitors(p_days integer DEFAULT 30)
 RETURNS TABLE(tanggal date, total bigint)
 LANGUAGE sql
 STABLE
AS $function$
  select d::date as tanggal, count(p.id) as total
  from generate_series(
         (now() at time zone 'Asia/Jakarta')::date - (p_days - 1),
         (now() at time zone 'Asia/Jakarta')::date,
         interval '1 day'
       ) as d
  left join public.data_pengunjung p on p.tanggal_kunjungan = d::date
  group by d
  order by d;
$function$;

CREATE OR REPLACE FUNCTION public.get_library_stats()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'pengunjung_hari_ini', (SELECT COALESCE(SUM(total), 0) FROM stats_aktivitas_harian WHERE tanggal = CURRENT_DATE AND aktivitas = 'Hadir'),
        'total_pinjam', (SELECT COALESCE(SUM(total), 0) FROM stats_aktivitas_harian WHERE aktivitas = 'Pinjam'),
        'total_koleksi', (SELECT total FROM total_koleksi_buku LIMIT 1)
    ) INTO result;
    
    RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_library_summary_stats()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE result JSON;
BEGIN
    SELECT row_to_json(v) INTO result FROM (SELECT * FROM view_library_dashboard_summary) v;
    RETURN result;
END; $function$;

CREATE OR REPLACE FUNCTION public.get_monthly_library_stats(target_year integer)
 RETURNS TABLE(bulan integer, total_kunjungan bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY SELECT v.bulan, v.total_kunjungan FROM view_statistik_pengunjung_bulanan v;
END; $function$;

CREATE OR REPLACE FUNCTION public.get_pemustaka(p_search text DEFAULT ''::text, p_limit integer DEFAULT 25, p_offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, nama text, nis text, jenjang text, kamar text, role text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        a.id, a.nama, a.nis, a.jenjang, a.kamar, a.role
    FROM anggota a
    WHERE 
        (p_search = '' OR a.nama ILIKE '%' || p_search || '%' OR a.nis ILIKE '%' || p_search || '%')
    ORDER BY a.nama ASC
    LIMIT p_limit
    OFFSET p_offset;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_post_by_slug_or_id(identifier text)
 RETURNS TABLE(id bigint, title text, slug text, body_content text, media_url text, thumbnail_url text, category text, type text, created_at timestamp with time zone, author_name text, author_avatar text)
 LANGUAGE plpgsql
AS $function$
begin
  return query
  select 
    p.id, p.title, p.slug, p.body_content, p.media_url, p.thumbnail_url, p.category, p.type, p.created_at,
    a.full_name as author_name,
    a.avatar_url as author_avatar
  from posts p
  left join accounts a on p.fk_post_author = a.id
  where (p.slug = identifier or p.id::text = identifier)
    and p.status = 'published'
  limit 1;
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_reader_rankings()
 RETURNS TABLE(nama text, kamar text, jenjang text, total_kunjungan bigint, total_baca bigint, total_pinjam bigint, history text[])
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        dp.nama::TEXT,
        MAX(dp.kamar)::TEXT,
        MAX(dp.jenjang)::TEXT,
        COUNT(*)::BIGINT,
        COUNT(*) FILTER (WHERE dp.aktivitas = 'Baca')::BIGINT,
        COUNT(*) FILTER (WHERE dp.aktivitas = 'Pinjam')::BIGINT,
        ARRAY_AGG(DISTINCT dp.judul_buku) FILTER (WHERE dp.judul_buku IS NOT NULL AND dp.judul_buku <> '')
    FROM 
        data_pengunjung dp
    WHERE 
        -- Gunakan ::TIMESTAMP agar bisa dikonversi ke timezone Jakarta
        EXTRACT(YEAR FROM (COALESCE(dp.tanggal_kunjungan, dp.created_at::date)::TIMESTAMP AT TIME ZONE 'Asia/Jakarta')) 
        = 
        EXTRACT(YEAR FROM (NOW() AT TIME ZONE 'Asia/Jakarta'))
    GROUP BY 
        dp.nama
    ORDER BY 
        4 DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_achievement(p_nama text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    -- Menggunakan timezone Asia/Jakarta untuk penentuan tahun
    v_current_year INT := EXTRACT(YEAR FROM (NOW() AT TIME ZONE 'Asia/Jakarta'));
    v_profile RECORD;
    v_stats RECORD;
    v_history TEXT;
    v_rank TEXT;
BEGIN
    -- 1. Ambil data profil dasar
    SELECT nama, jenjang, kamar INTO v_profile 
    FROM anggota 
    WHERE nama = p_nama 
    LIMIT 1;

    -- Jika tidak ditemukan di tabel anggota, gunakan nama dari input
    IF v_profile.nama IS NULL THEN
        v_profile.nama := p_nama;
        v_profile.jenjang := '-';
        v_profile.kamar := '-';
    END IF;

    -- 2. Hitung statistik tahun berjalan (menggunakan timezone Jakarta)
    SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE aktivitas = 'Baca') as baca,
        COUNT(*) FILTER (WHERE aktivitas = 'Pinjam') as pinjam
    INTO v_stats
    FROM data_pengunjung
    WHERE nama = p_nama 
    AND EXTRACT(YEAR FROM (created_at AT TIME ZONE 'Asia/Jakarta')) = v_current_year;

    -- 3. Ambil riwayat judul buku unik (Sudah Diperbaiki dari judul_buko ke judul_buku)
    SELECT string_agg(DISTINCT judul_buku, ', ') INTO v_history
    FROM (
        SELECT judul_buku 
        FROM data_pengunjung 
        WHERE nama = p_nama 
        AND judul_buku IS NOT NULL  -- PERBAIKAN DI SINI
        AND EXTRACT(YEAR FROM (created_at AT TIME ZONE 'Asia/Jakarta')) = v_current_year
        ORDER BY created_at DESC 
        LIMIT 15
    ) sub;

    -- 4. Logika Penentuan Rank
    IF v_stats.total >= 100 THEN v_rank := 'Immortal';
    ELSIF v_stats.total >= 80 THEN v_rank := 'Glory';
    ELSIF v_stats.total >= 60 THEN v_rank := 'Honor';
    ELSIF v_stats.total >= 50 THEN v_rank := 'Mythic';
    ELSIF v_stats.total >= 40 THEN v_rank := 'Legend';
    ELSIF v_stats.total >= 30 THEN v_rank := 'Epic';
    ELSIF v_stats.total >= 20 THEN v_rank := 'Grandmaster';
    ELSIF v_stats.total >= 10 THEN v_rank := 'Master';
    ELSIF v_stats.total >= 5  THEN v_rank := 'Elite';
    ELSE v_rank := 'Warrior';
    END IF;

    -- 5. Kembalikan semua dalam satu objek JSON
    RETURN json_build_object(
        'nama', v_profile.nama,
        'jenjang', v_profile.jenjang,
        'kamar', v_profile.kamar,
        'rank', v_rank,
        'total', COALESCE(v_stats.total, 0),
        'baca', COALESCE(v_stats.baca, 0),
        'pinjam', COALESCE(v_stats.pinjam, 0),
        'history', COALESCE(v_history, 'Belum ada riwayat buku.'),
        'year', v_current_year
    );
END; $function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.accounts (id, email, full_name, username, role, status_akun)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)), 
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)), 
    'user', 
    'active'
  );
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.hapus_karya_kedaluwarsa()
 RETURNS TABLE(id_terhapus uuid, url_gambar_terhapus text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    -- Menghapus data dan mengembalikan kolom id serta gambar_url 
    -- agar aplikasi Anda tahu file mana saja yang harus dihapus dari Storage
    RETURN QUERY 
    DELETE FROM public.karya_koran_lubangsa
    WHERE status = 'hapus'
    RETURNING id, gambar_url;
END;
$function$;

CREATE OR REPLACE FUNCTION public.hitung_umur_dan_status_karya()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Menghitung selisih hari
    NEW.umur_hari := EXTRACT(DAY FROM (NOW() - NEW.created_at));
    
    -- Menentukan status berdasarkan umur
    IF NEW.umur_hari > 14 THEN
        NEW.status := 'hapus';
    ELSE
        NEW.status := 'aman';
    END IF;
    
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.increment_stat(row_id uuid, column_name text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
begin
  execute format('update biblio set %I = coalesce(%I, 0) + 1 where id = %L', column_name, column_name, row_id);
end;
$function$;

CREATE OR REPLACE FUNCTION public.insert_admin(new_user text, new_pass text, role_type text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    INSERT INTO public.allowed_admins (username, password, role)
    VALUES (
        new_user, 
        crypt(new_pass, gen_salt('bf')), -- Ini bagian yang melakukan hashing
        role_type
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.insert_karya_koran(p_nama_penulis text, p_kategori_karya text, p_judul_karya text, p_isi_karya text, p_bio_penulis text DEFAULT NULL::text, p_gambar_url text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Proses insert data ke tabel karya_koran_lubangsa
  INSERT INTO public.karya_koran_lubangsa (
    nama_penulis, 
    kategori_karya, 
    judul_karya, 
    isi_karya, 
    bio_penulis, 
    gambar_url
  )
  VALUES (
    p_nama_penulis, 
    p_kategori_karya, 
    p_judul_karya, 
    p_isi_karya, 
    p_bio_penulis, 
    p_gambar_url
  );

  -- Mengembalikan respons sukses ke JavaScript frontend
  RETURN json_build_object('status', 'success', 'message', 'Karya berhasil disimpan');

EXCEPTION WHEN OTHERS THEN
  -- Menangkap error jika terjadi kendala di database
  RETURN json_build_object('status', 'error', 'message', SQLERRM);
END;
$function$;

CREATE OR REPLACE FUNCTION public.isi_karya_dari_anggota()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  a public.anggota%ROWTYPE;
BEGIN
  IF NEW.anggota_id IS NOT NULL THEN
    SELECT * INTO a FROM public.anggota WHERE id = NEW.anggota_id;
    IF FOUND THEN
      NEW.nama_anggota   := a.nama;
      NEW.nis            := a.nis;
      NEW.organisasi     := a.organisasi;
      NEW.status_anggota := 'aktif';
      IF NEW.penulis IS NULL OR btrim(NEW.penulis) = '' THEN
        NEW.penulis := a.nama;
      END IF;
    END IF;
  ELSE
    NEW.status_anggota := 'tidak aktif';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.isi_pengunjung_dari_anggota()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  a public.anggota%ROWTYPE;
BEGIN
  IF NEW.id_anggota IS NOT NULL THEN
    SELECT * INTO a FROM public.anggota WHERE id = NEW.id_anggota;
    IF FOUND THEN
      NEW.nama    := a.nama;
      NEW.nis     := a.nis;
      NEW.kamar   := a.kamar;
      NEW.jenjang := a.jenjang;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.isi_terakhir_aktif()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if coalesce(new.total_kunjungan,0) > coalesce(old.total_kunjungan,0)
  or coalesce(new.total_baca,0)      > coalesce(old.total_baca,0)
  or coalesce(new.total_pinjam,0)    > coalesce(old.total_pinjam,0) then
    new.terakhir_aktif := now();
  end if;
  return new;
end $function$;

CREATE OR REPLACE FUNCTION public.kirim_karya_dan_foto(p_nama_penulis text, p_kategori_karya text, p_judul_karya text, p_bio_penulis text, p_isi_karya text, p_file_base64 text, p_file_name text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_gambar_url TEXT := NULL;
BEGIN
  -- 1. Logika upload ke bucket storage via ekstensi storage/plpgsql (jika p_file_base64 tidak kosong)
  IF p_file_base64 IS NOT NULL THEN
    -- Di sini Anda bisa memanggil fungsi storage Supabase di server, 
    -- Atau jika RPC Anda didesain untuk menyimpan string base64 langsung ke kolom tabel/bucket.
    -- v_gambar_url := 'https://heosadzwckwmbjhxydtm.supabase.co/storage/v1/object/public/foto_koran/karya_uploads/' || p_file_name;
  END IF;

  -- 2. Insert ke data tabel utama
  INSERT INTO karya_koran_lubangsa (nama_penulis, kategori_karya, judul_karya, bio_penulis, isi_karya, gambar_url)
  VALUES (p_nama_penulis, p_kategori_karya, p_judul_karya, p_bio_penulis, p_isi_karya, v_gambar_url);
END;
$function$;

CREATE OR REPLACE FUNCTION public.login_admin_lubangsa(p_username text, p_password text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_exists BOOLEAN;
BEGIN
  -- Memeriksa apakah ada username dan password yang cocok di tabel akun_koran_lubangsa
  SELECT EXISTS (
    SELECT 1 
    FROM akun_koran_lubangsa 
    WHERE username = p_username 
      AND password = p_password -- Menggunakan pencocokan string langsung
  ) INTO v_exists;

  RETURN v_exists;
END;
$function$;

CREATE OR REPLACE FUNCTION public.manage_pemustaka(p_action text, p_id uuid DEFAULT NULL::uuid, p_nama text DEFAULT NULL::text, p_nis text DEFAULT NULL::text, p_jenjang text DEFAULT NULL::text, p_kamar text DEFAULT NULL::text, p_role text DEFAULT NULL::text, p_password text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_result json;
    v_final_role text;
BEGIN
    -- Validasi Role: Paksa ke 'anggota' jika mencoba memasukkan 'admin'
    v_final_role := CASE 
        WHEN p_role = 'pustakawan' THEN 'pustakawan' 
        ELSE 'anggota' 
    END;

    IF p_action = 'DELETE' THEN
        DELETE FROM anggota WHERE id = p_id;
        v_result := json_build_object('status', 'deleted');

    ELSIF p_action = 'SAVE' THEN
        IF p_id IS NULL THEN
            INSERT INTO anggota (nama, nis, jenjang, kamar, role, password)
            VALUES (p_nama, p_nis, p_jenjang, UPPER(p_kamar), v_final_role, p_password);
            v_result := json_build_object('status', 'inserted');
        ELSE
            IF p_password IS NOT NULL AND p_password <> '' THEN
                UPDATE anggota SET 
                    nama = p_nama, nis = p_nis, jenjang = p_jenjang, 
                    kamar = UPPER(p_kamar), role = v_final_role, password = p_password
                WHERE id = p_id;
            ELSE
                UPDATE anggota SET 
                    nama = p_nama, nis = p_nis, jenjang = p_jenjang, 
                    kamar = UPPER(p_kamar), role = v_final_role
                WHERE id = p_id;
            END IF;
            v_result := json_build_object('status', 'updated');
        END IF;
    END IF;

    RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.otomatis_isi_profil_karya()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    -- Mengambil data profil dari tabel anggota berdasarkan anggota_id yang diinput
    SELECT nama, foto, jenjang, kamar, organisasi, role, rank
    INTO NEW.nama, NEW.foto, NEW.jenjang, NEW.kamar, NEW.organisasi, NEW.role, NEW.rank
    FROM anggota
    WHERE id = NEW.anggota_id;

    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.penurunan_poin_harian(p_hari date DEFAULT ((now() AT TIME ZONE 'Asia/Jakarta'::text))::date)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  c_mulai    constant date   := date '2026-10-11'; -- masa tenggang data lama
  c_ambang   constant int    := 15;                -- hari tidak aktif sebelum mulai dikurangi
  c_poin     constant int    := 5;                 -- pengurangan per hari
  c_kategori constant bigint := 7;                 -- kategori "Penurunan 15 hari"
  v_waktu    timestamptz;
  n integer;
begin
  -- guard: tanggal masa depan tidak diizinkan
  if p_hari > (now() at time zone 'Asia/Jakarta')::date then
    raise exception 'p_hari tidak boleh di masa depan';
  end if;

  v_waktu := case
    when p_hari = (now() at time zone 'Asia/Jakarta')::date then now()
    else p_hari::timestamp at time zone 'Asia/Jakarta'
  end;

  with kandidat as (
    select v.anggota_id,
           v.total_poin,
           v.tanggal_aktif_terakhir,
           greatest(v.tanggal_aktif_terakhir, c_mulai) as dasar
    from v_aktivitas_terakhir v
    where coalesce(v.total_poin, 0) > 0
      and v.tanggal_aktif_terakhir is not null
  ),
  hitung as (
    select k.*,
           p_hari - greatest(
             k.dasar + c_ambang,
             coalesce((select max((m.created_at at time zone 'Asia/Jakarta')::date)
                       from mutasi_poin m
                       where m.anggota_id = k.anggota_id
                         and m.kategori_id = c_kategori),
                      date '1900-01-01')
           ) as hari_belum
    from kandidat k
  ),
  final as (
    select h.*,
           least(c_poin * h.hari_belum, h.total_poin) as poin_kurang
    from hitung h
    where h.hari_belum > 0
  )
  insert into mutasi_poin (anggota_id, poin, keterangan, kategori_id, created_at)
  select anggota_id,
         -poin_kurang,
         format('Penurunan otomatis: tidak aktif %s hari (terakhir aktif %s), %s hari x %s poin = %s poin',
                p_hari - tanggal_aktif_terakhir,
                to_char(tanggal_aktif_terakhir, 'DD-MM-YYYY'),
                hari_belum, c_poin, poin_kurang),
         c_kategori,
         v_waktu
  from final;

  get diagnostics n = row_count;
  return n;
end $function$;

CREATE OR REPLACE FUNCTION public.pindah_rak(p_id text, p_target text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare
  v_ids  text[];
  v_new  text[];
  v_from int;
  v_to   int;
begin
  select array_agg(id::text order by nomor_urut asc nulls last, nama_rak asc, id asc)
    into v_ids
    from public.rak;

  v_from := array_position(v_ids, p_id);
  v_to   := array_position(v_ids, p_target);

  if v_from is null or v_to is null or v_from = v_to then
    return;
  end if;

  -- Cabut rak yang dipindah, lalu sisipkan di posisi rak tujuan
  v_new := array_remove(v_ids, p_id);
  v_new := array_cat(
             array_append(v_new[1:v_to - 1], p_id),
             v_new[v_to:coalesce(array_length(v_new, 1), 0)]
           );

  -- Fase 1: kosongkan nomor lama (NULL tidak kena unique constraint)
  update public.rak set nomor_urut = null where nomor_urut is not null;

  -- Fase 2: tulis nomor baru 1..N
  update public.rak r
     set nomor_urut = t.pos
    from unnest(v_new) with ordinality as t(id, pos)
   where r.id::text = t.id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.protect_user_role()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- 1. HANYA EMAIL ANDA YANG BOLEH MELAKUKAN UPDATE ROLE
  -- auth.jwt() -> 'email' mengambil email user yang sedang login saat ini
  IF (auth.jwt() ->> 'email') = '<EMAIL_SUPER_ADMIN>' THEN
    RETURN NEW;
  ELSE
    -- Jika orang lain (termasuk admin lain) mencoba mengubah, kembalikan ke data lama
    RAISE NOTICE 'Akses ditolak: Hanya Super Admin yang bisa mengubah role.';
    RETURN OLD;
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.search_anggota_guestbook(search_term text)
 RETURNS TABLE(nama text, nis text, kamar text, jenjang text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY 
    SELECT a.nama, a.nis, a.kamar, a.jenjang 
    FROM anggota a
    WHERE a.nama ILIKE '%' || search_term || '%' 
    OR a.nis ILIKE '%' || search_term || '%'
    LIMIT 10;
END; $function$;

CREATE OR REPLACE FUNCTION public.search_biblio(q text, lim integer DEFAULT 60)
 RETURNS SETOF biblio
 LANGUAGE sql
 STABLE
AS $function$
  with p as (
    select '%' || replace(replace(replace(trim(q), '\', '\\'), '%', '\%'), '_', '\_') || '%' as pat
  )
  select b.*
  from biblio b, p
  where b.judul ilike p.pat
     or b.penulis ilike p.pat
     or exists (
       select 1
       from jsonb_array_elements_text(
              case when jsonb_typeof(b.topik) = 'array' then b.topik else '[]'::jsonb end
            ) as t
       where t ilike p.pat
     )
  order by
    (b.judul ilike p.pat) desc,
    b.jumlah_pinjam desc nulls last,
    b.judul asc
  limit lim;
$function$;

CREATE OR REPLACE FUNCTION public.search_buku_guestbook(search_term text)
 RETURNS TABLE(judul text, penulis text, kategori text, kode text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY 
    SELECT DISTINCT ON (b.judul) 
        b.judul, 
        b.penulis, 
        b.kategori, 
        e.kode
    FROM biblio b
    -- Menggunakan biblio_id sesuai struktur tabel eksemplar Anda
    LEFT JOIN eksemplar e ON b.id = e.biblio_id 
    WHERE b.judul ILIKE '%' || search_term || '%' 
       OR b.penulis ILIKE '%' || search_term || '%'
       OR e.kode ILIKE '%' || search_term || '%'
    ORDER BY b.judul, e.kode ASC 
    LIMIT 10;
END; $function$;

CREATE OR REPLACE FUNCTION public.search_sirkulasi_book(p_query text)
 RETURNS TABLE(id uuid, kode text, status text, lokasi_rak text, judul text, penulis text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        e.id, e.kode, e.status, e.lokasi_rak, b.judul, b.penulis
    FROM eksemplar e
    JOIN biblio b ON e.biblio_id = b.id
    WHERE 
        e.kode ILIKE '%' || p_query || '%' OR 
        b.judul ILIKE '%' || p_query || '%'
    LIMIT 20;
END; $function$;

CREATE OR REPLACE FUNCTION public.search_sirkulasi_member(p_query text)
 RETURNS TABLE(id uuid, nis text, nama text, jenjang text, kamar text, organisasi text, loan_kode text, loan_judul text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        a.id, a.nis, a.nama, a.jenjang, a.kamar, a.organisasi,
        s.kode_eksemplar as loan_kode, s.judul_buku as loan_judul
    FROM anggota a
    LEFT JOIN sirkulasi s ON a.id = s.member_id AND s.status = 'DIPINJAM'
    WHERE 
        a.nama ILIKE '%' || p_query || '%' OR 
        a.nis ILIKE '%' || p_query || '%' OR
        a.kamar ILIKE '%' || p_query || '%'
    LIMIT 20;
END; $function$;

CREATE OR REPLACE FUNCTION public.set_active_background()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF NEW.is_active = true THEN
        UPDATE system_backgrounds SET is_active = false WHERE id <> NEW.id;
    END IF;
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sinkronisasi_eksemplar_ke_biblio()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    target_biblio_id UUID;
BEGIN
    -- Menentukan biblio_id mana yang perlu diupdate datanya
    IF (TG_OP = 'DELETE') THEN
        target_biblio_id := OLD.biblio_id;
    ELSE
        target_biblio_id := NEW.biblio_id;
    END IF;

    -- Jika ada target biblio_id, lakukan agregasi data eksemplar terbaru
    IF target_biblio_id IS NOT NULL THEN
        UPDATE biblio
        SET 
            -- Mengisi array teks berisi kode saja
            daftar_kode = (
                SELECT coalesce(jsonb_agg(kode), '[]'::jsonb)
                FROM eksemplar
                WHERE biblio_id = target_biblio_id AND kode IS NOT NULL
            ),
            -- Mengisi array objek berisi kombinasi kode dan lokasi_rak
            daftar_eksemplar_rak = (
                SELECT coalesce(jsonb_agg(jsonb_build_object('kode', kode, 'rak', lokasi_rak)), '[]'::jsonb)
                FROM eksemplar
                WHERE biblio_id = target_biblio_id AND kode IS NOT NULL
            )
        WHERE id = target_biblio_id;
    END IF;

    RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sinkronisasi_link_rank()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Menggabungkan URL bucket dengan nilai kolom rank yang baru
    NEW.avatar_rank := 'https://heosadzwckwmbjhxydtm.supabase.co/storage/v1/object/public/rank-badges/' || NEW.rank || '.jpg';
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sinkronisasi_statistik_anggota()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_anggota_id UUID;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        v_anggota_id := OLD.id_anggota;
    ELSE
        v_anggota_id := NEW.id_anggota;
    END IF;

    IF v_anggota_id IS NOT NULL THEN
        UPDATE anggota
        SET 
            total_kunjungan = (
                SELECT COUNT(*) FROM data_pengunjung 
                WHERE id_anggota = v_anggota_id AND (LOWER(aktivitas) LIKE '%kunjungan%' OR LOWER(aktivitas) LIKE '%hadir%')
            ),
            total_baca = (
                SELECT COUNT(*) FROM data_pengunjung 
                WHERE id_anggota = v_anggota_id AND (LOWER(aktivitas) LIKE '%baca%' OR LOWER(aktivitas) LIKE '%buku%')
            ),
            total_pinjam = (
                SELECT COUNT(*) FROM data_pengunjung 
                WHERE id_anggota = v_anggota_id AND LOWER(aktivitas) LIKE '%pinjam%'
            ),
            updated_at = NOW()
        WHERE id = v_anggota_id;
    END IF;

    RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sirkulasi_action_handler(p_action text, p_member_id uuid, p_book_code text, p_sirkulasi_id bigint DEFAULT NULL::bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_biblio_id uuid;
    v_judul_buku text;
    v_nis text;
    v_nama_anggota text;
    v_new_due_date date;
    v_result JSONB;
BEGIN
    v_new_due_date := CURRENT_DATE + INTERVAL '4 days';

    -- 1. AKSI KONFIRMASI PINJAM
    IF p_action = 'CONFIRM' THEN
        -- Ambil data anggota (NIS & Nama)
        SELECT nis, nama INTO v_nis, v_nama_anggota 
        FROM anggota WHERE id = p_member_id;

        -- Ambil data buku (Biblio ID & Judul)
        SELECT e.biblio_id, b.judul INTO v_biblio_id, v_judul_buku 
        FROM eksemplar e
        JOIN biblio b ON e.biblio_id = b.id
        WHERE e.kode = p_book_code;
        
        -- Insert ke sirkulasi dengan data lengkap agar tidak melanggar constraint
        INSERT INTO sirkulasi (
            member_id, 
            nis, 
            nama_anggota, 
            biblio_id, 
            judul_buku, 
            kode_eksemplar, 
            status, 
            tgl_pinjam, 
            tgl_kembali
        )
        VALUES (
            p_member_id, 
            v_nis, 
            v_nama_anggota, 
            v_biblio_id, 
            v_judul_buku, 
            p_book_code, 
            'DIPINJAM', 
            CURRENT_DATE, 
            v_new_due_date
        )
        RETURNING jsonb_build_object('id', id, 'due_date', tgl_kembali) INTO v_result;

        -- Update status buku
        UPDATE eksemplar SET status = 'Dipinjam' WHERE kode = p_book_code;

    -- 2. AKSI PERPANJANG
    ELSIF p_action = 'EXTEND' THEN
        UPDATE sirkulasi 
        SET tgl_kembali = v_new_due_date 
        WHERE id = p_sirkulasi_id
        RETURNING jsonb_build_object('id', id, 'due_date', tgl_kembali) INTO v_result;

    -- 3. AKSI KEMBALIKAN
    ELSIF p_action = 'RETURN' THEN
        DELETE FROM sirkulasi WHERE id = p_sirkulasi_id;
        UPDATE eksemplar SET status = 'Tersedia' WHERE kode = p_book_code;
        v_result := jsonb_build_object('status', 'SUCCESS_RETURN');
    END IF;

    RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sirkulasi_search_handler(p_mode text, p_query text)
 RETURNS TABLE(id uuid, title text, subtitle text, tag1 text, tag2 text, status_label text, active_loan_code text, active_loan_title text, active_loan_id bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    IF p_mode = 'MEMBER' THEN
        RETURN QUERY
        SELECT 
            a.id,
            a.nama AS title,
            a.nis AS subtitle,
            a.kamar AS tag1,
            a.jenjang AS tag2,
            NULL::text AS status_label,
            s.kode_eksemplar AS active_loan_code,
            s.judul_buku AS active_loan_title,
            s.id AS active_loan_id
        FROM anggota a
        LEFT JOIN sirkulasi s ON a.id = s.member_id AND s.status = 'DIPINJAM'
        WHERE 
            a.nama ILIKE '%' || p_query || '%' 
            OR a.nis ILIKE '%' || p_query || '%'
            OR s.judul_buku ILIKE '%' || p_query || '%'
            OR s.kode_eksemplar ILIKE '%' || p_query || '%';

    ELSIF p_mode = 'BOOK' THEN
        RETURN QUERY
        SELECT 
            e.id,
            b.judul AS title,
            e.kode AS subtitle,
            b.penulis AS tag1,
            e.lokasi_rak AS tag2,
            e.status AS status_label,
            NULL::text AS active_loan_code,
            NULL::text AS active_loan_title,
            NULL::bigint AS active_loan_id
        FROM eksemplar e
        JOIN biblio b ON e.biblio_id = b.id
        WHERE b.judul ILIKE '%' || p_query || '%' 
           OR e.kode ILIKE '%' || p_query || '%';
    END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.statistik_pengunjung(p_dari date DEFAULT NULL::date, p_sampai date DEFAULT NULL::date, p_granularitas text DEFAULT 'bulan'::text)
 RETURNS json
 LANGUAGE sql
 STABLE
AS $function$
  with d as (
    select
      tanggal_kunjungan as tgl,
      coalesce(nullif(aktivitas, ''), 'Tidak diisi')  as aktivitas,
      coalesce(nullif(kategori, ''), 'Tidak diisi')   as kategori,
      coalesce(nullif(jenjang, ''), 'Tidak diisi')    as jenjang,
      coalesce(nullif(judul_buku, ''), 'Tidak diisi') as buku,
      coalesce(nullif(nama, ''), 'Tidak diisi')       as nama,
      coalesce(id_anggota::text, nullif(nis, ''), nullif(nama, '')) as pid
    from data_pengunjung
    where tanggal_kunjungan is not null
      and (p_dari   is null or tanggal_kunjungan >= p_dari)
      and (p_sampai is null or tanggal_kunjungan <= p_sampai)
  )
  select json_build_object(
    'ringkasan', (
      select json_build_object('total', count(*), 'unik', count(distinct pid), 'hari_aktif', count(distinct tgl))
      from d
    ),
    'tren', (
      select coalesce(json_agg(json_build_object('k', k, 'n', n) order by k), '[]'::json)
      from (
        select
          case p_granularitas
            when 'tahun'  then extract(year from tgl)::int
            when 'bulan'  then extract(month from tgl)::int
            when 'minggu' then least(5, (extract(day from tgl)::int - 1) / 7 + 1)
            else extract(day from tgl)::int
          end as k,
          count(*) as n
        from d group by 1
      ) t
    ),
    'aktivitas', (
      select coalesce(json_agg(json_build_object('k', aktivitas, 'n', n) order by n desc, aktivitas), '[]'::json)
      from (select aktivitas, count(*) as n from d group by 1) t
    ),
    'kategori', (
      select coalesce(json_agg(json_build_object('k', kategori, 'n', n) order by n desc, kategori), '[]'::json)
      from (
        select kategori, count(*) as n from d
        where kategori <> 'Tidak diisi' group by 1 order by n desc limit 15
      ) t
    ),
    'jenjang', (
      select coalesce(json_agg(json_build_object('k', jenjang, 'n', n) order by n desc, jenjang), '[]'::json)
      from (select jenjang, count(*) as n from d group by 1) t
    ),
    'nama', (
      select coalesce(json_agg(json_build_object('k', nama, 'n', n) order by n desc, nama), '[]'::json)
      from (
        select max(nama) as nama, count(*) as n from d
        where pid is not null and nama <> 'Tidak diisi'
        group by pid order by n desc limit 10
      ) t
    ),
    'buku', (
      select coalesce(json_agg(json_build_object('k', buku, 'n', n) order by n desc, buku), '[]'::json)
      from (
        select buku, count(*) as n from d
        where buku <> 'Tidak diisi' group by 1 order by n desc limit 10
      ) t
    )
  );
$function$;

CREATE OR REPLACE FUNCTION public.submit_feedback(p_nama text, p_is_liked boolean, p_pesan text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    INSERT INTO public.feedback (nama, is_liked, pesan, created_at)
    VALUES (p_nama, p_is_liked, p_pesan, NOW() AT TIME ZONE 'Asia/Jakarta');
END;
$function$;

CREATE OR REPLACE FUNCTION public.submit_kunjungan_guestbook(p_nama text, p_kamar text, p_jenjang text, p_judul text, p_kategori text, p_aktivitas text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_jam_sekarang TIME := CURRENT_TIME;
    v_periode TEXT;
    v_sudah_ada BOOLEAN;
BEGIN
    -- 1. Tentukan Periode (Siang atau Malam)
    IF v_jam_sekarang >= '06:00:00' AND v_jam_sekarang < '16:00:00' THEN
        v_periode := 'SIANG';
    ELSE
        v_periode := 'MALAM';
    END IF;

    -- 2. Cek apakah sudah ada input di periode yang sama hari ini
    -- Menggunakan blok waktu untuk akurasi (mencegah spam tombol)
    SELECT EXISTS (
        SELECT 1 FROM data_pengunjung 
        WHERE nama = p_nama 
        AND tanggal_kunjungan = CURRENT_DATE
        AND (
            (v_periode = 'SIANG' AND created_at::TIME >= '06:00:00' AND created_at::TIME < '16:00:00')
            OR
            (v_periode = 'MALAM' AND (created_at::TIME >= '16:00:00' OR created_at::TIME < '06:00:00'))
        )
    ) INTO v_sudah_ada;

    -- 3. Defender: Jika sudah ada, tolak input
    IF v_sudah_ada THEN
        RETURN json_build_object(
            'success', false, 
            'message', 'Maaf, Anda sudah mengisi buku tamu periode ' || v_periode || ' hari ini.'
        );
    END IF;

    -- 4. Jika lolos, masukkan data
    INSERT INTO data_pengunjung (
        nama, kamar, jenjang, judul_buku, kategori, aktivitas, tanggal_kunjungan, created_at
    )
    VALUES (
        p_nama, p_kamar, p_jenjang, p_judul, p_kategori, p_aktivitas, CURRENT_DATE, NOW()
    );

    RETURN json_build_object('success', true, 'message', 'Data berhasil disimpan!');
END; $function$;

CREATE OR REPLACE FUNCTION public.suggest_biblio(q text, lim integer DEFAULT 3)
 RETURNS TABLE(teks text, tipe text)
 LANGUAGE sql
 STABLE
AS $function$
  with p as (
    select '%' || replace(replace(replace(trim(q), '\', '\\'), '%', '\%'), '_', '\_') || '%' as pat
  )
  (
    select distinct b.judul::text, 'judul'::text
    from biblio b, p
    where b.judul ilike p.pat
    limit lim
  )
  union all
  (
    select distinct b.penulis::text, 'penulis'::text
    from biblio b, p
    where b.penulis is not null and b.penulis ilike p.pat
    limit lim
  )
  union all
  (
    select distinct t::text, 'topik'::text
    from biblio b, p,
         jsonb_array_elements_text(
           case when jsonb_typeof(b.topik) = 'array' then b.topik else '[]'::jsonb end
         ) as t
    where t ilike p.pat
    limit lim
  );
$function$;

CREATE OR REPLACE FUNCTION public.sync_eksemplar_status_on_circulation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_eksemplar_array jsonb;
    v_updated_array jsonb;
    v_item jsonb;
    v_found boolean := false;
BEGIN
    -- Ambil data jsonb daftar_eksemplar_rak saat ini berdasarkan biblio_id transaksi
    SELECT daftar_eksemplar_rak 
    INTO v_eksemplar_array
    FROM public.biblio
    WHERE id = NEW.biblio_id;

    -- Jika kolom jsonb kosong atau bukan sebuah array, batalkan eksekusi
    IF v_eksemplar_array IS NULL OR jsonb_typeof(v_eksemplar_array) != 'array' THEN
        RETURN NEW;
    END IF;

    -- Inisialisasi array kosong untuk menampung hasil pembaruan
    v_updated_array := '[]'::jsonb;

    -- Looping setiap objek eksemplar di dalam array
    FOR v_item IN SELECT jsonb_array_elements(v_eksemplar_array) LOOP
        -- Validasi apakah kode_eksemplar di JSON cocok dengan data sirkulasi yang baru masuk/berubah
        -- Catatan: Pastikan field di JSON Anda bernama "kode_eksemplar" atau sesuaikan baris ini
        IF v_item->>'kode_eksemplar' = NEW.kode_eksemplar THEN
            -- Perbarui status eksemplar tersebut sesuai dengan status di tabel sirkulasi (misal: 'Dipinjam' atau 'Tersedia')
            v_item := jsonb_set(v_item, '{status}', to_jsonb(NEW.status));
            v_found := true;
        END IF;
        
        -- Masukkan objek (baik yang diubah atau tidak) ke array baru
        v_updated_array := v_updated_array || jsonb_build_array(v_item);
    END LOOP;

    -- Jika ada eksemplar yang cocok dan berhasil diperbarui, simpan ke tabel biblio
    IF v_found THEN
        UPDATE public.biblio
        SET 
            daftar_eksemplar_rak = v_updated_array,
            updated_at = NOW()
        WHERE id = NEW.biblio_id;
    END IF;

    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_karya_dari_anggota()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.karya
  SET penulis = CASE
                  WHEN penulis IS NULL OR btrim(penulis) = '' OR penulis = nama_anggota
                  THEN NEW.nama
                  ELSE penulis
                END,
      nama_anggota   = NEW.nama,
      nis            = NEW.nis,
      organisasi     = NEW.organisasi,
      status_anggota = 'aktif'
  WHERE anggota_id = NEW.id;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_pengunjung_dari_anggota()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.data_pengunjung
  SET nama    = NEW.nama,
      nis     = NEW.nis,
      kamar   = NEW.kamar,
      jenjang = NEW.jenjang
  WHERE id_anggota = NEW.id
    AND (nama, nis, kamar, jenjang)
        IS DISTINCT FROM (NEW.nama, NEW.nis, NEW.kamar, NEW.jenjang);
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_statistik_buku()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Kurangi hitungan lama (saat hapus / ubah)
  IF TG_OP IN ('DELETE', 'UPDATE') AND OLD.id_buku IS NOT NULL THEN
    UPDATE biblio SET
      jumlah_baca   = GREATEST(COALESCE(jumlah_baca, 0)   - (OLD.aktivitas = 'Baca')::int, 0),
      jumlah_pinjam = GREATEST(COALESCE(jumlah_pinjam, 0) - (OLD.aktivitas = 'Pinjam')::int, 0)
    WHERE id = OLD.id_buku;
  END IF;

  -- Tambah hitungan baru (saat tambah / ubah)
  IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.id_buku IS NOT NULL THEN
    UPDATE biblio SET
      jumlah_baca   = COALESCE(jumlah_baca, 0)   + (NEW.aktivitas = 'Baca')::int,
      jumlah_pinjam = COALESCE(jumlah_pinjam, 0) + (NEW.aktivitas = 'Pinjam')::int
    WHERE id = NEW.id_buku;
  END IF;

  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_status_jsonb_from_sirkulasi()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_status_array jsonb;
    v_updated_array jsonb;
    v_element jsonb;
    v_match_found boolean := false;
    v_mapped_status text;
BEGIN
    -- 1. Konversi teks sirkulasi: Jika 'DIPINJAM' jadi 'Dipinjam', selain itu (KEMBALI) jadi 'Tersedia'
    IF NEW.status = 'DIPINJAM' THEN
        v_mapped_status := 'Dipinjam';
    ELSE
        v_mapped_status := 'Tersedia';
    END IF;

    -- 2. Ambil data dari kolom status jsonb di tabel biblio
    SELECT status INTO v_status_array
    FROM public.biblio
    WHERE id = NEW.biblio_id;

    -- Proteksi jika datanya null atau bukan array
    IF v_status_array IS NULL OR jsonb_typeof(v_status_array) != 'array' THEN
        v_status_array := '[]'::jsonb;
    END IF;

    v_updated_array := '[]'::jsonb;

    -- 3. Looping isi array untuk memperbarui status eksemplar yang cocok
    FOR v_element IN SELECT jsonb_array_elements(v_status_array) LOOP
        IF v_element->>'kode_eksemplar' = NEW.kode_eksemplar THEN
            v_element := jsonb_set(v_element, '{status}', to_jsonb(v_mapped_status));
            v_match_found := true;
        END IF;
        v_updated_array := v_updated_array || jsonb_build_array(v_element);
    END LOOP;

    -- 4. Jika kode_eksemplar belum ada di kolom status, tambahkan sebagai objek baru
    IF NOT v_match_found THEN
        v_element := jsonb_build_object(
            'kode_eksemplar', NEW.kode_eksemplar,
            'status', v_mapped_status
        );
        v_updated_array := v_updated_array || jsonb_build_array(v_element);
    END IF;

    -- 5. Update kolom status jsonb di tabel biblio
    UPDATE public.biblio
    SET 
        status = v_updated_array,
        updated_at = NOW()
    WHERE id = NEW.biblio_id;

    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.tandai_karya_tidak_aktif()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.karya
  SET status_anggota = 'tidak aktif'
  WHERE anggota_id = OLD.id;
  RETURN OLD;
END;
$function$;

CREATE OR REPLACE FUNCTION public.tentukan_rank_dan_avatar_anggota()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_rank text;
BEGIN
    -- Mengamankan logika peringkat dari nilai total_poin negatif
    IF NEW.total_poin >= 500     THEN v_rank := 'GABRIEL';
    ELSIF NEW.total_poin >= 400  THEN v_rank := 'FALAK';
    ELSIF NEW.total_poin >= 350  THEN v_rank := 'LUCIFER';
    ELSIF NEW.total_poin >= 300  THEN v_rank := 'ODIN';
    ELSIF NEW.total_poin >= 250  THEN v_rank := 'POSEIDON';
    ELSIF NEW.total_poin >= 200  THEN v_rank := 'ANUBIS';
    ELSIF NEW.total_poin >= 150  THEN v_rank := 'ASURA';
    
    -- Kategori Mobile Legends Tier
    ELSIF NEW.total_poin >= 100  THEN v_rank := 'IMMORTAL';
    ELSIF NEW.total_poin >= 80   THEN v_rank := 'GLORY';
    ELSIF NEW.total_poin >= 60   THEN v_rank := 'HONOR';
    ELSIF NEW.total_poin >= 50   THEN v_rank := 'MYTHIC';
    ELSIF NEW.total_poin >= 40   THEN v_rank := 'LEGEND';
    ELSIF NEW.total_poin >= 30   THEN v_rank := 'EPIC';
    ELSIF NEW.total_poin >= 20   THEN v_rank := 'GRANDMASTER';
    ELSIF NEW.total_poin >= 10   THEN v_rank := 'MASTER';
    ELSIF NEW.total_poin >= 5    THEN v_rank := 'ELITE';
    ELSE v_rank := 'WARRIOR'; -- Meng-handle poin 0 hingga minus berapapun
    END IF;

    -- Tulis ke kolom masing-masing
    NEW.rank := v_rank;
    NEW.avatar_rank := 'https://heosadzwckwmbjhxydtm.supabase.co/storage/v1/object/public/rank-badges/' || v_rank || '.jpg';

    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.trg_func_hitung_poin_tambahan()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_id_anggota UUID;
    v_total_res_poin INT;
BEGIN
    -- Identifikasi ID Anggota berdasarkan operasi data (Tambah, Edit, Hapus)
    IF (TG_OP = 'DELETE') THEN
        v_id_anggota := OLD.anggota_id;
    ELSE
        v_id_anggota := NEW.anggota_id;
    END IF;

    -- Hitung total bersih seluruh riwayat mutasi anggota ini
    SELECT COALESCE(SUM(poin), 0)
    INTO v_total_res_poin
    FROM public.mutasi_poin
    WHERE anggota_id = v_id_anggota;

    -- Perbarui kolom poin_tambahan di tabel anggota
    UPDATE public.anggota 
    SET poin_tambahan = v_total_res_poin 
    WHERE id = v_id_anggota;

    -- Kembalikan data ke sistem
    IF (TG_OP = 'DELETE') THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.trg_func_proses_kalkulasi_anggota()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_rank TEXT;
BEGIN
    -- PERBAIKAN RUMUS: Hanya mentotal kunjungan dan poin tambahan
    NEW.total_poin := COALESCE(NEW.total_kunjungan, 0) + 
                      COALESCE(NEW.poin_tambahan, 0);

    -- Proteksi agar total poin tidak minus di bawah angka 0
    IF NEW.total_poin < 0 THEN
        NEW.total_poin := 0;
    END IF;

    -- Penentuan tingkatan Rank berdasarkan total_poin yang baru
    IF NEW.total_poin >= 500     THEN v_rank := 'GABRIEL';
    ELSIF NEW.total_poin >= 400  THEN v_rank := 'FALAK';
    ELSIF NEW.total_poin >= 350  THEN v_rank := 'LUCIFER';
    ELSIF NEW.total_poin >= 300  THEN v_rank := 'ODIN';
    ELSIF NEW.total_poin >= 250  THEN v_rank := 'POSEIDON';
    ELSIF NEW.total_poin >= 200  THEN v_rank := 'ANUBIS';
    ELSIF NEW.total_poin >= 150  THEN v_rank := 'ASURA';
    
    -- Kategori Mobile Legends Tier
    ELSIF NEW.total_poin >= 100  THEN v_rank := 'IMMORTAL';
    ELSIF NEW.total_poin >= 80   THEN v_rank := 'GLORY';
    ELSIF NEW.total_poin >= 60   THEN v_rank := 'HONOR';
    ELSIF NEW.total_poin >= 50   THEN v_rank := 'MYTHIC';
    ELSIF NEW.total_poin >= 40   THEN v_rank := 'LEGEND';
    ELSIF NEW.total_poin >= 30   THEN v_rank := 'EPIC';
    ELSIF NEW.total_poin >= 20   THEN v_rank := 'GRANDMASTER';
    ELSIF NEW.total_poin >= 10   THEN v_rank := 'MASTER';
    ELSIF NEW.total_poin >= 5    THEN v_rank := 'ELITE';
    ELSE v_rank := 'WARRIOR';
    END IF;

    -- Simpan nama rank dan buat URL asset gambar menggunakan HURUF KAPITAL ASLI
    NEW.rank := v_rank;
    NEW.avatar_rank := 'https://heosadzwckwmbjhxydtm.supabase.co/storage/v1/object/public/rank-badges/' || v_rank || '.jpg';

    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.trg_func_sinkronisasi_total_kunjungan()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Skenario 1: Jika ada pengunjung baru melakukan scan/input (INSERT)
    IF (TG_OP = 'INSERT') THEN
        UPDATE public.anggota 
        SET total_kunjungan = COALESCE(total_kunjungan, 0) + 1
        WHERE id = NEW.id_anggota; -- Menggunakan kolom id_anggota sesuai tabel Anda
        
    -- Skenario 2: Jika ada data pengunjung yang dihapus oleh admin (DELETE)
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.anggota 
        SET total_kunjungan = GREATEST(0, COALESCE(total_kunjungan, 0) - 1)
        WHERE id = OLD.id_anggota;
    END IF;
    
    RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_admin(old_user text, new_user text, new_pass text, role_type text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    UPDATE public.allowed_admins
    SET username = new_user,
        password = crypt(new_pass, gen_salt('bf')), -- Hash password baru
        role = role_type
    WHERE username = old_user;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_klasifikasi(p_id uuid, p_kode text, p_nama text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    UPDATE klasifikasi_ddc 
    SET kode_ddc = p_kode, 
        nama_kategori = p_nama 
    WHERE id = p_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_klasifikasi(p_id uuid, p_nama text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    UPDATE klasifikasi_ddc 
    SET nama_kategori = p_nama 
    WHERE id = p_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_modified_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_pendaftaran_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = TIMEZONE('Asia/Jakarta', NOW());
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.upsert_full_biblio(p_id uuid, p_data jsonb, p_eksemplars jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
    v_biblio_id uuid;
begin
    if p_id is null then
        insert into public.biblio (judul, penulis, penerbit, tahun_terbit, isbn_issn, kategori, deskripsi_fisik, created_at, updated_at)
        values (p_data->>'judul', p_data->>'penulis', p_data->>'penerbit', p_data->>'tahun_terbit',
                p_data->>'isbn_issn', p_data->>'kategori', p_data->>'deskripsi_fisik', now(), now())
        returning id into v_biblio_id;
    else
        update public.biblio set
            judul = p_data->>'judul', penulis = p_data->>'penulis', penerbit = p_data->>'penerbit',
            tahun_terbit = p_data->>'tahun_terbit', isbn_issn = p_data->>'isbn_issn',
            kategori = p_data->>'kategori', deskripsi_fisik = p_data->>'deskripsi_fisik',
            updated_at = now()
        where id = p_id;
        v_biblio_id := p_id;
    end if;

    delete from public.eksemplar where biblio_id = v_biblio_id;

    insert into public.eksemplar (biblio_id, kode, nomor_panggil, lokasi_rak, status, created_at)
    select v_biblio_id, (obj->>'kode'), (obj->>'nomor_panggil'), (obj->>'lokasi_rak'),
           coalesce(obj->>'status', 'Tersedia'), now()
    from jsonb_array_elements(p_eksemplars) as obj;

    return v_biblio_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.verify_admin_login(input_user text, input_pass text)
 RETURNS TABLE(res_username text, res_role text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY 
    SELECT username, role 
    FROM public.allowed_admins 
    -- Bandingkan input_pass dengan hash yang tersimpan di kolom password
    WHERE username = input_user 
    AND password = crypt(input_pass, password);
END;
$function$;
