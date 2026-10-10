import { useEffect, useRef, useState } from 'react';

export const PER_HALAMAN = 10;

/** Buang karakter yang punya arti khusus di filter PostgREST / pola ilike */
export const sanitizeQuery = (s: string) =>
    s.replace(/[%_,()*\\"']/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);

export function useDebounced<T>(nilai: T, ms = 350): T {
    const [v, setV] = useState(nilai);
    useEffect(() => {
        const t = setTimeout(() => setV(nilai), ms);
        return () => clearTimeout(t);
    }, [nilai, ms]);
    return v;
}

/**
 * Daftar yang dimuat bertahap ("muat lebih banyak").
 * `ambil` harus stabil (useCallback); ganti identitasnya untuk memuat ulang dari awal.
 * `ambil(0)` sebaiknya mengembalikan `total` (count exact); halaman berikutnya boleh null.
 */
export function useBertahap<T extends { id: string | number }>(
    ambil: (dari: number) => Promise<{ rows: T[]; total: number | null }>,
    aktif = true
) {
    const [baris, setBaris] = useState<T[]>([]);
    const [total, setTotal] = useState<number | null>(null);
    const [adaLagi, setAdaLagi] = useState(false);
    const [memuat, setMemuat] = useState(aktif);
    const [memuatLagi, setMemuatLagi] = useState(false);
    const [galat, setGalat] = useState<'awal' | 'lagi' | null>(null);
    const [ulang, setUlang] = useState(0);
    const permintaan = useRef(0);

    useEffect(() => {
        const no = ++permintaan.current;
        setGalat(null);
        setMemuatLagi(false);

        if (!aktif) {
            setBaris([]);
            setTotal(null);
            setAdaLagi(false);
            setMemuat(false);
            return;
        }

        setMemuat(true);
        ambil(0)
            .then((h) => {
                if (no !== permintaan.current) return;
                setBaris(h.rows);
                setTotal(h.total);
                setAdaLagi(h.rows.length >= PER_HALAMAN && (h.total === null || h.rows.length < h.total));
                setMemuat(false);
            })
            .catch((err) => {
                if (no !== permintaan.current) return;
                console.error('Gagal memuat daftar:', err);
                setBaris([]);
                setAdaLagi(false);
                setGalat('awal');
                setMemuat(false);
            });

        return () => {
            permintaan.current++;
        };
    }, [ambil, aktif, ulang]);

    async function muatLagi() {
        if (memuat || memuatLagi || baris.length === 0) return;
        const no = permintaan.current;
        setMemuatLagi(true);
        setGalat(null);
        try {
            const h = await ambil(baris.length);
            if (no !== permintaan.current) return;
            const sudah = new Set(baris.map((b) => b.id));
            const gabung = [...baris, ...h.rows.filter((b) => !sudah.has(b.id))];
            setBaris(gabung);
            setAdaLagi(h.rows.length >= PER_HALAMAN && (total === null || gabung.length < total));
            setMemuatLagi(false);
        } catch (err) {
            if (no !== permintaan.current) return;
            console.error('Gagal memuat data berikutnya:', err);
            setGalat('lagi');
            setMemuatLagi(false);
        }
    }

    return { baris, total, adaLagi, memuat, memuatLagi, galat, muatLagi, coba: () => setUlang((n) => n + 1) };
}