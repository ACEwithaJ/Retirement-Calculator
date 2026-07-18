/**
 * Independent validation & regression tests (see VALIDATION_REPORT.md).
 *
 * These tests recompute engine outputs from first principles (closed-form
 * formulas and hand loops) rather than re-implementing the engine's own logic,
 * so they catch real mathematical regressions rather than merely mirroring them.
 */
import { describe, expect, it } from 'vitest';
import type { Scenario } from '../types';
import { defaultScenario, DEFAULT_MARGINAL } from '../models/defaults';
import { createReturnGenerator } from '../simulation/returns';
import { simulatePath } from '../simulation/engine';
import { runSimulation } from '../simulation/monteCarlo';
import { solveSustainableSpending } from '../simulation/solver';
import { SeededRandom } from '../utils/random';
import { MarginalTaxEngine } from '../taxes';
import { COUNTRY_PROFILES } from '../countries/profiles';

/** Make the engine fully deterministic: one asset class, zero volatility. */
function deterministic(s: Scenario, nominal: number, inflation: number): Scenario {
  s.assumptions.assetClasses = s.assumptions.assetClasses.map((a) => ({
    ...a, arithmeticReturn: nominal, geometricReturn: nominal, volatility: 0, yield: 0, expenseRatio: 0,
  }));
  s.assumptions.inflation = { ...s.assumptions.inflation, general: inflation, stochastic: false };
  s.assumptions.returnModel = { ...s.assumptions.returnModel, method: 'parametric', distribution: 'normal', meanReversion: false };
  s.allocations = s.allocations.map((a) => ({ ...a, weights: { globalStocks: 1 } }));
  s.allocationPolicy = { ...s.allocationPolicy, allocationId: 'demoDefault', glidepath: 'fixed', rebalance: 'annual' };
  s.fees = { ...s.fees, model: 'none', fundExpenseRatio: 0, platformFee: 0 };
  return s;
}

function onePath(s: Scenario): ReturnType<typeof simulatePath> {
  const gen = createReturnGenerator(s.assumptions);
  const rng = new SeededRandom(1);
  const startAge = s.household.people[0].currentAge;
  const endAge = s.household.planningEndAge!;
  gen.beginPath(rng, endAge - startAge + 1);
  return simulatePath(s, gen, rng);
}

describe('Case A — accumulation matches closed-form annuity-due (real $)', () => {
  it('is exact for $500k + $3k/mo, 25y, 7% nominal, 3% inflation', () => {
    const s = deterministic(defaultScenario(), 0.07, 0.03);
    s.household.people = [{ id: 'p1', label: 'P1', currentAge: 40, retirementAge: 65, longevityAge: 66 }];
    s.household.maritalStatus = 'single';
    s.household.planningEndAge = 66;
    s.accounts = [{ id: 'a', name: 'Port', taxClass: 'taxable', balance: 500000, costBasis: 500000, allocationId: 'demoDefault', assetType: 'portfolio' }];
    s.contributions = [{ accountId: 'a', monthlyAmount: 3000, endAge: 65 }];
    s.incomeSources = [];
    s.spending = { ...s.spending, desiredMonthly: 100, essentialMonthly: 100, phases: [] };
    s.taxes = { ...s.taxes, mode: 'flat', flat: { effectiveRate: 0 } };

    const atRet = onePath(s).records.find((r) => r.age === 65)!.startBalance;
    const r = 1.07 / 1.03 - 1;
    const closed = 500000 * Math.pow(1 + r, 25) + 36000 * ((Math.pow(1 + r, 25) - 1) / r) * (1 + r);
    expect(atRet).toBeCloseTo(closed, 0); // exact to the dollar
  });
});

describe('Case B — drawdown matches a begin-year annuity hand loop (real $)', () => {
  it('is exact for $2M, $8k/mo real, 6% nominal, 2.5% inflation', () => {
    const s = deterministic(defaultScenario(), 0.06, 0.025);
    s.household.people = [{ id: 'p1', label: 'P1', currentAge: 65, retirementAge: 65, longevityAge: 95 }];
    s.household.maritalStatus = 'single';
    s.household.planningEndAge = 95;
    s.accounts = [{ id: 'a', name: 'Port', taxClass: 'taxable', balance: 2000000, costBasis: 2000000, allocationId: 'demoDefault', assetType: 'portfolio' }];
    s.contributions = [];
    s.incomeSources = [];
    s.spending = { ...s.spending, desiredMonthly: 8000, essentialMonthly: 8000, phases: [], realDeclineRate: 0 };
    s.strategy = { id: 'constantReal' };
    s.taxes = { ...s.taxes, mode: 'flat', flat: { effectiveRate: 0 } };

    const path = onePath(s);
    const r = 1.06 / 1.025 - 1;
    let hand = 2000000;
    for (let y = 0; y < path.records.length; y++) { hand -= 96000; hand *= 1 + r; }
    expect(path.records[0].netSpending).toBeCloseTo(96000, 0);
    expect(path.records[0].startBalance).toBeCloseTo(2000000, 0);
    expect(path.endingBalance).toBeCloseTo(hand, 0);
  });
});

describe('Flat tax grosses up correctly', () => {
  it('a net $60k target from a tax-deferred account withdraws $80k at 25%', () => {
    const s = deterministic(defaultScenario(), 0.03, 0.03); // 0% real return
    s.household.people = [{ id: 'p1', label: 'P1', currentAge: 65, retirementAge: 65, longevityAge: 66 }];
    s.household.maritalStatus = 'single';
    s.household.planningEndAge = 66;
    s.accounts = [{ id: 'd', name: 'IRA', taxClass: 'tax-deferred', balance: 1000000, allocationId: 'demoDefault', assetType: 'portfolio' }];
    s.contributions = [];
    s.incomeSources = [];
    s.spending = { ...s.spending, desiredMonthly: 5000, essentialMonthly: 5000, phases: [], realDeclineRate: 0 };
    s.strategy = { id: 'constantReal' };
    s.taxes = { ...s.taxes, mode: 'flat', flat: { effectiveRate: 0.25 } };

    const r0 = onePath(s).records[0];
    expect(r0.netSpending).toBeCloseTo(60000, 0);
    expect(r0.grossWithdrawal).toBeCloseTo(80000, 0);
    expect(r0.taxes).toBeCloseTo(20000, 0);
  });
});

describe('Marginal tax matches a hand-computed bracket calculation', () => {
  it('$120k ordinary income, single, year 0', () => {
    const eng = new MarginalTaxEngine();
    const income = { ordinary: 120000, taxDeferredDistribution: 0, capitalGains: 0, dividends: 0, pension: 0, socialSecurity: 0, rental: 0, annuity: 0, taxFreeWithdrawal: 0 };
    const res = eng.compute(income, {
      settings: { mode: 'marginal', flat: { effectiveRate: 0 }, marginal: DEFAULT_MARGINAL, custom: { rules: [] }, enableRMD: false, rmdStartAge: 73 },
      country: COUNTRY_PROFILES[0], yearIndex: 0, inflation: 0.025, age: 65,
    });
    const taxable = 120000 - 14600;
    const hand = 0.1 * 11600 + 0.12 * (47150 - 11600) + 0.22 * (100525 - 47150) + 0.24 * (taxable - 100525);
    expect(res.totalTax).toBeCloseTo(hand, 0);
  });
});

describe('Monte Carlo success rate equals an independent recomputation', () => {
  it('reproduces desiredFunded / essentialFunded / survival exactly from raw paths', () => {
    const s = defaultScenario();
    s.simulation = { trials: 400, seed: 12345, timestep: 'annual' };
    const res = runSimulation(s);

    const gen = createReturnGenerator(s.assumptions);
    const startAge = s.household.people[0].currentAge;
    const horizon = s.household.planningEndAge! - startAge + 1;
    const master = s.simulation.seed >>> 0;
    let desired = 0, essential = 0, survived = 0;
    for (let t = 0; t < 400; t++) {
      const rng = new SeededRandom((master ^ (t * 0x9e3779b1)) >>> 0);
      gen.beginPath(rng, horizon);
      const p = simulatePath(s, gen, rng);
      if (p.desiredAlwaysFunded) desired++;
      if (p.essentialAlwaysFunded) essential++;
      if (!p.depleted) survived++;
    }
    expect(res.metrics.desiredFunded).toBe(desired / 400);
    expect(res.metrics.essentialFunded).toBe(essential / 400);
    expect(res.metrics.portfolioSurvival).toBe(survived / 400);
  });
});

describe('Property invariants (fixed seed)', () => {
  const base = (mut?: (s: Scenario) => void): Scenario => {
    const s = defaultScenario();
    s.simulation = { trials: 800, seed: 2024, timestep: 'annual' };
    s.spending = { ...s.spending, desiredMonthly: 7000, essentialMonthly: 5000 };
    if (mut) mut(s);
    return s;
  };
  const df = (s: Scenario): number => runSimulation(s).metrics.desiredFunded;
  const me = (s: Scenario): number => runSimulation(s).metrics.medianEndingWealth;

  it('higher spending does not increase success', () => {
    expect(df(base((s) => { s.spending.desiredMonthly = 11000; }))).toBeLessThanOrEqual(df(base()));
  });
  it('a larger starting portfolio does not decrease success', () => {
    expect(df(base((s) => { s.accounts = s.accounts.map((a) => ({ ...a, balance: a.balance * 1.5, costBasis: (a.costBasis ?? a.balance) * 1.5 })); }))).toBeGreaterThanOrEqual(df(base()));
  });
  it('more guaranteed income does not decrease success', () => {
    expect(df(base((s) => { s.incomeSources = [{ id: 'p', label: 'p', type: 'pension', monthlyAmount: 4000, startAge: 55, inflationAdjust: 1, taxablePortion: 1, survivorFraction: 1, currency: 'USD', enabled: true }]; }))).toBeGreaterThanOrEqual(df(base()));
  });
  it('higher fees do not increase median ending wealth', () => {
    expect(me(base((s) => { s.fees = { ...s.fees, model: 'aum', aumRate: 0.015 }; }))).toBeLessThan(me(base()));
  });
  it('a 100% cash portfolio does not receive equity returns', () => {
    const equity = me(base((s) => { s.allocationPolicy = { ...s.allocationPolicy, allocationId: 'stocks100' }; }));
    const cash = me(base((s) => { s.allocations = s.allocations.map((a) => (a.id === 'demoDefault' ? { ...a, weights: { cash: 1 } } : a)); }));
    expect(cash).toBeLessThan(equity);
  });
});

describe('85% sustainable-spending headline stability (regression guard for DEF-001)', () => {
  // The shipped hook uses 500 search trials. At 100 trials the peak-to-peak
  // spread across seeds was ~24% (values $7,470–$9,477); at 500 it is ~7%.
  // This guards against a regression back to a too-low trial count.
  it('spread across seeds stays well below the 100-trial level', () => {
    const vals: number[] = [];
    for (const seed of [1, 2, 3]) {
      const s = defaultScenario();
      s.simulation = { trials: 1500, seed, timestep: 'annual' };
      // Shipped settings from useTargetSpending (400 trials, $250 tolerance).
      vals.push(solveSustainableSpending(s, 0.85, 'desiredFunded', { searchTrials: 400, tolerance: 250 }).monthlySpending);
    }
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const spread = (Math.max(...vals) - Math.min(...vals)) / mean;
    expect(spread).toBeLessThan(0.12);
  });
});
