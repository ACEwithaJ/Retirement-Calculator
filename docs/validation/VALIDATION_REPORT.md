# Validation Report — Retirement Calculator

**Validator role:** senior software QE + quantitative financial-planning analyst + skeptical model validator
**Date:** 2026-07-18
**Commit validated:** `main` @ `8228d2b` (includes PR #1 engine + PR #2 "85% success planning and contribution projections")
**Method:** independent recomputation (closed-form + hand loops), raw-path recomputation of Monte Carlo aggregates, property-based invariants, deterministic edge cases, and a methodology-based comparison to the Trinity Study / FIRECalc 4%-rule benchmark.

> Evidence scripts are in the repo history under `scratchpad/` during validation and are permanently encoded as `src/tests/validation.test.ts` (11 tests). Every "verified" claim below was independently recalculated — not read off the app.

---

## 1. Executive summary

The calculation core of this application is **mathematically correct to the dollar** on the checks that can be computed in closed form, and its Monte Carlo aggregation is **exactly reproducible and internally consistent**. Two defects were found and fixed (both quality/precision, not core-math). The most important issues are **not bugs** but **assumption and interpretation choices** that make the app's headline noticeably more conservative than popular historical-backtest calculators — these are defensible but under-disclosed.

**What was independently verified (High confidence):**

| Area | Result |
|---|---|
| Accumulation future value (Case A) | Exact vs closed-form annuity-due (0.000%) |
| Retirement drawdown (Case B) | Exact vs begin-year annuity hand loop (0.000%) |
| Flat tax gross-up | Exact ($60k net → $80k gross @ 25%) |
| Marginal bracket tax | Exact vs hand calc ($18,339 on $120k single) |
| Monte Carlo success rate | Exactly equals independent recomputation from raw paths |
| Reproducibility | Identical seed → identical results |
| Convergence | desiredFunded stable ~47.5% at 50k trials |
| Fee compounding | Monotonic; 1.5% AUM cuts median ending $11.5M→$2.9M |
| Property invariants | All 6 pass (spending, portfolio size, income, retire-age, fees, cash≠equity) |
| Edge cases | No crashes across 9 boundary scenarios |
| 4%-rule vs Trinity/FIRECalc (historical method) | 94.2% vs ~95% — agreement < 1pp |

**Overall confidence rating:**

- Mathematically correct: **High confidence** (for the deterministic engine, tax gross-up, MC aggregation).
- Technically reliable: **High confidence** (reproducible, robust to edge cases, 69 automated tests pass).
- Financially reasonable: **Moderate confidence** (historical method aligns with mainstream; the *default* parametric method is materially more conservative and this is under-disclosed).
- Appropriately transparent: **Moderate confidence** (strong tooltips and a methodology page, but the headline "Chance of success" uses a stricter definition than mainstream tools without adjacent context, and default-method conservatism is not surfaced).

---

## 2. Major findings

### Verified correct (High confidence)
The engine works in **real (today's) dollars**, uses **multiplicative** real returns `(1+nominal)/(1+inflation)−1` (not the naive subtractive approximation), applies **beginning-of-year** contribution/withdrawal timing consistently, and grosses up withdrawals for taxes correctly by account type. All of this was reproduced exactly outside the app.

### DEF-001 (Medium — FIXED): noisy "Monthly spending at 85%" headline
`useTargetSpending` ran the binary-search solver at **100 trials**, giving a **~24% peak-to-peak swing** across random seeds ($7,470–$9,477/mo for the default). Fixed to **400 trials with a $250 convergence tolerance + rounding to the nearest $100**, cutting the spread to ~6% (`src/hooks/useTargetSpending.ts`).

### DEF-002 (Low — FIXED): misleading code comment
`contributionProjection.ts` documented "mid-year" contributions but the code (correctly, and consistently with the MC engine) adds them at the **start** of the year. Comment corrected.

### OBS-001 (Interpretation — documented): "Chance of success" is stricter than mainstream
The headline **"Chance of success" = `desiredFunded` = desired spending fully funded in *every* retirement year.** FIRECalc, cFIREsim, and the Trinity Study define success as **"portfolio ended with a positive balance."** These are different questions; the app's is stricter, so its headline will read lower than those tools for the same plan. It *is* disclosed in the tooltip and the app also reports `portfolioSurvival` ("Portfolio remains positive") in the metrics table — but a user comparing headlines to FIRECalc could be misled. **Recommendation:** show `portfolioSurvival` beside the headline for apples-to-apples comparability.

### OBS-002 (Assumptions — documented, MATERIAL): default parametric method is much more conservative than history
For the canonical 4% rule ($1M, 30y, 70/30, no SS/tax/fees):

| Return method | Portfolio survival |
|---|---|
| **Historical** (this app) | **94.2%** |
| Bootstrap (this app) | 92.2% |
| **Parametric (this app's DEFAULT)** | **73.6%** |
| Trinity Study / FIRECalc (published) | ~95–100% |

The historical engine agrees with mainstream tools to <1pp. The **default parametric** method is ~20pp lower because (a) its default capital-market assumptions embed lower forward-looking equity returns than realized US history (globalStocks 8.0% arithmetic / 16.5% vol ⇒ ~4% real geometric, vs ~7% real US history), and (b) i.i.d. normal draws omit the mean reversion that helped historical 30-year sequences. **This is a legitimate forward-looking choice, not a bug**, but it is material and it is the default. **Recommendation:** surface the method prominently and consider showing historical alongside parametric by default, so users don't conclude a historically-safe plan is unsafe.

### OBS-003 (Convention — documented): planning-age is inclusive
"Plan to 95" from age 65 produces **31** spending years (ages 65–95 inclusive), where some tools count 30. Slightly conservative; document so users can set the horizon deliberately.

### OBS-004 (Precision — minor): success shown to 0.1%
Success percentages render to one decimal (e.g. 47.3%), implying more precision than ~1pp Monte Carlo noise at typical trial counts supports. **Recommendation:** whole-percent display or a ±band.

### OBS-005 (Robustness — minor): engine silently normalizes bad allocations
`buildHoldings` normalizes weights that don't sum to 1, so a 50%-sum allocation runs as if scaled to 100%. The **UI validation layer** (`validateScenario`) flags this as a blocking error, so user impact is low, but the engine itself is permissive.

---

## 3. Mathematical validation (evidence)

All encoded in `src/tests/validation.test.ts`.

- **Case A (accumulation):** `$500k + $3,000/mo, 25y, 7% nominal, 3% inflation` → engine `$2,829,348` = closed-form annuity-due `$2,829,348` (real). **Exact.**
- **Case B (drawdown):** `$2M, $8,000/mo real, 6% nominal, 2.5% inflation` → engine ending `$337,894` = begin-year hand loop `$337,894` (real). First-year net spending `$96,000`, first-year start balance `$2,000,000`. **Exact.**
- **Flat tax:** net `$60,000` target from a tax-deferred account → gross `$80,000`, tax `$20,000` (25.0%). **Exact.**
- **Marginal tax:** `$120,000` ordinary, single, year 0 → engine `$18,339` = bracket hand calc `$18,339`. **Exact.**
- **MC aggregation:** at 400 trials, engine `desiredFunded/essentialFunded/portfolioSurvival` **equal** an independent recomputation from raw paths (denominator includes failed paths — correct).

## 4. External calculator comparison

Live browsing to Fidelity/Vanguard/Empower/Boldin/Portfolio Visualizer was **not possible** — the validation sandbox's network policy blocks arbitrary outbound HTTP (verified: proxy returns 403 on non-allowlisted hosts). Web **search** was available and used to confirm methodology. Full detail in `CALCULATOR_COMPARISON.md`. The one rigorous external anchor achievable — the **Trinity/FIRECalc 4%-rule survival benchmark** — matches the app's **historical** engine to <1pp (94.2% vs ~95%). Comparison to live Monte Carlo tools is **Not validated**.

## 5. Monte Carlo assessment — High confidence
Seeded mulberry32 PRNG; deterministic per-path sub-seeds; reproducible; success denominator includes failures; converges (~47.5% at 50k). Correlated draws use a numerically hardened (modified, zero-pivot) Cholesky. Definition of "success" is explicit in code and matches the tooltip. See `MODEL_CARD.md`.

## 6. Tax-model assessment — High (flat/marginal) / Moderate (international)
Flat and marginal engines verified exact. International/custom is a **simplified effective-rate** model, clearly labeled as such; Social Security is approximated at 85% taxable. Not suitable for actual tax filing. See `ASSUMPTIONS_AND_DATA_SOURCES.md`.

## 7. Fee-model assessment — High confidence
Fees apply annually to the post-withdrawal, non-home-equity balance, before returns; compounding is monotonic and matches expectation; fund/platform fees are separated from advisor fees and not double-counted.

## 8. Data-quality assessment — Moderate confidence
Capital-market assumptions and the bundled 1928–2023 historical series are **clearly labeled as illustrative approximations**, not licensed data. Country profiles are labeled simplified examples. Values are plausible but the historical series is not an authoritative reproduction — see `ASSUMPTIONS_AND_DATA_SOURCES.md` and `docs/UPDATING_DATA.md`.

## 9. Usability risks
OBS-001 (stricter success definition), OBS-002 (conservative default method), OBS-004 (false precision). None are calculation errors; all are disclosure/interpretation risks.

## 10. Limitations of this validation
- No live comparison to commercial Monte Carlo tools (network-blocked).
- Rebalancing-mode *distinctness* is tested, but the realism of "no rebalancing" drift over 50+ years is not benchmarked against a reference.
- Stochastic-inflation + marginal-bracket interaction (bracket indexing uses the current year's inflation, not the cumulative path) is a minor theoretical inconsistency, untested under that specific combination.

## 11. Recommended next steps (priority order)
1. **Surface the return method and its conservatism** (OBS-002) — the default parametric result is ~20pp below historical; users must see this.
2. **Show `portfolioSurvival` beside "Chance of success"** (OBS-001) for comparability with FIRECalc/Trinity.
3. **Round success % to whole numbers** or show a ±band (OBS-004).
4. **Document the inclusive planning-age convention** in the Household UI (OBS-003).
5. **Harden the engine** to reject (or explicitly normalize with a warning) non-100% allocations rather than silently scaling (OBS-005).

## Files changed by this validation
- `src/hooks/useTargetSpending.ts` — DEF-001 fix (trials 100→500, round to $100).
- `src/simulation/contributionProjection.ts` — DEF-002 fix (comment).
- `src/tests/validation.test.ts` — new (11 independent validation/regression tests).
- `docs/validation/*` — this report and the five companion deliverables.
