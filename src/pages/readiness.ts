import type { ReadinessLevel } from '../types';

/** Calm, non-alarmist labels and colors for readiness levels. */
export const READINESS_META: Record<ReadinessLevel, { label: string; color: string }> = {
  stronglyFunded: { label: 'Strongly funded', color: 'var(--good)' },
  reasonablyFunded: { label: 'Reasonably funded', color: 'var(--good)' },
  borderline: { label: 'Borderline', color: 'var(--warn)' },
  vulnerable: { label: 'Vulnerable', color: 'var(--warn)' },
  notFunded: { label: 'Not currently funded', color: 'var(--bad)' },
};
