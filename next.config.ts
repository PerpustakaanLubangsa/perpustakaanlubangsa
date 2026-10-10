import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Paket ini dijalankan langsung oleh Node.js dan tidak digabung (bundle) oleh Next.js.
  // Dibutuhkan agar pembuatan PDF dan pengolahan gambar berjalan normal.
  serverExternalPackages: ["@react-pdf/renderer", "sharp"],

  experimental: {
    serverActions: {
      // Dibutuhkan saat dikembangkan di GitHub Codespaces, karena proxy-nya membuat
      // header Origin tidak sama dengan Host sehingga server action ditolak.
      allowedOrigins: ["*.app.github.dev", "localhost:3000"],
    },
  },

  async headers() {
    return [
      {
        // Pastikan browser selalu mengambil service worker terbaru
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;