import { describe, expect, it } from 'vitest';
import {
  applyReturns,
  buildHoldings,
  holdingsValue,
  maxDrift,
  rebalance,
  syncHoldings,
} from '../simulation/rebalance';
import { runSimulation } from '../simulation/monteCarlo';
import { defaultScenario } from '../models/defaults';
import type { AssetAllocation, Scenario } from '../types';

const target: AssetAllocation = {
  id: 't',
  name: 'Test 60/40',
  weights: { globalStocks: 0.6, govBonds: 0.4 },
};

describe('holdings mechanics', () => {
  it('builds holdings matching the target weights', () => {
    const h = buildHoldings(100000, target);
    expect(h.globalStocks).toBeCloseTo(60000, 6);
    expect(h.govBonds).toBeCloseTo(40000, 6);
    expect(holdingsValue(h)).toBeCloseTo(100000, 6);
  });

  it('applies per-class returns independently', () => {
    const h = buildHoldings(100000, target);
    applyReturns(h, { globalStocks: 0.1, govBonds: -0.05 });
    expect(h.globalStocks).toBeCloseTo(66000, 6);
    expect(h.govBonds).toBeCloseTo(38000, 6);
  });

  it('annual rebalance restores target weights; none lets them drift', () => {
    const drifted = buildHoldings(100000, target);
    applyReturns(drifted, { globalStocks: 0.5, govBonds: 0.0 }); // stocks now overweight
    expect(maxDrift(drifted, target)).toBeGreaterThan(0.05);

    const rebalanced = { ...drifted };
    rebalance(rebalanced, target, 'annual', 0.05);
    expect(maxDrift(rebalanced, target)).toBeCloseTo(0, 6);

    const noReb = { ...drifted };
    rebalance(noReb, target, 'none', 0.05);
    expect(maxDrift(noReb, target)).toBeGreaterThan(0.05); // unchanged
  });

  it('threshold rebalance only acts outside the band', () => {
    const small = buildHoldings(100000, target);
    applyReturns(small, { globalStocks: 0.02, govBonds: 0.0 }); // tiny drift
    const before = maxDrift(small, target);
    rebalance(small, target, 'threshold', 0.1); // band wider than drift
    expect(maxDrift(small, target)).toBeCloseTo(before, 6); // untouched
  });

  it('syncHoldings rebuilds a drained account when it receives an inflow', () => {
    const h = buildHoldings(100000, target);
    syncHoldings(h, 0, target); // drain
    expect(holdingsValue(h)).toBeCloseTo(0, 6);
    syncHoldings(h, 50000, target); // inflow into a zeroed account
    expect(holdingsValue(h)).toBeCloseTo(50000, 6);
    expect(h.globalStocks).toBeCloseTo(30000, 6);
  });
});

describe('rebalancing affects simulation outcomes', () => {
  function withRebalance(mode: Scenario['allocationPolicy']['rebalance']): Scenario {
    const s = defaultScenario();
    s.simulation = { trials: 400, seed: 2024, timestep: 'annual' };
    s.allocationPolicy = { ...s.allocationPolicy, rebalance: mode };
    return s;
  }

  it('annual and no-rebalancing produce different ending wealth', () => {
    const annual = runSimulation(withRebalance('annual'));
    const none = runSimulation(withRebalance('none'));
    // Both are finite and valid; the distributions differ because holdings
    // drift under 'none' but are reset under 'annual'.
    expect(Number.isFinite(annual.metrics.medianEndingWealth)).toBe(true);
    expect(Number.isFinite(none.metrics.medianEndingWealth)).toBe(true);
    expect(annual.metrics.medianEndingWealth).not.toBe(none.metrics.medianEndingWealth);
  });
});
