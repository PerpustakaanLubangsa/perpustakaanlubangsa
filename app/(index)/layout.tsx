'use client';

import { useState } from 'react';
import Header from "@/components/header";
import VisitorForm from "@/components/visitor-form";
import { ArrowLeft } from 'lucide-react';

export default function IndexLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isVisitorOpen, setIsVisitorOpen] = useState(false);

  const toggleVisitor = () => {
    setIsVisitorOpen((prev) => !prev);
  };

  return (
    <div className="min-h-screen w-full bg-black text-slate-100 flex flex-col">
      {/* Header */}
      <Header onToggleVisitor={toggleVisitor} isVisitorOpen={isVisitorOpen} />

      <div className="flex-1 flex w-full relative">
        {/* SIDEBAR KIRI: z-index dinaikkan ke z-[60] supaya di atas Header */}
        <aside
          className={`fixed top-0 left-0 h-screen bg-slate-900 border-r border-slate-800 z-[60] transition-all duration-300 ease-in-out ${
            isVisitorOpen 
              ? 'w-full md:w-[320px] lg:w-[350px] opacity-100 translate-x-0' 
              : 'w-0 opacity-0 -translate-x-full border-none pointer-events-none'
          }`}
        >
          <div className="w-full md:w-[320px] lg:w-[350px] h-full pt-4 px-5 pb-5 overflow-y-auto flex flex-col">
            {/* Header Sidebar */}
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800 shrink-0 h-12">
              <h2 className="text-base font-semibold text-white tracking-tight">Catat Kunjungan</h2>
              
              {/* Tombol Panah Ke Kiri */}
              <button
                type="button"
                onClick={() => setIsVisitorOpen(false)}
                aria-label="Tutup sidebar"
                className="flex items-center justify-center h-8 w-8 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-300 hover:text-white hover:bg-slate-700 hover:border-slate-600 transition-all shadow-sm cursor-pointer z-10"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            </div>

            {/* Form Konten */}
            <div className="flex-1">
              <VisitorForm />
            </div>
          </div>
        </aside>

        {/* HALAMAN KANAN */}
        <main 
          className={`flex-1 min-w-0 bg-black transition-all duration-300 ${
            isVisitorOpen ? 'md:ml-[320px] lg:ml-[350px]' : 'ml-0'
          }`}
        >
          {children}
        </main>
      </div>
    </div>
  );
}