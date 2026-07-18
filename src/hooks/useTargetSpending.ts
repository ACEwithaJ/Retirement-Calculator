import { useEffect, useState } from 'react';
import type { Scenario } from '../types';
import { solveSustainableSpending } from '../simulation/solver';

export const SUCCESS_TARGET = 0.85;

export function useTargetSpending(scenario: Scenario): { monthly: number | null; solving: boolean } {
  const [monthly, setMonthly] = useState<number | null>(null);
  const [solving, setSolving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setMonthly(null);
    setSolving(true);
    const timer = window.setTimeout(() => {
      const solved = solveSustainableSpending(scenario, SUCCESS_TARGET, 'desiredFunded', { searchTrials: 100 });
      if (!cancelled) {
        setMonthly(solved.monthlySpending);
        setSolving(false);
      }
    }, 40);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [scenario]);

  return { monthly, solving };
}
