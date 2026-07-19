# Model Card — Retirement Calculator

## Intended use
Educational, local-first exploration of whether a household's desired **monthly spending** may be sustainable across retirement, under **explicit, user-editable assumptions**. For learning, scenario comparison, and sensitivity analysis by a financially literate non-professional.

## Inappropriate uses
- As individualized financial, tax, investment, or legal **advice**.
- As an **authoritative tax calculation** (domestic or cross-border).
- As a **guarantee** or a single "will I be OK?" verdict.
- For **actual tax filing**, Social Security optimization, or estate planning.
- Any decision made on one success percentage without sensitivity analysis.

## Methodology
- Monthly-resolution cash-flow engine in **real (today's) dollars**; taxes computed in nominal terms then converted back.
- Return methods: **parametric Monte Carlo** (normal / Student-t / lognormal, optional mean reversion), **historical rolling**, **historical bootstrap**, **deterministic stress tests**.
- Per-asset-class holdings with configurable rebalancing (annual/quarterly/threshold/none).
- Order per year: income → spending target (strategy) → gross-up & withdraw for taxes → fees → returns → rebalance.
- Seeded, reproducible PRNG (mulberry32).

## Definition of success (READ THIS)
The prominent **"Chance of success" = desired spending is fully funded in *every* retirement year.** This is **stricter** than the industry-common "portfolio ended above zero" used by FIRECalc, cFIREsim, the Trinity Study, and many commercial tools. The app also reports, in the Results metrics table:
- **Portfolio remains positive** (`portfolioSurvival`) — the metric **comparable** to those tools.
- Essential-spending funded, spending never below 90%/80% of target, depletion-by-age, legacy probability.
Use `portfolioSurvival` when comparing to FIRECalc-style calculators.

## Key assumptions (all editable; see ASSUMPTIONS_AND_DATA_SOURCES.md)
- Capital-market returns/volatility/correlations: **illustrative forward-looking estimates**, not forecasts. Defaults are **more conservative than realized US history** (e.g. ~4% real equity vs ~7% historical), which makes the **default parametric** method materially more cautious than historical-backtest tools.
- Inflation 2.5% general (healthcare 4.5%); planning age **inclusive**; Social Security 85% taxable; survivor spending ×0.75.
- Bundled 1928–2023 historical series is an **illustrative approximation**, not licensed data.

## Data sources
Illustrative/author-estimated capital-market and country assumptions; a representative (non-authoritative) historical return series. No external live data feeds. All labeled in-app and in docs.

## Known limitations
- Default **parametric** results diverge ~20pp from historical/Trinity for the 4% rule (assumptions, not error).
- Taxes: flat & marginal verified exact but simplified (no phase-outs, NIIT, most credits); international is a **simplified effective-rate example**.
- No stochastic mortality; single fixed horizon per person.
- FX not applied to income conversion; stochastic-inflation × marginal-bracket indexing has a minor theoretical inconsistency.
- "No rebalancing" drift realism over 50+ years is modeled but not externally benchmarked.

## Tax limitations
Not a tax engine. Do not use for filing or for country-specific planning. Roth/HSA/ISA/TFSA cross-border recognition is simplified and often wrong for real treaties.

## International limitations
Country profiles are **simplified examples** with editable effective rates and cost-of-living multipliers. Treat all cross-border output as scenario planning, never tax advice.

## Uncertainty
Results are **probabilities under assumptions**, subject to ~1pp Monte Carlo noise at typical trial counts and to far larger swings from changing return/inflation/longevity assumptions. Displayed precision (0.1%) exceeds the model's true precision (OBS-004).

## Required user disclosures (shown in-app)
- "Educational tool — not financial, tax, investment, or legal advice."
- Country tax profiles are simplified examples.
- Results are probabilities, not guarantees.
- No endorsement by any financial educator or firm.

## Validation status (2026-07-18, commit 8228d2b)
Core math (accumulation, drawdown, flat & marginal tax, MC aggregation, fees, invariants) **independently verified**. Historical engine matches the 4%-rule benchmark to <1pp. Two quality defects fixed. Live commercial-tool comparison **not performed** (network-blocked). Confidence: math **High**, reliability **High**, financial reasonableness **Moderate** (default-method conservatism under-disclosed), transparency **Moderate**.
