/**
 * The Web Worker client (src/workers/simulationClient.ts) offloads simulation
 * to a worker in the browser and falls back to synchronous compute under jsdom.
 * These tests exercise the fallback path and assert it is a faithful wrapper:
 * identical seed → identical results, and the cap is honored.
 */
import { describe, expect, it } from 'vitest';
import { previewSimulation, solveTargetSpending } from '../workers/simulationClient';
import { runSimulation } from '../simulation/monteCarlo';
import { defaultScenario } from '../models/defaults';

describe('simulation worker client (synchronous fallback)', () => {
  it('previewSimulation matches a direct capped runSimulation', async () => {
    const s = defaultScenario();
    s.simulation = { trials: 5000, seed: 321, timestep: 'annual' };
    const cap = 400;
    const viaClient = await previewSimulation(s, cap);
    const direct = runSimulation({ ...s, simulation: { ...s.simulation, trials: cap } });
    expect(viaClient).not.toBeNull();
    expect(viaClient!.metrics.desiredFunded).toBe(direct.metrics.desiredFunded);
    expect(viaClient!.metrics.medianEndingWealth).toBe(direct.metrics.medianEndingWealth);
    expect(viaClient!.trials).toBe(cap); // cap honored
  });

  it('solveTargetSpending returns a positive rounded monthly figure', async () => {
    const s = defaultScenario();
    s.simulation = { trials: 1500, seed: 654, timestep: 'annual' };
    const monthly = await solveTargetSpending(s, 0.85, 'desiredFunded', 400, 250);
    expect(monthly).not.toBeNull();
    expect(monthly!).toBeGreaterThan(0);
  });
});
