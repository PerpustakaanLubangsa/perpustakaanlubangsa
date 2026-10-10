import type { Loan } from './konfigurasi';

/* Tabel untuk salin & Excel (kolom dan urutan sama) */

export const TABLE_HEADERS = ['No', 'Nama', 'Kamar', 'Judul Buku', 'Penulis', 'Telat (Hari)', 'Denda (Rp)'];
// Kolom angka (rata kanan di tabel HTML)
const NUMERIC_COLS = new Set([0, 5, 6]);

export function loanToCells(l: Loan, i: number): (string | number)[] {
  return [i + 1, l.nama, l.kamar, l.judul, l.penulis, l.hariTerlambat, l.denda];
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Hasil salin: TSV (otomatis jadi sel saat ditempel ke Excel/Sheets) + HTML (tabel di Word/Docs) */
function buildCopyTable(data: Loan[]): { tsv: string; html: string } {
  const body = data.map(loanToCells);

  const clean = (v: string | number) => String(v).replace(/[\t\r\n]+/g, ' ').trim();
  const tsv = [TABLE_HEADERS, ...body].map((r) => r.map(clean).join('\t')).join('\n');

  const cell = 'border:1px solid #94a3b8;padding:4px 8px;';
  const th = TABLE_HEADERS.map(
    (h, c) =>
      `<th style="${cell}background:#dbeafe;font-weight:bold;text-align:${
        NUMERIC_COLS.has(c) ? 'right' : 'left'
      };">${escapeHtml(h)}</th>`,
  ).join('');
  const tr = body
    .map(
      (r) =>
        `<tr>${r
          .map(
            (v, c) =>
              `<td style="${cell}text-align:${NUMERIC_COLS.has(c) ? 'right' : 'left'};">${escapeHtml(
                clean(v),
              )}</td>`,
          )
          .join('')}</tr>`,
    )
    .join('');
  const html = `<table style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:12px;"><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table>`;

  return { tsv, html };
}

async function copyText(text: string): Promise<void> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
  } catch {
    // lanjut ke cadangan di bawah (mis. Safari menolak setelah proses async)
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  const ok = document.execCommand('copy');
  document.body.removeChild(ta);
  if (!ok) throw new Error('Browser menolak menyalin ke clipboard.');
}

export async function copyTable(data: Loan[]): Promise<void> {
  const { tsv, html } = buildCopyTable(data);

  try {
    if (navigator.clipboard?.write && typeof ClipboardItem !== 'undefined') {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/plain': new Blob([tsv], { type: 'text/plain' }),
          'text/html': new Blob([html], { type: 'text/html' }),
        }),
      ]);
      return;
    }
  } catch {
    // jatuh ke salinan teks biasa (tab-separated)
  }
  await copyText(tsv);
}