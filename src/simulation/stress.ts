/**
 * Deterministic stress scenarios. Each provides a sequence of (equity, bond,
 * cash, inflation) nominal returns for the early years of retirement; after the
 * scripted years the engine falls back to steady assumed returns. These are
 * labeled SCENARIOS, not forecasts.
 */

export interface StressYear {
  stocks: number;
  bonds: number;
  cash: number;
  inflation: number;
}

export interface StressScenario {
  id: string;
  label: string;
  description: string;
  years: StressYear[];
}

const s = (stocks: number, bonds: number, cash: number, inflation: number): StressYear => ({
  stocks,
  bonds,
  cash,
  inflation,
});

export const STRESS_SCENARIOS: StressScenario[] = [
  {
    id: 'greatDepression',
    label: 'Great Depression (1929-1933)',
    description: 'Severe multi-year equity collapse with deflation.',
    years: [s(-0.083, 0.042, 0.048, 0.006), s(-0.251, 0.045, 0.024, -0.064), s(-0.438, -0.026, 0.011, -0.093), s(-0.086, 0.088, 0.009, -0.103), s(0.499, 0.019, 0.003, 0.008)],
  },
  {
    id: 'stagflation70s',
    label: '1970s Stagflation',
    description: 'High inflation eroding real returns for a decade.',
    years: [s(-0.146, 0.037, 0.068, 0.087), s(-0.263, 0.02, 0.08, 0.123), s(0.372, 0.081, 0.058, 0.069), s(0.238, 0.157, 0.05, 0.049), s(-0.072, 0.03, 0.051, 0.067), s(0.066, 0.007, 0.072, 0.09), s(0.184, 0.012, 0.104, 0.133)],
  },
  {
    id: 'dotcom',
    label: 'Dot-com Bust (2000-2002)',
    description: 'Three consecutive down years for equities.',
    years: [s(-0.091, 0.168, 0.059, 0.034), s(-0.119, 0.055, 0.039, 0.016), s(-0.221, 0.152, 0.017, 0.024)],
  },
  {
    id: 'gfc',
    label: 'Global Financial Crisis (2008)',
    description: 'A sharp -37% equity year followed by recovery.',
    years: [s(-0.37, 0.201, 0.016, 0.001), s(0.264, -0.114, 0.001, 0.027), s(0.151, 0.085, 0.001, 0.015)],
  },
  {
    id: 'lostDecade',
    label: 'Lost Decade (flat equities)',
    description: 'Ten years of roughly zero real equity return.',
    years: Array.from({ length: 10 }, () => s(0.02, 0.03, 0.02, 0.025)),
  },
  {
    id: 'crash20',
    label: 'Immediate 20% Crash',
    description: 'A one-time 20% equity decline at retirement.',
    years: [s(-0.2, 0.03, 0.02, 0.025)],
  },
  {
    id: 'crash30',
    label: 'Immediate 30% Crash',
    description: 'A one-time 30% equity decline at retirement.',
    years: [s(-0.3, 0.04, 0.02, 0.025)],
  },
  {
    id: 'crash40',
    label: 'Immediate 40% Crash',
    description: 'A one-time 40% equity decline at retirement.',
    years: [s(-0.4, 0.05, 0.02, 0.025)],
  },
  {
    id: 'crash50',
    label: 'Immediate 50% Crash',
    description: 'A one-time 50% equity decline at retirement.',
    years: [s(-0.5, 0.06, 0.02, 0.025)],
  },
  {
    id: 'highInflation10',
    label: 'High Inflation for 10 Years',
    description: 'Sustained 7% inflation with muted nominal returns.',
    years: Array.from({ length: 10 }, () => s(0.05, 0.02, 0.05, 0.07)),
  },
  {
    id: 'lowReal20',
    label: 'Low Real Returns for 20 Years',
    description: 'Two decades of below-average real returns.',
    years: Array.from({ length: 20 }, () => s(0.045, 0.025, 0.02, 0.03)),
  },
  {
    id: 'badFirstDecade',
    label: 'Poor Returns in First Decade',
    description: 'The worst case for sequence-of-returns risk.',
    years: [s(-0.15, 0.02, 0.02, 0.03), s(-0.1, 0.03, 0.02, 0.03), s(-0.05, 0.03, 0.02, 0.03), s(0.0, 0.03, 0.02, 0.03), s(0.02, 0.03, 0.02, 0.03), s(0.03, 0.03, 0.02, 0.03), s(0.04, 0.03, 0.02, 0.03), s(0.05, 0.03, 0.02, 0.03), s(0.05, 0.03, 0.02, 0.03), s(0.05, 0.03, 0.02, 0.03)],
  },
  {
    id: 'goodThenBad',
    label: 'Strong Early, Weak Later',
    description: 'Favorable sequence — strong returns while balances are largest.',
    years: [s(0.2, 0.05, 0.02, 0.025), s(0.18, 0.05, 0.02, 0.025), s(0.15, 0.05, 0.02, 0.025), s(0.12, 0.04, 0.02, 0.025), s(0.1, 0.04, 0.02, 0.025)],
  },
];

export function findStressScenario(id: string | undefined): StressScenario | undefined {
  if (!id) return undefined;
  return STRESS_SCENARIOS.find((x) => x.id === id);
}
