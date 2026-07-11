import Sidebar from "@/components/sidebar";

export default function IndexLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen w-full relative">
      {/* Sidebar melayang khusus untuk halaman di dalam grup (index) */}
      <Sidebar />

      {/* Konten halaman dengan padding kiri pl-16 (setara w-16 default sidebar) 
          agar konten tidak tertutup oleh sidebar */}
      <div className="pl-16 min-h-screen bg-slate-50 transition-all duration-300">
        {children}
      </div>
    </div>
  );
}