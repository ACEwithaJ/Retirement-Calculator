import { describe, expect, it } from 'vitest';
import { aumFee, totalAnnualFee, advisorAnnualFee } from '../fees/fees';
import type { FeeSettings } from '../types';

const base: FeeSettings = {
  model: 'aum',
  aumRate: 0.01,
  aumTiers: [],
  flatAnnual: 0,
  fundExpenseRatio: 0.001,
  platformFee: 0,
  advisorValueAdded: 0,
};

describe('AUM fees', () => {
  it('applies a flat rate when no tiers', () => {
    expect(aumFee(1000000, base)).toBeCloseTo(10000, 6);
  });

  it('applies a tiered schedule to slices', () => {
    const tiered: FeeSettings = {
      ...base,
      aumTiers: [
        { threshold: 0, rate: 0.01 },
        { threshold: 1000000, rate: 0.005 },
      ],
    };
    // First 1M at 1% (10,000) + next 1M at 0.5% (5,000) = 15,000.
    expect(aumFee(2000000, tiered)).toBeCloseTo(15000, 6);
  });

  it('total fee includes fund expense ratio', () => {
    expect(totalAnnualFee(1000000, base)).toBeCloseTo(10000 + 1000, 6);
  });

  it('flat retainer is independent of portfolio size', () => {
    const flat: FeeSettings = { ...base, model: 'flatRetainer', flatAnnual: 5000 };
    expect(advisorAnnualFee(2000000, flat)).toBe(5000);
    expect(advisorAnnualFee(500000, flat)).toBe(5000);
  });

  it('none model has zero advisor fee', () => {
    const none: FeeSettings = { ...base, model: 'none' };
    expect(advisorAnnualFee(1000000, none)).toBe(0);
    // But fund expenses still apply to the total.
    expect(totalAnnualFee(1000000, none)).toBeCloseTo(1000, 6);
  });
});
