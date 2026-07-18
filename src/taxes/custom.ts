import type { CustomTaxRule } from '../types';
import type { TaxContext, TaxEngine, TaxableIncome, TaxResult } from './types';
import { grossTaxableTotal } from './types';

/**
 * Mode C: user-defined rates by income category, country, and (optionally) age.
 * Each income component is taxed at the most specific applicable rule for the
 * country in effect this year. If no rule matches a category, the country
 * profile's simplified effective rates are used as a fallback.
 */
export class CustomTaxEngine implements TaxEngine {
  readonly id = 'custom';
  readonly label = 'Custom international';

  private rateFor(
    category: string,
    rules: CustomTaxRule[],
    ctx: TaxContext,
    fallback: number,
  ): number {
    const candidates = rules
      .filter(
        (r) =>
          r.countryId === ctx.country.id &&
          r.incomeCategory === category &&
          (r.fromAge === undefined || ctx.age >= r.fromAge),
      )
      .sort((a, b) => (b.fromAge ?? -Infinity) - (a.fromAge ?? -Infinity));
    return candidates.length > 0 ? candidates[0].rate : fallback;
  }

  compute(income: TaxableIncome, ctx: TaxContext): TaxResult {
    const rules = ctx.settings.custom.rules;
    const c = ctx.country;

    const parts: Array<[number, number]> = [
      [income.ordinary, this.rateFor('ordinary', rules, ctx, c.ordinaryRate)],
      [income.taxDeferredDistribution, this.rateFor('taxDeferred', rules, ctx, c.taxDeferredDistributionRate)],
      [income.capitalGains, this.rateFor('capitalGains', rules, ctx, c.capitalGainsRate)],
      [income.dividends, this.rateFor('dividends', rules, ctx, c.dividendRate)],
      [income.pension, this.rateFor('pension', rules, ctx, c.pensionRate)],
      [income.socialSecurity, this.rateFor('socialSecurity', rules, ctx, c.pensionRate)],
      [income.rental, this.rateFor('rental', rules, ctx, c.ordinaryRate)],
      [income.annuity, this.rateFor('annuity', rules, ctx, c.pensionRate)],
      [income.taxFreeWithdrawal, this.rateFor('taxFree', rules, ctx, c.taxFreeRate)],
    ];

    let totalTax = 0;
    let maxRate = 0;
    for (const [amt, rate] of parts) {
      if (amt > 0) {
        totalTax += amt * rate;
        if (rate > maxRate) maxRate = rate;
      }
    }
    // Social taxes applied to ordinary + pension.
    totalTax += (income.ordinary + income.pension) * c.socialTaxRate;

    const base = grossTaxableTotal(income) + income.taxFreeWithdrawal;
    return {
      totalTax: Math.max(0, totalTax),
      taxableIncome: base,
      effectiveRate: base > 0 ? totalTax / base : 0,
      marginalRate: maxRate + c.socialTaxRate,
    };
  }
}
