import type { AssetClassAssumption, AssetClassId } from '../types';
import { geometricFromArithmetic } from '../utils/finance';

/**
 * Baseline capital-market assumptions.
 *
 * These are illustrative long-run nominal figures in the spirit of broad,
 * low-cost index investing. They are assumptions, not forecasts, and are fully
 * editable in the Assumptions page. Arithmetic returns are the mean single-year
 * return; the geometric (compound) return is lower because of volatility drag.
 */
export const DEFAULT_ASSET_CLASSES: AssetClassAssumption[] = [
  { id: 'usLargeCap', name: 'US Large-Cap Stocks', arithmeticReturn: 0.079, volatility: 0.16, yield: 0.017, expenseRatio: 0.0004, inflationSensitivity: 0.4 },
  { id: 'usSmallCap', name: 'US Small-Cap Stocks', arithmeticReturn: 0.088, volatility: 0.20, yield: 0.014, expenseRatio: 0.0006, inflationSensitivity: 0.4 },
  { id: 'usValue', name: 'US Value Stocks', arithmeticReturn: 0.083, volatility: 0.17, yield: 0.024, expenseRatio: 0.0006, inflationSensitivity: 0.4 },
  { id: 'intlDeveloped', name: 'Developed International Stocks', arithmeticReturn: 0.081, volatility: 0.18, yield: 0.028, expenseRatio: 0.0007, inflationSensitivity: 0.4 },
  { id: 'emergingMarkets', name: 'Emerging-Market Stocks', arithmeticReturn: 0.090, volatility: 0.24, yield: 0.026, expenseRatio: 0.0010, inflationSensitivity: 0.4 },
  { id: 'globalStocks', name: 'Global Stocks', arithmeticReturn: 0.080, volatility: 0.165, yield: 0.020, expenseRatio: 0.0008, inflationSensitivity: 0.4 },
  { id: 'govBonds', name: 'Government Bonds', arithmeticReturn: 0.041, volatility: 0.06, yield: 0.038, expenseRatio: 0.0005, inflationSensitivity: -0.2 },
  { id: 'corpBonds', name: 'Investment-Grade Corporate Bonds', arithmeticReturn: 0.047, volatility: 0.075, yield: 0.045, expenseRatio: 0.0006, inflationSensitivity: -0.15 },
  { id: 'intlBonds', name: 'International Bonds', arithmeticReturn: 0.038, volatility: 0.07, yield: 0.034, expenseRatio: 0.0009, inflationSensitivity: -0.1 },
  { id: 'tips', name: 'TIPS', arithmeticReturn: 0.035, volatility: 0.055, yield: 0.020, expenseRatio: 0.0005, inflationSensitivity: 0.9 },
  { id: 'shortTermBonds', name: 'Short-Term Bonds', arithmeticReturn: 0.035, volatility: 0.03, yield: 0.034, expenseRatio: 0.0005, inflationSensitivity: 0.1 },
  { id: 'cash', name: 'Cash', arithmeticReturn: 0.028, volatility: 0.01, yield: 0.028, expenseRatio: 0.0002, inflationSensitivity: 0.2 },
  { id: 'reits', name: 'Real Estate (REITs)', arithmeticReturn: 0.078, volatility: 0.19, yield: 0.038, expenseRatio: 0.0010, inflationSensitivity: 0.5 },
  { id: 'homeEquity', name: 'Home Equity', arithmeticReturn: 0.035, volatility: 0.10, yield: 0, expenseRatio: 0, inflationSensitivity: 0.8 },
  { id: 'gold', name: 'Gold', arithmeticReturn: 0.045, volatility: 0.17, yield: 0.0, expenseRatio: 0.0025, inflationSensitivity: 0.6 },
  { id: 'alternatives', name: 'Alternatives', arithmeticReturn: 0.060, volatility: 0.14, yield: 0.01, expenseRatio: 0.0090, inflationSensitivity: 0.2 },
];

/** Convenience: lookup map. */
export function assetClassMap(
  classes: AssetClassAssumption[],
): Record<string, AssetClassAssumption> {
  const m: Record<string, AssetClassAssumption> = {};
  for (const c of classes) m[c.id] = c;
  return m;
}

/** Effective geometric return for an asset class (derived if not provided). */
export function geometricReturn(a: AssetClassAssumption): number {
  return a.geometricReturn ?? geometricFromArithmetic(a.arithmeticReturn, a.volatility);
}

/**
 * Broadly classify a class as equity-like for glidepath/allocation summaries.
 */
export const EQUITY_CLASSES: AssetClassId[] = [
  'usLargeCap',
  'usSmallCap',
  'usValue',
  'intlDeveloped',
  'emergingMarkets',
  'globalStocks',
  'reits',
];
