import type { Scenario } from '../types';
import { defaultScenario } from './defaults';

/** Deep clone helper so sample scenarios never share mutable references. */
function clone(s: Scenario): Scenario {
  return JSON.parse(JSON.stringify(s)) as Scenario;
}

/**
 * Eight sample scenarios illustrating distinct planning situations. Each is a
 * modification of the demonstration default and is fully editable.
 */
export function sampleScenarios(): Scenario[] {
  const base = defaultScenario();

  // 1. Traditional US retirement at 65.
  const traditional = clone(base);
  traditional.id = 'sample-traditional';
  traditional.name = 'Traditional US Retirement at 65';
  traditional.household.people = traditional.household.people.map((p) => ({
    ...p, currentAge: 60, retirementAge: 65, longevityAge: 92,
  }));
  traditional.household.planningEndAge = 92;
  traditional.spending.desiredMonthly = 8000;
  traditional.spending.essentialMonthly = 6000;
  traditional.accounts = [
    { id: 'a1', name: 'Taxable', taxClass: 'taxable', balance: 600000, costBasis: 400000, allocationId: 'stocks60' },
    { id: 'a2', name: 'IRA/401k', taxClass: 'tax-deferred', balance: 900000, allocationId: 'stocks60' },
    { id: 'a3', name: 'Cash', taxClass: 'cash', balance: 100000, allocationId: 'stocks60' },
  ];
  traditional.allocationPolicy.allocationId = 'stocks60';
  traditional.incomeSources = [
    { id: 'ss1', label: 'Social Security', type: 'socialSecurity', monthlyAmount: 3500, startAge: 67, inflationAdjust: 1, taxablePortion: 0.85, survivorFraction: 0.6, currency: 'USD', enabled: true },
  ];

  // 2. Early retirement at 50.
  const early = clone(base);
  early.id = 'sample-early';
  early.name = 'Early Retirement at 50 (50-year horizon)';
  early.household.people = early.household.people.map((p) => ({
    ...p, currentAge: 45, retirementAge: 50, longevityAge: 100,
  }));
  early.household.planningEndAge = 100;
  early.strategy = { id: 'guytonKlinger', initialRate: 0.04, upperGuardrail: 0.2, lowerGuardrail: 0.2, adjustment: 0.1 };
  early.spending.desiredMonthly = 12000;

  // 3. US retiree moving to Italy.
  const italy = clone(base);
  italy.id = 'sample-italy';
  italy.name = 'US Retiree Moving to Italy at 55';
  italy.household.retirementCountryId = 'IT';
  italy.household.countryTransitions = [{ countryId: 'IT', effectiveAge: 55 }];
  italy.taxes.mode = 'custom';
  italy.taxes.custom.rules = [
    { countryId: 'IT', incomeCategory: 'taxFree', rate: 0.26, fromAge: 55 },
    { countryId: 'IT', incomeCategory: 'capitalGains', rate: 0.26, fromAge: 55 },
    { countryId: 'IT', incomeCategory: 'taxDeferred', rate: 0.3, fromAge: 55 },
  ];
  italy.assumptions.currency = {
    ...italy.assumptions.currency, spendingCurrency: 'EUR', initialRate: 0.92, volatility: 0.09,
  };

  // 4. High-AUM-fee vs low-cost.
  const highFee = clone(base);
  highFee.id = 'sample-highfee';
  highFee.name = 'High-AUM-Fee Plan (1.00% advisor)';
  highFee.fees = { ...highFee.fees, model: 'aum', aumRate: 0.01, fundExpenseRatio: 0.006 };

  // 5. Flexible-spending retiree.
  const flexible = clone(base);
  flexible.id = 'sample-flexible';
  flexible.name = 'Flexible-Spending Retiree (VPW)';
  flexible.strategy = { id: 'vpw', spendingFloor: 90000 };

  // 6. Fixed-spending retiree.
  const fixed = clone(base);
  fixed.id = 'sample-fixed';
  fixed.name = 'Fixed-Spending Retiree (constant real)';
  fixed.strategy = { id: 'constantReal', initialRate: 0.04 };

  // 7. Couple with Social Security and pension.
  const couple = clone(base);
  couple.id = 'sample-couple';
  couple.name = 'Couple with Social Security and Pension';
  couple.incomeSources = [
    { id: 'ss1', label: 'Social Security (P1)', type: 'socialSecurity', monthlyAmount: 3000, startAge: 67, inflationAdjust: 1, taxablePortion: 0.85, survivorFraction: 0.6, currency: 'USD', enabled: true },
    { id: 'ss2', label: 'Social Security (P2)', type: 'socialSecurity', monthlyAmount: 2200, startAge: 67, inflationAdjust: 1, taxablePortion: 0.85, survivorFraction: 0.5, currency: 'USD', enabled: true },
    { id: 'pen1', label: 'Pension', type: 'pension', monthlyAmount: 2500, startAge: 65, inflationAdjust: 0.5, taxablePortion: 1, survivorFraction: 0.5, currency: 'USD', enabled: true },
  ];

  // 8. Long retirement with restricted assets until 59½.
  const restricted = clone(base);
  restricted.id = 'sample-restricted';
  restricted.name = 'Restricted Assets Until 59½';
  restricted.household.people = restricted.household.people.map((p) => ({
    ...p, currentAge: 48, retirementAge: 52, longevityAge: 95,
  }));
  restricted.accounts = [
    { id: 'r1', name: 'Taxable Bridge', taxClass: 'taxable', balance: 500000, costBasis: 350000, allocationId: 'stocks70' },
    { id: 'r2', name: '401k (locked to 59.5)', taxClass: 'tax-deferred', balance: 1800000, allocationId: 'stocks70', availabilityAge: 59.5 },
    { id: 'r3', name: 'Cash', taxClass: 'cash', balance: 120000, allocationId: 'stocks70' },
  ];
  restricted.allocationPolicy.allocationId = 'stocks70';

  return [traditional, early, italy, highFee, flexible, fixed, couple, restricted];
}
