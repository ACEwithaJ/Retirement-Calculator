import { useEffect, useState } from 'react';
import type { Scenario } from '../types';
import { solveSustainableSpending } from '../simulation/solver';

export const SUCCESS_TARGET = 0.85;

/**
 * Solver settings for the headline figure. Stability is dominated by the trial
 * count: at 100 trials the solved value swings ~24% peak-to-peak across random
 * seeds (validated); at 400 it is ~6%. A coarse $250 convergence tolerance
 * keeps the binary search to a handful of iterations so the eager solve stays
 * affordable, and we round the result to the nearest $100 so the headline does
 * not imply false precision.
 *
 * NOTE: this solve is computationally heavy (~seconds) and runs on scenario
 * change; it is debounced to fire AFTER the live results preview so the
 * readiness summary paints first. A future improvement is to move it off the
 * main thread (Web Worker) or compute it lazily on demand.
 */
const SEARCH_TRIALS = 400;
const TOLERANCE = 250;
const DEBOUNCE_MS = 450;

/** Round a monthly figure to the nearest $100 to avoid implying MC precision. */
function roundHeadline(monthly: number): number {
  return Math.round(monthly / 100) * 100;
}

export function useTargetSpending(scenario: Scenario): { monthly: number | null; solving: boolean } {
  const [monthly, setMonthly] = useState<number | null>(null);
  const [solving, setSolving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setMonthly(null);
    setSolving(true);
    const timer = window.setTimeout(() => {
      const solved = solveSustainableSpending(scenario, SUCCESS_TARGET, 'desiredFunded', {
        searchTrials: SEARCH_TRIALS,
        tolerance: TOLERANCE,
      });
      if (!cancelled) {
        setMonthly(roundHeadline(solved.monthlySpending));
        setSolving(false);
      }
    }, DEBOUNCE_MS);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [scenario]);

  return { monthly, solving };
}
