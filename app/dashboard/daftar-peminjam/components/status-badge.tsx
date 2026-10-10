import { AlertTriangle, Check } from 'lucide-react';
import type { Loan } from '../konfigurasi';
import { statusText } from '../helper';

export default function StatusBadge({ loan }: { loan: Loan }) {
  const late = loan.hariTerlambat > 0;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md border text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${
        late ? 'border-blue-600 bg-blue-600 text-white' : 'border-blue-200 bg-blue-50 text-blue-700'
      }`}
    >
      {late ? <AlertTriangle className="w-3 h-3" /> : <Check className="w-3 h-3" />}
      {statusText(loan)}
    </span>
  );
}