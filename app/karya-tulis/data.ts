import { cache } from 'react';
import { supabase } from '@/lib/supabase';

export interface KaryaTulisItem {
  id: string;
  anggota_id: string;
  kategori: string;
  judul: string;
  isi: string;
  dibuat_pada: string;
  foto_url: string | null;
  penulis: string | null;
  slug: string | null;
}

// Versi ringan untuk daftar (tanpa isi penuh agar HTML dan payload tetap kecil)
export interface KaryaRingkas {
  id: string;
  kategori: string;
  judul: string;
  cuplikan: string;
  dibuat_pada: string;
  foto_url: string | null;
  penulis: string | null;
  slug: string | null;
}

export const SITE_NAME = 'Perpustakaan Lubangsa';
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');

const COLUMNS = 'id, anggota_id, kategori, judul, isi, dibuat_pada, foto_url, penulis, slug';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const segmenKarya = (k: { slug: string | null; id: string }) => k.slug || k.id;

export const hrefKarya = (k: { slug: string | null; id: string }) =>
  `/karya-tulis/${encodeURIComponent(segmenKarya(k))}`;

export function dekode(nilai: string) {
  try {
    return decodeURIComponent(nilai);
  } catch {
    return nilai;
  }
}

export function ringkas(teks: string, maks: number) {
  const bersih = teks.replace(/\s+/g, ' ').trim();
  if (bersih.length <= maks) return bersih;
  const potong = bersih.slice(0, maks);
  const spasi = potong.lastIndexOf(' ');
  return `${potong.slice(0, spasi > maks * 0.6 ? spasi : maks).trimEnd()}…`;
}

// Zona waktu dikunci agar hasil server dan browser selalu sama
export function formatTanggal(iso: string, gaya: 'pendek' | 'panjang' = 'pendek') {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: gaya === 'panjang' ? 'long' : 'short',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  }).format(d);
}

export function keRingkas(k: KaryaTulisItem): KaryaRingkas {
  return {
    id: k.id,
    kategori: k.kategori,
    judul: k.judul,
    cuplikan: ringkas(k.isi, 400),
    dibuat_pada: k.dibuat_pada,
    foto_url: k.foto_url,
    penulis: k.penulis,
    slug: k.slug,
  };
}

// cache() mencegah query ganda saat generateMetadata dan halaman memanggil data yang sama
export const getKaryaList = cache(async () => {
  try {
    const { data, error } = await supabase
      .from('karya')
      .select(COLUMNS)
      .order('dibuat_pada', { ascending: false });
    if (error) throw error;
    return { items: (data ?? []) as KaryaTulisItem[], gagal: false };
  } catch (err) {
    console.error('Gagal memuat karya tulis:', err);
    return { items: [] as KaryaTulisItem[], gagal: true };
  }
});

export const getKaryaBySegmen = cache(async (segmen: string) => {
  try {
    const query = supabase.from('karya').select(COLUMNS);
    const { data, error } = UUID_RE.test(segmen)
      ? await query.eq('id', segmen).maybeSingle()
      : await query.eq('slug', segmen).limit(1).maybeSingle();
    if (error) throw error;
    return (data as KaryaTulisItem | null) ?? null;
  } catch (err) {
    console.error('Gagal memuat karya:', err);
    return null;
  }
});

export const getKaryaTerkait = cache(async (kategori: string, kecualiId: string) => {
  try {
    const { data, error } = await supabase
      .from('karya')
      .select(COLUMNS)
      .eq('kategori', kategori)
      .neq('id', kecualiId)
      .order('dibuat_pada', { ascending: false })
      .limit(3);
    if (error) throw error;
    return (data ?? []) as KaryaTulisItem[];
  } catch {
    return [] as KaryaTulisItem[];
  }
});