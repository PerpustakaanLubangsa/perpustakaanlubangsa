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

export const metadata: Metadata = {
  applicationName: "Perpustakaan Lubangsa",
  title: "Perpustakaan Lubangsa",
  description: "Sistem Informasi Perpustakaan",
  appleWebApp: {
    capable: true,
    title: "Perpustakaan",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
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
        {/* Layout utama sekarang polos tanpa sidebar agar fleksibel di rute grup */}
        {children}

        {/* PWA */}
        <ServiceWorkerRegister />
        <InstallPrompt />
      </body>
    </html>
  );
}