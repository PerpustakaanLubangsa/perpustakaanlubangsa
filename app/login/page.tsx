import React from 'react';
import LeftPanel from './LeftPanel';
import RightForm from './RightForm';

export default function LoginPage() {
  return (
    /* PERUBAHAN: Mengubah bg-slate-50 menjadi bg-slate-950.
      Ini memastikan sela di balik lengkungan RightForm menampilkan warna gelap yang menyatu dengan LeftPanel.
    */
    <div className="min-h-screen w-full bg-slate-950 flex flex-col md:flex-row text-slate-800">
      {/* Kolom Kiri: Video Sinematik & Branding Pustakawan */}
      <LeftPanel />

      {/* Kolom Kanan: Form Autentikasi dengan Sudut Kiri Melengkung */}
      <RightForm />
    </div>
  );
}