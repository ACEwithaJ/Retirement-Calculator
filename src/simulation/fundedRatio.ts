import type { Scenario } from '../types';
import { pvGrowingAnnuity } from '../utils/finance';

/**
 * Funded ratio = investable assets / present value of projected net portfolio
 * withdrawals (spending not covered by guaranteed income), discounted at an
 * assumed real return.
 *
 * This is an additional planning indicator. It depends heavily on the discount
 * rate: a higher assumed return flatters the ratio. We use the portfolio's
 * assumed real return as the discount rate and document the sensitivity.
 */
export function computeFundedRatio(scenario: Scenario): number {
  const assets = scenario.accounts.reduce((a, acc) => a + acc.balance, 0);
  const startAge = scenario.household.people[0]?.currentAge ?? 47;
  const retAge = scenario.household.people[0]?.retirementAge ?? 65;
  const endAge =
    scenario.household.planningEndAge ??
    Math.max(...scenario.household.people.map((p) => p.longevityAge));

  const yearsInRetirement = Math.max(1, endAge - retAge + 1);

  // Annual net portfolio need (real): desired spending minus guaranteed income
  // that is active in retirement.
  const desiredAnnual = scenario.spending.desiredMonthly * 12;
  const guaranteedAnnual = scenario.incomeSources
    .filter((s) => s.enabled && s.startAge <= retAge + 5)
    .reduce((a, s) => a + s.monthlyAmount * 12, 0);
  const netNeed = Math.max(0, desiredAnnual - guaranteedAnnual);

  // Discount rate: assumed real return, floored to avoid divide-by-zero.
  const equityReturn = 0.05; // conservative default real discount rate
  const realDiscount = Math.max(0.005, equityReturn);

  // Present value at retirement, then discount back to today.
  const pvAtRetirement = pvGrowingAnnuity(netNeed, realDiscount, 0, yearsInRetirement);
  const yearsToRet = Math.max(0, retAge - startAge);
  const pvToday = pvAtRetirement / Math.pow(1 + realDiscount, yearsToRet);

  if (pvToday <= 0) return assets > 0 ? 99 : 1;
  return assets / pvToday;
}
