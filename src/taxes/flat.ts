import type { TaxContext, TaxEngine, TaxableIncome, TaxResult } from './types';
import { grossTaxableTotal } from './types';

/**
 * Mode A: a single effective rate applied to total taxable income. Simple and
 * transparent. Tax-free withdrawals are excluded from the base.
 */
export class FlatTaxEngine implements TaxEngine {
  readonly id = 'flat';
  readonly label = 'Flat effective rate';

  compute(income: TaxableIncome, ctx: TaxContext): TaxResult {
    const rate = ctx.settings.flat.effectiveRate;
    const base = grossTaxableTotal(income);
    const totalTax = Math.max(0, base * rate);
    return {
      totalTax,
      taxableIncome: base,
      effectiveRate: base > 0 ? totalTax / base : 0,
      marginalRate: rate,
    };
  }
}
