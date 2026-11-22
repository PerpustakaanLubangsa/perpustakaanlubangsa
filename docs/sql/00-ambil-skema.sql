-- Ambil skema asli Supabase supaya AI tidak menebak.
-- Cara: Supabase → SQL Editor → jalankan SATU kueri per kali (bukan sekaligus).
-- Tiap kueri mengembalikan satu sel teks. Salin isi sel (klik kanan → Copy cell, atau klik selnya)
-- lalu tempel ke docs/supabase-skema-asli.md di bawah judul kueri yang sesuai.
-- Hanya memuat struktur, tidak ada data dan tidak ada kunci rahasia.

-- ===== KUERI 1: tabel, kolom, kunci utama, kunci asing =====
select string_agg(blok, E'\n\n' order by tabel) as hasil
from (
  select c.relname as tabel,
    format(E'### %s (%s)\n%s%s',
      c.relname,
      case c.relkind when 'v' then 'view' when 'm' then 'materialized view' else 'tabel' end,
      (select string_agg(format('- %s %s%s%s', a.attname, format_type(a.atttypid, a.atttypmod),
                                case when a.attnotnull then ' NOT NULL' else '' end,
                                coalesce(' DEFAULT ' || pg_get_expr(d.adbin, d.adrelid), '')),
                         E'\n' order by a.attnum)
         from pg_attribute a
         left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
         where a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped),
      coalesce(E'\n' || (select string_agg('- ' || pg_get_constraintdef(k.oid), E'\n' order by k.contype desc, k.conname)
                         from pg_constraint k where k.conrelid = c.oid and k.contype in ('p','f','u')), '')
    ) as blok
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r','v','m','p')
) t;

-- ===== KUERI 2: RLS dan kebijakan =====
select coalesce(string_agg(blok, E'\n' order by tabel, nama), '(tidak ada kebijakan)') as hasil
from (
  select c.relname as tabel, p.polname as nama,
    format('- %s | RLS %s | %s | %s | untuk: %s%s%s',
      c.relname,
      case when c.relrowsecurity then 'AKTIF' else 'mati' end,
      p.polname,
      case p.polcmd when 'r' then 'SELECT' when 'a' then 'INSERT' when 'w' then 'UPDATE' when 'd' then 'DELETE' else 'ALL' end,
      coalesce((select string_agg(rolname, ',') from pg_roles where oid = any(p.polroles)), 'public'),
      coalesce(E'\n    USING: ' || pg_get_expr(p.polqual, p.polrelid), ''),
      coalesce(E'\n    CHECK: ' || pg_get_expr(p.polwithcheck, p.polrelid), '')) as blok
  from pg_policy p
  join pg_class c on c.oid = p.polrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
) t;

-- ===== KUERI 2b: tabel dengan RLS aktif atau mati =====
select string_agg(format('- %s: RLS %s', c.relname, case when c.relrowsecurity then 'AKTIF' else 'mati' end), E'\n' order by c.relname) as hasil
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r';

-- ===== KUERI 3: fungsi (RPC dan fungsi trigger) =====
select coalesce(string_agg(pg_get_functiondef(p.oid), E'\n\n' order by p.proname), '(tidak ada fungsi)') as hasil
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.prokind = 'f';

-- ===== KUERI 4: trigger =====
select coalesce(string_agg(pg_get_triggerdef(t.oid), E'\n' order by c.relname, t.tgname), '(tidak ada trigger)') as hasil
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and not t.tgisinternal;

-- ===== KUERI 5: isi view (mis. data_rak) =====
select coalesce(string_agg(format(E'### %s\n%s', viewname, definition), E'\n\n' order by viewname), '(tidak ada view)') as hasil
from pg_views
where schemaname = 'public';

-- ===== KUERI 6: indeks =====
select coalesce(string_agg(indexdef, E'\n' order by tablename, indexname), '(tidak ada indeks)') as hasil
from pg_indexes
where schemaname = 'public';

-- ===== KUERI 7: bucket storage =====
select coalesce(string_agg(format('- %s | publik: %s', id, public), E'\n' order by id), '(tidak ada bucket)') as hasil
from storage.buckets;
