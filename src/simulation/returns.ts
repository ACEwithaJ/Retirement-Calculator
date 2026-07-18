import type {
  AssetAllocation,
  AssetClassId,
  Assumptions,
} from '../types';
import {
  portfolioArithmeticReturn,
  portfolioVolatility,
} from '../allocations/portfolio';
import { SeededRandom } from '../utils/random';
import { HISTORICAL_SERIES } from './historicalData';
import { findStressScenario } from './stress';

/** One year's realized nominal returns and inflation for a resolved portfolio. */
export interface YearReturn {
  nominal: number; // portfolio nominal return
  inflation: number;
  real: number; // (1+nominal)/(1+inflation) - 1
}

/**
 * A return generator produces a realized return sequence for one simulated
 * path. `beginPath` is called once per path (e.g. to pick a bootstrap ordering
 * or a historical start year); `year` is called once per simulated year with
 * the allocation in effect that year (allowing glidepaths).
 */
export interface ReturnGenerator {
  readonly method: string;
  beginPath(rng: SeededRandom, horizon: number): void;
  year(rng: SeededRandom, yearIndex: number, alloc: AssetAllocation): YearReturn;
}

const BOND_CLASSES: AssetClassId[] = [
  'govBonds',
  'corpBonds',
  'intlBonds',
  'tips',
  'shortTermBonds',
];

/** Collapse an allocation into equity/bond/cash buckets for series blending. */
function buckets(alloc: AssetAllocation): { eq: number; bd: number; csh: number } {
  let eq = 0;
  let bd = 0;
  let csh = 0;
  for (const [id, w] of Object.entries(alloc.weights)) {
    if (!w) continue;
    if (id === 'cash') csh += w;
    else if (BOND_CLASSES.includes(id)) bd += w;
    else eq += w; // equities, REITs, gold, alternatives treated as risk assets
  }
  const total = eq + bd + csh || 1;
  return { eq: eq / total, bd: bd / total, csh: csh / total };
}

function toReal(nominal: number, inflation: number): number {
  return (1 + nominal) / (1 + inflation) - 1;
}

/** Parametric Monte Carlo: draw the portfolio return from a distribution. */
export class ParametricGenerator implements ReturnGenerator {
  readonly method = 'parametric';
  private lastReal = 0;

  constructor(private assumptions: Assumptions) {}

  beginPath(): void {
    this.lastReal = 0;
  }

  year(rng: SeededRandom, _yearIndex: number, alloc: AssetAllocation): YearReturn {
    const mu = portfolioArithmeticReturn(alloc, this.assumptions.assetClasses);
    const sigma = portfolioVolatility(alloc, this.assumptions);
    const model = this.assumptions.returnModel;

    // Optional mild mean reversion: dampen after a strong/weak year.
    let drift = mu;
    if (model.meanReversion && this.lastReal !== 0) {
      drift = mu - 0.15 * (this.lastReal - (mu - this.assumptions.inflation.general));
    }

    let z: number;
    if (model.distribution === 'studentT') {
      z = rng.studentT(Math.max(3, model.studentTDf));
    } else {
      z = rng.normal();
    }
    let nominal = drift + sigma * z;
    if (model.distribution === 'lognormal') {
      // Lognormal wealth process: guard against <-100% returns.
      nominal = Math.exp(Math.log(1 + Math.max(-0.99, drift)) - 0.5 * sigma * sigma + sigma * z) - 1;
    }

    const inf = this.assumptions.inflation.stochastic
      ? rng.normal(this.assumptions.inflation.general, this.assumptions.inflation.volatility)
      : this.assumptions.inflation.general;

    const real = toReal(nominal, inf);
    this.lastReal = real;
    return { nominal, inflation: inf, real };
  }
}

/** Historical rolling periods: use consecutive real history from a start year. */
export class HistoricalGenerator implements ReturnGenerator {
  readonly method = 'historical';
  private start = 0;

  beginPath(rng: SeededRandom, horizon: number): void {
    const n = HISTORICAL_SERIES.length;
    // Prefer non-wrapping windows; if horizon exceeds history, allow wrap.
    const maxStart = Math.max(0, n - horizon);
    this.start = maxStart > 0 ? rng.int(0, maxStart) : rng.int(0, n - 1);
  }

  year(_rng: SeededRandom, yearIndex: number, alloc: AssetAllocation): YearReturn {
    const n = HISTORICAL_SERIES.length;
    const row = HISTORICAL_SERIES[(this.start + yearIndex) % n];
    const { eq, bd, csh } = buckets(alloc);
    const nominal = eq * row.stocks + bd * row.bonds + csh * row.cash;
    return { nominal, inflation: row.inflation, real: toReal(nominal, row.inflation) };
  }
}

/** Bootstrap: resample historical years, optionally in blocks to keep runs. */
export class BootstrapGenerator implements ReturnGenerator {
  readonly method = 'bootstrap';
  private sequence: number[] = [];

  constructor(private blockSize: number) {}

  beginPath(rng: SeededRandom, horizon: number): void {
    const n = HISTORICAL_SERIES.length;
    const block = Math.max(1, this.blockSize);
    this.sequence = [];
    while (this.sequence.length < horizon) {
      const start = rng.int(0, n - 1);
      for (let k = 0; k < block && this.sequence.length < horizon; k++) {
        this.sequence.push((start + k) % n);
      }
    }
  }

  year(_rng: SeededRandom, yearIndex: number, alloc: AssetAllocation): YearReturn {
    const idx = this.sequence[yearIndex] ?? 0;
    const row = HISTORICAL_SERIES[idx];
    const { eq, bd, csh } = buckets(alloc);
    const nominal = eq * row.stocks + bd * row.bonds + csh * row.cash;
    return { nominal, inflation: row.inflation, real: toReal(nominal, row.inflation) };
  }
}

/** Deterministic stress scenario followed by steady assumed returns. */
export class StressGenerator implements ReturnGenerator {
  readonly method = 'stress';
  private scenarioId?: string;

  constructor(private assumptions: Assumptions) {
    this.scenarioId = assumptions.returnModel.stressScenarioId;
  }

  beginPath(): void {
    /* deterministic */
  }

  year(_rng: SeededRandom, yearIndex: number, alloc: AssetAllocation): YearReturn {
    const scen = findStressScenario(this.scenarioId);
    const { eq, bd, csh } = buckets(alloc);
    if (scen && yearIndex < scen.years.length) {
      const y = scen.years[yearIndex];
      const nominal = eq * y.stocks + bd * y.bonds + csh * y.cash;
      return { nominal, inflation: y.inflation, real: toReal(nominal, y.inflation) };
    }
    // Fallback: steady expected returns after the scripted years.
    const mu = portfolioArithmeticReturn(alloc, this.assumptions.assetClasses);
    const inf = this.assumptions.inflation.general;
    return { nominal: mu, inflation: inf, real: toReal(mu, inf) };
  }
}

export function createReturnGenerator(assumptions: Assumptions): ReturnGenerator {
  switch (assumptions.returnModel.method) {
    case 'historical':
      return new HistoricalGenerator();
    case 'bootstrap':
      return new BootstrapGenerator(assumptions.returnModel.bootstrapBlockSize);
    case 'stress':
      return new StressGenerator(assumptions);
    case 'parametric':
    default:
      return new ParametricGenerator(assumptions);
  }
}
