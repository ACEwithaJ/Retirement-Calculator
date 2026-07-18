import type { AssetClassId } from '../types';

/**
 * Default correlation assumptions between asset classes. Symmetric; diagonal 1.
 * Only a subset of pairs are specified; unspecified pairs default to a mild
 * positive correlation for equity-equity, near-zero for equity-bond, and
 * moderate for bond-bond via `defaultCorrelation`.
 */
const EXPLICIT: Array<[AssetClassId, AssetClassId, number]> = [
  ['usLargeCap', 'usSmallCap', 0.85],
  ['usLargeCap', 'usValue', 0.9],
  ['usLargeCap', 'intlDeveloped', 0.8],
  ['usLargeCap', 'emergingMarkets', 0.7],
  ['usLargeCap', 'globalStocks', 0.95],
  ['usLargeCap', 'govBonds', 0.0],
  ['usLargeCap', 'corpBonds', 0.25],
  ['usLargeCap', 'tips', 0.05],
  ['usLargeCap', 'cash', 0.0],
  ['usLargeCap', 'reits', 0.6],
  ['usLargeCap', 'gold', 0.1],
  ['globalStocks', 'govBonds', 0.0],
  ['globalStocks', 'corpBonds', 0.25],
  ['globalStocks', 'cash', 0.0],
  ['globalStocks', 'tips', 0.05],
  ['globalStocks', 'gold', 0.1],
  ['globalStocks', 'reits', 0.65],
  ['intlDeveloped', 'emergingMarkets', 0.8],
  ['govBonds', 'corpBonds', 0.7],
  ['govBonds', 'intlBonds', 0.6],
  ['govBonds', 'tips', 0.75],
  ['govBonds', 'shortTermBonds', 0.8],
  ['govBonds', 'cash', 0.3],
  ['corpBonds', 'tips', 0.5],
  ['gold', 'tips', 0.3],
];

function defaultCorrelation(a: AssetClassId, b: AssetClassId): number {
  if (a === b) return 1;
  const bondish = new Set(['govBonds', 'corpBonds', 'intlBonds', 'tips', 'shortTermBonds', 'cash']);
  const aBond = bondish.has(a);
  const bBond = bondish.has(b);
  if (aBond && bBond) return 0.5;
  if (aBond !== bBond) return 0.05; // equity vs bond
  return 0.7; // equity vs equity
}

/** Build a full correlation matrix record over the given asset-class ids. */
export function defaultCorrelations(
  ids: AssetClassId[],
): Record<string, Record<string, number>> {
  const explicitMap = new Map<string, number>();
  for (const [a, b, v] of EXPLICIT) {
    explicitMap.set(`${a}|${b}`, v);
    explicitMap.set(`${b}|${a}`, v);
  }
  const out: Record<string, Record<string, number>> = {};
  for (const a of ids) {
    out[a] = {};
    for (const b of ids) {
      out[a][b] = explicitMap.get(`${a}|${b}`) ?? defaultCorrelation(a, b);
    }
  }
  return out;
}
