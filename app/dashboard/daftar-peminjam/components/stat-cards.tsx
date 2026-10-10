import { useMemo } from 'react';
import { AlertTriangle, BookMarked, CheckCircle2, Clock } from 'lucide-react';
import { LOAN_DAYS, type Counts } from '../konfigurasi';
import { BADGE, CARD } from '../gaya';

export default function StatCards({ counts }: { counts: Counts }) {
  const stats = useMemo(() => {
    const fmt = (n: number | null) => (n === null ? '–' : n.toLocaleString('id-ID'));
    const onTime =
      counts.borrowed !== null && counts.late !== null ? Math.max(0, counts.borrowed - counts.late) : null;

    return [
      { title: 'Sedang Dipinjam', value: fmt(counts.borrowed), info: 'Buku yang belum kembali', icon: BookMarked },
      {
        title: 'Buku Terlambat',
        value: fmt(counts.late),
        info: `Melewati batas ${LOAN_DAYS} hari`,
        icon: AlertTriangle,
      },
      { title: 'Masih Dalam Batas', value: fmt(onTime), info: 'Belum jatuh tempo', icon: CheckCircle2 },
      {
        title: 'Terlama Terlambat',
        value: counts.terlamaHari === null ? '–' : `${counts.terlamaHari} hari`,
        info: 'Keterlambatan paling lama',
        icon: Clock,
      },
    ];
  }, [counts]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div key={stat.title} className={`${CARD} p-5 rounded-2xl flex items-start justify-between`}>
          <div className="space-y-1 min-w-0">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
              {stat.title}
            </span>
            <span className="text-2xl font-black text-slate-900 tracking-tight block truncate">{stat.value}</span>
            <span className="text-[10px] text-slate-500 font-medium block">{stat.info}</span>
          </div>
          <div className={`w-10 h-10 ${BADGE} rounded-xl flex items-center justify-center shrink-0`}>
            <stat.icon className="w-5 h-5" />
          </div>
        </div>
      ))}
    </div>
  );
}