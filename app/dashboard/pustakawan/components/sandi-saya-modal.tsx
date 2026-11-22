'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { X, Loader2, Save, KeyRound, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { BTN_PRIMARY, BTN_NEUTRAL, BTN_NEUTRAL_SM } from '../../bibliografi/components/raised-buttons';
import { MIN_PASSWORD } from '../akun-tipe';

interface SandiSayaModalProps {
  onClose: () => void;
}

const INPUT_CLASS =
  'w-full h-10 px-3 pr-10 text-sm font-medium bg-white border border-blue-100 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-colors disabled:opacity-60';
const LABEL_CLASS = 'block mb-1 text-[10px] font-black text-slate-500 uppercase tracking-wider';

/** Ganti kata sandi akun sendiri. Dipakai semua pustakawan, tidak butuh hak super admin. */
export default function SandiSayaModal({ onClose }: SandiSayaModalProps) {
  const uid = useId();
  const [lama, setLama] = useState('');
  const [baru, setBaru] = useState('');
  const [ulang, setUlang] = useState('');
  const [tampil, setTampil] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [berhasil, setBerhasil] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [saving, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    if (!lama) return setError('Kata sandi saat ini wajib diisi.');
    if (baru.length < MIN_PASSWORD) return setError(`Kata sandi baru minimal ${MIN_PASSWORD} karakter.`);
    if (baru !== ulang) return setError('Ulangi kata sandi tidak sama.');
    if (baru === lama) return setError('Kata sandi baru harus berbeda dari yang lama.');

    setSaving(true);
    setError(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.email) {
        setError('Sesi tidak valid. Silakan login ulang.');
        return;
      }

      // Pastikan yang mengganti benar pemilik akun: verifikasi kata sandi saat ini
      const { error: errCek } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: lama,
      });
      if (errCek) {
        setError('Kata sandi saat ini salah.');
        return;
      }

      const { error: errUbah } = await supabase.auth.updateUser({ password: baru });
      if (errUbah) {
        console.error('Gagal mengganti kata sandi:', errUbah);
        setError('Gagal mengganti kata sandi. Coba lagi.');
        return;
      }
      setBerhasil(true);
    } catch (err) {
      console.error('Gagal mengganti kata sandi:', err);
      setError('Terjadi kesalahan saat mengganti kata sandi.');
    } finally {
      setSaving(false);
    }
  };

  const ikonMata = (
    <button
      type="button"
      onClick={() => setTampil((v) => !v)}
      tabIndex={-1}
      aria-label={tampil ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
    >
      {tampil ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
    </button>
  );

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Ganti kata sandi"
        className="w-full max-w-sm max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden"
      >
        <div className="flex items-center gap-3 p-5 border-b border-slate-200 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
            <KeyRound className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Ganti Kata Sandi</h3>
            <p className="text-[11px] text-slate-500 font-medium">Untuk akun yang sedang dipakai</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Tutup"
            className={`w-8 h-8 flex items-center justify-center rounded-lg ${BTN_NEUTRAL_SM}`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {berhasil ? (
          <div className="p-5 space-y-4">
            <p role="status" className="text-sm font-semibold text-emerald-700">
              Kata sandi berhasil diganti. Pakai kata sandi baru saat login berikutnya.
            </p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className={`h-9 px-4 text-[11px] font-extrabold uppercase tracking-wider rounded-lg ${BTN_PRIMARY}`}
              >
                Selesai
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1" noValidate>
            <div className="p-5 space-y-4 overflow-y-auto min-h-0">
              <div>
                <label htmlFor={`${uid}-lama`} className={LABEL_CLASS}>
                  Kata Sandi Saat Ini
                </label>
                <div className="relative">
                  <input
                    ref={inputRef}
                    id={`${uid}-lama`}
                    type={tampil ? 'text' : 'password'}
                    value={lama}
                    onChange={(e) => setLama(e.target.value)}
                    disabled={saving}
                    autoComplete="current-password"
                    className={INPUT_CLASS}
                  />
                  {ikonMata}
                </div>
              </div>
              <div>
                <label htmlFor={`${uid}-baru`} className={LABEL_CLASS}>
                  Kata Sandi Baru
                </label>
                <input
                  id={`${uid}-baru`}
                  type={tampil ? 'text' : 'password'}
                  value={baru}
                  onChange={(e) => setBaru(e.target.value)}
                  disabled={saving}
                  autoComplete="new-password"
                  placeholder={`Minimal ${MIN_PASSWORD} karakter`}
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label htmlFor={`${uid}-ulang`} className={LABEL_CLASS}>
                  Ulangi Kata Sandi Baru
                </label>
                <input
                  id={`${uid}-ulang`}
                  type={tampil ? 'text' : 'password'}
                  value={ulang}
                  onChange={(e) => setUlang(e.target.value)}
                  disabled={saving}
                  autoComplete="new-password"
                  className={INPUT_CLASS}
                />
              </div>

              {error && (
                <p role="alert" className="text-xs font-semibold text-red-600">
                  {error}
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-200 shrink-0">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className={`h-9 px-4 text-[11px] font-extrabold uppercase tracking-wider rounded-lg ${BTN_NEUTRAL}`}
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={saving}
                className={`inline-flex items-center justify-center gap-1.5 h-9 px-4 text-[11px] font-extrabold uppercase tracking-wider rounded-lg ${BTN_PRIMARY}`}
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
