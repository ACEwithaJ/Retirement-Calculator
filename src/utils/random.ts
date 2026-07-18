/**
 * Deterministic, seeded random-number generation.
 *
 * We use mulberry32 (a small, fast, well-distributed 32-bit PRNG). Given the
 * same seed, the same sequence is produced on every machine and every run,
 * which is what makes Monte Carlo results reproducible.
 */

export class SeededRandom {
  private state: number;

  constructor(seed: number) {
    // Ensure a non-zero 32-bit integer state.
    this.state = (seed >>> 0) || 0x9e3779b9;
  }

  /** Uniform in [0, 1). */
  next(): number {
    // mulberry32
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Uniform integer in [min, max]. */
  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /** Standard normal via Box-Muller. */
  normal(mean = 0, stdev = 1): number {
    let u = 0;
    let v = 0;
    while (u === 0) u = this.next();
    while (v === 0) v = this.next();
    const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return z * stdev + mean;
  }

  /**
   * Student's t sample with `df` degrees of freedom, scaled to unit variance
   * so it can be used as a drop-in fat-tailed replacement for a standard
   * normal. Uses the ratio of a normal to sqrt(chi-square/df).
   */
  studentT(df: number): number {
    const z = this.normal();
    // chi-square with df degrees of freedom = sum of df squared normals.
    let chi2 = 0;
    for (let i = 0; i < df; i++) {
      const n = this.normal();
      chi2 += n * n;
    }
    const raw = z / Math.sqrt(chi2 / df);
    // Rescale to unit variance: Var(t) = df/(df-2) for df > 2.
    const scale = df > 2 ? Math.sqrt((df - 2) / df) : 1;
    return raw * scale;
  }
}

/**
 * Cholesky decomposition of a symmetric positive-definite matrix.
 * Returns lower-triangular L such that L * L^T = matrix.
 * Falls back to the identity's diagonal if the matrix is not PD.
 */
export function cholesky(matrix: number[][]): number[][] {
  const n = matrix.length;
  const L: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = 0;
      for (let k = 0; k < j; k++) sum += L[i][k] * L[j][k];
      if (i === j) {
        const d = matrix[i][i] - sum;
        L[i][j] = d > 0 ? Math.sqrt(d) : 1e-9;
      } else {
        L[i][j] = (matrix[i][j] - sum) / (L[j][j] || 1e-9);
      }
    }
  }
  return L;
}

/**
 * Draw a vector of correlated standard-normal samples given a Cholesky factor.
 */
export function correlatedNormals(
  rng: SeededRandom,
  choleskyL: number[][],
): number[] {
  const n = choleskyL.length;
  const z = Array.from({ length: n }, () => rng.normal());
  const out = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let j = 0; j <= i; j++) s += choleskyL[i][j] * z[j];
    out[i] = s;
  }
  return out;
}
