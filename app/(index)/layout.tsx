'use client';

import { useState, useCallback, useEffect } from 'react';
import Header from "@/components/header";
import VisitorForm from "@/components/visitor-form";
import { ArrowLeft } from 'lucide-react';

export default function IndexLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isVisitorOpen, setIsVisitorOpen] = useState(false);
  const [shouldRenderForm, setShouldRenderForm] = useState(false);

  // Kunci scroll di level HTML & Body (Sangat ampuh untuk HP/Device low-end)
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    if (isVisitorOpen) {
      root.classList.add('overflow-hidden');
      body.classList.add('overflow-hidden');
    } else {
      root.classList.remove('overflow-hidden');
      body.classList.remove('overflow-hidden');
    }

    return () => {
      root.classList.remove('overflow-hidden');
      body.classList.remove('overflow-hidden');
    };
  }, [isVisitorOpen]);

  // Tunda render form agar animasi slide lancar
  useEffect(() => {
    if (isVisitorOpen) {
      const timer = setTimeout(() => setShouldRenderForm(true), 100);
      return () => clearTimeout(timer);
    } else {
      setShouldRenderForm(false);
    }
  }, [isVisitorOpen]);

  const toggleVisitor = useCallback(() => {
    setIsVisitorOpen((prev) => !prev);
  }, []);

  const closeVisitor = useCallback(() => {
    setIsVisitorOpen(false);
  }, []);

  return (
    <div className="min-h-screen w-full bg-black text-slate-100 flex flex-col antialiased">
      <Header onToggleVisitor={toggleVisitor} isVisitorOpen={isVisitorOpen} />

      <div className="flex-1 flex w-full relative overflow-hidden">
        {/* BACKDROP SOLID ringan */}
        {isVisitorOpen && (
          <div 
            onClick={closeVisitor}
            onTouchMove={(e) => e.preventDefault()} // Mencegah scroll sentuhan layar di mobile
            className="fixed inset-0 bg-black/60 z-[55] transition-opacity duration-150 touch-none"
          />
        )}

        {/* SIDEBAR */}
        <aside
          className={`fixed top-0 left-0 h-screen w-full md:w-[320px] lg:w-[350px] bg-slate-900 border-r border-slate-800 z-[60] transition-transform duration-150 ease-out transform-gpu ${
            isVisitorOpen 
              ? 'translate-x-0 pointer-events-auto' 
              : '-translate-x-full pointer-events-none'
          }`}
        >
          <div className="w-full h-full pt-4 px-5 pb-5 overflow-y-auto flex flex-col overscroll-contain">
            {/* Header Sidebar */}
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800 shrink-0 h-12">
              <h2 className="text-base font-semibold text-white tracking-tight">Catat Kunjungan</h2>
              
              <button
                type="button"
                onClick={closeVisitor}
                aria-label="Tutup sidebar"
                className="flex items-center justify-center h-8 w-8 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer z-10"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            </div>

            {/* Form Konten */}
            <div className="flex-1">
              {shouldRenderForm && <VisitorForm />}
            </div>
          </div>
        </aside>

        {/* HALAMAN UTAMA */}
        <main className="flex-1 min-w-0 bg-black">
          {children}
        </main>
      </div>
    </div>
  );
}