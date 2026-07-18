# Calculation-Engine Documentation

The engine is decoupled from the UI and can be used as a library. Entry points are exported from
`src/simulation/index.ts`.

## Top-level API

```ts
import { runSimulation } from './simulation/monteCarlo';
import { defaultScenario } from './models/defaults';

const results = runSimulation(defaultScenario());
// results.metrics, results.balanceBands, results.readiness, ...
```

Key exports:

| Function | Purpose |
| --- | --- |
| `runSimulation(scenario)` | Run the full Monte Carlo and aggregate results. |
| `simulatePath(scenario, generator, rng)` | Simulate a single future (real dollars). |
| `createReturnGenerator(assumptions)` | Build the selected return model. |
| `computeMetrics(paths, legacyTarget)` | Aggregate success metrics across paths. |
| `computeFundedRatio(scenario)` | The funded-ratio indicator. |
| `solveSustainableSpending(...)` | Binary-search sustainable spending at a confidence target. |
| `solveSpendingCurve(...)` | Sustainable spending across all standard confidence targets. |
| `solveRetirementAge(...)` | Earliest retirement age meeting a target probability. |
| `compareStrategies / compareAllocations / compareFees` | Side-by-side analyses. |

## Data flow

```
Scenario ──► runSimulation
                │  for each trial:
                │    createReturnGenerator().beginPath(rng, horizon)
                │    simulatePath(scenario, generator, rng)  ──► SinglePathResult
                ▼
        computeMetrics + buildBands + classifyReadiness + primaryRisk
                ▼
        SimulationResults (bands, metrics, representative paths, readiness)
```

## The single-path loop (`engine.ts`)

Per year, retirement branch:

1. `computeIncome` — real guaranteed income + a `TaxableIncome` breakdown by category, with
   inflation-adjusted and survivor handling.
2. `computeSpending` — desired/essential after phases, real decline, cost-of-living, and survivor
   factor (0.75 when one spouse has died).
3. `strategy.decide(ctx)` — the withdrawal strategy returns a target after-tax spending.
4. `solveWithdrawal` — iterates to find the gross withdrawal funding the target, composing the
   withdrawal across accounts and taxing it jointly with income. Nominalizes for bracket indexing,
   then converts tax back to real.
5. Fees applied to the post-withdrawal balance via `totalAnnualFee`.
6. Per-asset-class real returns applied to each account's holdings, then the
   account is rebalanced per the policy (annual / quarterly / threshold / none)
   via `rebalance.ts`. Tracking holdings per class is what makes rebalancing
   modes and per-account allocations affect outcomes distinctly.
7. Record `YearRecord`.

Accumulation branch adds contributions and applies returns.

## Tax engines (`src/taxes`)

All implement `TaxEngine.compute(income: TaxableIncome, ctx: TaxContext): TaxResult`.

- **Flat** — one effective rate on total taxable income; tax-free withdrawals excluded.
- **Marginal** — progressive ordinary brackets after a standard deduction; preferential capital
  gains/dividends stacked on top; a flat state rate; optional inflation indexing; Social Security
  simplified to 85% taxable.
- **Custom** — per-(country, category, age) rates with country-profile fallbacks; social taxes on
  ordinary + pension.

`TaxableIncome` separates: `ordinary`, `taxDeferredDistribution`, `capitalGains`, `dividends`,
`pension`, `socialSecurity`, `rental`, `annuity`, `taxFreeWithdrawal`.

## Withdrawal ordering (`withdrawalOrder.ts`)

`withdraw(states, order, amount, age)` mutates account states and returns a `WithdrawalComposition`
(`taxableBasis`, `taxableGains`, `deferred`, `taxFree`, `total`). Taxable accounts split each draw
into basis (untaxed) and gains (taxed) by `basisFraction`. Availability ages exclude locked accounts.

## Fees (`src/fees/fees.ts`)

`totalAnnualFee(value, fees)` = fund expense ratio + platform fee (always) + advisor fee (AUM tiered
or flat, robo, or flat retainer). `advisorAnnualFee` isolates the advisor portion for break-even
analysis.

## Return generators (`returns.ts`)

Each implements `ReturnGenerator` with `beginPath(rng, horizon)` and
`year(rng, yearIndex, alloc): { nominal, inflation, real }`. Allocations are collapsed into
equity/bond/cash buckets for the historical/bootstrap/stress models; the parametric model draws the
portfolio return directly from its arithmetic mean and correlation-matrix volatility.

## Correctness & tests

Deterministic tests live in `src/tests`. Hand-computable cases (amortization payments, progressive
brackets, pro-rata withdrawals, zero-return drawdown) anchor the engine; reproducibility tests assert
seed determinism. Run `npm run test`.
