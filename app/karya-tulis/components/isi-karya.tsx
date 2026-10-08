interface IsiKaryaProps {
  isi: string;
  /** true untuk puisi/syair: baris dan bait dipertahankan, rata kiri */
  rataKiri?: boolean;
}

export default function IsiKarya({ isi, rataKiri = false }: IsiKaryaProps) {
  // Baris kosong = paragraf baru. Baris tunggal tetap dipertahankan di dalam paragraf.
  const paragraf = isi
    .replace(/\r\n?/g, '\n')
    .trim()
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div
      lang="id"
      className={`text-[17px] leading-8 text-slate-800 sm:text-lg sm:leading-9 [overflow-wrap:break-word] ${
        rataKiri
          ? 'text-left'
          : 'text-justify [hyphens:auto] [text-justify:inter-word] [text-wrap:pretty]'
      }`}
    >
      {paragraf.map((p, i) => (
        <p key={i} className="mb-6 whitespace-pre-line last:mb-0">
          {p}
        </p>
      ))}
    </div>
  );
}