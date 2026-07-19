import type { ReadinessLevel, ReturnMethod } from '../types';

/** Calm, non-alarmist labels and colors for readiness levels. */
export const READINESS_META: Record<ReadinessLevel, { label: string; color: string }> = {
  stronglyFunded: { label: 'Strongly funded', color: 'var(--good)' },
  reasonablyFunded: { label: 'Reasonably funded', color: 'var(--good)' },
  borderline: { label: 'Borderline', color: 'var(--warn)' },
  vulnerable: { label: 'Vulnerable', color: 'var(--warn)' },
  notFunded: { label: 'Not currently funded', color: 'var(--bad)' },
};

/**
 * A short, plain-language note on the active return model. Surfaces the fact
 * (validated) that the default parametric method is forward-looking and tends
 * to be more conservative than historical-backtest calculators like FIRECalc.
 */
export function returnMethodNote(method: ReturnMethod): string {
  switch (method) {
    case 'historical':
      return 'Return model: historical sequences — comparable to FIRECalc/Trinity-style backtests.';
    case 'bootstrap':
      return 'Return model: historical bootstrap — resampled history, close to backtest results.';
    case 'stress':
      return 'Return model: deterministic stress scenario — a single adverse path, not a probability.';
    case 'parametric':
    default:
      return 'Return model: parametric Monte Carlo (forward-looking). Its default assumptions are more conservative than realized US history, so success reads lower than historical-backtest calculators. Try the Historical method in Assumptions to compare.';
  }
}
