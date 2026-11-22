'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X, Loader2, Plus, Edit3, Trash2, Check, Tags } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  BTN_PRIMARY_SM,
  BTN_NEUTRAL_SM,
  BTN_EDIT,
  BTN_DELETE,
} from '../../bibliografi/components/raised-buttons';
import type { JabatanOption } from './pustakawan-form-modal';

interface JabatanModalProps {
  jabatanOptions: JabatanOption[];
  /** Jumlah pustakawan per jabatan (kunci: id jabatan) */
  usage: Record<number, number>;
  onClose: () => void;
  /** Dipanggil setelah data jabatan berubah, agar halaman memuat ulang */
  onChanged: () => Promise<void>;
}

const TABLE = 'jabatan';

const INPUT_CLASS =
  'w-full h-9 px-3 text-sm font-medium bg-white border border-blue-100 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-colors disabled:opacity-60';

const clean = (v: string) => v.trim().replace(/\s+/g, ' ');

function pesanError(err: { code?: string } | null, aksi: string): string {
  if (err?.code === '23505') return 'Nama jabatan sudah ada.';
  if (err?.code === '42501') {
    return 'Tidak punya izin mengubah jabatan. Jalankan SQL izin kelola jabatan di Supabase lebih dulu.';
  }
  return `Gagal ${aksi} jabatan.`;
}

export default function JabatanModal({
  jabatanOptions,
  usage,
  onClose,
  onChanged,
}: JabatanModalProps) {
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const newRef = useRef<HTMLInputElement>(null);
  const editRef = useRef<HTMLInputElement>(null);

  // Fokus ke kolom tambah, Esc untuk menutup, kunci scroll halaman
  useEffect(() => {
    newRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  useEffect(() => {
    if (editingId !== null) editRef.current?.focus();
  }, [editingId]);

  const run = async (job: () => Promise<string | null>) => {
    if (busy) return false;
    setBusy(true);
    setError(null);
    const problem = await job();
    if (problem) {
      setError(problem);
      setBusy(false);
      return false;
    }
    await onChanged();
    setBusy(false);
    return true;
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const nama = clean(newName);
    if (!nama) {
      setError('Nama jabatan wajib diisi.');
      return;
    }
    // Jabatan baru ditaruh paling akhir di dropdown
    const urutan = jabatanOptions.reduce((m, j) => Math.max(m, j.urutan), 0) + 1;

    const ok = await run(async () => {
      const { error } = await supabase.from(TABLE).insert([{ nama, urutan }]);
      if (error) console.error('Gagal menambah jabatan:', error);
      return error ? pesanError(error, 'menambah') : null;
    });
    if (ok) {
      setNewName('');
      newRef.current?.focus();
    }
  };

  const startEdit = (j: JabatanOption) => {
    setEditingId(j.id);
    setEditName(j.nama);
    setError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  const saveEdit = async () => {
    if (editingId === null) return;
    const nama = clean(editName);
    if (!nama) {
      setError('Nama jabatan wajib diisi.');
      return;
    }
    const id = editingId;

    const ok = await run(async () => {
      const { error } = await supabase.from(TABLE).update({ nama }).eq('id', id);
      if (error) console.error('Gagal mengubah jabatan:', error);
      return error ? pesanError(error, 'mengubah') : null;
    });
    if (ok) cancelEdit();
  };

  const handleDelete = async (j: JabatanOption) => {
    const dipakai = usage[j.id] ?? 0;
    const pesan = dipakai
      ? `Hapus jabatan "${j.nama}"? ${dipakai} pustakawan akan menjadi tanpa jabatan.`
      : `Hapus jabatan "${j.nama}"?`;
    if (!confirm(pesan)) return;

    await run(async () => {
      const { error } = await supabase.from(TABLE).delete().eq('id', j.id);
      if (error) console.error('Gagal menghapus jabatan:', error);
      return error ? pesanError(error, 'menghapus') : null;
    });
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Kelola jabatan"
        className="w-full max-w-md max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center gap-3 p-5 border-b border-slate-200 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
            <Tags className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
              Kelola Jabatan
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              Daftar pilihan jabatan pustakawan
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className={`w-8 h-8 flex items-center justify-center rounded-lg ${BTN_NEUTRAL_SM}`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tambah jabatan */}
        <form
          onSubmit={handleAdd}
          className="flex items-center gap-2 px-5 py-3 border-b border-slate-200 shrink-0"
          noValidate
        >
          <input
            ref={newRef}
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            disabled={busy}
            autoComplete="off"
            placeholder="Nama jabatan baru"
            aria-label="Nama jabatan baru"
            className={INPUT_CLASS}
          />
          <button
            type="submit"
            disabled={busy}
            className={`inline-flex items-center justify-center gap-1.5 h-9 px-3 shrink-0 text-[11px] font-extrabold uppercase tracking-wider rounded-lg ${BTN_PRIMARY_SM}`}
          >
            {busy && editingId === null ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5 stroke-[3]" />
            )}
            Tambah
          </button>
        </form>

        {error && (
          <p role="alert" className="px-5 pt-3 text-xs font-semibold text-red-600">
            {error}
          </p>
        )}

        {/* Daftar jabatan */}
        <div className="overflow-y-auto min-h-0 divide-y divide-blue-50">
          {jabatanOptions.length === 0 && (
            <p className="px-5 py-6 text-center text-xs text-slate-500">
              Belum ada jabatan. Tambahkan jabatan pertama di atas.
            </p>
          )}

          {jabatanOptions.map((j) => {
            const dipakai = usage[j.id] ?? 0;

            if (editingId === j.id) {
              return (
                <div key={j.id} className="flex items-center gap-2 px-5 py-2.5 bg-blue-50/50">
                  <input
                    ref={editRef}
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        saveEdit();
                      } else if (e.key === 'Escape') {
                        // Batalkan edit saja, jangan menutup modal
                        e.stopPropagation();
                        cancelEdit();
                      }
                    }}
                    disabled={busy}
                    autoComplete="off"
                    aria-label={`Nama jabatan ${j.nama}`}
                    className={INPUT_CLASS}
                  />
                  <button
                    type="button"
                    onClick={saveEdit}
                    disabled={busy}
                    title="Simpan"
                    aria-label="Simpan perubahan"
                    className={`p-1.5 rounded-md ${BTN_EDIT}`}
                  >
                    {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    disabled={busy}
                    title="Batal"
                    aria-label="Batal mengubah"
                    className={`p-1.5 rounded-md ${BTN_NEUTRAL_SM}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            }

            return (
              <div key={j.id} className="flex items-center gap-3 px-5 py-2.5">
                <div className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold text-slate-800 truncate">{j.nama}</span>
                  <span className="block text-[10px] font-medium text-slate-500">
                    {dipakai ? `${dipakai} pustakawan` : 'Belum dipakai'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => startEdit(j)}
                  disabled={busy}
                  title="Edit Jabatan"
                  aria-label={`Edit ${j.nama}`}
                  className={`p-1.5 rounded-md ${BTN_EDIT}`}
                >
                  <Edit3 className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(j)}
                  disabled={busy}
                  title="Hapus Jabatan"
                  aria-label={`Hapus ${j.nama}`}
                  className={`p-1.5 rounded-md ${BTN_DELETE}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
