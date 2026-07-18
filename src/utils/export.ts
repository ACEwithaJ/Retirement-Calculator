import type { SimulationResults } from '../types';

/** Convert per-year balance/spending bands to CSV text. */
export function resultsToCSV(results: SimulationResults): string {
  const rows: string[] = [];
  rows.push(
    'age,balance_p10,balance_p25,balance_p50,balance_p75,balance_p90,spending_p10,spending_p50,spending_p90',
  );
  const bal = results.balanceBands;
  const spd = results.spendingBands;
  for (let i = 0; i < bal.length; i++) {
    const b = bal[i];
    const s = spd[i] ?? { p10: 0, p50: 0, p90: 0 };
    rows.push(
      [b.age, b.p10, b.p25, b.p50, b.p75, b.p90, s.p10, s.p50, s.p90]
        .map((x) => Math.round(x))
        .join(','),
    );
  }
  return rows.join('\n');
}

/** Trigger a browser download of text content. */
export function downloadText(filename: string, text: string, mime = 'text/plain'): void {
  if (typeof document === 'undefined') return;
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
