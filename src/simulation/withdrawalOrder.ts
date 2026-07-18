import type { Account, WithdrawalOrder } from '../types';

/** Mutable per-account state during a single simulated path (real dollars). */
export interface AccountState {
  id: string;
  taxClass: Account['taxClass'];
  value: number;
  /** Fraction of value that is cost basis (taxable/cash only). */
  basisFraction: number;
  availabilityAge?: number;
}

export interface WithdrawalComposition {
  taxableBasis: number; // untaxed return of basis
  taxableGains: number; // taxed at capital-gains rate
  deferred: number; // taxed as ordinary income
  taxFree: number; // usually untaxed
  total: number;
}

export function emptyComposition(): WithdrawalComposition {
  return { taxableBasis: 0, taxableGains: 0, deferred: 0, taxFree: 0, total: 0 };
}

/** Accounts available to tap at the given age. */
export function availableAccounts(
  states: AccountState[],
  age: number,
): AccountState[] {
  return states.filter(
    (s) => s.availabilityAge === undefined || age >= s.availabilityAge,
  );
}

/** Ordered account ids to draw from, per the chosen mode. */
export function orderedForWithdrawal(
  states: AccountState[],
  order: WithdrawalOrder,
): AccountState[] {
  const rank = (s: AccountState): number => {
    switch (order.mode) {
      case 'taxDeferredFirst':
        return { 'tax-deferred': 0, cash: 1, taxable: 2, hsa: 3, 'tax-free': 4 }[s.taxClass];
      case 'preserveTaxFree':
      case 'taxableFirst':
        return { cash: 0, taxable: 1, 'tax-deferred': 2, hsa: 3, 'tax-free': 4 }[s.taxClass];
      case 'bracketFill':
        // Simplified: take some tax-deferred early (fill low brackets), then taxable.
        return { 'tax-deferred': 0, taxable: 1, cash: 2, hsa: 3, 'tax-free': 4 }[s.taxClass];
      default:
        return { cash: 0, taxable: 1, 'tax-deferred': 2, hsa: 3, 'tax-free': 4 }[s.taxClass];
    }
  };

  if (order.mode === 'custom' && order.customOrder) {
    const idx = new Map(order.customOrder.map((id, i) => [id, i]));
    return [...states].sort(
      (a, b) => (idx.get(a.id) ?? 99) - (idx.get(b.id) ?? 99),
    );
  }
  return [...states].sort((a, b) => rank(a) - rank(b));
}

/**
 * Withdraw `amount` (real) from the given account states, mutating them, and
 * return the tax composition. Supports sequential draining or pro-rata.
 */
export function withdraw(
  states: AccountState[],
  order: WithdrawalOrder,
  amount: number,
  age: number,
): WithdrawalComposition {
  const comp = emptyComposition();
  if (amount <= 0) return comp;
  const pool = availableAccounts(states, age);

  const take = (s: AccountState, want: number): number => {
    const got = Math.min(s.value, want);
    if (got <= 0) return 0;
    switch (s.taxClass) {
      case 'taxable':
      case 'cash': {
        comp.taxableBasis += got * s.basisFraction;
        comp.taxableGains += got * (1 - s.basisFraction);
        break;
      }
      case 'tax-deferred':
        comp.deferred += got;
        break;
      case 'tax-free':
      case 'hsa':
        comp.taxFree += got;
        break;
    }
    s.value -= got;
    comp.total += got;
    return got;
  };

  if (order.mode === 'proRata') {
    const total = pool.reduce((a, s) => a + s.value, 0);
    if (total <= 0) return comp;
    for (const s of pool) {
      take(s, amount * (s.value / total));
    }
    // Second pass to mop up rounding if some accounts were short.
    let remaining = amount - comp.total;
    if (remaining > 0.01) {
      for (const s of orderedForWithdrawal(pool, { mode: 'taxableFirst' })) {
        if (remaining <= 0) break;
        remaining -= take(s, remaining);
      }
    }
    return comp;
  }

  let remaining = amount;
  for (const s of orderedForWithdrawal(pool, order)) {
    if (remaining <= 0) break;
    remaining -= take(s, remaining);
  }
  return comp;
}
