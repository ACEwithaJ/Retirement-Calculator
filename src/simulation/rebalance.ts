import type { AssetAllocation, RebalanceMode } from '../types';

/** Per-asset-class dollar holdings within one account (real dollars). */
export type Holdings = Record<string, number>;

export function holdingsValue(h: Holdings): number {
  let s = 0;
  for (const v of Object.values(h)) s += v;
  return s;
}

/** Build initial holdings from an account's target allocation and value. */
export function buildHoldings(value: number, target: AssetAllocation): Holdings {
  const h: Holdings = {};
  let wsum = 0;
  for (const w of Object.values(target.weights)) wsum += w ?? 0;
  if (wsum <= 0) {
    // No usable allocation: park everything in cash so it still behaves.
    h.cash = value;
    return h;
  }
  for (const [id, w] of Object.entries(target.weights)) {
    if (w) h[id] = (value * w) / wsum;
  }
  return h;
}

/**
 * Reconcile holdings to a known account value after cash flows (withdrawals,
 * contributions, fees, one-time flows) changed the value outside the holdings.
 *  - value <= 0: clear holdings.
 *  - holdings empty but value > 0 (e.g. account was drained then received an
 *    inflow): rebuild from the target allocation.
 *  - otherwise: scale proportionally, preserving current weights.
 */
export function syncHoldings(h: Holdings, value: number, target: AssetAllocation): void {
  if (value <= 0) {
    for (const id of Object.keys(h)) h[id] = 0;
    return;
  }
  if (holdingsValue(h) <= 0) {
    for (const id of Object.keys(h)) delete h[id];
    Object.assign(h, buildHoldings(value, target));
    return;
  }
  scaleToValue(h, value);
}

/** Apply per-asset-class real returns to holdings in place. */
export function applyReturns(h: Holdings, real: Record<string, number>): void {
  for (const id of Object.keys(h)) {
    h[id] *= 1 + (real[id] ?? 0);
  }
}

/** Scale holdings so their total equals `newValue` (proportional buy/sell). */
export function scaleToValue(h: Holdings, newValue: number): void {
  const cur = holdingsValue(h);
  if (cur <= 0) {
    return;
  }
  const factor = newValue / cur;
  for (const id of Object.keys(h)) h[id] *= factor;
}

/** Maximum absolute deviation of current weights from target weights. */
export function maxDrift(h: Holdings, target: AssetAllocation): number {
  const value = holdingsValue(h);
  if (value <= 0) return 0;
  const ids = new Set([...Object.keys(h), ...Object.keys(target.weights)]);
  let maxDev = 0;
  let wsum = 0;
  for (const w of Object.values(target.weights)) wsum += w ?? 0;
  for (const id of ids) {
    const cur = (h[id] ?? 0) / value;
    const tgt = wsum > 0 ? (target.weights[id] ?? 0) / wsum : 0;
    maxDev = Math.max(maxDev, Math.abs(cur - tgt));
  }
  return maxDev;
}

/**
 * Rebalance holdings toward the target allocation according to the mode.
 * Total value is preserved; only the split across classes changes.
 *  - annual / quarterly: rebalance to target every year (annual resolution).
 *  - threshold: rebalance only when drift exceeds the band.
 *  - none: never rebalance — holdings drift with returns.
 */
export function rebalance(
  h: Holdings,
  target: AssetAllocation,
  mode: RebalanceMode,
  threshold: number,
): void {
  if (mode === 'none') return;
  if (mode === 'threshold' && maxDrift(h, target) < threshold) return;

  const value = holdingsValue(h);
  if (value <= 0) return;
  let wsum = 0;
  for (const w of Object.values(target.weights)) wsum += w ?? 0;
  if (wsum <= 0) return;

  // Remove classes not in the target and redistribute to target weights.
  for (const id of Object.keys(h)) delete h[id];
  for (const [id, w] of Object.entries(target.weights)) {
    if (w) h[id] = (value * w) / wsum;
  }
}
