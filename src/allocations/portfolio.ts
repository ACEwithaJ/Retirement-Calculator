import type {
  AssetAllocation,
  AssetClassAssumption,
  Assumptions,
} from '../types';
import { assetClassMap } from './assetClasses';
import { EQUITY_CLASSES } from './assetClasses';

/** Weighted arithmetic expected nominal return of an allocation. */
export function portfolioArithmeticReturn(
  alloc: AssetAllocation,
  classes: AssetClassAssumption[],
): number {
  const map = assetClassMap(classes);
  let r = 0;
  for (const [id, w] of Object.entries(alloc.weights)) {
    const a = map[id];
    if (a && w) r += w * a.arithmeticReturn;
  }
  return r;
}

/** Weighted blended yield of an allocation. */
export function portfolioYield(
  alloc: AssetAllocation,
  classes: AssetClassAssumption[],
): number {
  const map = assetClassMap(classes);
  let y = 0;
  for (const [id, w] of Object.entries(alloc.weights)) {
    const a = map[id];
    if (a && w) y += w * a.yield;
  }
  return y;
}

/** Weighted blended fund expense ratio of an allocation. */
export function portfolioExpenseRatio(
  alloc: AssetAllocation,
  classes: AssetClassAssumption[],
): number {
  const map = assetClassMap(classes);
  let e = 0;
  for (const [id, w] of Object.entries(alloc.weights)) {
    const a = map[id];
    if (a && w) e += w * a.expenseRatio;
  }
  return e;
}

/**
 * Portfolio volatility using the correlation matrix and per-class volatilities.
 * σ_p = sqrt( Σ_i Σ_j w_i w_j σ_i σ_j ρ_ij ).
 */
export function portfolioVolatility(
  alloc: AssetAllocation,
  assumptions: Assumptions,
): number {
  const map = assetClassMap(assumptions.assetClasses);
  const ids = Object.keys(alloc.weights);
  let variance = 0;
  for (const i of ids) {
    const wi = alloc.weights[i] ?? 0;
    const ai = map[i];
    if (!ai || !wi) continue;
    for (const j of ids) {
      const wj = alloc.weights[j] ?? 0;
      const aj = map[j];
      if (!aj || !wj) continue;
      const rho = assumptions.correlations[i]?.[j] ?? (i === j ? 1 : 0);
      variance += wi * wj * ai.volatility * aj.volatility * rho;
    }
  }
  return Math.sqrt(Math.max(0, variance));
}

/** Fraction of the allocation in equity-like classes. */
export function equityFraction(alloc: AssetAllocation): number {
  let eq = 0;
  for (const [id, w] of Object.entries(alloc.weights)) {
    if (w && EQUITY_CLASSES.includes(id)) eq += w;
  }
  return eq;
}
