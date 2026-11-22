# Gaya UI

Ringkas dan diambil dari kode yang ada. Tiru, jangan buat gaya baru.

- Tailwind 4 (kelas utilitas langsung di JSX). Palet utama biru (`blue-600`, `blue-700`) dengan netral `slate`. Dashboard berlatar `bg.png` gelap; kartu putih/terang di atasnya.
- Teks antarmuka dalam bahasa Indonesia.
- Ikon: Sidebar memakai FontAwesome (nama ikon di `app/dashboard/navigation.ts`); halaman dan modal lain memakai `lucide-react`.
- Tombol timbul (3D) bersama: `app/dashboard/bibliografi/components/raised-buttons.ts`. Impor konstanta dari sana, jangan menyalin kelasnya:
  `BTN_PRIMARY`/`BTN_PRIMARY_SM` (biru), `BTN_NEUTRAL`/`BTN_NEUTRAL_SM` (putih), `BTN_EDIT` (ikon biru), `BTN_DELETE` (ikon merah), `BTN_TAG_REMOVE`, `BTN_FIELD` (pemicu dropdown).
  Perilaku: saat hover tombol turun seperti ditekan, saat `:active` tertekan penuh, saat nonaktif tetap timbul tanpa reaksi pointer.
- Modal buku tamu (`visitor-modal.tsx`): footer tidak boleh terpotong di layar pendek. Saat semua input terisi, dua tombol footer diganti satu tombol Enter dengan petunjuk "tekan Enter untuk simpan". Saran autocomplete menampilkan tanda "Enter" pada item yang sedang terfokus.
- Komponen berbagi per fitur ada di folder `components/` masing-masing (mis. `poin/components/ui.tsx`, `leaderboard/components/vp-ui.tsx`). Cari dulu sebelum membuat komponen baru.
- Dashboard: `app/dashboard/layout.tsx` memasang `Sidebar` tetap selebar `w-72`; konten diberi `md:pl-72`.
- Aksesibilitas: hormati `prefers-reduced-motion` (sudah dipakai di beberapa animasi) dan mode ringan untuk perangkat rendah (`detectLite` di `vp-types.ts`).
