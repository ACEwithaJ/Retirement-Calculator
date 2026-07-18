import type { CountryProfile, TaxSettings } from '../types';

/**
 * The taxable components of a single year's cash flows, separated so each
 * engine can treat them differently. All amounts are nominal for the year.
 */
export interface TaxableIncome {
  ordinary: number; // wages, consulting, other ordinary income
  taxDeferredDistribution: number; // Traditional IRA/401k withdrawals
  capitalGains: number; // realized gains from taxable accounts
  dividends: number; // taxable dividends/interest
  pension: number; // pension income
  socialSecurity: number; // Social Security or equivalent
  rental: number; // rental income
  annuity: number; // taxable portion of annuity income
  taxFreeWithdrawal: number; // Roth/HSA qualified withdrawals (usually untaxed)
}

export interface TaxContext {
  settings: TaxSettings;
  /** Country profile in effect this year (for custom/international mode). */
  country: CountryProfile;
  /** Years since simulation start (for inflation-indexing brackets). */
  yearIndex: number;
  /** General inflation used to index brackets. */
  inflation: number;
  /** Person1 age this year (for age-conditioned custom rules). */
  age: number;
}

export interface TaxResult {
  totalTax: number;
  taxableIncome: number;
  effectiveRate: number;
  /** Approximate marginal rate on the last dollar of ordinary income. */
  marginalRate: number;
}

/** All tax engines implement this interface. */
export interface TaxEngine {
  readonly id: string;
  readonly label: string;
  compute(income: TaxableIncome, ctx: TaxContext): TaxResult;
}

export function grossTaxableTotal(income: TaxableIncome): number {
  return (
    income.ordinary +
    income.taxDeferredDistribution +
    income.capitalGains +
    income.dividends +
    income.pension +
    income.socialSecurity +
    income.rental +
    income.annuity
  );
}
