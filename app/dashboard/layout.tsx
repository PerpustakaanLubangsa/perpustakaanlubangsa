import React from 'react';
import Sidebar from './Sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="min-h-screen flex text-slate-800 font-sans bg-[#0b0c10] bg-[url('/bg.png')] bg-cover bg-center bg-no-repeat bg-fixed"
    >
      {/* Sidebar (fixed, lebar tetap w-72, sisi kanan melengkung) */}
      <Sidebar />

      {/* Konten Utama: offset kiri disamakan dengan lebar sidebar */}
      <div className="flex-1 min-w-0 flex flex-col md:pl-72">
        <main className="w-full">{children}</main>
      </div>
    </div>
  );
}