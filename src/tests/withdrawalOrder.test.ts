import { describe, expect, it } from 'vitest';
import { withdraw, type AccountState } from '../simulation/withdrawalOrder';

function accounts(): AccountState[] {
  return [
    { id: 'taxable', taxClass: 'taxable', value: 100000, basisFraction: 0.6 },
    { id: 'deferred', taxClass: 'tax-deferred', value: 100000, basisFraction: 0 },
    { id: 'roth', taxClass: 'tax-free', value: 100000, basisFraction: 0 },
    { id: 'cash', taxClass: 'cash', value: 50000, basisFraction: 1 },
  ];
}

describe('withdrawal ordering', () => {
  it('taxableFirst drains cash then taxable before deferred', () => {
    const a = accounts();
    const comp = withdraw(a, { mode: 'taxableFirst' }, 120000, 65);
    expect(comp.total).toBeCloseTo(120000, 6);
    // Cash (50k) fully drained, then 70k from taxable.
    expect(a.find((x) => x.id === 'cash')!.value).toBeCloseTo(0, 6);
    expect(a.find((x) => x.id === 'taxable')!.value).toBeCloseTo(30000, 6);
    expect(a.find((x) => x.id === 'deferred')!.value).toBeCloseTo(100000, 6);
    // 70k from taxable at 60% basis -> 42k basis, 28k gains; cash is all basis.
    expect(comp.taxableBasis).toBeCloseTo(50000 + 42000, 6);
    expect(comp.taxableGains).toBeCloseTo(28000, 6);
  });

  it('taxDeferredFirst drains the IRA first', () => {
    const a = accounts();
    const comp = withdraw(a, { mode: 'taxDeferredFirst' }, 80000, 65);
    expect(a.find((x) => x.id === 'deferred')!.value).toBeCloseTo(20000, 6);
    expect(comp.deferred).toBeCloseTo(80000, 6);
  });

  it('preserveTaxFree leaves the Roth untouched when possible', () => {
    const a = accounts();
    withdraw(a, { mode: 'preserveTaxFree' }, 200000, 65);
    expect(a.find((x) => x.id === 'roth')!.value).toBeCloseTo(100000, 6);
  });

  it('proRata draws proportionally across available accounts', () => {
    const a = accounts();
    const comp = withdraw(a, { mode: 'proRata' }, 35000, 65);
    expect(comp.total).toBeCloseTo(35000, 6);
    // Total 350k, drawing 35k = 10% from each.
    expect(a.find((x) => x.id === 'taxable')!.value).toBeCloseTo(90000, 0);
    expect(a.find((x) => x.id === 'cash')!.value).toBeCloseTo(45000, 0);
  });

  it('respects availability age (restricted accounts excluded)', () => {
    const a: AccountState[] = [
      { id: 'bridge', taxClass: 'taxable', value: 50000, basisFraction: 0.8 },
      { id: 'locked', taxClass: 'tax-deferred', value: 500000, basisFraction: 0, availabilityAge: 59.5 },
    ];
    const comp = withdraw(a, { mode: 'taxableFirst' }, 80000, 52);
    // Only the 50k bridge is available; the locked account cannot be tapped.
    expect(comp.total).toBeCloseTo(50000, 6);
    expect(a.find((x) => x.id === 'locked')!.value).toBeCloseTo(500000, 6);
  });
});
