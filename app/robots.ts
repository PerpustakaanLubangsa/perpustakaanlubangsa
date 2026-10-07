// app/robots.ts
import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://perpustakaanlubangsa2.vercel.app/";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/api"], // area pustakawan tidak perlu diindeks
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}