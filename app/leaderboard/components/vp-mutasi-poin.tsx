'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Folder, FolderOpen, Loader2 } from 'lucide-react';
import { formatWaktu, type KategoriPoin, type MutasiFolder, type MutasiPoinItem } from './vp-types';
import { supabase } from './vp-data';
import { PER_HALAMAN, sanitizeQuery, useBertahap, useDebounced } from './vp-paging';
import { BawahDaftar, Kartu, KotakCari, tombolPutih } from './vp-ui';

const fmtPoin = (n: number) => `${n > 0 ? '+' : ''}${n.toLocaleString('id-ID')}`;
const warnaPoin = (n: number) => (n >= 0 ? 'text-green-700' : 'text-red-600');

const KETERANGAN_TANPA = 'Mutasi poin yang tidak diberi kategori.';

/**
 * Kartu mutasi poin bergaya folder.
 * - Awal: daftar folder kategori (yang punya mutasi) + "Tanpa kategori" bila ada.
 * - Klik folder: isi kartu berganti menjadi mutasi kategori itu, dengan kartu keterangan kategori di paling atas.
 * - Pencarian: di tampilan folder mencari di dalam folder; di tampilan awal mencari ke semua mutasi.
 */
export default function MutasiPoinBox({ anggotaId, className = '' }: { anggotaId: string; className?: string }) {
    const [folders, setFolders] = useState<MutasiFolder[]>([]);
    const [memuatFolder, setMemuatFolder] = useState(true);
    const [galatFolder, setGalatFolder] = useState(false);
    const [ulang, setUlang] = useState(0);

    const [folder, setFolder] = useState<MutasiFolder | null>(null);
    const [kueri, setKueri] = useState('');
    const q = useDebounced(sanitizeQuery(kueri));

    /* ringkasan per kategori dari seluruh mutasi anggota (dibatasi server, umumnya 1000 baris) */
    useEffect(() => {
        let batal = false;
        setMemuatFolder(true);
        setGalatFolder(false);

        Promise.all([
            supabase.from('kategori_poin').select('id, nama, keterangan'),
            supabase.from('mutasi_poin').select('poin, kategori_id').eq('anggota_id', anggotaId).limit(5000),
        ]).then(([katRes, mutRes]) => {
            if (batal) return;
            if (mutRes.error) {
                console.error('Gagal memuat ringkasan mutasi poin:', mutRes.error);
                setGalatFolder(true);
                setMemuatFolder(false);
                return;
            }
            if (katRes.error) console.error('Gagal memuat kategori poin:', katRes.error);

            const nama = new Map<number, KategoriPoin>();
            ((katRes.data ?? []) as KategoriPoin[]).forEach((k) => nama.set(k.id, k));

            const peta = new Map<number | null, { jumlah: number; total: number }>();
            for (const r of (mutRes.data ?? []) as { poin: number; kategori_id: number | null }[]) {
                const lama = peta.get(r.kategori_id) ?? { jumlah: 0, total: 0 };
                peta.set(r.kategori_id, { jumlah: lama.jumlah + 1, total: lama.total + r.poin });
            }

            const daftar: MutasiFolder[] = [...peta.entries()].map(([id, r]) => {
                const k = id === null ? undefined : nama.get(id);
                return {
                    id,
                    nama: id === null ? 'Tanpa kategori' : (k?.nama ?? `Kategori #${id}`),
                    keterangan: id === null ? KETERANGAN_TANPA : (k?.keterangan ?? null),
                    ...r,
                };
            });
            daftar.sort((a, b) => {
                if (a.id === null) return 1;
                if (b.id === null) return -1;
                return a.nama.localeCompare(b.nama, 'id');
            });

            setFolders(daftar);
            setMemuatFolder(false);
        });

        return () => {
            batal = true;
        };
    }, [anggotaId, ulang]);

    const jumlahSemua = folders.reduce((n, f) => n + f.jumlah, 0);
    const totalSemua = folders.reduce((n, f) => n + f.total, 0);

    /* filter pencarian di tampilan awal: keterangan atau nama kategori yang cocok */
    const filterSemua = useMemo(() => {
        if (!q) return '';
        const kecil = q.toLowerCase();
        const bagian = [`keterangan.ilike.%${q}%`];
        const idCocok = folders.filter((f) => f.id !== null && f.nama.toLowerCase().includes(kecil)).map((f) => f.id);
        if (idCocok.length) bagian.push(`kategori_id.in.(${idCocok.join(',')})`);
        if ('tanpa kategori'.includes(kecil)) bagian.push('kategori_id.is.null');
        return bagian.join(',');
    }, [q, folders]);

    const idFolder = folder ? String(folder.id) : 'semua';
    const modeDaftar = folder !== null || q !== '';

    const ambil = useCallback(
        async (dari: number) => {
            let query: any = supabase
                .from('mutasi_poin')
                .select('id, poin, keterangan, created_at, kategori:kategori_poin(id, nama)', {
                    count: dari === 0 ? 'exact' : undefined,
                })
                .eq('anggota_id', anggotaId)
                .order('id', { ascending: false })
                .range(dari, dari + PER_HALAMAN - 1);

            if (idFolder !== 'semua') {
                query = idFolder === 'null' ? query.is('kategori_id', null) : query.eq('kategori_id', Number(idFolder));
                if (q) query = query.ilike('keterangan', `%${q}%`);
            } else if (filterSemua) {
                query = query.or(filterSemua);
            }

            const { data, error, count } = await query;
            if (error) throw error;
            const rows = ((data ?? []) as any[]).map((r) => ({
                ...r,
                kategori: Array.isArray(r.kategori) ? (r.kategori[0] ?? null) : r.kategori,
            })) as MutasiPoinItem[];
            return { rows, total: (count as number | null) ?? null };
        },
        [anggotaId, idFolder, q, filterSemua]
    );

    const d = useBertahap<MutasiPoinItem>(ambil, modeDaftar);

    function bukaFolder(f: MutasiFolder) {
        setFolder(f);
        setKueri('');
    }
    function kembali() {
        setFolder(null);
        setKueri('');
    }

    return (
        <Kartu
            judul="Mutasi Poin"
            kanan={
                !memuatFolder && !galatFolder
                    ? `${jumlahSemua.toLocaleString('id-ID')} mutasi · ${fmtPoin(totalSemua)} poin`
                    : undefined
            }
            className={className}
        >
            <div className="flex shrink-0 items-center gap-3">
                {folder && (
                    <button type="button" onClick={kembali} className={`${tombolPutih} shrink-0 px-3 py-2 text-xs`}>
                        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                        Semua folder
                    </button>
                )}
                <KotakCari
                    id="vp-cari-mutasi"
                    label="Cari mutasi poin"
                    placeholder={folder ? `Cari di folder ${folder.nama}` : 'Cari keterangan atau kategori'}
                    value={kueri}
                    onChange={setKueri}
                />
                {modeDaftar && d.memuat && d.baris.length > 0 && (
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin text-slate-400" aria-hidden="true" />
                )}
            </div>

            <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
                {!modeDaftar ? (
                    /* ============ TAMPILAN FOLDER ============ */
                    memuatFolder ? (
                        <p role="status" className="flex items-center gap-2 text-sm text-slate-500">
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                            Memuat folder…
                        </p>
                    ) : galatFolder ? (
                        <div className="space-y-3">
                            <p className="text-sm text-slate-500">Mutasi poin tidak dapat dimuat.</p>
                            <button type="button" onClick={() => setUlang((n) => n + 1)} className={`${tombolPutih} px-4 py-2 text-xs`}>
                                Coba lagi
                            </button>
                        </div>
                    ) : folders.length === 0 ? (
                        <p className="text-sm text-slate-500">Belum ada mutasi poin tambahan.</p>
                    ) : (
                        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {folders.map((f) => (
                                <li key={f.id ?? 'tanpa'}>
                                    <button
                                        type="button"
                                        onClick={() => bukaFolder(f)}
                                        className="group flex h-full w-full cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-left transition-colors hover:border-blue-300 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                    >
                                        <Folder
                                            className="mt-0.5 h-8 w-8 shrink-0 fill-blue-100 text-blue-500 group-hover:fill-blue-200"
                                            aria-hidden="true"
                                        />
                                        <span className="min-w-0 flex-1">
                                            <span
                                                className={`block break-words text-sm font-bold ${
                                                    f.id === null ? 'italic text-slate-600' : 'text-slate-800'
                                                }`}
                                            >
                                                {f.nama}
                                            </span>
                                            <span className="mt-0.5 block text-xs text-slate-500">
                                                {f.jumlah.toLocaleString('id-ID')} mutasi
                                            </span>
                                            <span className={`mt-1 block text-sm font-extrabold tabular-nums ${warnaPoin(f.total)}`}>
                                                {fmtPoin(f.total)}
                                                <span className="sr-only"> poin</span>
                                            </span>
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )
                ) : (
                    /* ============ TAMPILAN DAFTAR ============ */
                    <>
                        {folder && (
                            <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 p-4">
                                <div className="flex items-start gap-3">
                                    <FolderOpen className="h-7 w-7 shrink-0 fill-blue-100 text-blue-500" aria-hidden="true" />
                                    <div className="min-w-0 flex-1">
                                        <p className="break-words text-sm font-bold text-slate-800">{folder.nama}</p>
                                        <p className="mt-0.5 text-xs text-slate-500">
                                            {folder.jumlah.toLocaleString('id-ID')} mutasi ·{' '}
                                            <span className={`font-bold ${warnaPoin(folder.total)}`}>
                                                {fmtPoin(folder.total)} poin
                                            </span>
                                        </p>
                                    </div>
                                </div>
                                <p
                                    className={`mt-3 whitespace-pre-line break-words text-sm leading-6 ${
                                        folder.keterangan ? 'text-slate-700' : 'italic text-slate-400'
                                    }`}
                                >
                                    {folder.keterangan || 'Kategori ini belum memiliki keterangan.'}
                                </p>
                            </div>
                        )}

                        {d.baris.length === 0 && d.memuat ? (
                            <p role="status" className="flex items-center gap-2 text-sm text-slate-500">
                                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                                Memuat mutasi…
                            </p>
                        ) : d.galat === 'awal' ? (
                            <div className="space-y-3">
                                <p className="text-sm text-red-600">Mutasi poin gagal dimuat.</p>
                                <button type="button" onClick={d.coba} className={`${tombolPutih} px-4 py-2 text-xs`}>
                                    Coba lagi
                                </button>
                            </div>
                        ) : d.baris.length === 0 ? (
                            <p className="text-sm text-slate-500">
                                {q ? `Tidak ada mutasi yang cocok dengan "${q}".` : 'Belum ada mutasi di folder ini.'}
                            </p>
                        ) : (
                            <>
                                <ul
                                    aria-busy={d.memuat}
                                    className={`divide-y divide-slate-100 transition-opacity ${d.memuat ? 'opacity-60' : ''}`}
                                >
                                    {d.baris.map((m) => (
                                        <li key={m.id} className="flex items-start gap-4 py-3">
                                            <div className="min-w-0 flex-1">
                                                <p
                                                    className={`break-words text-sm leading-5 ${
                                                        m.keterangan ? 'font-semibold text-slate-800' : 'italic text-slate-400'
                                                    }`}
                                                >
                                                    {m.keterangan || 'Tanpa keterangan'}
                                                </p>
                                                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                                                    {!folder && (
                                                        <span
                                                            className={`rounded-full px-2 py-0.5 font-semibold ${
                                                                m.kategori
                                                                    ? 'bg-blue-50 text-blue-700'
                                                                    : 'bg-slate-100 text-slate-400'
                                                            }`}
                                                        >
                                                            {m.kategori?.nama || 'Tanpa kategori'}
                                                        </span>
                                                    )}
                                                    <time dateTime={m.created_at}>{formatWaktu(m.created_at)}</time>
                                                </p>
                                            </div>
                                            <p className={`shrink-0 text-base font-extrabold tabular-nums ${warnaPoin(m.poin)}`}>
                                                {fmtPoin(m.poin)}
                                                <span className="sr-only"> poin</span>
                                            </p>
                                        </li>
                                    ))}
                                </ul>
                                <BawahDaftar
                                    galat={d.galat}
                                    adaLagi={d.adaLagi}
                                    memuatLagi={d.memuatLagi}
                                    onMuatLagi={d.muatLagi}
                                    selesai={q ? 'Semua hasil pencarian sudah ditampilkan.' : 'Semua mutasi sudah ditampilkan.'}
                                />
                            </>
                        )}
                    </>
                )}
            </div>
        </Kartu>
    );
}