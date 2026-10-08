// Data terstruktur untuk mesin pencari (schema.org). Karakter "<" di-escape agar aman dari injeksi.
export default function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}