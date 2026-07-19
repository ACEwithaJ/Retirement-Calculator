# Assumptions & Data Sources

Units and provenance for every major model input. **Real** = inflation-adjusted to today. All returns are **nominal** unless stated. All rates are **decimals** in code (0.07 = 7%); the UI's percent fields display ×100.

## Global conventions (verified in code)
- Engine currency: **real (today's) dollars**; nominal used only to index tax brackets.
- Real return: **multiplicative** `(1+nominal)/(1+inflation)−1` (not subtractive). Verified.
- Timing: contributions and withdrawals at **beginning of year**; fees then returns after. Verified.
- Return basis: **arithmetic** mean drawn per year; **geometric** emerges from compounding (correct). Volatility drag `≈σ²/2`.

## Capital-market assumptions (`src/allocations/assetClasses.ts`)

| Field | Units | Source | Nominal/Real | Forward/Historical | Hard-coded? | User-override? |
|---|---|---|---|---|---|---|
| Arithmetic return | annual decimal | **Illustrative** (author estimates in the spirit of low-cost indexing) | Nominal | Forward-looking | Yes (defaults) | **Yes** (Assumptions page) |
| Volatility | annual σ | Illustrative | — | Forward | Yes | Yes |
| Correlations | −1..1 | Illustrative pairwise (`correlations.ts`) | — | Forward | Yes | Partial |
| Yield | decimal | Illustrative | Nominal | Forward | Yes | Yes |
| Expense ratio | decimal | Illustrative | — | — | Yes | Yes |

Example defaults: `globalStocks` 8.0% arith / 16.5% σ (⇒ ~4% **real** geometric after 2.5% inflation); `govBonds` 4.1% / 6%; `cash` 2.8% / 1%; `homeEquity` 3.5% / 10% (added in PR #2). **These are assumptions, not forecasts**, and drive OBS-002 (default parametric conservatism). They are fully editable and labeled as such in-app.

## Inflation (`src/models/defaults.ts`)

| Field | Default | Units | Source | Override? |
|---|---|---|---|---|
| General | 2.5% | annual decimal | Illustrative | Yes |
| Healthcare | 4.5% | annual | Illustrative | Yes |
| Housing / education | 3.0% / 4.0% | annual | Illustrative | Yes |
| Stochastic inflation | off | — | — | Yes |

## Historical series (`src/simulation/historicalData.ts`)
- **Range:** 1928–2023 (96 years), annual nominal stock/bond/cash + CPI.
- **Source:** **clearly labeled representative approximations** — close in spirit to Shiller/Damodaran but **not licensed or authoritative**. The header comment and `docs/UPDATING_DATA.md` say to replace it for real analysis.
- Used by the historical and bootstrap methods; never silently extrapolated (horizon wraps with a documented caveat).

## Taxes (`src/taxes/`, `src/countries/profiles.ts`)

| Model | What it is | Accuracy |
|---|---|---|
| Flat | single effective rate on taxable income | Exact arithmetic; user supplies the rate |
| Marginal | illustrative **US single-filer** brackets + preferential LTCG + standard deduction + flat state rate; optional inflation indexing | Verified exact vs hand calc; **not** a full tax engine (no phase-outs, NIIT, credits) |
| Custom/international | per-(country, category, age) effective rates; country profiles are **simplified examples** | **Not authoritative** — scenario planning only |
| Social Security | approximated at **85% taxable** | Simplification |

Country profiles (US, IT, UK, CA, FR, DE, ES, PT, CH, AU, custom) hard-code illustrative effective rates + cost-of-living multipliers; **all editable**; all flagged `simplified: true`.

## Longevity / horizon
- Per-person `longevityAge` (default 100 for the demo; samples vary). Planning age is **inclusive** (OBS-003).
- No stochastic mortality; single fixed horizon per person. Survivor modeling: spending ×0.75 and income ×`survivorFraction` when one spouse's age exceeds their longevity.

## Fees (`src/fees/fees.ts`)
- AUM (flat or tiered), robo, flat retainer/subscription, fund expense ratio, platform fee. Applied **annually** to the **post-withdrawal, non-home-equity** balance, **before** returns. Advisor "value added" is an explicit **subjective user input**, labeled as such.

## Currency
- Base/spending/asset currencies, initial rate, trend, volatility, hedged fraction — all user inputs, labeled as **scenario variables, not forecasts**. FX is not applied to income conversion in the core engine (documented limitation).

## Simulation
- Trials (default 10,000; live preview caps 1,500), seed (default 12345), timestep annual. PRNG: mulberry32 (seeded, reproducible). Distribution: normal / Student-t / lognormal; optional mean reversion (off by default).

## Summary of data-quality flags
- **Illustrative, not sourced:** capital-market assumptions, correlations, inflation, historical series, country rates. All **editable** and **labeled**.
- **Verified exact given inputs:** the *formulas* that consume these assumptions.
- **Recommendation:** display source/date next to major assumptions; the app currently labels them as illustrative but does not cite a dated source (acceptable for an educational tool, improvable).
