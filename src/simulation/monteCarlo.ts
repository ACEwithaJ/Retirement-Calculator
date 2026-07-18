import type {
  Scenario,
  SimulationResults,
  SinglePathResult,
} from '../types';
import { SeededRandom } from '../utils/random';
import { createReturnGenerator } from './returns';
import { simulatePath } from './engine';
import {
  buildBands,
  classifyReadiness,
  computeMetrics,
  primaryRisk,
} from './metrics';
import { computeFundedRatio } from './fundedRatio';

/**
 * Run the Monte Carlo simulation for a scenario. Reproducible: the same seed
 * yields identical results. Each path gets its own deterministic sub-seed so
 * paths are independent yet reproducible.
 */
export function runSimulation(scenario: Scenario): SimulationResults {
  const trials = Math.max(1, Math.floor(scenario.simulation.trials));
  const generator = createReturnGenerator(scenario.assumptions);
  const masterSeed = scenario.simulation.seed >>> 0;

  const paths: SinglePathResult[] = [];
  for (let t = 0; t < trials; t++) {
    // Deterministic per-path seed derived from the master seed.
    const pathSeed = (masterSeed ^ (t * 0x9e3779b1)) >>> 0;
    const rng = new SeededRandom(pathSeed);
    generator.beginPath(rng, horizonYears(scenario));
    paths.push(simulatePath(scenario, generator, rng));
  }

  const legacyTarget = 0; // default legacy goal; UI can pass a solver variant
  const metrics = computeMetrics(paths, legacyTarget);

  // Representative paths, chosen by ending wealth ranking.
  const byEnding = [...paths].sort((a, b) => a.endingBalance - b.endingBalance);
  const pick = (frac: number): SinglePathResult =>
    byEnding[Math.min(byEnding.length - 1, Math.floor(frac * byEnding.length))];

  const readiness = classifyReadiness(metrics);

  return {
    scenarioId: scenario.id,
    trials,
    seed: masterSeed,
    balanceBands: buildBands(paths, (r) => r.endBalance),
    spendingBands: buildBands(paths, (r) => r.netSpending),
    withdrawalRateBands: buildBands(paths, (r) => r.withdrawalRate),
    fundedRatio: computeFundedRatio(scenario),
    metrics,
    representative: {
      failure: byEnding[0],
      borderline: pick(0.25),
      median: pick(0.5),
      success: pick(0.9),
    },
    readiness,
    primaryRisk: primaryRisk(metrics, scenario),
  };
}

function horizonYears(scenario: Scenario): number {
  const startAge = scenario.household.people[0]?.currentAge ?? 47;
  const endAge =
    scenario.household.planningEndAge ??
    Math.max(...scenario.household.people.map((p) => p.longevityAge));
  return Math.max(1, endAge - startAge + 1);
}
