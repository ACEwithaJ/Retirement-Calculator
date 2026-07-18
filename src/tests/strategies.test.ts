import { describe, expect, it } from 'vitest';
import { createStrategy, allStrategies } from '../strategies';
import type { StrategyContext } from '../strategies';
import type { StrategyConfig } from '../types';

function baseCtx(overrides: Partial<StrategyContext> = {}): StrategyContext {
  return {
    config: { id: 'constantReal' },
    ageP1: 65,
    yearIndex: 1,
    isRetired: true,
    remainingYears: 30,
    portfolioValue: 1000000,
    initialPortfolioAtRetirement: 1000000,
    desiredRealSpending: 40000,
    essentialRealSpending: 25000,
    guaranteedRealIncome: 0,
    prevRealSpending: 40000,
    prevRealReturn: 0.05,
    assumedRealReturn: 0.04,
    trailingPortfolio: [1000000],
    ...overrides,
  };
}

describe('constant real strategy', () => {
  it('spends the desired amount', () => {
    const s = createStrategy({ id: 'constantReal' });
    expect(s.decide(baseCtx()).targetRealSpending).toBeCloseTo(40000, 6);
  });

  it('trims spending after a loss when configured', () => {
    const cfg: StrategyConfig = { id: 'constantReal', skipRaiseAfterLoss: true };
    const s = createStrategy(cfg);
    const out = s.decide(baseCtx({ config: cfg, prevRealReturn: -0.1, prevRealSpending: 40000 }));
    expect(out.targetRealSpending).toBeCloseTo(38800, 0); // 40000 * 0.97
  });
});

describe('constant percentage strategy', () => {
  it('withdraws the configured percentage of the portfolio', () => {
    const s = createStrategy({ id: 'constantPercentage', initialRate: 0.05 });
    const out = s.decide(baseCtx({ config: { id: 'constantPercentage', initialRate: 0.05 } }));
    expect(out.targetRealSpending).toBeCloseTo(50000, 6); // 5% of 1,000,000
  });

  it('adds guaranteed income on top of the portfolio draw', () => {
    const cfg: StrategyConfig = { id: 'constantPercentage', initialRate: 0.04 };
    const s = createStrategy(cfg);
    const out = s.decide(baseCtx({ config: cfg, guaranteedRealIncome: 20000 }));
    expect(out.targetRealSpending).toBeCloseTo(60000, 6); // 40k draw + 20k income
  });
});

describe('VPW strategy', () => {
  it('withdraws more as the horizon shortens', () => {
    const cfg: StrategyConfig = { id: 'vpw' };
    const s = createStrategy(cfg);
    const young = s.decide(baseCtx({ config: cfg, remainingYears: 40, assumedRealReturn: 0.03 }));
    const old = s.decide(baseCtx({ config: cfg, remainingYears: 5, assumedRealReturn: 0.03 }));
    expect(old.targetRealSpending).toBeGreaterThan(young.targetRealSpending);
  });

  it('reduces to 1/n when the assumed real return is zero', () => {
    const cfg: StrategyConfig = { id: 'vpw' };
    const s = createStrategy(cfg);
    const out = s.decide(baseCtx({ config: cfg, assumedRealReturn: 0, remainingYears: 20, guaranteedRealIncome: 0 }));
    expect(out.targetRealSpending).toBeCloseTo(1000000 / 20, 4); // 50,000
  });
});

describe('RMD-style strategy', () => {
  it('withdraws portfolio / life-expectancy divisor', () => {
    const cfg: StrategyConfig = { id: 'rmdMethod' };
    const s = createStrategy(cfg);
    const out = s.decide(baseCtx({ config: cfg, ageP1: 80, portfolioValue: 1000000, guaranteedRealIncome: 0 }));
    // Divisor at 80 ~ 20.2 -> ~49,505.
    expect(out.targetRealSpending).toBeGreaterThan(45000);
    expect(out.targetRealSpending).toBeLessThan(55000);
  });
});

describe('floor-and-ceiling strategy', () => {
  it('clamps spending between floor and ceiling', () => {
    const cfg: StrategyConfig = { id: 'floorCeiling', initialRate: 0.1, spendingFloor: 30000, spendingCeiling: 60000 };
    const s = createStrategy(cfg);
    const out = s.decide(baseCtx({ config: cfg, portfolioValue: 1000000, guaranteedRealIncome: 0 }));
    // 10% of 1M = 100k, clamped to ceiling 60k.
    expect(out.targetRealSpending).toBeCloseTo(60000, 6);
  });
});

describe('Vanguard dynamic strategy', () => {
  it('limits the year-over-year decrease', () => {
    const cfg: StrategyConfig = { id: 'vanguardDynamic', initialRate: 0.05, maxDecrease: 0.025, maxIncrease: 0.05 };
    const s = createStrategy(cfg);
    // Portfolio dropped so target draw is low, but prior spending was 50k.
    const out = s.decide(baseCtx({ config: cfg, portfolioValue: 500000, prevRealSpending: 50000, guaranteedRealIncome: 0 }));
    // Floor on decrease: 50k * (1 - 0.025) = 48,750.
    expect(out.targetRealSpending).toBeCloseTo(48750, 0);
  });
});

describe('strategy registry', () => {
  it('constructs every registered strategy without error', () => {
    const strategies = allStrategies();
    expect(strategies.length).toBeGreaterThanOrEqual(11);
    for (const s of strategies) {
      expect(typeof s.decide).toBe('function');
      const out = s.decide(baseCtx({ config: { id: s.id } }));
      expect(out.targetRealSpending).toBeGreaterThanOrEqual(0);
    }
  });
});
