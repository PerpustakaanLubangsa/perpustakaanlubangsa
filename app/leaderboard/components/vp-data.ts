import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import type {
    AnggotaProfile,
    KategoriStat,
    Phase,
    ProfileTarget,
    RiwayatItem,
    Stats,
} from './vp-types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface KategoriRow {
    id: number;
    nama_kategori: string;
    kode_awal: number | null;
    kode_akhir: number | null;
}

const norm = (s: string) => s.trim().toLowerCase();
const pad = (n: number) => String(n).padStart(3, '0');

function formatKode(awal: number | null, akhir: number | null): string | null {
    if (awal === null || awal === undefined) return null;
    if (akhir === null || akhir === undefined || akhir === awal) return pad(awal);
    return `${pad(awal)}–${pad(akhir)}`;
}

/**
 * Gabungkan daftar kategori (tabel `kategori`) dengan aktivitas anggota,
 * sehingga kategori yang belum pernah dibaca/dipinjam tetap tampil (nilai 0).
 * Kategori di data_pengunjung yang tidak ada di tabel tetap ditampilkan di bagian akhir.
 */
function gabungKategori(
    daftar: KategoriRow[],
    aktivitas: { kategori: string | null; aktivitas: string | null }[]
): KategoriStat[] {
    const peta = new Map<string, KategoriStat & { urut: number }>();

    for (const k of daftar) {
        peta.set(norm(k.nama_kategori), {
            nama: k.nama_kategori.trim(),
            kode: formatKode(k.kode_awal, k.kode_akhir),
            baca: 0,
            pinjam: 0,
            total: 0,
            urut: k.kode_awal ?? 9999,
        });
    }

    for (const row of aktivitas) {
        if (!row.kategori) continue;
        if (row.aktivitas !== 'Baca' && row.aktivitas !== 'Pinjam') continue;
        const kunci = norm(row.kategori);
        let st = peta.get(kunci);
        if (!st) {
            st = { nama: row.kategori.trim(), kode: null, baca: 0, pinjam: 0, total: 0, urut: 10000 };
            peta.set(kunci, st);
        }
        if (row.aktivitas === 'Pinjam') st.pinjam += 1;
        else st.baca += 1;
        st.total += 1;
    }

    return [...peta.values()]
        .sort((a, b) => b.total - a.total || a.urut - b.urut || a.nama.localeCompare(b.nama, 'id'))
        .map(({ urut: _urut, ...sisa }) => sisa);
}

/** Data inti profil. Riwayat kunjungan & mutasi poin dimuat sendiri oleh kartunya (bertahap + pencarian). */
export function useProfileData(isOpen: boolean, target: ProfileTarget | null) {
    const [phase, setPhase] = useState<Phase>('loading');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [anggota, setAnggota] = useState<AnggotaProfile | null>(null);
    const [stats, setStats] = useState<Stats | null>(null);
    const [terbaru, setTerbaru] = useState<RiwayatItem | null>(null);

    /* reset saat ditutup */
    useEffect(() => {
        if (isOpen) return;
        setPhase('loading');
        setAnggota(null);
        setStats(null);
        setTerbaru(null);
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen || !target) return;

        let cancelled = false;

        async function load(id: string) {
            setPhase('loading');
            setErrorMsg(null);
            setAnggota(null);
            setStats(null);
            setTerbaru(null);

            try {
                const [anggotaRes, totalRes, bacaRes, pinjamRes, terbaruRes, katRes, daftarKatRes] =
                    await Promise.all([
                        supabase.from('anggota').select('*').eq('id', id).single(),
                        supabase
                            .from('data_pengunjung')
                            .select('id', { count: 'exact', head: true })
                            .eq('id_anggota', id),
                        supabase
                            .from('data_pengunjung')
                            .select('id', { count: 'exact', head: true })
                            .eq('id_anggota', id)
                            .eq('aktivitas', 'Baca'),
                        supabase
                            .from('data_pengunjung')
                            .select('id', { count: 'exact', head: true })
                            .eq('id_anggota', id)
                            .eq('aktivitas', 'Pinjam'),
                        supabase
                            .from('data_pengunjung')
                            .select('id, judul_buku, kategori, aktivitas, created_at')
                            .eq('id_anggota', id)
                            .order('created_at', { ascending: false })
                            .limit(1),
                        supabase
                            .from('data_pengunjung')
                            .select('kategori, aktivitas')
                            .eq('id_anggota', id)
                            .not('kategori', 'is', null)
                            .limit(1000),
                        supabase
                            .from('kategori')
                            .select('id, nama_kategori, kode_awal, kode_akhir')
                            .order('kode_awal', { ascending: true, nullsFirst: false })
                            .order('nama_kategori', { ascending: true }),
                    ]);

                if (anggotaRes.error) throw anggotaRes.error;
                if (totalRes.error) throw totalRes.error;
                if (bacaRes.error) throw bacaRes.error;
                if (pinjamRes.error) throw pinjamRes.error;
                if (terbaruRes.error) throw terbaruRes.error;

                // Kategori tidak boleh menggagalkan seluruh profil
                if (katRes.error) console.error('Gagal memuat aktivitas kategori:', katRes.error);
                if (daftarKatRes.error) console.error('Gagal memuat tabel kategori:', daftarKatRes.error);

                const kategori = gabungKategori(
                    (daftarKatRes.data ?? []) as KategoriRow[],
                    (katRes.data ?? []) as { kategori: string | null; aktivitas: string | null }[]
                );

                if (cancelled) return;

                setAnggota(anggotaRes.data as AnggotaProfile);
                setStats({
                    totalKunjungan: totalRes.count ?? 0,
                    totalBaca: bacaRes.count ?? 0,
                    totalPinjam: pinjamRes.count ?? 0,
                    kategoriFavorit: kategori.length > 0 && kategori[0].total > 0 ? kategori[0].nama : null,
                    kategori,
                });
                setTerbaru(((terbaruRes.data ?? [])[0] as RiwayatItem | undefined) ?? null);
                setPhase('done');
            } catch (err: any) {
                if (!cancelled) {
                    setErrorMsg(err?.message || 'Gagal memuat profil pengunjung.');
                    setPhase('error');
                }
            }
        }

        load(target.id);

        return () => {
            cancelled = true;
        };
    }, [isOpen, target]);

    return { phase, errorMsg, anggota, stats, terbaru };
}