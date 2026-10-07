import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegister from "./components/ServiceWorkerRegister";
import InstallPrompt from "./components/InstallPrompt";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Ganti dengan domain asli, atau set NEXT_PUBLIC_SITE_URL di .env
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://perpustakaanlubangsa2.vercel.app/";
const SITE_NAME = "Perpustakaan Lubangsa";
const DESCRIPTION =
  "Katalog online Perpustakaan Lubangsa: cari buku dan karya tulis, catat kunjungan, dan akses layanan sirkulasi peminjaman serta pengembalian buku.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  title: {
    default: "Perpustakaan Lubangsa | Katalog Buku & Karya Tulis Online",
    template: "%s | Perpustakaan Lubangsa",
  },
  description: DESCRIPTION,
  keywords: [
    "Perpustakaan Lubangsa",
    "katalog buku online",
    "pencarian buku",
    "karya tulis",
    "OPAC perpustakaan",
    "sistem informasi perpustakaan",
  ],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: "/",
    siteName: SITE_NAME,
    title: "Perpustakaan Lubangsa | Katalog Buku & Karya Tulis Online",
    description: DESCRIPTION,
    images: [
      { url: "/og-image.png", width: 1200, height: 630, alt: SITE_NAME },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Perpustakaan Lubangsa",
    description: DESCRIPTION,
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  appleWebApp: {
    capable: true,
    title: "Perpustakaan",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
  // Isi setelah mendaftar di Google Search Console (metode meta tag)
  // verification: { google: "KODE_VERIFIKASI" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2563eb",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Library",
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  description: DESCRIPTION,
  inLanguage: "id",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-white text-slate-800 font-sans">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
          }}
        />

        {children}

        {/* PWA */}
        <ServiceWorkerRegister />
        <InstallPrompt />
      </body>
    </html>
  );
}