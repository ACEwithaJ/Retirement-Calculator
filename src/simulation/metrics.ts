import type {
  PercentileBand,
  ReadinessLevel,
  Scenario,
  SinglePathResult,
  SuccessMetrics,
} from '../types';
import { median, percentile } from '../utils/stats';

const DEPLETION_AGES = [80, 90, 95, 100, 105];

/** Build percentile bands for a per-year series across all paths. */
export function buildBands(
  paths: SinglePathResult[],
  pick: (r: SinglePathResult['records'][number]) => number,
): PercentileBand[] {
  if (paths.length === 0) return [];
  const maxLen = Math.max(...paths.map((p) => p.records.length));
  const bands: PercentileBand[] = [];
  for (let i = 0; i < maxLen; i++) {
    const vals: number[] = [];
    let age = 0;
    for (const p of paths) {
      const rec = p.records[i];
      if (rec) {
        vals.push(pick(rec));
        age = rec.age;
      }
    }
    bands.push({
      age,
      p10: percentile(vals, 0.1),
      p25: percentile(vals, 0.25),
      p50: percentile(vals, 0.5),
      p75: percentile(vals, 0.75),
      p90: percentile(vals, 0.9),
    });
  }
  return bands;
}

/** Legacy target: does ending wealth meet a specified real bequest goal? */
export function computeMetrics(
  paths: SinglePathResult[],
  legacyTarget: number,
): SuccessMetrics {
  const n = paths.length || 1;
  const endings = paths.map((p) => p.endingBalance);
  const lifetimeSpends = paths.map((p) => p.lifetimeSpending);

  const depletionBefore: Record<number, number> = {};
  for (const a of DEPLETION_AGES) {
    depletionBefore[a] =
      paths.filter((p) => p.depleted && (p.depletionAge ?? Infinity) < a).length / n;
  }

  const firstReductions = paths
    .map((p) => p.firstReductionAge)
    .filter((x): x is number => x !== undefined);
  const depletionAges = paths
    .map((p) => p.depletionAge)
    .filter((x): x is number => x !== undefined);

  return {
    portfolioSurvival: paths.filter((p) => !p.depleted).length / n,
    essentialFunded: paths.filter((p) => p.essentialAlwaysFunded).length / n,
    desiredFunded: paths.filter((p) => p.desiredAlwaysFunded).length / n,
    spendingAbove90: paths.filter((p) => p.maxRealSpendingCut <= 0.1).length / n,
    spendingAbove80: paths.filter((p) => p.maxRealSpendingCut <= 0.2).length / n,
    legacyProbability: paths.filter((p) => p.endingBalance >= legacyTarget).length / n,
    medianLifetimeSpending: median(lifetimeSpends),
    medianEndingWealth: median(endings),
    p10EndingWealth: percentile(endings, 0.1),
    p90EndingWealth: percentile(endings, 0.9),
    maxRealSpendingCut: median(paths.map((p) => p.maxRealSpendingCut)),
    avgRealSpendingCut:
      paths.reduce((a, p) => a + p.maxRealSpendingCut, 0) / n,
    avgYearsBelowDesired: paths.reduce((a, p) => a + p.yearsBelowDesired, 0) / n,
    medianFirstReductionAge: firstReductions.length ? median(firstReductions) : undefined,
    medianDepletionAge: depletionAges.length ? median(depletionAges) : undefined,
    depletionBefore,
    lifetimeTaxesMedian: median(paths.map((p) => p.lifetimeTaxes)),
    lifetimeFeesMedian: median(paths.map((p) => p.lifetimeFees)),
  };
}

/**
 * Map success metrics to a qualitative readiness level. We weight essential and
 * desired funding, not merely "a dollar left at the end". Deliberately calm
 * language, no alarmist thresholds.
 */
export function classifyReadiness(m: SuccessMetrics): ReadinessLevel {
  const desired = m.desiredFunded;
  const essential = m.essentialFunded;
  if (desired >= 0.9 && essential >= 0.99) return 'stronglyFunded';
  if (desired >= 0.8 && essential >= 0.95) return 'reasonablyFunded';
  if (desired >= 0.65 && essential >= 0.9) return 'borderline';
  if (essential >= 0.8) return 'vulnerable';
  return 'notFunded';
}

/**
 * Identify the most salient risk driver for the plan by inspecting the
 * aggregate metrics and scenario configuration. Heuristic and explanatory —
 * it names a likely driver, it does not assert causation.
 */
export function primaryRisk(
  m: SuccessMetrics,
  scenario: Scenario,
): string {
  if (m.essentialFunded < 0.9) return 'Essential spending is at risk — the plan may not reliably cover the necessities.';
  if (scenario.strategy.id === 'constantReal' && m.desiredFunded < 0.85)
    return 'Sequence-of-returns risk under fixed real spending — early poor returns hit hardest. Spending flexibility would help most.';
  const retAge = scenario.household.people[0]?.retirementAge ?? 65;
  const endAge = scenario.household.planningEndAge ?? 100;
  if (endAge - retAge > 40) return 'A very long horizon amplifies inflation and sequence risk; small assumption changes matter a lot.';
  if (scenario.fees.model === 'aum' && scenario.fees.aumRate >= 0.01)
    return 'Advisory fees are a meaningful compounding drag; review whether the value received justifies the cost.';
  if (m.maxRealSpendingCut > 0.2) return 'Spending variability is high — expect years with material spending cuts.';
  return 'No single dominant risk — outcomes are driven by the ordinary range of market and inflation uncertainty.';
}
