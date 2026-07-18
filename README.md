# Retirement Calculator

A **local-first, privacy-preserving retirement-planning calculator** that evaluates whether a
household's desired *monthly spending* can be sustained across retirement — including long early
retirements of 40–60 years.

It is rigorous enough for sophisticated personal planning yet understandable to a financially
literate nonprofessional, and it deliberately separates:

1. **User inputs** — ages, accounts, spending, income
2. **Modeling assumptions** — returns, volatility, inflation, currency
3. **Calculation methodology** — the cash-flow engine and return models
4. **Simulation results** — probabilities, charts, percentiles
5. **Planning interpretations** — readiness, risks, sustainable spending
6. **Limitations and uncertainty** — made explicit throughout

> ⚠️ **This is an educational tool, not individualized financial, tax, investment, or legal advice.**
> Results are probabilities under explicit assumptions, never guarantees. Country tax profiles are
> simplified examples, not authoritative calculations. It claims no endorsement by any financial
> educator. Consult qualified professionals before making decisions.

---

## Highlights

- **Monthly spending is the central outcome.** Portfolio value is treated as one means of supporting
  it, not the goal itself.
- **Four return models:** parametric Monte Carlo (normal / Student's t / lognormal, optional mean
  reversion), historical rolling periods, historical bootstrap (with block sampling), and
  deterministic stress tests (Depression, 1970s stagflation, dot-com, 2008, lost decade, immediate
  crashes, and more).
- **Eleven withdrawal strategies** behind one interface: constant real / nominal, constant
  percentage, amortization, interest-only, Guyton-Klinger guardrails, Vanguard dynamic, VPW, RMD
  method, endowment, and floor-and-ceiling.
- **Three tax modes:** flat effective rate, progressive marginal brackets (with preferential capital
  gains, standard deduction, state rate, inflation indexing), and a custom international model by
  income category, country, and age.
- **Country framework** with simplified starter profiles (US, Italy, UK, Canada, France, Germany,
  Spain, Portugal, Switzerland, Australia, custom) and residency transitions.
- **Cost of Advice** analysis: AUM / robo / flat-fee scenarios, lifetime fee drag, and break-even
  value of advice.
- **Multi-metric definition of success** — not merely "a dollar left at the end": essential and
  desired funding, spending stability, depletion-by-age, legacy, and more.
- **Sustainable-spending solver** (binary search) across confidence targets, plus retirement-age
  solving.
- **Strategy and allocation comparison** tables, sortable side by side.
- **Reproducible** via seeded random numbers, **local-only** storage, and **CSV/JSON** export.
- Responsive UI, light/dark themes, keyboard-accessible forms, tooltips, plain-language glossary,
  and a print-friendly summary.

---

## Getting started

Requirements: **Node.js 18+** (developed on Node 22) and npm.

```bash
npm install      # install dependencies
npm run dev      # start the dev server (Vite) at http://localhost:5173
npm run build    # type-check and produce a production build in dist/
npm run preview  # preview the production build
npm run test     # run the unit + integration test suite (Vitest)
npm run lint     # run ESLint
```

The app runs entirely in your browser. **No account, no server, no external API, and no personal
financial data ever leaves your machine.** Scenarios are saved in `localStorage`.

---

## Using the calculator

Navigate the sections in order (they mirror how the plan is built):

1. **Overview** — readiness summary, key numbers, and sample scenarios to load.
2. **Household** — ages, retirement/longevity, marital status, country, residency transitions.
3. **Spending & Income** — desired and essential monthly spending, phases, and income sources.
4. **Assets** — accounts by tax class, balances, cost basis, availability ages, one-time flows.
5. **Allocation** — presets, glidepaths, rebalancing, trials, and seed.
6. **Withdrawal Strategy** — pick and configure a strategy; set withdrawal ordering.
7. **Taxes & Countries** — flat / marginal / custom tax modes and country profiles.
8. **Fees & Advice** — your fee configuration and the Cost of Advice comparison.
9. **Assumptions** — preset (Conservative / Moderate / Historical / Optimistic / Custom), return
   model, inflation, currency, and per-asset-class assumptions.
10. **Results** — probabilities, charts with percentile bands, the sustainable-spending solver,
    representative paths, and CSV/JSON export.
11. **Compare** — save/duplicate/import scenarios and compare strategies and allocations side by side.
12. **Methodology** — how everything is computed, plus the glossary.

Results recompute automatically (a capped live preview) as you edit. Use **Run full** on the Results
page for the full trial count.

---

## The demonstration default

A neutral demonstration scenario is provided (all values editable): age 47, retire at 55, plan to
100, $3,000,000 invested, $15,000 desired / $10,000 essential monthly spending, 70/25/5 allocation,
0.08% fund expense ratio, 0% advisor fee, 25% flat tax, constant-real withdrawals, 10,000 Monte
Carlo trials, USD, US residence. These are demonstration assumptions only.

---

## Project structure

```
src/
  allocations/   asset-class assumptions, presets, correlations, portfolio math
  components/    reusable UI (fields, stat cards, charts, tooltips)
  countries/     simplified country tax/cost profiles
  fees/          AUM / flat / expense-ratio fee models + comparison scenarios
  models/        default scenario, sample scenarios, presets, validation, localStorage store
  pages/         one component per navigation section
  simulation/    return generators, single-path engine, Monte Carlo, metrics, solver, compare
  state/         React context holding the scenario and results
  strategies/    withdrawal strategies behind a shared interface + registry
  taxes/         flat / marginal / custom tax engines behind a shared interface
  tests/         deterministic unit + integration tests
  types/         all domain models (single source of truth)
  utils/         seeded RNG, finance math, statistics, formatting, export
docs/            methodology, glossary, engine, disclaimer, and extension guides
```

The calculation engine (`simulation/`, `strategies/`, `taxes/`, `allocations/`, `fees/`) is fully
decoupled from the UI and can be used as a library.

---

## Documentation

- [`docs/METHODOLOGY.md`](docs/METHODOLOGY.md) — the modeling methodology in depth.
- [`docs/GLOSSARY.md`](docs/GLOSSARY.md) — plain-language glossary.
- [`docs/ENGINE.md`](docs/ENGINE.md) — calculation-engine internals.
- [`docs/EXTENDING.md`](docs/EXTENDING.md) — how to add strategies, countries, and asset classes.
- [`docs/UPDATING_DATA.md`](docs/UPDATING_DATA.md) — how to update the historical dataset.
- [`docs/DISCLAIMER.md`](docs/DISCLAIMER.md) — tax and international-model disclaimer.
- [`docs/validation/`](docs/validation/) — independent validation report, benchmark results, external-calculator comparison, assumptions & data sources, defect log, and model card.

---

## Testing

Deterministic tests (49 cases) cover finance math, seeded RNG reproducibility, the tax engines,
withdrawal ordering, fees, every withdrawal strategy, the single-path engine (including zero-return,
guaranteed-income-exceeds-spending, and crash edge cases), Monte Carlo reproducibility, and the
sustainable-spending solver.

```bash
npm run test
```

---

## Design principles honored

- Never hard-codes that 4% is universally safe.
- Never presents a Monte Carlo probability as certainty.
- Never calls a plan successful solely because a dollar remains at the end.
- Reports spending stability and essential-spending coverage alongside portfolio survival.
- Keeps nominal and inflation-adjusted values clearly distinguished.
- Deducts taxes, fund expenses, and advisory fees in the correct order without double-counting.
- Preserves reproducibility through seeded simulations.
- Makes all important assumptions visible and editable.
- Implements competing methods rather than declaring one universally correct.
- Treats international taxation as scenario planning, not tax advice.

## License

Provided as-is for educational purposes. No warranty. Not financial advice.
