import { describe, expect, it } from 'vitest';
import {
  amortizationPayment,
  annualToMonthly,
  geometricFromArithmetic,
  monthlyToAnnual,
  pvAnnuity,
  pvGrowingAnnuity,
} from '../utils/finance';
import { percentile, median, mean, stdev } from '../utils/stats';
import { SeededRandom, cholesky } from '../utils/random';

describe('finance math', () => {
  it('annual/monthly rate conversions round-trip', () => {
    const annual = 0.08;
    expect(monthlyToAnnual(annualToMonthly(annual))).toBeCloseTo(annual, 10);
  });

  it('amortization payment matches a hand-computed mortgage', () => {
    // $100,000 over 10 periods at 5% -> ~12,950.46 per period.
    expect(amortizationPayment(100000, 0.05, 10)).toBeCloseTo(12950.46, 1);
  });

  it('amortization with zero rate is simple division', () => {
    expect(amortizationPayment(100000, 0, 10)).toBeCloseTo(10000, 6);
  });

  it('pvAnnuity with zero rate equals pmt * n', () => {
    expect(pvAnnuity(1000, 0, 20)).toBe(20000);
  });

  it('pvGrowingAnnuity matches level annuity when growth is zero', () => {
    expect(pvGrowingAnnuity(1000, 0.05, 0, 20)).toBeCloseTo(pvAnnuity(1000, 0.05, 20), 6);
  });

  it('geometric return is below arithmetic by variance drag', () => {
    expect(geometricFromArithmetic(0.08, 0.2)).toBeCloseTo(0.08 - 0.02, 10);
  });
});

describe('statistics', () => {
  it('percentile interpolates correctly', () => {
    const xs = [10, 20, 30, 40, 50];
    expect(percentile(xs, 0.5)).toBe(30);
    expect(percentile(xs, 0)).toBe(10);
    expect(percentile(xs, 1)).toBe(50);
    expect(percentile(xs, 0.25)).toBe(20);
  });

  it('median, mean, stdev basic values', () => {
    expect(median([1, 2, 3, 4])).toBeCloseTo(2.5, 10);
    expect(mean([2, 4, 6])).toBe(4);
    expect(stdev([2, 4, 6])).toBeCloseTo(2, 10);
  });
});

describe('seeded RNG', () => {
  it('is reproducible for the same seed', () => {
    const a = new SeededRandom(42);
    const b = new SeededRandom(42);
    for (let i = 0; i < 100; i++) expect(a.next()).toBe(b.next());
  });

  it('differs for different seeds', () => {
    const a = new SeededRandom(1);
    const b = new SeededRandom(2);
    expect(a.next()).not.toBe(b.next());
  });

  it('normal samples have roughly correct mean and stdev', () => {
    const r = new SeededRandom(7);
    const xs = Array.from({ length: 20000 }, () => r.normal(0, 1));
    expect(mean(xs)).toBeCloseTo(0, 1);
    expect(stdev(xs)).toBeCloseTo(1, 1);
  });

  it('cholesky reconstructs a simple correlation matrix', () => {
    const m = [
      [1, 0.5],
      [0.5, 1],
    ];
    const L = cholesky(m);
    // L * L^T should equal m.
    const r00 = L[0][0] * L[0][0];
    const r10 = L[1][0] * L[0][0];
    const r11 = L[1][0] * L[1][0] + L[1][1] * L[1][1];
    expect(r00).toBeCloseTo(1, 6);
    expect(r10).toBeCloseTo(0.5, 6);
    expect(r11).toBeCloseTo(1, 6);
  });
});
