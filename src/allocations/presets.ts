import type { AssetAllocation } from '../types';

/**
 * Named allocation presets. Weights must sum to 1 (validated in validation.ts).
 * "globalStocks" is used as the single equity building block for the simple
 * stock/bond presets so the demonstration defaults stay easy to reason about.
 */
export const ALLOCATION_PRESETS: AssetAllocation[] = [
  { id: 'stocks100', name: '100% Global Stocks', weights: { globalStocks: 1.0 } },
  { id: 'stocks90', name: '90/10 Stocks/Bonds', weights: { globalStocks: 0.9, govBonds: 0.1 } },
  { id: 'stocks80', name: '80/20 Stocks/Bonds', weights: { globalStocks: 0.8, govBonds: 0.2 } },
  { id: 'stocks70', name: '70/30 Stocks/Bonds', weights: { globalStocks: 0.7, govBonds: 0.3 } },
  { id: 'stocks60', name: '60/40 Stocks/Bonds', weights: { globalStocks: 0.6, govBonds: 0.4 } },
  { id: 'stocks50', name: '50/50 Stocks/Bonds', weights: { globalStocks: 0.5, govBonds: 0.5 } },
  { id: 'stocks40', name: '40/60 Stocks/Bonds', weights: { globalStocks: 0.4, govBonds: 0.6 } },
  { id: 'stocks30', name: '30/70 Stocks/Bonds', weights: { globalStocks: 0.3, govBonds: 0.7 } },
  {
    id: 'threeFund',
    name: 'Three-Fund Portfolio',
    weights: { usLargeCap: 0.42, intlDeveloped: 0.18, govBonds: 0.4 },
  },
  {
    id: 'globalMarket',
    name: 'Global Market Portfolio',
    weights: { usLargeCap: 0.32, intlDeveloped: 0.18, emergingMarkets: 0.05, govBonds: 0.3, corpBonds: 0.1, reits: 0.05 },
  },
  {
    id: 'usOnly',
    name: 'US-Only Stock/Bond',
    weights: { usLargeCap: 0.42, usSmallCap: 0.18, govBonds: 0.4 },
  },
  {
    id: 'permanent',
    name: 'Permanent Portfolio',
    weights: { usLargeCap: 0.25, govBonds: 0.25, cash: 0.25, gold: 0.25 },
  },
  {
    id: 'allWeather',
    name: 'All-Weather Style',
    weights: { usLargeCap: 0.30, govBonds: 0.40, corpBonds: 0.15, gold: 0.075, alternatives: 0.075 },
  },
  {
    id: 'equityTips',
    name: 'Equity + TIPS',
    weights: { globalStocks: 0.6, tips: 0.4 },
  },
  {
    id: 'equityCash',
    name: 'Equity + Cash Reserve',
    weights: { globalStocks: 0.75, cash: 0.25 },
  },
  {
    id: 'demoDefault',
    name: '70/25/5 (Demo Default)',
    weights: { globalStocks: 0.7, govBonds: 0.25, cash: 0.05 },
  },
];

export function findAllocation(
  allocations: AssetAllocation[],
  id: string,
): AssetAllocation | undefined {
  return allocations.find((a) => a.id === id);
}
