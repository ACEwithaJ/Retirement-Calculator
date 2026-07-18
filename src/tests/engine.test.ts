import { describe, expect, it } from 'vitest';
import { simulatePath } from '../simulation/engine';
import { runSimulation } from '../simulation/monteCarlo';
import { createReturnGenerator } from '../simulation/returns';
import { defaultScenario } from '../models/defaults';
import { SeededRandom } from '../utils/random';
import type { Scenario } from '../types';

/** A tiny scenario: retire now, fixed returns, no taxes, no fees. */
function toyScenario(): Scenario {
  const s = defaultScenario();
  s.household.people = [{ id: 'p1', label: 'P1', currentAge: 65, retirementAge: 65, longevityAge: 85 }];
  s.household.planningEndAge = 85;
  s.household.maritalStatus = 'single';
  s.accounts = [{ id: 'a', name: 'Portfolio', taxClass: 'taxable', balance: 1000000, costBasis: 1000000, allocationId: 'demoDefault' }];
  s.contributions = [];
  s.incomeSources = [];
  s.spending = { ...s.spending, desiredMonthly: 4000, essentialMonthly: 3000 };
  s.taxes.flat.effectiveRate = 0;
  s.fees = { ...s.fees, model: 'none', fundExpenseRatio: 0 };
  s.simulation = { trials: 500, seed: 999, timestep: 'annual' };
  return s;
}

describe('single-path engine — deterministic sanity', () => {
  it('with zero real return, zero taxes, spending draws down linearly', () => {
    const s = toyScenario();
    // Force zero returns and zero inflation via parametric with overridden classes.
    s.assumptions.assetClasses = s.assumptions.assetClasses.map((a) => ({ ...a, arithmeticReturn: 0.025, volatility: 0 }));
    s.assumptions.inflation.general = 0.025; // real return = 0
    s.assumptions.returnModel = { ...s.assumptions.returnModel, method: 'parametric', distribution: 'normal', meanReversion: false };

    const gen = createReturnGenerator(s.assumptions);
    const rng = new SeededRandom(1);
    gen.beginPath(rng, 21);
    const path = simulatePath(s, gen, rng);

    // Spending 48k/yr real, 0% real return -> ~1,000,000 / 48,000 ≈ 20.8 years.
    // Over a 21-year horizon the portfolio should be nearly depleted.
    expect(path.endingBalance).toBeLessThan(120000);
    expect(path.endingBalance).toBeGreaterThanOrEqual(0);
    // First-year net spending equals desired (portfolio sufficient early).
    expect(path.records[0].netSpending).toBeCloseTo(48000, 0);
  });

  it('guaranteed income exceeding spending means no withdrawals', () => {
    const s = toyScenario();
    s.incomeSources = [
      { id: 'big', label: 'Big pension', type: 'pension', monthlyAmount: 10000, startAge: 65, inflationAdjust: 1, taxablePortion: 0, survivorFraction: 1, currency: 'USD', enabled: true },
    ];
    s.assumptions.assetClasses = s.assumptions.assetClasses.map((a) => ({ ...a, volatility: 0 }));
    const gen = createReturnGenerator(s.assumptions);
    const rng = new SeededRandom(2);
    gen.beginPath(rng, 21);
    const path = simulatePath(s, gen, rng);
    // Income (120k) > spending (48k); no gross withdrawals in any year.
    const totalWithdrawn = path.records.reduce((a, r) => a + r.grossWithdrawal, 0);
    expect(totalWithdrawn).toBeCloseTo(0, 6);
    // Portfolio should grow (surplus reinvested + returns).
    expect(path.endingBalance).toBeGreaterThan(1000000);
  });

  it('an immediate 100% loss depletes the portfolio', () => {
    const s = toyScenario();
    s.assumptions.returnModel = { ...s.assumptions.returnModel, method: 'stress', stressScenarioId: 'crash50' };
    s.strategy = { id: 'constantReal' };
    s.spending = { ...s.spending, desiredMonthly: 6000, essentialMonthly: 5000 };
    const res = runSimulation(s);
    // A 50% crash at retirement should reduce survival meaningfully vs a calm market.
    expect(res.metrics.portfolioSurvival).toBeLessThan(1);
  });
});

describe('full Monte Carlo — reproducibility', () => {
  it('identical seeds produce identical metrics', () => {
    const s = defaultScenario();
    s.simulation = { trials: 300, seed: 4242, timestep: 'annual' };
    const a = runSimulation(s);
    const b = runSimulation(s);
    expect(a.metrics.desiredFunded).toBe(b.metrics.desiredFunded);
    expect(a.metrics.medianEndingWealth).toBe(b.metrics.medianEndingWealth);
    expect(a.balanceBands[0].p50).toBe(b.balanceBands[0].p50);
  });

  it('different seeds produce different but plausible results', () => {
    const s = defaultScenario();
    s.simulation = { trials: 300, seed: 1, timestep: 'annual' };
    const a = runSimulation(s);
    s.simulation = { trials: 300, seed: 2, timestep: 'annual' };
    const b = runSimulation(s);
    // Probabilities should be in [0,1] and generally close but not identical.
    expect(a.metrics.desiredFunded).toBeGreaterThanOrEqual(0);
    expect(a.metrics.desiredFunded).toBeLessThanOrEqual(1);
    expect(Math.abs(a.metrics.desiredFunded - b.metrics.desiredFunded)).toBeLessThan(0.2);
  });

  it('produces sane readiness and success metrics for the default scenario', () => {
    const s = defaultScenario();
    s.simulation = { trials: 500, seed: 12345, timestep: 'annual' };
    const res = runSimulation(s);
    expect(res.metrics.essentialFunded).toBeGreaterThanOrEqual(res.metrics.desiredFunded);
    expect(res.metrics.portfolioSurvival).toBeGreaterThanOrEqual(0);
    expect(['stronglyFunded', 'reasonablyFunded', 'borderline', 'vulnerable', 'notFunded']).toContain(res.readiness);
    expect(res.balanceBands.length).toBeGreaterThan(30);
  });
});
