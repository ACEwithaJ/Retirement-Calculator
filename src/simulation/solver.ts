import type { Scenario } from '../types';
import { runSimulation } from './monteCarlo';

/** Which success metric a solver targets. */
export type SuccessCriterion =
  | 'desiredFunded'
  | 'essentialFunded'
  | 'portfolioSurvival';

function successOf(scenario: Scenario, criterion: SuccessCriterion): number {
  const res = runSimulation(scenario);
  return res.metrics[criterion];
}

/**
 * Binary-search the maximum desired monthly spending that still meets a target
 * probability for the chosen success criterion. Robust and reproducible.
 *
 * We use a reduced trial count during search for speed, then the caller can
 * re-run at full fidelity. Convergence stops at a tolerance in dollars or a
 * maximum iteration count.
 */
export function solveSustainableSpending(
  scenario: Scenario,
  targetProbability: number,
  criterion: SuccessCriterion = 'desiredFunded',
  opts: { searchTrials?: number; tolerance?: number; maxIter?: number } = {},
): { monthlySpending: number; achievedProbability: number; iterations: number } {
  const searchTrials = opts.searchTrials ?? Math.min(2000, scenario.simulation.trials);
  const tolerance = opts.tolerance ?? 25; // dollars/month
  const maxIter = opts.maxIter ?? 24;

  let lo = 0;
  let hi = Math.max(1000, scenario.spending.desiredMonthly * 4);

  const evalAt = (monthly: number): number => {
    const s: Scenario = {
      ...scenario,
      spending: { ...scenario.spending, desiredMonthly: monthly },
      simulation: { ...scenario.simulation, trials: searchTrials },
    };
    return successOf(s, criterion);
  };

  // Ensure hi is actually infeasible; expand if not.
  let hiProb = evalAt(hi);
  let guard = 0;
  while (hiProb >= targetProbability && guard < 8) {
    hi *= 1.5;
    hiProb = evalAt(hi);
    guard++;
  }

  let achieved = 0;
  let iterations = 0;
  for (; iterations < maxIter; iterations++) {
    const mid = (lo + hi) / 2;
    const prob = evalAt(mid);
    if (prob >= targetProbability) {
      lo = mid;
      achieved = prob;
    } else {
      hi = mid;
    }
    if (hi - lo < tolerance) break;
  }

  return {
    monthlySpending: Math.floor(lo),
    achievedProbability: achieved,
    iterations,
  };
}

/** Standard confidence targets used by the results dashboard. */
export const CONFIDENCE_TARGETS = [0.5, 0.75, 0.8, 0.85, 0.9, 0.95, 0.99];

/** Solve sustainable spending across all standard confidence targets. */
export function solveSpendingCurve(
  scenario: Scenario,
  criterion: SuccessCriterion = 'desiredFunded',
  searchTrials = 1000,
): Array<{ probability: number; monthlySpending: number }> {
  return CONFIDENCE_TARGETS.map((p) => ({
    probability: p,
    monthlySpending: solveSustainableSpending(scenario, p, criterion, {
      searchTrials,
    }).monthlySpending,
  }));
}

/**
 * Solve for the retirement age (person1) that first achieves a target
 * probability of funding desired spending, holding everything else fixed.
 */
export function solveRetirementAge(
  scenario: Scenario,
  targetProbability: number,
  searchTrials = 1000,
): number | undefined {
  const current = scenario.household.people[0]?.currentAge ?? 47;
  const maxAge = scenario.household.people[0]?.longevityAge ?? 95;
  for (let age = current + 1; age <= maxAge; age++) {
    const people = scenario.household.people.map((p, i) =>
      i === 0 ? { ...p, retirementAge: age } : p,
    );
    const s: Scenario = {
      ...scenario,
      household: { ...scenario.household, people },
      simulation: { ...scenario.simulation, trials: searchTrials },
    };
    if (successOf(s, 'desiredFunded') >= targetProbability) return age;
  }
  return undefined;
}
