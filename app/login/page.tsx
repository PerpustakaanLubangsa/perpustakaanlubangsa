import React from 'react';
import LeftPanel from './LeftPanel';
import RightForm from './RightForm';

export default function LoginPage() {
  return (
    /* PERUBAHAN:
       1. Menambahkan `overflow-hidden` agar pergeseran/overlay RightForm ke kiri tidak memicu horizontal scrollbar.
       2. Memastikan susunan komponen bersih dan siap menampung overlay RightForm di atas LeftPanel.
    */
    <div className="min-h-screen w-full bg-slate-950 flex flex-col md:flex-row text-slate-800 overflow-hidden relative">
      {/* Kolom Kiri: Branding & Visual Panel */}
      <LeftPanel />

      {/* Kolom Kanan: Form Autentikasi dengan Sudut Kiri Melengkung */}
      <RightForm />
    </div>
  );
}