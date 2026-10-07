import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/dashboard/sirkulasi",
    name: "Perpustakaan Lubangsa",
    short_name: "Perpustakaan",
    description: "Sistem Informasi Perpustakaan Lubangsa: sirkulasi peminjaman dan pengembalian buku.",
    lang: "id",
    start_url: "/dashboard/sirkulasi",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#eff6ff",
    theme_color: "#2563eb",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}