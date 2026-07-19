/// <reference lib="webworker" />
/**
 * Web Worker that runs the (CPU-heavy) Monte Carlo simulation and the
 * sustainable-spending solver off the main thread, so editing inputs never
 * freezes the UI. The engine modules are pure (no DOM / localStorage), so they
 * import cleanly here. Scenarios and results are plain JSON, so structured
 * clone handles the message boundary.
 */
import type { Scenario } from '../types';
import { runSimulation } from '../simulation/monteCarlo';
import { solveSustainableSpending, type SuccessCriterion } from '../simulation/solver';

export type WorkerRequest =
  | { id: number; type: 'preview'; scenario: Scenario; cap: number }
  | { id: number; type: 'solveTarget'; scenario: Scenario; probability: number; criterion: SuccessCriterion; searchTrials: number; tolerance: number };

export type WorkerResponse =
  | { id: number; type: 'preview'; result: ReturnType<typeof runSimulation> }
  | { id: number; type: 'solveTarget'; result: number };

const ctx = self as unknown as DedicatedWorkerGlobalScope;

ctx.addEventListener('message', (event: MessageEvent<WorkerRequest>) => {
  const msg = event.data;
  if (msg.type === 'preview') {
    const trials = Math.min(msg.scenario.simulation.trials, msg.cap);
    const result = runSimulation({
      ...msg.scenario,
      simulation: { ...msg.scenario.simulation, trials },
    });
    ctx.postMessage({ id: msg.id, type: 'preview', result } satisfies WorkerResponse);
  } else if (msg.type === 'solveTarget') {
    const solved = solveSustainableSpending(msg.scenario, msg.probability, msg.criterion, {
      searchTrials: msg.searchTrials,
      tolerance: msg.tolerance,
    });
    ctx.postMessage({ id: msg.id, type: 'solveTarget', result: solved.monthlySpending } satisfies WorkerResponse);
  }
});
