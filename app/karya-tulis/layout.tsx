import KaryaShell from './components/karya-shell';

export default function KaryaTulisLayout({ children }: { children: React.ReactNode }) {
  return <KaryaShell>{children}</KaryaShell>;
}