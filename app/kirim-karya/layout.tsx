import KaryaShell from '../karya-tulis/components/karya-shell';

export default function KirimKaryaLayout({ children }: { children: React.ReactNode }) {
  return <KaryaShell>{children}</KaryaShell>;
}