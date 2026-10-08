import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet, renderToBuffer } from '@react-pdf/renderer';
import {
  SITE_NAME,
  SITE_URL,
  dekode,
  formatTanggal,
  getAnggotaIdentitas,
  getKaryaBySegmen,
  hrefKarya,
} from '../../data';

export const runtime = 'nodejs';
export const revalidate = 300;

type Ctx = { params: Promise<{ slug: string }> };

const styles = StyleSheet.create({
  /* ---------- Halaman 1: sampul ---------- */
  sampul: {
    backgroundColor: '#1d4ed8',
    padding: 48,
    flexDirection: 'column',
    justifyContent: 'space-between',
    color: '#ffffff',
  },
  sampulBrand: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: '#bfdbfe',
  },
  sampulGaris: { height: 1, backgroundColor: '#60a5fa', marginTop: 10 },
  sampulTengah: { flexGrow: 1, justifyContent: 'center' },
  sampulGambar: {
    height: 330,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    padding: 6,
    marginBottom: 28,
  },
  sampulGambarIsi: { width: '100%', height: '100%', objectFit: 'contain' },
  sampulKategori: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: '#bfdbfe',
    marginBottom: 10,
  },
  sampulJudul: { fontFamily: 'Helvetica-Bold', fontSize: 34, lineHeight: 1.2, color: '#ffffff' },
  sampulBawah: { borderTopWidth: 1, borderTopColor: '#60a5fa', paddingTop: 14 },
  sampulPenulis: { fontFamily: 'Helvetica-Bold', fontSize: 14, color: '#ffffff' },
  sampulMeta: { fontFamily: 'Helvetica', fontSize: 10, color: '#dbeafe', marginTop: 4 },

  /* ---------- Halaman 2 dst: isi ---------- */
  isiHalaman: {
    paddingTop: 56,
    paddingBottom: 64,
    paddingHorizontal: 56,
    fontFamily: 'Times-Roman',
    color: '#1e293b',
  },
  isiKategori: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    color: '#1d4ed8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  isiJudul: { fontFamily: 'Helvetica-Bold', fontSize: 20, lineHeight: 1.25, color: '#0f172a' },
  isiPenulis: { fontFamily: 'Helvetica', fontSize: 10, color: '#64748b', marginTop: 6 },
  isiGaris: { height: 1, backgroundColor: '#dbeafe', marginTop: 14, marginBottom: 22 },
  paragraf: { fontSize: 12.5, lineHeight: 1.65, marginBottom: 12 },
  footer: {
    position: 'absolute',
    left: 56,
    right: 56,
    bottom: 28,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontFamily: 'Helvetica',
    fontSize: 8,
    color: '#94a3b8',
  },
});

// Ambil gambar dari link mana pun, lalu ubah ke JPG agar bisa dipakai react-pdf
async function ambilGambar(url: string | null) {
  if (!url || !/^https?:\/\//i.test(url)) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const tipe = res.headers.get('content-type') ?? '';
    if (!tipe.startsWith('image/')) return null;
    const asli = Buffer.from(await res.arrayBuffer());
    if (asli.length > 10 * 1024 * 1024) return null;

    const sharp = (await import('sharp')).default;
    const data = await sharp(asli)
      .rotate()
      .resize({ width: 1400, withoutEnlargement: true })
      .flatten({ background: '#ffffff' })
      .jpeg({ quality: 82 })
      .toBuffer();
    return { data, format: 'jpg' as const };
  } catch {
    return null;
  }
}

export async function GET(_req: Request, { params }: Ctx) {
  const { slug } = await params;
  const karya = await getKaryaBySegmen(dekode(slug));
  if (!karya) return new Response('Karya tidak ditemukan', { status: 404 });

  const [anggota, gambar] = await Promise.all([
    getAnggotaIdentitas(karya.anggota_id),
    ambilGambar(karya.foto_url),
  ]);

  const penulis = karya.penulis || anggota?.nama || 'Anonim';
  const identitas = [anggota?.jenjang, anggota?.kamar && `Kamar ${anggota.kamar}`, anggota?.organisasi]
    .filter(Boolean)
    .join('  •  ');

  const paragraf = karya.isi
    .replace(/\r\n?/g, '\n')
    .trim()
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  // Puisi dan sejenisnya rata kiri, tulisan lain rata kanan-kiri
  const rataKiri = /puisi|sajak|syair|pantun|lirik/i.test(karya.kategori);
  const alamat = `${SITE_URL}${hrefKarya(karya)}`;

  const dokumen = (
    <Document title={karya.judul} author={penulis} creator={SITE_NAME} producer={SITE_NAME}>
      {/* Halaman 1: sampul */}
      <Page size="A4" style={styles.sampul}>
        <View>
          <Text style={styles.sampulBrand}>{SITE_NAME}</Text>
          <View style={styles.sampulGaris} />
        </View>

        <View style={styles.sampulTengah}>
          {gambar && (
            <View style={styles.sampulGambar}>
              <Image src={gambar} style={styles.sampulGambarIsi} />
            </View>
          )}
          <Text style={styles.sampulKategori}>{karya.kategori}</Text>
          <Text style={styles.sampulJudul}>{karya.judul}</Text>
        </View>

        <View style={styles.sampulBawah}>
          <Text style={styles.sampulPenulis}>{penulis}</Text>
          {identitas ? <Text style={styles.sampulMeta}>{identitas}</Text> : null}
          <Text style={styles.sampulMeta}>{formatTanggal(karya.dibuat_pada, 'panjang')}</Text>
        </View>
      </Page>

      {/* Halaman 2 dst: isi karya */}
      <Page size="A4" style={styles.isiHalaman}>
        <Text style={styles.isiKategori}>{karya.kategori}</Text>
        <Text style={styles.isiJudul}>{karya.judul}</Text>
        <Text style={styles.isiPenulis}>{penulis}</Text>
        <View style={styles.isiGaris} />

        {paragraf.map((p, i) => (
          <Text key={i} style={[styles.paragraf, { textAlign: rataKiri ? 'left' : 'justify' }]}>
            {p}
          </Text>
        ))}

        <View style={styles.footer} fixed>
          <Text>{alamat}</Text>
          {/* Sampul tidak dihitung, jadi halaman isi mulai dari 1 */}
          <Text render={({ pageNumber, totalPages }) => `${pageNumber - 1} / ${totalPages - 1}`} />
        </View>
      </Page>
    </Document>
  );

  let buffer: Buffer;
  try {
    buffer = await renderToBuffer(dokumen);
  } catch (err) {
    console.error('Gagal membuat PDF:', err);
    return new Response('Gagal membuat PDF', { status: 500 });
  }

  const nama =
    (karya.slug || karya.judul)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'karya';

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${nama}.pdf"`,
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  });
}