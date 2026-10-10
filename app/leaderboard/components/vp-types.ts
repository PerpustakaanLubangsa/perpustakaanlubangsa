/* Tipe, konstanta, dan util kecil untuk profil pengunjung */

export interface ProfileTarget {
    id: string;
    nama: string;
}

export interface AnggotaProfile {
    id: string;
    nis: string;
    nama: string;
    jenjang: string;
    organisasi: string | null;
    kamar: string | null;
    role: string;
    rank: string | null;
    total_kunjungan: number | null;
    total_baca: number | null;
    total_pinjam: number | null;
    poin_tambahan: number | null;
    total_poin: number | null;
    avatar_rank: string | null;
    foto: string | null;
}

export interface RiwayatItem {
    id: string | number;
    judul_buku: string | null;
    kategori: string | null;
    aktivitas: string | null;
    created_at: string;
}

export interface KategoriStat {
    nama: string;
    /** Rentang kode dari tabel kategori (mis. "000–099"), null jika tidak ada */
    kode: string | null;
    baca: number;
    pinjam: number;
    total: number;
}

export interface Stats {
    totalKunjungan: number;
    totalBaca: number;
    totalPinjam: number;
    kategoriFavorit: string | null;
    kategori: KategoriStat[];
}

export interface MutasiPoinItem {
    id: number;
    poin: number;
    keterangan: string | null;
    created_at: string;
    kategori: { id: number; nama: string } | null;
}

export interface KategoriPoin {
    id: number;
    nama: string;
    keterangan: string | null;
}

/** Satu "folder" kategori pada kotak mutasi poin (id null = tanpa kategori). */
export interface MutasiFolder {
    id: number | null;
    nama: string;
    keterangan: string | null;
    jumlah: number;
    total: number;
}

export type Phase = 'loading' | 'done' | 'error';
export type Variant = 'up' | 'left' | 'right' | 'zoom' | 'pop' | 'flip' | 'fade';

export const COLOR_BACA = '#3b82f6';
export const COLOR_PINJAM = '#06b6d4';

export function formatWaktu(iso: string) {
    try {
        return new Date(iso).toLocaleString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return iso;
    }
}

/** Deteksi perangkat low-end / hemat data / reduced motion -> mode ringan */
export function detectLite(): boolean {
    if (typeof window === 'undefined') return false;
    const nav = navigator as Navigator & {
        deviceMemory?: number;
        connection?: { saveData?: boolean };
    };
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const mem = nav.deviceMemory;
    const cores = nav.hardwareConcurrency;
    return !!(
        reduce ||
        nav.connection?.saveData ||
        (mem !== undefined && mem <= 2) ||
        (cores !== undefined && cores <= 4)
    );
}