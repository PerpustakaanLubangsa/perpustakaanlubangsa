import React from 'react';
import Sidebar from './Sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F5F5F5] flex text-slate-800 font-sans">
      
      {/* Komponen Sidebar yang sudah dipisah */}
      <Sidebar />

      {/* Konten Utama */}
      <div className="flex-1 flex flex-col md:pl-20">
        <main className="w-full">{children}</main>
      </div>

    </div>
  );
}