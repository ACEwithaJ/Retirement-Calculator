import { describe, expect, it } from 'vitest';
import { FlatTaxEngine, MarginalTaxEngine, taxFromBrackets } from '../taxes';
import type { TaxableIncome, TaxContext } from '../taxes';
import { DEFAULT_MARGINAL } from '../models/defaults';
import { COUNTRY_PROFILES } from '../countries/profiles';

const emptyIncome = (): TaxableIncome => ({
  ordinary: 0,
  taxDeferredDistribution: 0,
  capitalGains: 0,
  dividends: 0,
  pension: 0,
  socialSecurity: 0,
  rental: 0,
  annuity: 0,
  taxFreeWithdrawal: 0,
});

const ctx = (mode: 'flat' | 'marginal'): TaxContext => ({
  settings: {
    mode,
    flat: { effectiveRate: 0.25 },
    marginal: DEFAULT_MARGINAL,
    custom: { rules: [] },
    enableRMD: false,
    rmdStartAge: 73,
  },
  country: COUNTRY_PROFILES[0],
  yearIndex: 0,
  inflation: 0.025,
  age: 60,
});

describe('flat tax', () => {
  it('applies a single rate to total taxable income', () => {
    const engine = new FlatTaxEngine();
    const inc = { ...emptyIncome(), ordinary: 100000 };
    const res = engine.compute(inc, ctx('flat'));
    expect(res.totalTax).toBeCloseTo(25000, 6);
    expect(res.effectiveRate).toBeCloseTo(0.25, 6);
  });

  it('excludes tax-free withdrawals from the base', () => {
    const engine = new FlatTaxEngine();
    const inc = { ...emptyIncome(), taxFreeWithdrawal: 50000 };
    const res = engine.compute(inc, ctx('flat'));
    expect(res.totalTax).toBe(0);
  });

  it('zero rate yields zero tax', () => {
    const engine = new FlatTaxEngine();
    const c = ctx('flat');
    c.settings.flat.effectiveRate = 0;
    const res = engine.compute({ ...emptyIncome(), ordinary: 100000 }, c);
    expect(res.totalTax).toBe(0);
  });

  it('100% rate taxes everything', () => {
    const engine = new FlatTaxEngine();
    const c = ctx('flat');
    c.settings.flat.effectiveRate = 1;
    const res = engine.compute({ ...emptyIncome(), ordinary: 100000 }, c);
    expect(res.totalTax).toBe(100000);
  });
});

describe('bracket math', () => {
  it('computes progressive tax by hand', () => {
    const brackets = [
      { threshold: 0, rate: 0.1 },
      { threshold: 10000, rate: 0.2 },
      { threshold: 40000, rate: 0.3 },
    ];
    // 50,000: 10% of first 10k (1000) + 20% of next 30k (6000) + 30% of last 10k (3000) = 10,000.
    expect(taxFromBrackets(50000, brackets)).toBeCloseTo(10000, 6);
  });

  it('returns zero for non-positive income', () => {
    expect(taxFromBrackets(0, DEFAULT_MARGINAL.ordinaryBrackets)).toBe(0);
    expect(taxFromBrackets(-100, DEFAULT_MARGINAL.ordinaryBrackets)).toBe(0);
  });
});

describe('marginal tax engine', () => {
  it('applies the standard deduction before brackets', () => {
    const engine = new MarginalTaxEngine();
    // Income equal to the standard deduction -> ~no ordinary tax.
    const inc = { ...emptyIncome(), ordinary: DEFAULT_MARGINAL.standardDeduction };
    const res = engine.compute(inc, ctx('marginal'));
    expect(res.totalTax).toBeCloseTo(0, 2);
  });

  it('taxes long-term gains at preferential 0% in the lowest band', () => {
    const engine = new MarginalTaxEngine();
    const inc = { ...emptyIncome(), capitalGains: 30000 };
    const res = engine.compute(inc, ctx('marginal'));
    // Gains within the 0% CG bracket and below deduction -> no tax.
    expect(res.totalTax).toBeCloseTo(0, 2);
  });

  it('produces a higher effective rate as income rises', () => {
    const engine = new MarginalTaxEngine();
    const low = engine.compute({ ...emptyIncome(), ordinary: 60000 }, ctx('marginal'));
    const high = engine.compute({ ...emptyIncome(), ordinary: 300000 }, ctx('marginal'));
    expect(high.effectiveRate).toBeGreaterThan(low.effectiveRate);
  });
});
