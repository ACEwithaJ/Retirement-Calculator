# Methodology

This document explains how the calculator models retirement outcomes. It complements the in-app
**Methodology** page. Everything here is a *model* under explicit, editable assumptions — not a
forecast, and not advice.

## 1. Units: real vs. nominal, arithmetic vs. geometric

- All portfolio balances and spending are reported in **real (today's) dollars**. This keeps
  multi-decade comparisons meaningful.
- **Nominal** values are used only where taxes require them: bracket thresholds are indexed by the
  cumulative inflation experienced along each path, so a marginal-bracket calculation sees
  nominal income and nominal thresholds, and the resulting tax is converted back to real dollars.
- **Arithmetic return** is the mean single-year return; we draw single-year returns with this mean.
- **Geometric return** is the compound rate that actually grows wealth and is lower by roughly
  σ²/2 (variance drag). It emerges naturally from compounding the simulated single-year returns.

## 2. The single-path cash-flow engine

For each simulated future (`src/simulation/engine.ts`), we step year by year from the current age to
the planning horizon. Each retirement year, in order:

1. **Income** — sum active guaranteed/expected income sources (real), applying each source's
   inflation-adjusted fraction and survivor fraction if a spouse has died.
2. **Spending target** — the withdrawal strategy chooses this year's desired after-tax spending,
   after applying retirement phases, optional real spending decline, and the cost-of-living
   multiplier of the country in effect.
3. **Taxes & withdrawal solve** — we solve for the gross portfolio withdrawal that funds the target
   after-tax spending given fixed income. Because taxes depend on the withdrawal's *composition*
   (basis vs. gains vs. tax-deferred vs. tax-free), the solve iterates (Newton-style using an
   estimated marginal rate) until net spending matches the target or the portfolio is exhausted.
4. **Withdrawal ordering** — the gross amount is drawn across accounts per the chosen order
   (taxable-first, tax-deferred-first, pro rata, preserve-tax-free, bracket-fill, or custom),
   respecting each account's availability age and tracking cost basis.
5. **Fees** — fund expense ratios, platform fees, and the advisor fee are applied to the
   post-withdrawal balance so fees are never double-counted against the withdrawal.
6. **Returns** — the year's real return is applied to the (annually rebalanced) portfolio.
7. **Recording** — balances, income, taxes, fees, net spending, desired/essential spending, and the
   withdrawal rate are recorded for the year.

Accumulation years (before retirement) instead add contributions (with optional annual increases and
employer match) and apply returns.

Surplus guaranteed income beyond the spending target is reinvested rather than discarded.

## 3. Return models

Selectable in **Assumptions** (`src/simulation/returns.ts`):

- **Parametric Monte Carlo** — each year the portfolio's arithmetic return and its volatility
  (computed from per-asset-class volatilities and the correlation matrix) parameterize a draw from a
  normal, Student's t (fat-tailed), or lognormal distribution. Optional mild mean reversion dampens
  after unusually strong or weak years. Inflation can be fixed or stochastic.
- **Historical rolling periods** — a random start year is chosen and consecutive real history is
  replayed, blending the era's stock/bond/cash returns by the allocation's equity/bond/cash buckets.
  The dataset's date range is shown and never silently extrapolated (long horizons wrap with a note).
- **Historical bootstrap** — historical years are resampled, optionally in multi-year blocks so some
  sequence behavior (e.g. runs of good or bad years) is preserved.
- **Deterministic stress tests** — scripted analogues (Great Depression, 1970s stagflation, dot-com,
  2008, lost decade, immediate 20–50% crashes, sustained high inflation, poor first decade, and a
  favorable early sequence). After the scripted years, steady expected returns apply. These are
  labeled scenarios, not forecasts.

## 4. Sequence-of-returns risk

Because withdrawals are taken every year, the *order* of returns matters, not just the average.
Losses early in retirement do disproportionate damage. The engine captures this automatically (each
path experiences a specific ordering), and the "Poor returns in first decade" and "Strong early,
weak later" stress scenarios isolate it deliberately.

## 5. Reproducibility

All randomness comes from a seeded PRNG (`SeededRandom`, mulberry32). The Monte Carlo runner derives
a deterministic per-path sub-seed from the master seed, so the same seed and trial count always
produce identical results across machines and runs.

## 6. Definition of success

Success is deliberately multi-dimensional (`src/simulation/metrics.ts`). We report:

- Probability the portfolio stays positive.
- Probability essential spending is funded every year.
- Probability desired spending is funded every year.
- Probability spending never falls below 90% / 80% of target.
- Median lifetime spending; median, 10th- and 90th-percentile ending wealth.
- Maximum and average real spending cut; average years below desired; median first-cut age.
- Probability of depletion before ages 80/90/95/100/105.
- Legacy probability against a target bequest.

Readiness is classified with calm, non-alarmist language (Strongly / Reasonably funded, Borderline,
Vulnerable, Not currently funded) weighted toward essential and desired funding — **not** merely
whether a dollar remains at the end.

Dynamic strategies (percentage, VPW, guardrails) often improve portfolio survival by **transferring
risk into spending variability**. A strategy that "never runs out" can still deliver unacceptably low
spending; the tool surfaces the lowest-spending outcomes so this trade-off is visible.

## 7. Funded ratio

`funded ratio = investable assets ÷ present value of projected net portfolio withdrawals`, discounted
at an assumed real return (`src/simulation/fundedRatio.ts`). It is a useful supplementary indicator
but is **sensitive to the discount rate** — a higher assumed return flatters it. Use it alongside,
not instead of, the probability metrics.

## 8. Sustainable-spending solver

A binary search (`src/simulation/solver.ts`) finds the maximum monthly spending that still meets each
confidence target (50%–99%) for a chosen success criterion, re-running the simulation at each step
with a reduced trial count for speed and a dollar tolerance for convergence. A companion solver finds
the earliest retirement age that meets a target probability.

## 9. Taxes and fees

See [`ENGINE.md`](ENGINE.md) for the account-level tax treatment and fee ordering, and
[`DISCLAIMER.md`](DISCLAIMER.md) for the important limitations of the tax and international models.

## 10. Why assumptions matter more than decimals

The difference between a 90% and 75% success probability is usually smaller than the effect of
changing your inflation, return, or longevity assumptions. Treat the single success number as one
input to judgment, compare multiple calculators and methods, and favor flexibility over false
precision.
