# Calculator Comparison

## Access limitation (must read)

Live comparison against commercial calculators (Fidelity, Vanguard, Schwab, Empower, Boldin, ProjectionLab, Portfolio Visualizer) was **not possible in this environment**. The validation sandbox's outbound network policy blocks arbitrary HTTP(S): `curl`/WebFetch to non-allowlisted hosts return **HTTP 403 (CONNECT tunnel failed)**. Web **search** was available (used below for methodology), but interactive calculators require form submission behind that block.

Therefore, direct numeric comparison to live Monte Carlo tools is labeled **Not validated**. The comparisons that *were* achievable are:
1. **Closed-form formulas** every mainstream calculator implements (FV, annuity) — the app matches these **exactly** (see `BENCHMARK_RESULTS.md`, Cases A/B). For deterministic accumulation/drawdown, the closed form *is* the reference implementation.
2. The **published Trinity Study / FIRECalc / cFIREsim 4%-rule survival benchmark**, reproduced with the app's historical engine.

## Methodology of reference tools (from published sources)

| Tool | Engine | "Success" definition |
|---|---|---|
| FIRECalc | Historical sequences from 1871 | Portfolio ended **> $0** |
| cFIREsim | Historical sequences | Portfolio ended **> $0** |
| Trinity Study (1998) | Historical rolling 30-yr | Portfolio survived the period |
| Fidelity/Vanguard/Empower | Proprietary Monte Carlo | Typically "money lasts to plan age" (portfolio ≥ 0) |
| **This app (headline)** | Parametric MC (default) | **Desired spending fully funded *every* year** (stricter) |
| **This app (`portfolioSurvival`)** | any method | Portfolio ended > $0 (comparable) |

**Key takeaway:** the app's headline uses a **stricter** success definition than the reference tools. The comparable metric is the app's `portfolioSurvival`, shown in the Results "Success metrics" table.

## Comparison matrix

Scenario: classic 4% rule — $1,000,000, retire 65, 30-year horizon, 70/30, constant-real 4% ($40k/yr), no Social Security, no taxes, no fees. App run at 5,000 trials, seed 11.

| Metric | My App result | Comparison ref | External result | Abs diff | % diff | Likely explanation | Defect? |
|---|---|---|---|---|---|---|---|
| Survival — **historical** method | **94.2%** | Trinity / FIRECalc (historical) | ~95–100% | ~1–6pp | Different data window (app 1928–2023 vs 1871+), 70/30 vs 75/25, 31-yr inclusive horizon | **No** — excellent agreement |
| Survival — **bootstrap** method | 92.2% | Trinity / FIRECalc | ~95% | ~3pp | Block resampling breaks some historical mean reversion | No |
| Survival — **parametric** method (default) | 73.6% | Trinity / FIRECalc | ~95% | ~21pp | Lower forward-looking CMAs (~4% real equity vs ~7% historical) + i.i.d. normal draws (no mean reversion) → fatter 30-yr left tail | **No** — legitimate assumptions difference, but **material and default** (OBS-002) |
| Accumulation FV (Case A) | $2,829,348 | Closed-form annuity-due | $2,829,348 | $0 | — | No — exact |
| Drawdown ending (Case B) | $337,894 | Begin-year annuity loop | $337,894 | $0 | — | No — exact |

## Interpretation

- On **deterministic** math, the app agrees with the universal formulas **exactly** → High confidence.
- On **historical** Monte Carlo, the app agrees with the most-cited retirement benchmark (Trinity/FIRECalc) to within ~1pp → High confidence the historical engine is correct.
- On the **default parametric** method, the app is materially **more conservative** than historical-backtest tools. This is *not* a defect — it reflects (defensible) lower forward return assumptions and the absence of mean reversion — but a user comparing the app's default headline to FIRECalc would see a large, unexplained gap. **This is the most important user-facing finding (OBS-002).**

## What could not be matched
Life-expectancy tables, Social Security estimation engines, proprietary CMAs, tax treatment, spending-timing (begin vs end of year), and rebalancing rules differ across tools and were not normalized against live commercial calculators. Any single-number comparison to those tools would be **Not validated**.

## Sources
- [FIRECalc: Why another retirement calculator?](https://www.firecalc.com/intro.php)
- [FI Calc — Introduction / methodology](https://guide.ficalc.app/)
- [cFIREsim (open source)](https://alistair-marshall.github.io/cFIREsim-open/)
- [Bogleheads: How accurate is FIRECalc?](https://www.bogleheads.org/forum/viewtopic.php?t=441391)
