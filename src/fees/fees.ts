import type { FeeSettings } from '../types';

/**
 * Fee modeling. All functions return an ANNUAL fee in nominal currency for a
 * given portfolio value. The simulation applies the monthly-equivalent slice.
 */

/** AUM fee for a portfolio value, honoring an optional tiered schedule. */
export function aumFee(value: number, fees: FeeSettings): number {
  if (value <= 0) return 0;
  if (fees.aumTiers.length === 0) {
    return value * fees.aumRate;
  }
  // Tiered: each tier's rate applies to the slice of assets in that tier.
  const tiers = [...fees.aumTiers].sort((a, b) => a.threshold - b.threshold);
  let fee = 0;
  for (let i = 0; i < tiers.length; i++) {
    const lower = tiers[i].threshold;
    if (value <= lower) break;
    const upper = i + 1 < tiers.length ? tiers[i + 1].threshold : Infinity;
    const slice = Math.min(value, upper) - lower;
    if (slice > 0) fee += slice * tiers[i].rate;
  }
  return fee;
}

/**
 * Total annual advisory + product fee for a portfolio value. Combines the
 * chosen advisor model with fund expense ratios and platform fees, which apply
 * regardless of whether an advisor is used.
 */
export function totalAnnualFee(value: number, fees: FeeSettings): number {
  const productFees = value * (fees.fundExpenseRatio + fees.platformFee);
  let advisorFee = 0;
  switch (fees.model) {
    case 'aum':
      advisorFee = aumFee(value, fees);
      break;
    case 'robo':
      advisorFee = value * (fees.aumRate || 0.0025);
      break;
    case 'flatRetainer':
    case 'subscription':
    case 'hourly':
      advisorFee = fees.flatAnnual;
      break;
    case 'none':
    default:
      advisorFee = 0;
  }
  return productFees + advisorFee;
}

/** Just the advisor portion (excludes fund/platform fees). */
export function advisorAnnualFee(value: number, fees: FeeSettings): number {
  switch (fees.model) {
    case 'aum':
      return aumFee(value, fees);
    case 'robo':
      return value * (fees.aumRate || 0.0025);
    case 'flatRetainer':
    case 'subscription':
    case 'hourly':
      return fees.flatAnnual;
    default:
      return 0;
  }
}

/** Predefined comparison scenarios for the Cost of Advice section. */
export interface FeeScenario {
  id: string;
  label: string;
  build: (base: FeeSettings) => FeeSettings;
}

export const FEE_COMPARISON_SCENARIOS: FeeScenario[] = [
  { id: 'selfDirected', label: 'Self-directed (index funds)', build: (b) => ({ ...b, model: 'none', aumRate: 0, flatAnnual: 0 }) },
  { id: 'robo', label: 'Robo-advisor (0.25%)', build: (b) => ({ ...b, model: 'robo', aumRate: 0.0025, aumTiers: [] }) },
  { id: 'aum050', label: '0.50% AUM advisor', build: (b) => ({ ...b, model: 'aum', aumRate: 0.005, aumTiers: [] }) },
  { id: 'aum100', label: '1.00% AUM advisor', build: (b) => ({ ...b, model: 'aum', aumRate: 0.01, aumTiers: [] }) },
  { id: 'aum150', label: '1.50% AUM advisor', build: (b) => ({ ...b, model: 'aum', aumRate: 0.015, aumTiers: [] }) },
  { id: 'flat', label: 'Flat-fee advisor ($5,000/yr)', build: (b) => ({ ...b, model: 'flatRetainer', flatAnnual: 5000, aumTiers: [] }) },
];
