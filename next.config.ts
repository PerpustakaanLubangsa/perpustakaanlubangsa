import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Paket ini dijalankan langsung oleh Node.js dan tidak digabung (bundle) oleh Next.js.
  // Dibutuhkan agar pembuatan PDF dan pengolahan gambar berjalan normal.
  serverExternalPackages: ["@react-pdf/renderer", "sharp"],

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