# Benchmark Results

All results reproduced independently and encoded in `src/tests/validation.test.ts`. Monetary values are **real (today's dollars)** unless noted. The engine is made deterministic for closed-form checks by setting every asset class to a single nominal return with **zero volatility** (so geometric = arithmetic and the real return is exactly `(1+nominal)/(1+inflation)−1`).

## Case A — Simple accumulation

| Input | Value |
|---|---|
| Current age → retirement | 40 → 65 (25 yrs) |
| Starting portfolio | $500,000 |
| Contribution | $3,000/mo ($36,000/yr), begin-of-year |
| Nominal return / inflation | 7% / 3% (⇒ real 3.8835%) |
| Taxes / fees | none |

| Quantity | Expected (closed-form annuity-due) | Actual (engine @ age 65) | Diff | Pass |
|---|---|---|---|---|
| Portfolio at retirement (real) | $2,829,348 | $2,829,348 | 0.000% | ✅ |

Closed form: `500000·(1+r)²⁵ + 36000·((1+r)²⁵−1)/r·(1+r)`, `r = 1.07/1.03−1`.

## Case B — Simple retirement drawdown

| Input | Value |
|---|---|
| Retirement → planning age | 65 → 95 |
| Starting portfolio | $2,000,000 |
| Spending | $8,000/mo ($96,000/yr) real, constant-real |
| Nominal return / inflation | 6% / 2.5% (⇒ real 3.4146%) |
| Taxes / fees | none |

| Quantity | Expected (begin-year hand loop, 31 yrs) | Actual (engine) | Diff | Pass |
|---|---|---|---|---|
| First-year start balance | $2,000,000 | $2,000,000 | 0.000% | ✅ |
| First-year net spending | $96,000 | $96,000 | 0.000% | ✅ |
| Ending balance (real) | $337,894 | $337,894 | 0.000% | ✅ |

**Convention note:** the app models ages 65–95 **inclusive** = 31 spending years (OBS-003). The hand loop uses the same 31 years, isolating software correctness from the horizon convention.

## Case C / D — income sources & early-retirement bridge
Exercised via property tests and edge cases rather than a single closed form (taxes + multiple accounts + benefit-start ages have no simple closed form). Verified behaviors:
- Guaranteed income begins exactly at its `startAge` and offsets withdrawals (Phase-4e "income>spending" → 100% funded, surplus reinvested).
- Restricted accounts (`availabilityAge`, e.g. 59½) are excluded from the withdrawal pool until available (existing `withdrawalOrder.test.ts`).
- Home equity is excluded from withdrawals unless a sale age is set, and from the fee base (PR #2, code-reviewed).

## Case E — Fee comparison (default scenario, 2,000 trials, seed 4242)

| AUM fee | Median ending wealth | desiredFunded | Median lifetime fees |
|---|---|---|---|
| 0.00% | $0* | 47.3% | $0 |
| 0.25% | $0* | 42.9% | $362,104 |
| 0.75% | $0* | 33.4% | $880,874 |
| 1.00% | $0* | 29.6% | $1,087,218 |
| 1.50% | $0* | 21.9% | $1,410,038 |

Monotonic ✅ (higher fee never raises ending wealth or success). *Median ending is $0 because the demonstration default is deliberately borderline and depletes at the median; on a funded scenario ($7k/mo) 1.5% AUM cuts median ending **$11.5M → $2.9M**.

## Case F — International residency
Not independently benchmarked against a foreign tax authority (out of scope and explicitly a simplified model). Verified only that country selection changes the effective rates and cost-of-living multiplier applied. Treat as **Not validated** for tax accuracy; see `MODEL_CARD.md`.

## Case G — Boundary / failure cases (engine robustness, no crashes)

| Case | Result |
|---|---|
| $0 portfolio | 0% success (correct) |
| $0 spending | 100% success, portfolio grows (correct) |
| 100% tax | 5% survival (correct direction) |
| Fee 5% > return | 0% success (correct) |
| Retirement age = current age | runs, ~5% (aggressive default spend) |
| 60-year horizon | runs, 24% |
| Guaranteed income > spending | 100%, surplus reinvested |
| Allocation sums to 0.5 | runs (engine normalizes; UI blocks — OBS-005) |
| Portfolio = $1e12 | runs, median ending ~$5.5e12 |

UI-layer input validation (`validateScenario`) additionally rejects: retirement ≤ current age, end ≤ retirement, negative balances/spending, tax rate outside 0–100%, overlapping fee tiers, unordered country transitions, allocations ≠ 100%.

## 4%-rule external anchor (see CALCULATOR_COMPARISON.md)

| Method | Portfolio survival (30y, 4%, 70/30) |
|---|---|
| Historical | **94.2%** (≈ Trinity/FIRECalc ~95%) |
| Bootstrap | 92.2% |
| Parametric (default) | 73.6% |
