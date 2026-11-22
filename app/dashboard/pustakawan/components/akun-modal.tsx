'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { X, Loader2, Save, KeyRound, Eye, EyeOff, Dices, Trash2, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { BTN_PRIMARY, BTN_NEUTRAL, BTN_NEUTRAL_SM, BTN_DELETE } from '../../bibliografi/components/raised-buttons';
import { MENU_BAWAAN, MENU_WAJIB, NAVIGATION_GROUPS, rapikanMenuIds } from '../../navigation';
import { hapusAkunPustakawan, simpanAkunPustakawan } from '../actions';
import {
  DOMAIN_EMAIL,
  LABEL_PERAN,
  MIN_PASSWORD,
  POLA_USERNAME,
  type AkunPustakawan,
  type PeranAkun,
} from '../akun-tipe';

interface AkunModalProps {
  pustakawan: { id: number; nama: string };
  /** null = pustakawan ini belum punya akun login */
  akun: AkunPustakawan | null;
  onClose: () => void;
  /** Dipanggil setelah akun dibuat, diubah, atau dihapus, agar halaman memuat ulang */
  onChanged: () => Promise<void>;
}

const INPUT_CLASS =
  'w-full h-10 px-3 text-sm font-medium bg-white border border-blue-100 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-colors disabled:opacity-60';
const LABEL_CLASS = 'block mb-1 text-[10px] font-black text-slate-500 uppercase tracking-wider';

// Kata sandi acak yang mudah diketik: tanpa huruf/angka yang mirip (0 O 1 l I)
function buatSandiAcak(panjang = 10): string {
  const huruf = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const acak = new Uint32Array(panjang);
  crypto.getRandomValues(acak);
  return Array.from(acak, (n) => huruf[n % huruf.length]).join('');
}

async function ambilToken(): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? '';
}

export default function AkunModal({ pustakawan, akun, onClose, onChanged }: AkunModalProps) {
  const uid = useId();
  const adaAkun = akun !== null;

  const [username, setUsername] = useState(akun?.username ?? '');
  const [role, setRole] = useState<PeranAkun>(akun?.role ?? 'pustakawan');
  const [menuIds, setMenuIds] = useState<number[]>(
    adaAkun ? rapikanMenuIds(akun.menu_ids) : rapikanMenuIds(MENU_BAWAAN)
  );
  const [password, setPassword] = useState('');
  const [tampilSandi, setTampilSandi] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const toggleMenu = (id: number) => {
    if (MENU_WAJIB.includes(id)) return;
    setMenuIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const setGrup = (ids: number[], nyala: boolean) => {
    setMenuIds((prev) => {
      const set = new Set(prev);
      for (const id of ids) {
        if (MENU_WAJIB.includes(id)) continue;
        if (nyala) set.add(id);
        else set.delete(id);
      }
      return rapikanMenuIds([...set]);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    const uname = username.trim().toLowerCase();
    if (!POLA_USERNAME.test(uname)) {
      setError('Username 3-30 karakter: huruf kecil, angka, titik, garis bawah, atau strip.');
      return;
    }
    if (!adaAkun && !password) {
      setError('Kata sandi wajib diisi untuk akun baru.');
      return;
    }
    if (password && password.length < MIN_PASSWORD) {
      setError(`Kata sandi minimal ${MIN_PASSWORD} karakter.`);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const hasil = await simpanAkunPustakawan(await ambilToken(), {
        pustakawanId: pustakawan.id,
        username: uname,
        role,
        menuIds,
        password,
      });
      if (!hasil.ok) {
        setError(hasil.error);
        return;
      }
      await onChanged();
      onClose();
    } catch (err) {
      console.error('Gagal menyimpan akun:', err);
      setError('Terjadi kesalahan saat menyimpan akun.');
    } finally {
      setSaving(false);
    }
  };

  const handleHapus = async () => {
    if (saving || !adaAkun) return;
    if (!confirm(`Hapus akun login "${akun.username}"? Nama pustakawan tetap ada, tetapi tidak bisa masuk lagi.`)) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const hasil = await hapusAkunPustakawan(await ambilToken(), pustakawan.id);
      if (!hasil.ok) {
        setError(hasil.error);
        return;
      }
      await onChanged();
      onClose();
    } catch (err) {
      console.error('Gagal menghapus akun:', err);
      setError('Terjadi kesalahan saat menghapus akun.');
    } finally {
      setSaving(false);
    }
  };

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
        aria-label="Akun pustakawan"
        className="w-full max-w-lg max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden"
      >
        <div className="flex items-center gap-3 p-5 border-b border-slate-200 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
            <KeyRound className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
              {adaAkun ? 'Atur Akun' : 'Buat Akun'}
            </h3>
            <p className="text-[11px] text-slate-500 font-medium truncate">{pustakawan.nama}</p>
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

        <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1" noValidate>
          <div className="p-5 space-y-4 overflow-y-auto min-h-0">
            <div>
              <label htmlFor={`${uid}-user`} className={LABEL_CLASS}>
                Username<span className="text-blue-600"> *</span>
              </label>
              <div className="relative">
                <input
                  ref={inputRef}
                  id={`${uid}-user`}
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  disabled={saving}
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="contoh: ahmad"
                  className={`${INPUT_CLASS} pr-32`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-500 select-none pointer-events-none bg-slate-100 border border-slate-200 px-2 py-1 rounded-md">
                  @{DOMAIN_EMAIL}
                </span>
              </div>
            </div>

            <div>
              <label htmlFor={`${uid}-sandi`} className={LABEL_CLASS}>
                {adaAkun ? 'Kata Sandi Baru (kosongkan bila tidak diubah)' : 'Kata Sandi Awal'}
                {!adaAkun && <span className="text-blue-600"> *</span>}
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    id={`${uid}-sandi`}
                    type={tampilSandi ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={saving}
                    autoComplete="new-password"
                    placeholder={`Minimal ${MIN_PASSWORD} karakter`}
                    className={`${INPUT_CLASS} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setTampilSandi((v) => !v)}
                    tabIndex={-1}
                    aria-label={tampilSandi ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
                  >
                    {tampilSandi ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPassword(buatSandiAcak());
                    setTampilSandi(true);
                  }}
                  disabled={saving}
                  title="Buat kata sandi acak"
                  className={`h-10 px-3 inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider rounded-lg ${BTN_NEUTRAL_SM}`}
                >
                  <Dices className="w-4 h-4" />
                  Acak
                </button>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                Pustakawan bisa menggantinya sendiri lewat tombol &quot;Ganti Kata Sandi&quot; di halaman ini.
              </p>
            </div>

            <div>
              <label htmlFor={`${uid}-role`} className={LABEL_CLASS}>
                Peran
              </label>
              <select
                id={`${uid}-role`}
                value={role}
                onChange={(e) => setRole(e.target.value as PeranAkun)}
                disabled={saving}
                className={`${INPUT_CLASS} cursor-pointer`}
              >
                <option value="pustakawan">{LABEL_PERAN.pustakawan}</option>
                <option value="super_admin">{LABEL_PERAN.super_admin}</option>
              </select>
            </div>

            {role === 'super_admin' ? (
              <div className="flex items-start gap-2 px-3 py-2.5 bg-blue-50 border border-blue-100 rounded-xl text-xs font-medium text-blue-800">
                <ShieldCheck className="w-4 h-4 shrink-0 mt-px" />
                Super admin otomatis mengakses semua menu, mengatur akun, dan mengubah kata sandi pustakawan lain.
              </div>
            ) : (
              <div>
                <span className={LABEL_CLASS}>Akses Menu</span>
                <div className="space-y-3 border border-blue-100 rounded-xl p-3">
                  {NAVIGATION_GROUPS.map((grup) => {
                    const ids = grup.items.map((m) => m.id);
                    const semuaNyala = ids.every((id) => menuIds.includes(id));
                    return (
                      <div key={grup.groupName || 'utama'}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-extrabold tracking-widest text-blue-500 uppercase">
                            {grup.groupName}
                          </span>
                          <button
                            type="button"
                            onClick={() => setGrup(ids, !semuaNyala)}
                            disabled={saving}
                            className="text-[10px] font-bold text-slate-500 hover:text-blue-700 transition-colors"
                          >
                            {semuaNyala ? 'Kosongkan' : 'Pilih semua'}
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1">
                          {grup.items.map((m) => {
                            const wajib = MENU_WAJIB.includes(m.id);
                            return (
                              <label
                                key={m.id}
                                className={`flex items-center gap-2 text-xs font-medium text-slate-700 ${
                                  wajib ? 'opacity-60' : 'cursor-pointer'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={menuIds.includes(m.id)}
                                  disabled={wajib || saving}
                                  onChange={() => toggleMenu(m.id)}
                                  className="h-3.5 w-3.5 accent-blue-600"
                                />
                                <span className="truncate">{m.label}</span>
                                {wajib && <span className="text-[9px] text-slate-400">(selalu)</span>}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {error && (
              <p role="alert" className="text-xs font-semibold text-red-600">
                {error}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 px-5 py-4 border-t border-slate-200 shrink-0">
            {adaAkun && (
              <button
                type="button"
                onClick={handleHapus}
                disabled={saving}
                title="Hapus akun login"
                aria-label="Hapus akun login"
                className={`h-9 w-9 inline-flex items-center justify-center rounded-lg ${BTN_DELETE}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
            <div className="flex-1" />
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
      </div>
    </div>
  );
}
