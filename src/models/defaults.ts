import type {
  Assumptions,
  MarginalTaxConfig,
  Scenario,
} from '../types';
import { DEFAULT_ASSET_CLASSES } from '../allocations/assetClasses';
import { defaultCorrelations } from '../allocations/correlations';
import { ALLOCATION_PRESETS } from '../allocations/presets';
import { COUNTRY_PROFILES } from '../countries/profiles';

/** A simple stable id generator for seeded/default content. */
export function makeId(prefix = 'id'): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

/** US-style marginal brackets (illustrative, roughly 2024 single filer). */
export const DEFAULT_MARGINAL: MarginalTaxConfig = {
  ordinaryBrackets: [
    { threshold: 0, rate: 0.1 },
    { threshold: 11600, rate: 0.12 },
    { threshold: 47150, rate: 0.22 },
    { threshold: 100525, rate: 0.24 },
    { threshold: 191950, rate: 0.32 },
    { threshold: 243725, rate: 0.35 },
    { threshold: 609350, rate: 0.37 },
  ],
  capitalGainsBrackets: [
    { threshold: 0, rate: 0.0 },
    { threshold: 47025, rate: 0.15 },
    { threshold: 518900, rate: 0.2 },
  ],
  standardDeduction: 14600,
  filingStatus: 'single',
  stateRate: 0.0,
  dividendAsOrdinary: false,
  inflationIndexed: true,
};

/** The default modeling assumptions ("Moderate" preset). */
export function defaultAssumptions(): Assumptions {
  const ids = DEFAULT_ASSET_CLASSES.map((a) => a.id);
  return {
    presetId: 'moderate',
    assetClasses: DEFAULT_ASSET_CLASSES.map((a) => ({ ...a })),
    correlations: defaultCorrelations(ids),
    inflation: {
      general: 0.025,
      healthcare: 0.045,
      housing: 0.03,
      education: 0.04,
      volatility: 0.015,
      stochastic: false,
    },
    currency: {
      baseCurrency: 'USD',
      spendingCurrency: 'USD',
      initialRate: 1,
      expectedTrend: 0,
      volatility: 0.08,
      correlationWithEquity: 0,
      hedgedFraction: 0,
    },
    returnModel: {
      method: 'parametric',
      distribution: 'normal',
      studentTDf: 5,
      bootstrapBlockSize: 5,
      meanReversion: false,
    },
  };
}

/**
 * The initial demonstration scenario from the specification. All values are
 * editable in the UI; these are neutral demonstration assumptions only, not
 * advice.
 */
export function defaultScenario(): Scenario {
  const now = new Date().toISOString();
  const brokerage = 'acct-brokerage';
  const ira = 'acct-ira';
  const roth = 'acct-roth';
  const cash = 'acct-cash';

  return {
    id: 'default',
    name: 'Demonstration Default',
    createdAt: now,
    updatedAt: now,
    household: {
      people: [
        { id: 'p1', label: 'Person 1', currentAge: 47, retirementAge: 55, longevityAge: 100 },
        { id: 'p2', label: 'Person 2', currentAge: 47, retirementAge: 55, longevityAge: 100 },
      ],
      maritalStatus: 'married',
      dependents: 0,
      currentCountryId: 'US',
      retirementCountryId: 'US',
      countryTransitions: [],
      baseCurrency: 'USD',
      planningEndAge: 100,
    },
    accounts: [
      { id: brokerage, name: 'Taxable Brokerage', taxClass: 'taxable', balance: 1500000, costBasis: 900000, allocationId: 'demoDefault' },
      { id: ira, name: 'Traditional IRA / 401k', taxClass: 'tax-deferred', balance: 1000000, allocationId: 'demoDefault', availabilityAge: 59.5 },
      { id: roth, name: 'Roth IRA', taxClass: 'tax-free', balance: 350000, allocationId: 'demoDefault' },
      { id: cash, name: 'Cash', taxClass: 'cash', balance: 150000, allocationId: 'demoDefault' },
    ],
    contributions: [
      { accountId: brokerage, monthlyAmount: 5000, annualIncrease: 0.0, endAge: 55 },
      { accountId: ira, monthlyAmount: 3000, annualIncrease: 0.0, employerMatch: 0.5, endAge: 55 },
    ],
    spending: {
      desiredMonthly: 15000,
      essentialMonthly: 10000,
      basis: 'after-tax',
      includesAdvisoryFees: true,
      includesHousing: true,
      phases: [
        { startAge: 55, multiplier: 1.0, label: 'Go-go' },
        { startAge: 75, multiplier: 0.9, label: 'Slow-go' },
        { startAge: 85, multiplier: 0.85, label: 'No-go' },
      ],
      oneTimeExpenses: [],
    },
    incomeSources: [
      {
        id: 'ss1', label: 'Social Security (Person 1)', type: 'socialSecurity',
        monthlyAmount: 3000, startAge: 70, inflationAdjust: 1, taxablePortion: 0.85,
        survivorFraction: 1, currency: 'USD', certainty: 0.9, enabled: false,
      },
    ],
    allocations: ALLOCATION_PRESETS.map((a) => ({ ...a, weights: { ...a.weights } })),
    allocationPolicy: {
      allocationId: 'demoDefault',
      rebalance: 'annual',
      rebalanceThreshold: 0.05,
      glidepath: 'fixed',
    },
    strategy: {
      id: 'constantReal',
      initialRate: 0.04,
      skipRaiseAfterLoss: false,
    },
    withdrawalOrder: { mode: 'taxableFirst' },
    taxes: {
      mode: 'flat',
      flat: { effectiveRate: 0.25 },
      marginal: DEFAULT_MARGINAL,
      custom: { rules: [] },
      enableRMD: false,
      rmdStartAge: 73,
    },
    fees: {
      model: 'none',
      aumRate: 0.0,
      aumTiers: [],
      flatAnnual: 0,
      fundExpenseRatio: 0.0008,
      platformFee: 0,
      advisorValueAdded: 0,
    },
    assumptions: defaultAssumptions(),
    countries: COUNTRY_PROFILES.map((c) => ({ ...c })),
    simulation: { trials: 10000, seed: 12345, timestep: 'annual' },
    oneTimeFlows: [],
  };
}
