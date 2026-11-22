#!/bin/bash
# updateit: terapkan zip pembaruan dari AI ke proyek.
#   updateit            terapkan update*.zip terbaru di root proyek
#   updateit nama.zip   terapkan zip tertentu
#   updateit cek        hanya tampilkan apa yang akan berubah (tidak mengubah apa pun)
#   updateit cepat      terapkan tanpa tes TypeScript
#   updateit undo       batalkan pembaruan terakhir
set -u
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)" || exit 1
ROOT=$PWD
BACKUP="$ROOT/.backup"

MODE=apply; CEPAT=0; ZIP=""
for a in "$@"; do
  case "$a" in
    undo) MODE=undo ;;
    cek) MODE=cek ;;
    cepat) CEPAT=1 ;;
    *.zip) ZIP="$a" ;;
    *) echo "✘ Argumen tidak dikenal: $a"; exit 1 ;;
  esac
done

gagal() { echo "✘ $*" >&2; exit 1; }

# Path yang tidak boleh disentuh oleh zip pembaruan (rahasia, git, dependensi, cadangan)
aman() {
  case "$1" in
    ""|/*|..|../*|*/..|*/../*) return 1 ;;
    .env*|*/.env*) return 1 ;;
    .git|.git/*|.backup|.backup/*|node_modules|node_modules/*|.next|.next/*) return 1 ;;
  esac
  return 0
}

# ───────────── UNDO ─────────────
if [ "$MODE" = undo ]; then
  [ -d "$BACKUP" ] || gagal "Belum ada cadangan (.backup belum ada)."
  LAST=""
  for d in $(ls -1 "$BACKUP" | sort); do
    [ -f "$BACKUP/$d/_daftar.txt" ] && [ ! -f "$BACKUP/$d/.dibatalkan" ] && LAST=$d
  done
  [ -n "$LAST" ] || gagal "Tidak ada pembaruan yang bisa dibatalkan."
  D="$BACKUP/$LAST"
  while IFS=$'\t' read -r tipe path; do
    aman "$path" || continue
    case "$tipe" in
      U|D) mkdir -p "$(dirname "$ROOT/$path")"; cp -a "$D/files/$path" "$ROOT/$path" ;;
      N) rm -f "$ROOT/$path"; (cd "$ROOT" && rmdir --ignore-fail-on-non-empty -p "$(dirname "$path")" 2>/dev/null) ;;
    esac
  done < "$D/_daftar.txt"
  touch "$D/.dibatalkan"
  echo "✔ Dibatalkan: pembaruan $LAST dikembalikan seperti semula."
  echo "  Catatan: perubahan SQL di Supabase TIDAK ikut dibatalkan."
  [ -f tools/peta.py ] && python3 -I tools/peta.py >/dev/null 2>&1
  exit 0
fi

# ───────────── PILIH ZIP ─────────────
if [ -z "$ZIP" ]; then
  ZIP=$(ls -t "$ROOT"/update*.zip 2>/dev/null | head -1)
  [ -n "$ZIP" ] || gagal "Tidak ada update*.zip di $ROOT. Upload zip dari AI ke root proyek dulu."
  JML=$(ls "$ROOT"/update*.zip | wc -l)
  [ "$JML" -gt 1 ] && echo "⚠ Ada $JML file update*.zip. Memakai yang terbaru: $(basename "$ZIP")"
else
  [ -f "$ZIP" ] || gagal "File tidak ditemukan: $ZIP"
  ZIP=$(realpath "$ZIP")
fi
command -v unzip >/dev/null || gagal "unzip belum terpasang: sudo apt-get install -y unzip"
unzip -tq "$ZIP" >/dev/null 2>&1 || gagal "Zip rusak atau tidak bisa dibuka: $(basename "$ZIP")"

# Tolak path yang mencoba keluar dari folder proyek (.. atau diawali /), sebelum apa pun diekstrak
if unzip -Z1 "$ZIP" | grep -Eq '(^|/)\.\.(/|$)|^/'; then
  gagal "Zip berisi path berbahaya (.. atau path absolut). Dibatalkan, tidak ada yang diubah."
fi

TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
unzip -q -o "$ZIP" -d "$TMP" || gagal "Gagal mengekstrak zip."
rm -rf "$TMP/__MACOSX"; find "$TMP" -name .DS_Store -delete
[ -z "$(find "$TMP" -type l | head -1)" ] || gagal "Zip berisi symlink, ditolak demi keamanan."

# Jika AI membungkus semua berkas dalam satu folder (mis. update/app/...), buka bungkusnya
SRC="$TMP"
mapfile -t TOP < <(ls -A "$TMP")
if [ "${#TOP[@]}" -eq 1 ] && [ -d "$TMP/${TOP[0]}" ]; then
  case "${TOP[0]}" in
    app|lib|docs|public|tools) ;;
    *) SRC="$TMP/${TOP[0]}"; echo "ℹ Zip dibungkus folder '${TOP[0]}', dibuka otomatis." ;;
  esac
fi

# ───────────── KUMPULKAN & VALIDASI ─────────────
FILES=()
while IFS= read -r -d '' f; do
  f=${f#./}
  case "$f" in _hapus.txt|_catatan.md) continue ;; esac
  aman "$f" || gagal "Zip berisi path terlarang: $f. Dibatalkan, tidak ada yang diubah."
  FILES+=("$f")
done < <(cd "$SRC" && find . -type f -print0 | sort -z)

HAPUS=()
if [ -f "$SRC/_hapus.txt" ]; then
  while IFS= read -r l || [ -n "$l" ]; do
    l=${l%$'\r'}
    l=$(printf '%s' "$l" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
    case "$l" in ""|\#*) continue ;; esac
    aman "$l" || gagal "_hapus.txt berisi path terlarang: $l. Dibatalkan, tidak ada yang diubah."
    if [ -f "$ROOT/$l" ]; then HAPUS+=("$l"); else echo "ℹ Lewati (memang tidak ada): $l"; fi
  done < "$SRC/_hapus.txt"
fi

DAFTAR=(); JU=0; JN=0; JD=0; JS=0
for f in "${FILES[@]+"${FILES[@]}"}"; do
  if [ -f "$ROOT/$f" ]; then
    if cmp -s "$SRC/$f" "$ROOT/$f"; then JS=$((JS+1)); else DAFTAR+=("U"$'\t'"$f"); JU=$((JU+1)); fi
  else DAFTAR+=("N"$'\t'"$f"); JN=$((JN+1)); fi
done
for f in "${HAPUS[@]+"${HAPUS[@]}"}"; do DAFTAR+=("D"$'\t'"$f"); JD=$((JD+1)); done

[ "${#DAFTAR[@]}" -gt 0 ] || { echo "ℹ Tidak ada perubahan: semua berkas di zip sudah sama dengan proyek ($JS berkas)."; exit 0; }

echo "Zip: $(basename "$ZIP")"
for x in "${DAFTAR[@]}"; do
  case "${x%%$'\t'*}" in U) m="diubah  " ;; N) m="baru    " ;; D) m="dihapus " ;; esac
  echo "  $m ${x#*$'\t'}"
done
SAMA=""; [ "$JS" -gt 0 ] && SAMA=", $JS sama (dilewati)"
echo "  → $JU diubah, $JN baru, $JD dihapus$SAMA"

if [ "$MODE" = cek ]; then echo "(mode cek: tidak ada yang diubah)"; exit 0; fi

# ───────────── CADANGKAN ─────────────
STAMP=$(date +%Y%m%d-%H%M%S)
D="$BACKUP/$STAMP"
mkdir -p "$D/files"
: > "$D/_daftar.txt"
for x in "${DAFTAR[@]}"; do
  tipe=${x%%$'\t'*}; path=${x#*$'\t'}
  printf '%s\t%s\n' "$tipe" "$path" >> "$D/_daftar.txt"
  if [ "$tipe" != N ]; then
    mkdir -p "$D/files/$(dirname "$path")"
    cp -a "$ROOT/$path" "$D/files/$path"
  fi
done
[ -f "$SRC/_catatan.md" ] && cp "$SRC/_catatan.md" "$D/_catatan.md"

# ───────────── TERAPKAN ─────────────
for x in "${DAFTAR[@]}"; do
  tipe=${x%%$'\t'*}; path=${x#*$'\t'}
  case "$tipe" in
    U|N) mkdir -p "$ROOT/$(dirname "$path")"; cp "$SRC/$path" "$ROOT/$path" ;;
    D) rm -f "$ROOT/$path"; (cd "$ROOT" && rmdir --ignore-fail-on-non-empty -p "$(dirname "$path")" 2>/dev/null) ;;
  esac
done
[ "$(dirname "$ZIP")" = "$ROOT" ] && mv "$ZIP" "$D/"

# Jaga .gitignore: cadangan dan zip tidak ikut ke git
touch .gitignore
for p in ".backup/" "*.zip"; do grep -qxF "$p" .gitignore || printf '\n%s\n' "$p" >> .gitignore; done

echo "✔ Diterapkan. Cadangan: .backup/$STAMP (batalkan dengan: updateit undo)"
[ -f tools/peta.py ] && command -v python3 >/dev/null && python3 -I tools/peta.py >/dev/null 2>&1 && echo "✔ docs/peta-otomatis.md diperbarui"

if [ -f "$D/_catatan.md" ]; then echo; echo "── Catatan dari AI ──"; head -n 25 "$D/_catatan.md"; echo "─────────────────────"; fi

for x in "${DAFTAR[@]}"; do
  p=${x#*$'\t'}; t=${x%%$'\t'*}
  case "$p" in docs/sql/perubahan/*.sql) [ "$t" != D ] && echo "⚠ ADA SQL BARU: jalankan isi $p di Supabase → SQL Editor." ;; esac
  [ "$p" = package.json ] && echo "⚠ package.json berubah: jalankan  npm install"
done

# ───────────── TES TYPESCRIPT ─────────────
if [ "$CEPAT" -eq 0 ] && [ -x node_modules/.bin/tsc ]; then
  echo "… mengecek TypeScript (bisa 20-60 detik)"
  if HASIL=$(node_modules/.bin/tsc --noEmit 2>&1); then
    echo "✔ TypeScript lolos"
  else
    printf '%s\n' "$HASIL" | head -40
    echo "✘ Ada error TypeScript di atas (abaikan jika sudah ada sebelum update)."
    echo "  Kirim error ke AI, atau batalkan dengan: updateit undo"
  fi
fi
