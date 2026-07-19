import type { Scenario, SimulationResults } from '../types';
import { runSimulation } from '../simulation/monteCarlo';
import { solveSustainableSpending, type SuccessCriterion } from '../simulation/solver';
import type { WorkerRequest, WorkerResponse } from './simulation.worker';

/**
 * Client wrapper around the simulation Web Worker.
 *
 * Each "channel" (preview, solver) keeps a single worker. A new request on a
 * channel TERMINATES any in-flight worker for that channel — the user has moved
 * on, so stale compute is cancelled immediately rather than backing up. The
 * superseded promise resolves to `null` so callers can ignore it.
 *
 * When `Worker` is unavailable (jsdom/tests/SSR) we fall back to running the
 * computation synchronously, preserving behavior and reproducibility.
 */

// Use a worker only where the runtime provides one (real browsers). Under
// jsdom/Vitest `Worker` is undefined, so we transparently fall back to
// synchronous compute, which keeps tests deterministic and fast.
const workerSupported = typeof Worker !== 'undefined';

interface Channel {
  worker: Worker | null;
  /** Resolve the currently pending promise as superseded. */
  supersede: (() => void) | null;
}

const channels: Record<'preview' | 'solver', Channel> = {
  preview: { worker: null, supersede: null },
  solver: { worker: null, supersede: null },
};

let nextId = 1;

function spawn(): Worker {
  return new Worker(new URL('./simulation.worker.ts', import.meta.url), { type: 'module' });
}

function reset(name: 'preview' | 'solver'): void {
  const ch = channels[name];
  if (ch.supersede) ch.supersede();
  ch.supersede = null;
  if (ch.worker) {
    ch.worker.terminate();
    ch.worker = null;
  }
}

/**
 * Run a capped live-preview simulation. Resolves to results, or `null` if a
 * newer preview request superseded this one.
 */
export function previewSimulation(
  scenario: Scenario,
  cap: number,
): Promise<SimulationResults | null> {
  if (!workerSupported) {
    const trials = Math.min(scenario.simulation.trials, cap);
    return Promise.resolve(runSimulation({ ...scenario, simulation: { ...scenario.simulation, trials } }));
  }
  reset('preview');
  const worker = spawn();
  channels.preview.worker = worker;
  const id = nextId++;
  return new Promise<SimulationResults | null>((resolve) => {
    channels.preview.supersede = () => resolve(null);
    worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      if (e.data.id === id && e.data.type === 'preview') {
        worker.terminate();
        if (channels.preview.worker === worker) channels.preview.worker = null;
        channels.preview.supersede = null;
        resolve(e.data.result);
      }
    };
    worker.postMessage({ id, type: 'preview', scenario, cap } satisfies WorkerRequest);
  });
}

/**
 * Solve the maximum monthly spending meeting a target probability. Resolves to
 * a dollar amount, or `null` if superseded by a newer request.
 */
export function solveTargetSpending(
  scenario: Scenario,
  probability: number,
  criterion: SuccessCriterion,
  searchTrials: number,
  tolerance: number,
): Promise<number | null> {
  if (!workerSupported) {
    return Promise.resolve(
      solveSustainableSpending(scenario, probability, criterion, { searchTrials, tolerance }).monthlySpending,
    );
  }
  reset('solver');
  const worker = spawn();
  channels.solver.worker = worker;
  const id = nextId++;
  return new Promise<number | null>((resolve) => {
    channels.solver.supersede = () => resolve(null);
    worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      if (e.data.id === id && e.data.type === 'solveTarget') {
        worker.terminate();
        if (channels.solver.worker === worker) channels.solver.worker = null;
        channels.solver.supersede = null;
        resolve(e.data.result);
      }
    };
    worker.postMessage({ id, type: 'solveTarget', scenario, probability, criterion, searchTrials, tolerance } satisfies WorkerRequest);
  });
}
