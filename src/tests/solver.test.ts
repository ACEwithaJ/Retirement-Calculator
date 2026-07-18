import { describe, expect, it } from 'vitest';
import { solveSustainableSpending } from '../simulation/solver';
import { runSimulation } from '../simulation/monteCarlo';
import { defaultScenario } from '../models/defaults';

describe('sustainable-spending solver', () => {
  it('finds a spending level meeting the target probability', () => {
    const s = defaultScenario();
    s.simulation = { trials: 400, seed: 777, timestep: 'annual' };
    const result = solveSustainableSpending(s, 0.9, 'desiredFunded', { searchTrials: 400, tolerance: 100 });
    expect(result.monthlySpending).toBeGreaterThan(0);

    // Verify: at the solved spending, achieved probability is at least the target
    // (allowing a small Monte Carlo tolerance).
    const verify = runSimulation({
      ...s,
      spending: { ...s.spending, desiredMonthly: result.monthlySpending },
    });
    expect(verify.metrics.desiredFunded).toBeGreaterThanOrEqual(0.85);
  });

  it('lower confidence targets permit higher spending', () => {
    const s = defaultScenario();
    s.simulation = { trials: 400, seed: 555, timestep: 'annual' };
    const at50 = solveSustainableSpending(s, 0.5, 'desiredFunded', { searchTrials: 400, tolerance: 100 });
    const at95 = solveSustainableSpending(s, 0.95, 'desiredFunded', { searchTrials: 400, tolerance: 100 });
    expect(at50.monthlySpending).toBeGreaterThanOrEqual(at95.monthlySpending);
  });
});
