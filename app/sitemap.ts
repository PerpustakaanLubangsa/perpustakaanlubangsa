// app/sitemap.ts
import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://perpustakaanlubangsa2.vercel.app/";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    // tambahkan halaman publik lain, misalnya /karya-tulis, /catat-kunjungan
  ];
}