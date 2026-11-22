# Panduan AI — Perpustakaan Lubangsa

Baca berkas ini lebih dulu. Tujuannya: pembaruan cepat, tanpa membaca ulang seluruh proyek (hemat limit).

## 1. Proyek singkat

Aplikasi perpustakaan pesantren: katalog publik, buku tamu/kunjungan, leaderboard, karya tulis santri, dan dashboard pustakawan (sirkulasi, absensi, anggota, bibliografi, poin, laporan).
Next.js 16 (App Router) + React 19 + Tailwind 4 + Supabase. Antarmuka berbahasa Indonesia. Dikembangkan di GitHub Codespaces, di-deploy ke Vercel.

## 2. Peta dokumen (urutan baca)

| Berkas | Isi | Kapan dibaca |
|---|---|---|
| `docs/PANDUAN_AI.md` | aturan kerja (berkas ini) | selalu |
| `docs/peta-otomatis.md` | halaman, berkas, tabel, RPC, env; dibuat otomatis dari kode | selalu, untuk mencari berkas yang relevan |
| `docs/supabase-peta.md` | peta Supabase: tabel, relasi, RPC, alur trigger, fungsi usang, temuan keamanan | tugas yang menyentuh data |
| `docs/supabase-skema-asli.md` | kolom lengkap semua tabel/view, ringkasan RLS, trigger (hasil ekspor database asli) | sebelum menulis query atau SQL |
| `docs/aturan-bisnis.md` | aturan pinjam/denda, rank, poin, absensi | tugas yang menyentuh logika perpustakaan |
| `docs/gaya-ui.md` | gaya tombol, warna, ikon, pola komponen | tugas yang menyentuh tampilan |
| `docs/riwayat-perubahan.md` | catatan pembaruan terbaru | untuk tahu apa yang baru diubah |
| `docs/sql/` | `00-ambil-skema.sql` (kueri ekspor skema), `perubahan/` (SQL tiap pembaruan), `dump/` (isi lengkap fungsi, view, kebijakan RLS) | `dump/` HANYA bila mengubah fungsi/view/kebijakan; tidak ikut `zipit konteks`, minta pengguna melampirkan `docs/sql/dump/fungsi.sql` dst. secara khusus |

## 3. Alur kerja

1. Pengguna membuka percakapan dengan melampirkan `perpustakaanlubangsa-konteks.zip` (dibuat dengan `zipit konteks berkas1 berkas2 ...`). Isinya: `docs/` + berkas yang akan diubah. Bukan seluruh proyek.
2. AI membaca panduan, lalu `peta-otomatis.md`, lalu dokumen lain yang relevan.
3. Kalau AI butuh berkas yang belum dilampirkan, AI menyebut nama path-nya (maksimal 5 berkas sekali minta) dan pengguna melampirkan lagi dengan `zipit konteks path1 path2`. AI tidak meminta seluruh proyek.
4. AI mengerjakan, lalu membalas dengan format di bagian 4.
5. Pengguna mengunggah zip pembaruan ke root proyek dan menjalankan `updateit`.

## 4. Format balasan AI (wajib)

Urutannya selalu:

1. Ringkasan 1–3 kalimat tentang apa yang berubah dan alasannya. Tanpa mengulang isi kode.
2. File zip pembaruan, bernama `update-AAAAMMDD-HHMM-<kata-singkat>.zip`. Nama harus diawali `update` agar dikenali `updateit`.
3. Blok terminal untuk menerapkannya. Aturan blok kode: setiap perintah yang dijalankan terpisah ada di blok kodenya sendiri, supaya mudah disalin dengan tombol copy.

```bash
updateit
```

4. Bila ada SQL: tiap pernyataan atau langkah di blok ```sql terpisah, diberi label langkah (Langkah 1, Langkah 2, dst.). Urutan: jalankan SQL dulu atau kode dulu, sebutkan eksplisit.
5. Bila `package.json` berubah: blok terpisah berisi `npm install`.
6. Catatan risiko atau hal yang perlu dicek pengguna, maksimal 3 butir.

## 5. Format zip pembaruan

Zip hanya berisi berkas yang berubah atau baru, dengan path relatif dari root proyek (tanpa folder pembungkus):

```
update-20261122-1630-sirkulasi.zip
├── app/dashboard/sirkulasi/page.tsx      ← berkas diubah (isi LENGKAP, bukan potongan)
├── app/dashboard/sirkulasi/components/baru.tsx   ← berkas baru
├── docs/riwayat-perubahan.md             ← wajib diperbarui
├── docs/sql/perubahan/20261122-nama.sql  ← bila ada SQL (salinan dari yang ditampilkan di chat)
├── _hapus.txt                            ← opsional: daftar berkas yang dihapus, satu path per baris
└── _catatan.md                           ← opsional: catatan singkat, ditampilkan saat updateit selesai
```

Aturan:
- Tulis isi berkas secara lengkap. Dilarang memakai `// ... kode lainnya tetap ...` atau potongan, karena berkas akan menimpa aslinya.
- Jangan menyertakan berkas yang tidak berubah, `node_modules`, `.next`, `.env*`, `package-lock.json`.
- `updateit` menolak path berbahaya (`..`, path absolut, `.env*`, `.git`) dan otomatis mencadangkan berkas yang ditimpa ke `.backup/`. `updateit undo` mengembalikannya.
- Zip yang sama dengan isi proyek dilewati dan tidak dihitung sebagai perubahan.
- Berkas di bawah `docs/` ikut diperbarui lewat zip yang sama. `docs/peta-otomatis.md` jangan ditulis tangan, karena dibuat ulang oleh `updateit`.

Cara AI membuat zip: tulis berkas ke folder kerja dengan struktur path di atas, lalu `cd folder && zip -r ../update-....zip .`. Pastikan membuka isinya sekali (`unzip -l`) sebelum mengirim.

Jika AI tidak punya fitur membuat file: kirim tiap berkas sebagai satu blok terminal sendiri berisi `mkdir -p` + `cat > path <<'EOF' ... EOF` (pembatas dikutip supaya `$` tidak diproses), lalu blok terpisah untuk penghapusan.

## 6. Aturan SQL

- Setiap SQL yang diberikan ke pengguna juga disimpan di zip pembaruan sebagai `docs/sql/perubahan/AAAAMMDD-nama.sql` (satu berkas per pembaruan, urut sesuai langkah).
- Dahulukan idempoten: `create table if not exists`, `add column if not exists`, `create or replace function`, `drop policy if exists` + `create policy`.
- Perubahan merusak (drop kolom/tabel, update/delete massal) harus ditandai jelas dan didahului kueri `select` pengecekan.
- Setelah SQL mengubah struktur, perbarui `docs/supabase-peta.md` pada zip yang sama.
- Skema asli sudah diekspor ke `docs/supabase-skema-asli.md` dan `docs/sql/dump/`. Bila struktur database berubah (lewat SQL AI atau manual), minta pengguna menjalankan ulang kueri di `docs/sql/00-ambil-skema.sql`, atau perbarui berkas itu di zip pembaruan.
- Mengubah fungsi: pakai `create or replace function` dengan isi LENGKAP, berdasarkan isi di `docs/sql/dump/fungsi.sql` (jangan menulis dari ingatan). Jangan menghapus fungsi/tabel yang "tidak dipakai kode ini" tanpa konfirmasi; bisa milik aplikasi lain.
- Jangan mengubah RLS tanpa persetujuan eksplisit pengguna: kebijakan sekarang terbuka dan fitur bergantung padanya (lihat `docs/supabase-peta.md`).

## 7. Hemat limit

- Jangan membaca ulang seluruh `app/`. Cari lewat `peta-otomatis.md`, lalu buka hanya berkas yang terkait.
- Berkas besar (>800 baris: `manajemen-absensi`, `daftar-peminjam`, `sirkulasi`, `i-VisitorProfileModal`, `visitor-modal`): bila perubahan kecil, minta pengguna melampirkan berkas itu saja. Pertimbangkan memecah ke komponen kecil bila memang perlu mengubahnya berulang, karena itu menghemat limit ke depan.
- Jangan menulis ulang berkas yang tidak perlu diubah dan jangan memformat ulang kode di luar bagian yang dikerjakan.
- Penjelasan singkat. Jangan mengulang isi kode di chat, karena kodenya ada di zip.
- Riwayat perubahan: cukup 1–3 baris per pembaruan.
- Satu percakapan = satu topik. Bila percakapan sudah panjang, sarankan memulai percakapan baru dengan `zipit konteks`.

## 8. Setelah pembaruan

Tambahkan di `docs/riwayat-perubahan.md` (paling atas): tanggal, 1–3 baris perubahan, berkas utama, dan SQL bila ada.

## 9. Aturan kode

- Next.js 16: `params` dan `searchParams` berupa Promise, jadi di-`await`. Jangan mengandalkan ingatan versi lama. Tiru pola yang sudah ada di kode (mis. `app/karya-tulis/[slug]/page.tsx`).
- Berkas `'use server'` hanya boleh mengekspor fungsi async. Konstanta dan fungsi biasa taruh di berkas lain (lihat `slug.ts` di `admin_karya`).
- Klien Supabase: `lib/supabase.ts` (anon key, aman di browser). Kunci `SUPABASE_SERVICE_ROLE_KEY` hanya di server action, tidak boleh masuk komponen client.
- Teks antarmuka, pesan galat, dan komentar kode dalam bahasa Indonesia. Nama berkas dan folder mengikuti yang sudah ada (campuran Inggris dan Indonesia, jangan diubah massal).
- Setelah menulis kode, periksa sendiri: tipe TypeScript konsisten, impor ada, tidak ada `any` baru yang tidak perlu. `updateit` menjalankan `tsc --noEmit` otomatis.
- Gaya tombol dan warna: ikuti `docs/gaya-ui.md`.

## 10. Teks singkat untuk "Instruksi Project" di Claude

Salin ke instruksi Project agar berlaku di setiap percakapan:

```
Proyek: Perpustakaan Lubangsa (Next.js 16 + Supabase, bahasa Indonesia).
Baca docs/PANDUAN_AI.md di zip konteks sebelum bekerja, lalu docs/peta-otomatis.md.
Jangan minta seluruh proyek; sebut path berkas yang kamu butuhkan (maks 5).
Kirim setiap pembaruan sebagai zip bernama update-AAAAMMDD-HHMM-<singkat>.zip berisi hanya berkas berubah (isi lengkap)
dengan path dari root, plus docs/riwayat-perubahan.md; berkas dihapus ditulis di _hapus.txt.
Beri perintah terminal "updateit" di blok kode sendiri; SQL di blok ```sql terpisah per langkah dan disimpan juga
di docs/sql/perubahan/. Setiap perintah terminal yang dijalankan terpisah ada di blok kodenya sendiri.
Penjelasan singkat; jangan ulangi isi kode di chat.
```
