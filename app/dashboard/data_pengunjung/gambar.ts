import type { SpesifikasiGrafik } from './konfigurasi';

// Gambar PNG digambar langsung di canvas (tanpa library), jadi hasilnya sama di semua perangkat
const WARNA = ['#2563eb', '#0ea5e9', '#6366f1', '#14b8a6', '#f59e0b', '#ec4899', '#64748b'];
const LEBAR = 1200;
const SKALA = 2;

const fmt = (n: number) => n.toLocaleString('id-ID');
const pct = (n: number, t: number) =>
  (t ? (n / t) * 100 : 0).toLocaleString('id-ID', { maximumFractionDigits: 1 });

function potong(ctx: CanvasRenderingContext2D, teks: string, maks: number) {
  if (ctx.measureText(teks).width <= maks) return teks;
  let t = teks;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maks) t = t.slice(0, -1);
  return `${t}…`;
}

function tinggiGambar(s: SpesifikasiGrafik) {
  if (s.jenis === 'waktu') return 620;
  if (s.jenis === 'donut') return Math.max(560, 150 + s.data.length * 44 + 90);
  return 150 + Math.max(1, s.data.length) * 52 + 90;
}

export function unduhGambar(s: SpesifikasiGrafik, judul: string, subjudul: string, berkas: string) {
  const tinggi = tinggiGambar(s);
  const canvas = document.createElement('canvas');
  canvas.width = LEBAR * SKALA;
  canvas.height = tinggi * SKALA;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(SKALA, SKALA);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, LEBAR, tinggi);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#0f172a';
  ctx.font = '700 30px system-ui, sans-serif';
  ctx.fillText(judul, 48, 66);
  ctx.fillStyle = '#475569';
  ctx.font = '400 18px system-ui, sans-serif';
  ctx.fillText(subjudul, 48, 98);

  const kosong = s.data.length === 0 || (s.jenis === 'waktu' ? s.data.every((d) => d.n === 0) : false);

  if (kosong) {
    ctx.fillStyle = '#64748b';
    ctx.font = '400 20px system-ui, sans-serif';
    ctx.fillText('Tidak ada data pada lokasi ini.', 48, 180);
  } else if (s.jenis === 'waktu') {
    const data = s.data;
    const maks = Math.max(1, ...data.map((d) => d.n));
    const x0 = 60;
    const x1 = LEBAR - 60;
    const dasar = 490;
    const slot = (x1 - x0) / data.length;
    const lebarBatang = Math.min(90, slot * 0.66);
    const kecil = slot < 40;

    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x0, dasar + 0.5);
    ctx.lineTo(x1, dasar + 0.5);
    ctx.stroke();

    ctx.textAlign = 'center';
    data.forEach((d, i) => {
      const x = x0 + slot * i + (slot - lebarBatang) / 2;
      const h = Math.round((d.n / maks) * 300);
      ctx.fillStyle = '#2563eb';
      ctx.fillRect(x, dasar - h, lebarBatang, h);
      if (d.n > 0) {
        ctx.fillStyle = '#334155';
        ctx.font = `600 ${kecil ? 11 : 15}px system-ui, sans-serif`;
        ctx.fillText(fmt(d.n), x + lebarBatang / 2, dasar - h - 8);
      }
      ctx.fillStyle = '#475569';
      ctx.font = `400 ${kecil ? 12 : 16}px system-ui, sans-serif`;
      ctx.fillText(d.label, x + lebarBatang / 2, dasar + 26);
    });
  } else if (s.jenis === 'donut') {
    const { data, total } = s;
    const cx = 270;
    const cy = 340;
    const r = 150;
    let mulai = -Math.PI / 2;

    ctx.lineWidth = 60;
    data.forEach((d, i) => {
      const sudut = total ? (d.n / total) * Math.PI * 2 : 0;
      ctx.strokeStyle = WARNA[i % WARNA.length];
      ctx.beginPath();
      ctx.arc(cx, cy, r, mulai, mulai + sudut);
      ctx.stroke();
      mulai += sudut;
    });

    ctx.textAlign = 'center';
    ctx.fillStyle = '#0f172a';
    ctx.font = '700 38px system-ui, sans-serif';
    ctx.fillText(fmt(total), cx, cy + 8);
    ctx.fillStyle = '#64748b';
    ctx.font = '400 16px system-ui, sans-serif';
    ctx.fillText('kunjungan', cx, cy + 34);

    data.forEach((d, i) => {
      const y = 160 + i * 44;
      ctx.fillStyle = WARNA[i % WARNA.length];
      ctx.fillRect(560, y - 16, 20, 20);
      ctx.textAlign = 'left';
      ctx.fillStyle = '#0f172a';
      ctx.font = '500 19px system-ui, sans-serif';
      ctx.fillText(potong(ctx, d.k, 340), 594, y);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#475569';
      ctx.font = '400 18px system-ui, sans-serif';
      ctx.fillText(`${fmt(d.n)} · ${pct(d.n, total)}%`, LEBAR - 48, y);
    });
  } else {
    const { data, total } = s;
    const maks = Math.max(1, ...data.map((d) => d.n));
    data.forEach((d, i) => {
      const y = 170 + i * 52;
      ctx.textAlign = 'left';
      ctx.fillStyle = '#0f172a';
      ctx.font = '500 19px system-ui, sans-serif';
      ctx.fillText(potong(ctx, d.k, 360), 48, y);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(430, y - 20, 570, 28);
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(430, y - 20, Math.max(2, (d.n / maks) * 570), 28);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#475569';
      ctx.font = '400 18px system-ui, sans-serif';
      ctx.fillText(`${fmt(d.n)} · ${pct(d.n, total)}%`, LEBAR - 48, y);
    });
  }

  ctx.textAlign = 'left';
  ctx.fillStyle = '#94a3b8';
  ctx.font = '400 14px system-ui, sans-serif';
  ctx.fillText(`Perpustakaan Lubangsa · diunduh ${new Date().toISOString().slice(0, 10)}`, 48, tinggi - 28);

  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${berkas}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, 'image/png');
}