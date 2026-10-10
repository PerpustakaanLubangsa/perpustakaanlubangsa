import { randomBytes } from 'node:crypto';

// Salinan buatSlug dari kirim-karya/actions.ts (berkas 'use server' tidak bisa mengekspor fungsi biasa).
export function buatSlug(judul: string) {
  const dasar =
    judul
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60)
      .replace(/-+$/g, '') || 'karya';
  // Akhiran acak menjaga slug tetap unik tanpa perlu query tambahan
  return `${dasar}-${randomBytes(3).toString('hex')}`;
}