import type { Scenario, StrategyId } from '../types';
import { runSimulation } from './monteCarlo';
import { STRATEGY_IDS } from '../strategies';
import { ALLOCATION_PRESETS } from '../allocations/presets';
import { FEE_COMPARISON_SCENARIOS } from '../fees/fees';
import { percentile } from '../utils/stats';

export interface StrategyComparisonRow {
  strategyId: StrategyId;
  label: string;
  initialMonthly: number;
  medianMonthly: number;
  lowestMonthly: number;
  essentialSuccess: number;
  desiredSuccess: number;
  portfolioSurvival: number;
  medianEndingWealth: number;
  p10EndingWealth: number;
  maxSpendingCut: number;
  lifetimeTaxes: number;
  lifetimeFees: number;
  spendingVolatility: number;
  legacyProbability: number;
}

export function compareStrategies(
  scenario: Scenario,
  labels: Record<string, string>,
  trials = 1500,
): StrategyComparisonRow[] {
  return STRATEGY_IDS.map((id) => {
    const s: Scenario = {
      ...scenario,
      strategy: { ...scenario.strategy, id },
      simulation: { ...scenario.simulation, trials },
    };
    const res = runSimulation(s);
    const spendingP50 = res.spendingBands.map((b) => b.p50).filter((x) => x > 0);
    const spendingLow = res.spendingBands.map((b) => b.p10).filter((x) => x > 0);
    return {
      strategyId: id,
      label: labels[id] ?? id,
      initialMonthly: (spendingP50[0] ?? 0) / 12,
      medianMonthly: (percentile(spendingP50, 0.5)) / 12,
      lowestMonthly: (Math.min(...(spendingLow.length ? spendingLow : [0]))) / 12,
      essentialSuccess: res.metrics.essentialFunded,
      desiredSuccess: res.metrics.desiredFunded,
      portfolioSurvival: res.metrics.portfolioSurvival,
      medianEndingWealth: res.metrics.medianEndingWealth,
      p10EndingWealth: res.metrics.p10EndingWealth,
      maxSpendingCut: res.metrics.maxRealSpendingCut,
      lifetimeTaxes: res.metrics.lifetimeTaxesMedian,
      lifetimeFees: res.metrics.lifetimeFeesMedian,
      spendingVolatility: (res.spendingBands.reduce((a, b) => a + (b.p90 - b.p10), 0) / Math.max(1, res.spendingBands.length)),
      legacyProbability: res.metrics.legacyProbability,
    };
  });
}

export interface AllocationComparisonRow {
  allocationId: string;
  label: string;
  desiredSuccess: number;
  medianEndingWealth: number;
  p10EndingWealth: number;
  maxSpendingCut: number;
  portfolioSurvival: number;
  lifetimeTaxes: number;
}

export function compareAllocations(
  scenario: Scenario,
  trials = 1500,
): AllocationComparisonRow[] {
  const candidates = ['stocks100', 'stocks80', 'stocks60', 'stocks40', 'stocks30', 'permanent', 'allWeather'];
  return candidates.map((id) => {
    const preset = ALLOCATION_PRESETS.find((a) => a.id === id);
    const s: Scenario = {
      ...scenario,
      allocationPolicy: { ...scenario.allocationPolicy, allocationId: id, glidepath: 'fixed' },
      simulation: { ...scenario.simulation, trials },
    };
    const res = runSimulation(s);
    return {
      allocationId: id,
      label: preset?.name ?? id,
      desiredSuccess: res.metrics.desiredFunded,
      medianEndingWealth: res.metrics.medianEndingWealth,
      p10EndingWealth: res.metrics.p10EndingWealth,
      maxSpendingCut: res.metrics.maxRealSpendingCut,
      portfolioSurvival: res.metrics.portfolioSurvival,
      lifetimeTaxes: res.metrics.lifetimeTaxesMedian,
    };
  });
}

export interface FeeComparisonRow {
  id: string;
  label: string;
  lifetimeFees: number;
  medianEndingWealth: number;
  desiredSuccess: number;
  endingWealthReduction: number; // vs self-directed baseline
}

export function compareFees(scenario: Scenario, trials = 1500): FeeComparisonRow[] {
  const rows: FeeComparisonRow[] = [];
  let baseline = 0;
  for (const fs of FEE_COMPARISON_SCENARIOS) {
    const s: Scenario = {
      ...scenario,
      fees: fs.build(scenario.fees),
      simulation: { ...scenario.simulation, trials },
    };
    const res = runSimulation(s);
    if (fs.id === 'selfDirected') baseline = res.metrics.medianEndingWealth;
    rows.push({
      id: fs.id,
      label: fs.label,
      lifetimeFees: res.metrics.lifetimeFeesMedian,
      medianEndingWealth: res.metrics.medianEndingWealth,
      desiredSuccess: res.metrics.desiredFunded,
      endingWealthReduction: 0,
    });
  }
  for (const r of rows) r.endingWealthReduction = baseline - r.medianEndingWealth;
  return rows;
}
