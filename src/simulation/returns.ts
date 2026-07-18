import type {
  AssetAllocation,
  AssetClassId,
  Assumptions,
} from '../types';
import { assetClassMap } from '../allocations/assetClasses';
import { SeededRandom, cholesky, correlatedNormals } from '../utils/random';
import { HISTORICAL_SERIES } from './historicalData';
import { findStressScenario } from './stress';

/** One year's realized nominal returns and inflation for a resolved portfolio. */
export interface YearReturn {
  nominal: number; // portfolio nominal return
  inflation: number;
  real: number; // (1+nominal)/(1+inflation) - 1
}

/** One year's realized returns broken out by asset class (nominal + real). */
export interface AssetYearReturn {
  inflation: number;
  nominal: Record<string, number>;
  real: Record<string, number>;
}

/**
 * A return generator produces a realized return sequence for one simulated
 * path. `beginPath` is called once per path (e.g. to pick a bootstrap ordering
 * or a historical start year). `yearAssets` returns per-asset-class returns for
 * the year, which the engine applies to per-account holdings so that
 * rebalancing modes (annual, threshold, none) and per-account allocations
 * behave distinctly. `year` is a convenience that collapses those returns onto
 * a single allocation.
 */
export interface ReturnGenerator {
  readonly method: string;
  beginPath(rng: SeededRandom, horizon: number): void;
  yearAssets(rng: SeededRandom, yearIndex: number, classIds: string[]): AssetYearReturn;
  year(rng: SeededRandom, yearIndex: number, alloc: AssetAllocation): YearReturn;
}

const BOND_CLASSES: AssetClassId[] = [
  'govBonds',
  'corpBonds',
  'intlBonds',
  'tips',
  'shortTermBonds',
];

type Bucket = 'eq' | 'bd' | 'csh';

/** Classify an asset class into an equity/bond/cash bucket for series blending. */
export function classBucket(id: string): Bucket {
  if (id === 'cash') return 'csh';
  if (BOND_CLASSES.includes(id)) return 'bd';
  return 'eq'; // equities, REITs, gold, alternatives treated as risk assets
}

/** Collapse an allocation into equity/bond/cash buckets. */
function buckets(alloc: AssetAllocation): { eq: number; bd: number; csh: number } {
  let eq = 0;
  let bd = 0;
  let csh = 0;
  for (const [id, w] of Object.entries(alloc.weights)) {
    if (!w) continue;
    const b = classBucket(id);
    if (b === 'csh') csh += w;
    else if (b === 'bd') bd += w;
    else eq += w;
  }
  const total = eq + bd + csh || 1;
  return { eq: eq / total, bd: bd / total, csh: csh / total };
}

function toReal(nominal: number, inflation: number): number {
  return (1 + nominal) / (1 + inflation) - 1;
}

/** Collapse per-class returns onto an allocation to get a portfolio return. */
function portfolioFromAssets(alloc: AssetAllocation, assets: AssetYearReturn): YearReturn {
  let nominal = 0;
  let wsum = 0;
  for (const [id, w] of Object.entries(alloc.weights)) {
    if (!w) continue;
    nominal += w * (assets.nominal[id] ?? 0);
    wsum += w;
  }
  if (wsum > 0) nominal /= wsum;
  return { nominal, inflation: assets.inflation, real: toReal(nominal, assets.inflation) };
}

/** Parametric Monte Carlo: draw correlated per-asset-class returns. */
export class ParametricGenerator implements ReturnGenerator {
  readonly method = 'parametric';
  private lastReal = 0;
  private choleskyL: number[][] | null = null;
  private choleskyIds: string[] = [];

  constructor(private assumptions: Assumptions) {}

  beginPath(): void {
    this.lastReal = 0;
  }

  /** Build (and cache) the Cholesky factor of the correlation matrix. */
  private ensureCholesky(ids: string[]): void {
    if (this.choleskyL && this.choleskyIds.length === ids.length && this.choleskyIds.every((v, i) => v === ids[i])) {
      return;
    }
    const corr = this.assumptions.correlations;
    const matrix = ids.map((a) => ids.map((b) => corr[a]?.[b] ?? (a === b ? 1 : 0)));
    this.choleskyL = cholesky(matrix);
    this.choleskyIds = ids;
  }

  yearAssets(rng: SeededRandom, _yearIndex: number, classIds: string[]): AssetYearReturn {
    this.ensureCholesky(classIds);
    const map = assetClassMap(this.assumptions.assetClasses);
    const model = this.assumptions.returnModel;
    const z = correlatedNormals(rng, this.choleskyL!);

    // Multivariate Student's t: scale the whole correlated vector by a common
    // sqrt(df / chi2_df) factor, preserving correlation while fattening tails.
    let tScale = 1;
    if (model.distribution === 'studentT') {
      const df = Math.max(3, model.studentTDf);
      let chi2 = 0;
      for (let i = 0; i < df; i++) {
        const n = rng.normal();
        chi2 += n * n;
      }
      tScale = Math.sqrt(df / chi2) * Math.sqrt((df - 2) / df);
    }

    const inflation = this.assumptions.inflation.stochastic
      ? rng.normal(this.assumptions.inflation.general, this.assumptions.inflation.volatility)
      : this.assumptions.inflation.general;

    // Optional mild mean reversion: nudge all class means by a common factor
    // based on the prior year's portfolio real return.
    const reversion = model.meanReversion && this.lastReal !== 0
      ? -0.15 * (this.lastReal - (0.05))
      : 0;

    const nominal: Record<string, number> = {};
    const real: Record<string, number> = {};
    let eqReal = 0;
    let eqW = 0;
    for (let i = 0; i < classIds.length; i++) {
      const id = classIds[i];
      const a = map[id];
      if (!a) {
        nominal[id] = 0;
        real[id] = toReal(0, inflation);
        continue;
      }
      const mu = a.arithmeticReturn + reversion;
      const sigma = a.volatility;
      let ret: number;
      if (sigma <= 0) {
        ret = mu; // deterministic class; skip the random draw entirely
      } else if (model.distribution === 'lognormal') {
        ret = Math.exp(Math.log(1 + Math.max(-0.99, mu)) - 0.5 * sigma * sigma + sigma * z[i]) - 1;
      } else {
        ret = mu + sigma * z[i] * tScale;
      }
      nominal[id] = ret;
      real[id] = toReal(ret, inflation);
      if (classBucket(id) === 'eq') {
        eqReal += real[id];
        eqW += 1;
      }
    }
    // Track a representative (equity) real return for mean reversion.
    this.lastReal = eqW > 0 ? eqReal / eqW : this.lastReal;
    return { inflation, nominal, real };
  }

  year(rng: SeededRandom, yearIndex: number, alloc: AssetAllocation): YearReturn {
    const ids = this.assumptions.assetClasses.map((a) => a.id);
    return portfolioFromAssets(alloc, this.yearAssets(rng, yearIndex, ids));
  }
}

/** Base for series-driven generators (historical / bootstrap / stress). */
abstract class SeriesGenerator implements ReturnGenerator {
  abstract readonly method: string;
  abstract beginPath(rng: SeededRandom, horizon: number): void;
  /** Return the nominal (stocks, bonds, cash, inflation) for the year. */
  protected abstract buckets(yearIndex: number): { stocks: number; bonds: number; cash: number; inflation: number };

  yearAssets(_rng: SeededRandom, yearIndex: number, classIds: string[]): AssetYearReturn {
    const b = this.buckets(yearIndex);
    const nominal: Record<string, number> = {};
    const real: Record<string, number> = {};
    for (const id of classIds) {
      const bucket = classBucket(id);
      const r = bucket === 'csh' ? b.cash : bucket === 'bd' ? b.bonds : b.stocks;
      nominal[id] = r;
      real[id] = toReal(r, b.inflation);
    }
    return { inflation: b.inflation, nominal, real };
  }

  year(_rng: SeededRandom, yearIndex: number, alloc: AssetAllocation): YearReturn {
    const b = this.buckets(yearIndex);
    const { eq, bd, csh } = buckets(alloc);
    const nominal = eq * b.stocks + bd * b.bonds + csh * b.cash;
    return { nominal, inflation: b.inflation, real: toReal(nominal, b.inflation) };
  }
}

/** Historical rolling periods: consecutive real history from a start year. */
export class HistoricalGenerator extends SeriesGenerator {
  readonly method = 'historical';
  private start = 0;

  beginPath(rng: SeededRandom, horizon: number): void {
    const n = HISTORICAL_SERIES.length;
    const maxStart = Math.max(0, n - horizon);
    this.start = maxStart > 0 ? rng.int(0, maxStart) : rng.int(0, n - 1);
  }

  protected buckets(yearIndex: number): { stocks: number; bonds: number; cash: number; inflation: number } {
    const n = HISTORICAL_SERIES.length;
    return HISTORICAL_SERIES[(this.start + yearIndex) % n];
  }
}

/** Bootstrap: resample historical years, optionally in blocks. */
export class BootstrapGenerator extends SeriesGenerator {
  readonly method = 'bootstrap';
  private sequence: number[] = [];

  constructor(private blockSize: number) {
    super();
  }

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

  protected buckets(yearIndex: number): { stocks: number; bonds: number; cash: number; inflation: number } {
    const idx = this.sequence[yearIndex] ?? 0;
    return HISTORICAL_SERIES[idx];
  }
}

/** Deterministic stress scenario followed by steady assumed returns. */
export class StressGenerator extends SeriesGenerator {
  readonly method = 'stress';
  private scenarioId?: string;

  constructor(private assumptions: Assumptions) {
    super();
    this.scenarioId = assumptions.returnModel.stressScenarioId;
  }

  beginPath(): void {
    /* deterministic */
  }

  protected buckets(yearIndex: number): { stocks: number; bonds: number; cash: number; inflation: number } {
    const scen = findStressScenario(this.scenarioId);
    if (scen && yearIndex < scen.years.length) {
      const y = scen.years[yearIndex];
      return { stocks: y.stocks, bonds: y.bonds, cash: y.cash, inflation: y.inflation };
    }
    // Fallback: steady expected returns after the scripted years, using broad
    // equity/bond proxies from the assumptions.
    const map = assetClassMap(this.assumptions.assetClasses);
    const inf = this.assumptions.inflation.general;
    return {
      stocks: map.globalStocks?.arithmeticReturn ?? 0.07,
      bonds: map.govBonds?.arithmeticReturn ?? 0.04,
      cash: map.cash?.arithmeticReturn ?? 0.03,
      inflation: inf,
    };
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
