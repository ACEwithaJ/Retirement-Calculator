import type { AssumptionPresetId, Assumptions } from '../types';
import { defaultAssumptions } from './defaults';

/**
 * Assumption presets. Each scales the baseline capital-market assumptions and
 * sets inflation / longevity-relevant volatility. Never silently optimistic:
 * "Moderate" is the default and the UI always shows which preset is active.
 */
export function applyAssumptionPreset(
  base: Assumptions,
  preset: AssumptionPresetId,
): Assumptions {
  if (preset === 'custom') return { ...base, presetId: 'custom' };

  const scale = (() => {
    switch (preset) {
      case 'conservative':
        return { retMul: 0.8, volMul: 1.1, inflation: 0.03, curVol: 0.1 };
      case 'optimistic':
        return { retMul: 1.15, volMul: 0.9, inflation: 0.02, curVol: 0.06 };
      case 'historical':
        return { retMul: 1.0, volMul: 1.0, inflation: 0.031, curVol: 0.09 };
      case 'moderate':
      default:
        return { retMul: 1.0, volMul: 1.0, inflation: 0.025, curVol: 0.08 };
    }
  })();

  const fresh = defaultAssumptions();
  return {
    ...base,
    presetId: preset,
    assetClasses: fresh.assetClasses.map((a) => ({
      ...a,
      arithmeticReturn: a.arithmeticReturn * scale.retMul,
      volatility: a.volatility * scale.volMul,
    })),
    inflation: { ...base.inflation, general: scale.inflation },
    currency: { ...base.currency, volatility: scale.curVol },
  };
}

export const PRESET_LABELS: Record<AssumptionPresetId, string> = {
  conservative: 'Conservative',
  moderate: 'Moderate',
  historical: 'Historical average',
  optimistic: 'Optimistic',
  custom: 'Custom',
};
