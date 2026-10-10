import type { Loan, Scope } from './konfigurasi';
import { toISODate } from './helper';
import { TABLE_HEADERS, loanToCells } from './salin';

export async function exportExcel(data: Loan[], scope: Scope): Promise<void> {
  // Dimuat hanya saat dibutuhkan agar bundle halaman tetap ringan
  const ExcelJS = (await import('exceljs')).default;

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(scope === 'late' ? 'Terlambat' : 'Semua Peminjam');
  ws.columns = [5, 26, 10, 40, 26, 13, 13].map((width) => ({ width }));
  ws.addRows([TABLE_HEADERS, ...data.map(loanToCells)]);
  ws.getRow(1).font = { bold: true };
  ws.views = [{ state: 'frozen', ySplit: 1 }];

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer as ArrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `peminjam-${scope === 'late' ? 'terlambat' : 'semua'}-${toISODate(new Date())}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}