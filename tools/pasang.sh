#!/bin/bash
# Pasang perintah zipit dan updateit. Jalankan sekali: bash tools/pasang.sh
# Ulangi setelah Codespace dibangun ulang (rebuild).
cd "$(dirname "$0")" || exit 1
DEST="$HOME/.local/bin"
mkdir -p "$DEST"
cp zipit.sh "$DEST/zipit"
cp updateit.sh "$DEST/updateit"
chmod +x "$DEST/zipit" "$DEST/updateit"
grep -q '.local/bin' "$HOME/.bashrc" 2>/dev/null || echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$HOME/.bashrc"
for p in zip unzip python3; do
  command -v "$p" >/dev/null || echo "⚠ $p belum terpasang: sudo apt-get install -y $p"
done
echo "✔ Terpasang: zipit dan updateit"
echo "  Terakhir, jalankan:  source ~/.bashrc"
