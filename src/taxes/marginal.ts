import type { TaxBracket } from '../types';
import type { TaxContext, TaxEngine, TaxableIncome, TaxResult } from './types';

/**
 * Apply a progressive bracket schedule to a positive income amount.
 * Brackets are sorted ascending by threshold; each rate applies to the slice of
 * income between its threshold and the next.
 */
export function taxFromBrackets(income: number, brackets: TaxBracket[]): number {
  if (income <= 0 || brackets.length === 0) return 0;
  const sorted = [...brackets].sort((a, b) => a.threshold - b.threshold);
  let tax = 0;
  for (let i = 0; i < sorted.length; i++) {
    const lower = sorted[i].threshold;
    if (income <= lower) break;
    const upper = i + 1 < sorted.length ? sorted[i + 1].threshold : Infinity;
    const slice = Math.min(income, upper) - lower;
    if (slice > 0) tax += slice * sorted[i].rate;
  }
  return tax;
}

/** Marginal rate on the last dollar of a given income. */
export function marginalRateFor(income: number, brackets: TaxBracket[]): number {
  if (brackets.length === 0) return 0;
  const sorted = [...brackets].sort((a, b) => a.threshold - b.threshold);
  let rate = sorted[0].rate;
  for (const b of sorted) {
    if (income > b.threshold) rate = b.rate;
  }
  return rate;
}

/**
 * Mode B: progressive brackets for ordinary income plus a separate schedule for
 * long-term capital gains and qualified dividends, a standard deduction, and a
 * flat add-on state rate. Brackets can be inflation-indexed year over year.
 */
export class MarginalTaxEngine implements TaxEngine {
  readonly id = 'marginal';
  readonly label = 'Marginal brackets';

  compute(income: TaxableIncome, ctx: TaxContext): TaxResult {
    const cfg = ctx.settings.marginal;
    const indexFactor = cfg.inflationIndexed
      ? Math.pow(1 + ctx.inflation, ctx.yearIndex)
      : 1;

    const indexBrackets = (bs: TaxBracket[]): TaxBracket[] =>
      bs.map((b) => ({ threshold: b.threshold * indexFactor, rate: b.rate }));

    const deduction = cfg.standardDeduction * indexFactor;

    // Ordinary income: wages, tax-deferred distributions, pension, rental,
    // annuity, and (optionally) dividends taxed as ordinary.
    const ordinaryBase =
      income.ordinary +
      income.taxDeferredDistribution +
      income.pension +
      income.rental +
      income.annuity +
      income.socialSecurity * 0.85 + // simplified: up to 85% taxable
      (cfg.dividendAsOrdinary ? income.dividends : 0);

    const ordinaryTaxable = Math.max(0, ordinaryBase - deduction);
    const ordinaryTax = taxFromBrackets(ordinaryTaxable, indexBrackets(cfg.ordinaryBrackets));

    // Preferential income: capital gains + qualified dividends stack on top of
    // ordinary taxable income for rate-bracket purposes (simplified).
    const preferential =
      income.capitalGains + (cfg.dividendAsOrdinary ? 0 : income.dividends);
    const cgBrackets = indexBrackets(cfg.capitalGainsBrackets);
    const cgTax =
      taxFromBrackets(ordinaryTaxable + Math.max(0, preferential), cgBrackets) -
      taxFromBrackets(ordinaryTaxable, cgBrackets);

    const federalTax = ordinaryTax + Math.max(0, cgTax);

    const taxableIncome = ordinaryTaxable + Math.max(0, preferential);
    const stateTax = taxableIncome * cfg.stateRate;
    const totalTax = Math.max(0, federalTax + stateTax);

    const marginal =
      marginalRateFor(ordinaryTaxable, indexBrackets(cfg.ordinaryBrackets)) +
      cfg.stateRate;

    return {
      totalTax,
      taxableIncome,
      effectiveRate: taxableIncome > 0 ? totalTax / taxableIncome : 0,
      marginalRate: marginal,
    };
  }
}
