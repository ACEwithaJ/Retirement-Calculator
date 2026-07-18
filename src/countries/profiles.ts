import type { CountryProfile } from '../types';

/**
 * Simplified, illustrative country tax/cost profiles.
 *
 * IMPORTANT: These are simplified EXAMPLES for scenario planning, not
 * authoritative tax calculations. Real cross-border taxation depends on
 * treaties, residency rules, account-type recognition, timing, and personal
 * circumstances. Always consult a qualified cross-border tax professional.
 *
 * Rates are rough "effective" figures for a comfortable-but-not-ultra-wealthy
 * retiree and should be edited to fit your situation.
 */
export const COUNTRY_PROFILES: CountryProfile[] = [
  {
    id: 'US', name: 'United States', currency: 'USD',
    ordinaryRate: 0.22, capitalGainsRate: 0.15, dividendRate: 0.15,
    pensionRate: 0.22, taxDeferredDistributionRate: 0.22, taxFreeRate: 0.0,
    wealthTaxRate: 0.0, socialTaxRate: 0.0, costOfLivingMultiplier: 1.0,
    estateTaxRate: 0.0, entryExitTaxRate: 0.0, simplified: true,
    notes: 'Baseline. Roth/HSA respected as tax-free for qualified use.',
  },
  {
    id: 'IT', name: 'Italy', currency: 'EUR',
    ordinaryRate: 0.30, capitalGainsRate: 0.26, dividendRate: 0.26,
    pensionRate: 0.23, taxDeferredDistributionRate: 0.30, taxFreeRate: 0.26,
    wealthTaxRate: 0.002, socialTaxRate: 0.0, costOfLivingMultiplier: 0.82,
    inflationOverride: 0.025, estateTaxRate: 0.04, entryExitTaxRate: 0.0,
    simplified: true,
    notes: 'Roth is generally NOT recognized as tax-free in Italy. Foreign financial assets face IVAFE wealth tax. 7% flat-tax regimes exist in some southern regions for new residents.',
  },
  {
    id: 'UK', name: 'United Kingdom', currency: 'GBP',
    ordinaryRate: 0.25, capitalGainsRate: 0.20, dividendRate: 0.20,
    pensionRate: 0.25, taxDeferredDistributionRate: 0.25, taxFreeRate: 0.0,
    wealthTaxRate: 0.0, socialTaxRate: 0.0, costOfLivingMultiplier: 0.95,
    inflationOverride: 0.025, estateTaxRate: 0.40, entryExitTaxRate: 0.0,
    simplified: true,
    notes: 'ISA is tax-free domestically. US-UK treaty generally respects pensions. Inheritance tax above nil-rate band is significant.',
  },
  {
    id: 'CA', name: 'Canada', currency: 'CAD',
    ordinaryRate: 0.30, capitalGainsRate: 0.165, dividendRate: 0.25,
    pensionRate: 0.25, taxDeferredDistributionRate: 0.25, taxFreeRate: 0.0,
    wealthTaxRate: 0.0, socialTaxRate: 0.0, costOfLivingMultiplier: 0.9,
    inflationOverride: 0.02, estateTaxRate: 0.0, entryExitTaxRate: 0.0,
    simplified: true,
    notes: 'Only 50% (rising to 66% for large gains) of capital gains taxable. TFSA is tax-free domestically. Deemed disposition on emigration.',
  },
  {
    id: 'FR', name: 'France', currency: 'EUR',
    ordinaryRate: 0.30, capitalGainsRate: 0.30, dividendRate: 0.30,
    pensionRate: 0.20, taxDeferredDistributionRate: 0.30, taxFreeRate: 0.172,
    wealthTaxRate: 0.005, socialTaxRate: 0.172, costOfLivingMultiplier: 0.88,
    inflationOverride: 0.02, estateTaxRate: 0.20, entryExitTaxRate: 0.0,
    simplified: true,
    notes: 'Flat 30% "PFU" on investment income incl. 17.2% social charges. Wealth tax (IFI) on real estate. US-France treaty is unusually favorable to US-source retirement income.',
  },
  {
    id: 'DE', name: 'Germany', currency: 'EUR',
    ordinaryRate: 0.32, capitalGainsRate: 0.26, dividendRate: 0.26,
    pensionRate: 0.28, taxDeferredDistributionRate: 0.32, taxFreeRate: 0.26,
    wealthTaxRate: 0.0, socialTaxRate: 0.0, costOfLivingMultiplier: 0.85,
    inflationOverride: 0.02, estateTaxRate: 0.19, entryExitTaxRate: 0.0,
    simplified: true,
    notes: 'Flat 26.375% (incl. solidarity) on most investment income. No wealth tax currently.',
  },
  {
    id: 'ES', name: 'Spain', currency: 'EUR',
    ordinaryRate: 0.30, capitalGainsRate: 0.21, dividendRate: 0.21,
    pensionRate: 0.24, taxDeferredDistributionRate: 0.30, taxFreeRate: 0.21,
    wealthTaxRate: 0.005, socialTaxRate: 0.0, costOfLivingMultiplier: 0.75,
    inflationOverride: 0.025, estateTaxRate: 0.15, entryExitTaxRate: 0.0,
    simplified: true,
    notes: 'Regional wealth tax varies widely (Madrid ~0%). Beckham regime may apply to some new residents. Roth not recognized.',
  },
  {
    id: 'PT', name: 'Portugal', currency: 'EUR',
    ordinaryRate: 0.28, capitalGainsRate: 0.28, dividendRate: 0.28,
    pensionRate: 0.10, taxDeferredDistributionRate: 0.28, taxFreeRate: 0.28,
    wealthTaxRate: 0.0, socialTaxRate: 0.0, costOfLivingMultiplier: 0.7,
    inflationOverride: 0.025, estateTaxRate: 0.0, entryExitTaxRate: 0.0,
    simplified: true,
    notes: 'The old NHR regime (10% on foreign pensions) is largely closed to new applicants from 2024; a narrower IFICI regime replaced it. Verify current rules.',
  },
  {
    id: 'CH', name: 'Switzerland', currency: 'CHF',
    ordinaryRate: 0.22, capitalGainsRate: 0.0, dividendRate: 0.22,
    pensionRate: 0.15, taxDeferredDistributionRate: 0.15, taxFreeRate: 0.0,
    wealthTaxRate: 0.005, socialTaxRate: 0.0, costOfLivingMultiplier: 1.4,
    inflationOverride: 0.012, estateTaxRate: 0.0, entryExitTaxRate: 0.0,
    simplified: true,
    notes: 'Private capital gains generally untaxed, but cantonal wealth tax applies. Rates vary enormously by canton. Lump-sum taxation possible for some.',
  },
  {
    id: 'AU', name: 'Australia', currency: 'AUD',
    ordinaryRate: 0.30, capitalGainsRate: 0.16, dividendRate: 0.30,
    pensionRate: 0.0, taxDeferredDistributionRate: 0.30, taxFreeRate: 0.0,
    wealthTaxRate: 0.0, socialTaxRate: 0.0, costOfLivingMultiplier: 0.95,
    inflationOverride: 0.025, estateTaxRate: 0.0, entryExitTaxRate: 0.0,
    simplified: true,
    notes: 'Superannuation withdrawals after age 60 are generally tax-free. 50% CGT discount for assets held >1 year. Deemed disposal on ceasing residency.',
  },
  {
    id: 'CUSTOM', name: 'Custom Jurisdiction', currency: 'USD',
    ordinaryRate: 0.25, capitalGainsRate: 0.15, dividendRate: 0.15,
    pensionRate: 0.25, taxDeferredDistributionRate: 0.25, taxFreeRate: 0.0,
    wealthTaxRate: 0.0, socialTaxRate: 0.0, costOfLivingMultiplier: 1.0,
    estateTaxRate: 0.0, entryExitTaxRate: 0.0, simplified: true,
    notes: 'Fully user-defined placeholder.',
  },
];

export function findCountry(
  countries: CountryProfile[],
  id: string,
): CountryProfile {
  return countries.find((c) => c.id === id) ?? countries[0];
}
