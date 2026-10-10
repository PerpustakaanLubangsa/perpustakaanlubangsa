'use client';

import React, { useCallback, useState } from 'react';
import { Clock, Layers, Loader2 } from 'lucide-react';
import { COLOR_BACA, COLOR_PINJAM, formatWaktu, type RiwayatItem } from './vp-types';
import { supabase } from './vp-data';
import { PER_HALAMAN, sanitizeQuery, useBertahap, useDebounced } from './vp-paging';
import { BawahDaftar, Kartu, KotakCari, tombolPutih } from './vp-ui';

/** Kartu riwayat kunjungan (data_pengunjung): tinggi tetap, scroll di dalam, pencarian, muat lebih banyak. */
export default function RiwayatKunjungan({ anggotaId, className = '' }: { anggotaId: string; className?: string }) {
    const [kueri, setKueri] = useState('');
    const q = useDebounced(sanitizeQuery(kueri));

    const ambil = useCallback(
        async (dari: number) => {
            let query: any = supabase
                .from('data_pengunjung')
                .select('id, judul_buku, kategori, aktivitas, created_at', {
                    count: dari === 0 ? 'exact' : undefined,
                })
                .eq('id_anggota', anggotaId)
                .order('created_at', { ascending: false })
                .order('id', { ascending: false })
                .range(dari, dari + PER_HALAMAN - 1);
            if (q) query = query.or(`judul_buku.ilike.%${q}%,kategori.ilike.%${q}%,aktivitas.ilike.%${q}%`);

            const { data, error, count } = await query;
            if (error) throw error;
            return { rows: (data ?? []) as RiwayatItem[], total: (count as number | null) ?? null };
        },
        [anggotaId, q]
    );

    const d = useBertahap<RiwayatItem>(ambil);

    return (
        <Kartu
            judul="Riwayat Kunjungan"
            kanan={d.total !== null && !d.memuat ? `${d.total.toLocaleString('id-ID')} kunjungan` : undefined}
            className={className}
        >
            <div className="flex shrink-0 items-center gap-3">
                <KotakCari
                    id="vp-cari-riwayat"
                    label="Cari riwayat kunjungan"
                    placeholder="Cari judul, kategori, atau aktivitas"
                    value={kueri}
                    onChange={setKueri}
                />
                {d.memuat && d.baris.length > 0 && (
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin text-slate-400" aria-hidden="true" />
                )}
            </div>

            <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
                {d.baris.length === 0 && d.memuat ? (
                    <p role="status" className="flex items-center gap-2 text-sm text-slate-500">
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        Memuat riwayat…
                    </p>
                ) : d.galat === 'awal' ? (
                    <div className="space-y-3">
                        <p className="text-sm text-red-600">Riwayat kunjungan gagal dimuat.</p>
                        <button type="button" onClick={d.coba} className={`${tombolPutih} px-4 py-2 text-xs`}>
                            Coba lagi
                        </button>
                    </div>
                ) : d.baris.length === 0 ? (
                    <p className="text-sm text-slate-500">
                        {q ? `Tidak ada riwayat yang cocok dengan "${q}".` : 'Belum ada riwayat kunjungan.'}
                    </p>
                ) : (
                    <>
                        <ul
                            aria-busy={d.memuat}
                            className={`divide-y divide-slate-100 transition-opacity ${d.memuat ? 'opacity-60' : ''}`}
                        >
                            {d.baris.map((r, i) => {
                                const warna = r.aktivitas === 'Pinjam' ? COLOR_PINJAM : COLOR_BACA;
                                return (
                                    <li key={r.id} className="flex items-start gap-3 py-3">
                                        <span
                                            className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
                                            style={{ background: warna }}
                                        />
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="line-clamp-2 text-sm font-semibold text-slate-800">
                                                    {r.judul_buku || '-'}
                                                </div>
                                                <div className="flex shrink-0 items-center gap-2 text-[11px] font-bold">
                                                    {i === 0 && !q && <span className="text-blue-600">Baru</span>}
                                                    <span style={{ color: warna }}>{r.aktivitas || '-'}</span>
                                                </div>
                                            </div>
                                            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs text-slate-500">
                                                <span className="flex items-center gap-1">
                                                    <Layers className="h-3 w-3" />
                                                    {r.kategori || '-'}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    {formatWaktu(r.created_at)}
                                                </span>
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                        <BawahDaftar
                            galat={d.galat}
                            adaLagi={d.adaLagi}
                            memuatLagi={d.memuatLagi}
                            onMuatLagi={d.muatLagi}
                            selesai={q ? 'Semua hasil pencarian sudah ditampilkan.' : 'Semua riwayat sudah ditampilkan.'}
                        />
                    </>
                )}
            </div>
        </Kartu>
    );
}