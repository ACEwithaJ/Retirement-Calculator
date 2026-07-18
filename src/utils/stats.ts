/** Basic statistics helpers used by the aggregation layer. */

export function mean(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

export function stdev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  const v = xs.reduce((a, b) => a + (b - m) * (b - m), 0) / (xs.length - 1);
  return Math.sqrt(v);
}

/**
 * Percentile using linear interpolation between closest ranks.
 * `p` is a fraction in [0, 1]. Input need not be sorted.
 */
export function percentile(xs: number[], p: number): number {
  if (xs.length === 0) return 0;
  const sorted = [...xs].sort((a, b) => a - b);
  if (p <= 0) return sorted[0];
  if (p >= 1) return sorted[sorted.length - 1];
  const idx = p * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  const w = idx - lo;
  return sorted[lo] * (1 - w) + sorted[hi] * w;
}

export function median(xs: number[]): number {
  return percentile(xs, 0.5);
}

/** Fraction of values satisfying a predicate. */
export function fractionWhere<T>(xs: T[], pred: (x: T) => boolean): number {
  if (xs.length === 0) return 0;
  return xs.filter(pred).length / xs.length;
}
