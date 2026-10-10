'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Check, ExternalLink, Loader2, Pencil, RotateCcw, Trash2, X } from 'lucide-react';
import { hapusKarya, ubahStatus, type HasilAksi } from '../actions';
import { tombol } from '../tombol';
import type { KaryaAdmin, StatusKarya } from '../tipe';
import { hrefKarya } from '../../../karya-tulis/data';

export default function AksiKarya({
  karya,
  onSelesai,
  onEdit,
}: {
  karya: KaryaAdmin;
  onSelesai: (id: string, pesan: string) => void;
  onEdit: (id: string) => void;
}) {
  const [sibuk, mulai] = useTransition();
  const [pesan, setPesan] = useState('');

  const jalankan = (kerjakan: () => Promise<HasilAksi>, sukses: string) => {
    setPesan('');
    mulai(async () => {
      const hasil = await kerjakan();
      if (hasil.ok) onSelesai(karya.id, sukses);
      else setPesan(hasil.pesan);
    });
  };

  const ubah = (tujuan: StatusKarya, sukses: string) => jalankan(() => ubahStatus(karya.id, tujuan), sukses);

  const hapus = () => {
    if (!window.confirm(`Hapus karya "${karya.judul}" secara permanen? Tindakan ini tidak bisa dibatalkan.`)) return;
    jalankan(() => hapusKarya(karya.id), 'Karya dihapus.');
  };

  const status = karya.status;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-3 pb-1">
        <button type="button" onClick={() => onEdit(karya.id)} disabled={sibuk} className={tombol.netral}>
          <Pencil className="h-4 w-4" aria-hidden="true" />
          Baca / edit
        </button>

        {status !== 'approved' && (
          <button
            type="button"
            onClick={() => ubah('approved', 'Karya disetujui dan tampil di galeri.')}
            disabled={sibuk}
            className={tombol.utama}
          >
            {sibuk ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Check className="h-4 w-4" aria-hidden="true" />
            )}
            Setujui
          </button>
        )}

        {status === 'pending' && (
          <button
            type="button"
            onClick={() => ubah('rejected', 'Karya ditolak.')}
            disabled={sibuk}
            className={tombol.netral}
          >
            <X className="h-4 w-4" aria-hidden="true" />
            Tolak
          </button>
        )}

        {status === 'approved' && (
          <Link href={hrefKarya({ slug: karya.slug, id: karya.id })} target="_blank" className={tombol.netral}>
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            Lihat di galeri
          </Link>
        )}

        {status !== 'pending' && (
          <button
            type="button"
            onClick={() => ubah('pending', 'Karya dikembalikan ke antrean menunggu.')}
            disabled={sibuk}
            className={tombol.netral}
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Kembalikan ke menunggu
          </button>
        )}

        <button type="button" onClick={hapus} disabled={sibuk} className={`${tombol.bahaya} ml-auto`}>
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          Hapus
        </button>
      </div>

      {pesan && (
        <p role="alert" className="mt-2 text-xs font-medium text-red-600">
          {pesan}
        </p>
      )}
    </div>
  );
}