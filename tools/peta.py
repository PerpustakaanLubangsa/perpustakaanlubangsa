#!/usr/bin/env python3
"""Buat docs/peta-otomatis.md: peta halaman, tabel Supabase, RPC, dan env dari kode.
Dijalankan otomatis oleh `zipit` dan `updateit`. Hanya memakai pustaka bawaan Python.
Jangan edit hasilnya dengan tangan, karena akan ditimpa."""
import json, os, re, sys, datetime, collections

ROOT = os.getcwd()
if not os.path.isdir(os.path.join(ROOT, "app")):
    sys.exit("peta.py: jalankan dari root proyek (folder yang berisi app/)")

SKIP_DIR = {"node_modules", ".next", ".git", ".backup", "docs", "tools", "public"}
EXT = (".ts", ".tsx")

def baca(p):
    try:
        with open(p, encoding="utf-8") as f:
            return f.read()
    except Exception:
        return ""

files = []
for dp, dn, fn in os.walk(ROOT):
    dn[:] = sorted(d for d in dn if d not in SKIP_DIR and not d.startswith("."))
    for n in sorted(fn):
        if n.endswith(EXT) and n != "next-env.d.ts":
            p = os.path.join(dp, n)
            files.append(os.path.relpath(p, ROOT).replace(os.sep, "/"))
files = [f for f in files if f.startswith(("app/", "lib/"))]

RE_FROM = re.compile(r"\.from\(\s*['\"](\w+)['\"]\s*\)")
RE_RPC = re.compile(r"\.rpc\(\s*['\"](\w+)['\"]")
RE_ENV = re.compile(r"process\.env\.([A-Z0-9_]+)")
RE_STORAGE = re.compile(r"storage\s*\.from\(\s*['\"]([\w-]+)['\"]")

info = {}
tabel_ke_berkas = collections.defaultdict(set)
rpc_ke_berkas = collections.defaultdict(set)
env_ke_berkas = collections.defaultdict(set)
for f in files:
    s = baca(os.path.join(ROOT, f))
    storage_pos = {m.start() for m in re.finditer(r"storage\s*\.from", s)}
    tabel = set()
    for m in RE_FROM.finditer(s):
        # lewati storage.from('bucket'), itu bukan tabel
        awal = max(0, m.start() - 20)
        if re.search(r"storage\s*$", s[awal:m.start()]):
            continue
        tabel.add(m.group(1))
    rpc = set(RE_RPC.findall(s))
    env = set(RE_ENV.findall(s)) - {"NODE_ENV"}
    for t in tabel: tabel_ke_berkas[t].add(f)
    for r in rpc: rpc_ke_berkas[r].add(f)
    for e in env: env_ke_berkas[e].add(f)
    baris = s.count("\n") + 1
    mode = "client" if re.match(r"\s*(//[^\n]*\n|/\*.*?\*/\s*)*['\"]use client['\"]", s, re.S) else (
           "server-action" if re.match(r"\s*['\"]use server['\"]", s) else "")
    cat = ""
    for ln in s.splitlines()[:25]:
        t = ln.strip()
        m = re.match(r"(?://+|/\*+|\*)\s*(.{8,100})", t)
        if m and not t.startswith(("//#", "// eslint", "// @ts")) and "use client" not in t:
            cat = m.group(1).rstrip("*/ ").strip()
            break
    info[f] = dict(baris=baris, mode=mode, tabel=sorted(tabel), rpc=sorted(rpc), cat=cat)

def url(f):
    d = os.path.dirname(f)[len("app"):]
    parts = [p for p in d.split("/") if p and not (p.startswith("(") and p.endswith(")"))]
    return "/" + "/".join(parts)

pages, routes = [], []
for f in files:
    n = os.path.basename(f)
    if n in ("page.tsx", "page.ts"): pages.append(f)
    elif n in ("route.ts", "route.tsx"): routes.append(f)

try:
    pkg = json.loads(baca(os.path.join(ROOT, "package.json")))
except Exception:
    pkg = {}
dep = {**pkg.get("dependencies", {}), **pkg.get("devDependencies", {})}

def sel(f):
    i = info[f]
    bit = []
    if i["mode"]: bit.append(i["mode"])
    if i["tabel"]: bit.append("tabel: " + ", ".join(i["tabel"]))
    if i["rpc"]: bit.append("rpc: " + ", ".join(i["rpc"]))
    return "; ".join(bit)

out = []
w = out.append
w("# Peta otomatis proyek")
w("")
w(f"> Dibuat oleh `tools/peta.py` pada {datetime.date.today().isoformat()}. Jangan edit tangan; hasilnya ditimpa setiap `zipit` atau `updateit`.")
w("> Dipakai AI sebagai pengganti membaca seluruh kode: cari halaman/tabel di sini, lalu minta hanya berkas yang perlu diubah.")
w("")
w("## Teknologi (dari package.json)")
w("")
w(", ".join(f"{k} {dep[k]}" for k in ("next", "react", "tailwindcss", "@supabase/supabase-js", "typescript") if k in dep))
w("")
lain = [k for k in dep if k not in ("next","react","react-dom","tailwindcss","@supabase/supabase-js","typescript") and not k.startswith("@types/") and k not in ("eslint","eslint-config-next","@tailwindcss/postcss")]
w("Pustaka lain: " + ", ".join(sorted(lain)))
w("")
w("## Halaman")
w("")
w("| URL | Berkas | Baris | Data |")
w("|---|---|---|---|")
for f in sorted(pages, key=url):
    w(f"| `{url(f)}` | `{f}` | {info[f]['baris']} | {sel(f)} |")
if routes:
    w("")
    w("## Route handler (API / PDF)")
    w("")
    for f in sorted(routes, key=url):
        w(f"- `{url(f)}` → `{f}` ({info[f]['baris']} baris){'; ' + sel(f) if sel(f) else ''}")
w("")
w("## Berkas pendukung per folder")
w("")
w("Format: `berkas` (baris) — komentar pembuka / data yang dipakai.")
w("")
per = collections.defaultdict(list)
for f in files:
    if f in pages or f in routes: continue
    per[os.path.dirname(f)].append(f)
for d in sorted(per):
    w(f"**{d}/**")
    for f in per[d]:
        i = info[f]
        ket = " — ".join(x for x in (i["cat"], sel(f)) if x)
        w(f"- `{os.path.basename(f)}` ({i['baris']}){' — ' + ket if ket else ''}")
    w("")
w("## Tabel Supabase → berkas yang memakainya")
w("")
for t in sorted(tabel_ke_berkas):
    fl = sorted(tabel_ke_berkas[t])
    w(f"- **{t}** ({len(fl)}): " + ", ".join(f"`{x}`" for x in fl))
w("")
w("## RPC (fungsi database) → berkas")
w("")
for r in sorted(rpc_ke_berkas):
    w(f"- **{r}**: " + ", ".join(f"`{x}`" for x in sorted(rpc_ke_berkas[r])))
w("")
w("## Variabel lingkungan (hanya nama, nilai ada di .env.local)")
w("")
for e in sorted(env_ke_berkas):
    w(f"- `{e}`: " + ", ".join(f"`{x}`" for x in sorted(env_ke_berkas[e])))
w("")

os.makedirs(os.path.join(ROOT, "docs"), exist_ok=True)
with open(os.path.join(ROOT, "docs", "peta-otomatis.md"), "w", encoding="utf-8") as fh:
    fh.write("\n".join(out))
print(f"peta-otomatis.md: {len(files)} berkas, {len(pages)} halaman, {len(tabel_ke_berkas)} tabel")
