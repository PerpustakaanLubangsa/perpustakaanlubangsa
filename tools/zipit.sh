#!/bin/bash
# zipit: ekspor proyek ke zip untuk dibagikan ke AI.
#   zipit                      seluruh kode (tanpa node_modules, .next, .git, .env*, gambar public)
#   zipit konteks [berkas...]  paket kecil: docs/ (tanpa docs/sql/dump) + berkas yang disebut (HEMAT LIMIT, dianjurkan)
set -u
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)" || exit 1
command -v zip >/dev/null || { echo "✘ zip belum terpasang: sudo apt-get install -y zip"; exit 1; }
NAMA=$(basename "$PWD")

# Segarkan peta otomatis supaya AI melihat kondisi terbaru
if [ -f tools/peta.py ] && command -v python3 >/dev/null; then
  python3 -I tools/peta.py >/dev/null 2>&1
fi

if [ "${1:-}" = "konteks" ]; then
  shift
  OUT="$PWD/$NAMA-konteks.zip"
  rm -f "$OUT"
  zip -r -q "$OUT" docs AGENTS.md package.json lib -x "*.zip" "*/.env*" "docs/sql/dump/*"
  for f in "$@"; do
    if [ -e "$f" ]; then
      zip -r -q "$OUT" "$f" -x "*.zip" ".env*" "*/.env*" "node_modules/*" ".next/*" ".git/*"
    else
      echo "⚠ dilewati, tidak ditemukan: $f"
    fi
  done
else
  OUT="$PWD/$NAMA.zip"
  rm -f "$OUT"
  zip -r -q "$OUT" . -x "node_modules/*" ".next/*" ".git/*" ".backup/*" ".env*" "*/.env*" \
    "*.tsbuildinfo" "*.zip" "package-lock.json" "next-env.d.ts" "public/*.png" "public/icons/*"
fi

JML=$(unzip -Z1 "$OUT" | grep -vc '/$')
echo "✔ Selesai: $(basename "$OUT") ($(du -h "$OUT" | cut -f1), $JML berkas)"
echo "  Klik kanan file zip di Explorer, lalu pilih Download."
