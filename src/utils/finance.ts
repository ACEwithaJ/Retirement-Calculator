/**
 * Time-value-of-money and related financial math.
 *
 * Conventions:
 *  - "real" means inflation-adjusted to today's currency.
 *  - "nominal" means not inflation-adjusted.
 *  - Rates are annual fractions unless a name says "monthly".
 */

/** Convert an annual rate to an equivalent monthly rate (geometric). */
export function annualToMonthly(annualRate: number): number {
  return Math.pow(1 + annualRate, 1 / 12) - 1;
}

/** Convert a monthly rate to an equivalent annual rate (geometric). */
export function monthlyToAnnual(monthlyRate: number): number {
  return Math.pow(1 + monthlyRate, 12) - 1;
}

/**
 * Present value of a growing annuity paid at period end.
 * pmt: first payment. r: discount rate. g: growth rate. n: periods.
 */
export function pvGrowingAnnuity(
  pmt: number,
  r: number,
  g: number,
  n: number,
): number {
  if (n <= 0) return 0;
  if (Math.abs(r - g) < 1e-9) {
    return (pmt * n) / (1 + r);
  }
  return (pmt / (r - g)) * (1 - Math.pow((1 + g) / (1 + r), n));
}

/**
 * Present value of a level annuity paid at period end.
 */
export function pvAnnuity(pmt: number, r: number, n: number): number {
  if (n <= 0) return 0;
  if (Math.abs(r) < 1e-9) return pmt * n;
  return (pmt * (1 - Math.pow(1 + r, -n))) / r;
}

/**
 * Payment that amortizes a present value over n periods at rate r
 * (payment at period end). Used by the amortization withdrawal strategy.
 */
export function amortizationPayment(pv: number, r: number, n: number): number {
  if (n <= 0) return 0;
  if (Math.abs(r) < 1e-9) return pv / n;
  return (pv * r) / (1 - Math.pow(1 + r, -n));
}

/** Derive a geometric return from arithmetic mean and volatility. */
export function geometricFromArithmetic(
  arithmetic: number,
  volatility: number,
): number {
  // g ≈ a - σ²/2 (variance drag).
  return arithmetic - (volatility * volatility) / 2;
}

/** Clamp a number into [min, max]. */
export function clamp(x: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, x));
}

/** Round to cents for currency-stable comparisons. */
export function roundCents(x: number): number {
  return Math.round(x * 100) / 100;
}
