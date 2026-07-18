# Extending the Calculator

The engine is built around small, well-defined interfaces so new methods can be added without
touching unrelated code.

## Adding a withdrawal strategy

1. **Implement the interface** (`src/strategies/types.ts`):

   ```ts
   export class MyStrategy implements WithdrawalStrategy {
     readonly id = 'myStrategy' as const;
     readonly label = 'My Strategy';
     readonly description = 'One or two sentences a nonprofessional can understand.';
     decide(ctx: StrategyContext): StrategyDecision {
       // Return the target TOTAL after-tax spending for the year, in real dollars.
       return { targetRealSpending: /* ... */ };
     }
   }
   ```

   Put it in `src/strategies/static.ts`, `dynamic.ts`, or a new file. The context gives you the
   real portfolio value, age, remaining years, desired/essential spending, guaranteed income, prior
   spending and return, an assumed real return, and a trailing-portfolio window. Do not mutate `ctx`.

2. **Add the id** to `StrategyId` in `src/types/index.ts`.

3. **Register it** in `src/strategies/index.ts`:

   ```ts
   const REGISTRY: Record<StrategyId, () => WithdrawalStrategy> = {
     // ...
     myStrategy: () => new MyStrategy(),
   };
   ```

4. **Test it** with a deterministic case in `src/tests/strategies.test.ts`.

The UI picks it up automatically (the Strategy page and comparison table enumerate the registry).
Document initial withdrawal, adjustment rule, floor/ceiling behavior, failure behavior, and use
cases in the `description` and/or the Methodology page.

## Adding a country profile

1. Append a `CountryProfile` to `COUNTRY_PROFILES` in `src/countries/profiles.ts`. Set the effective
   rates, cost-of-living multiplier, currency, and a `notes` string, and keep `simplified: true`.
2. It appears automatically in the Household country pickers, the Taxes & Countries table, and the
   custom-tax-rule editor.
3. For nuanced rules, add `CustomTaxRule` entries (income category + rate + optional `fromAge`) via
   the custom tax mode, or extend `CustomTaxEngine` in `src/taxes/custom.ts`.

Always keep country profiles labeled as simplified examples — see [`DISCLAIMER.md`](DISCLAIMER.md).

## Adding an asset class

1. Add an `AssetClassAssumption` to `DEFAULT_ASSET_CLASSES` in `src/allocations/assetClasses.ts`
   (return, volatility, yield, expense ratio, inflation sensitivity).
2. Optionally add correlations in `src/allocations/correlations.ts` (unspecified pairs fall back to
   sensible defaults).
3. Reference it in an allocation preset in `src/allocations/presets.ts`. Weights must sum to 1
   (validated).
4. If it should be classified as a bond for historical blending, add its id to `BOND_CLASSES` in
   `src/simulation/returns.ts`; otherwise it is treated as a risk asset.

## Adding a tax mode

Implement `TaxEngine` in `src/taxes`, add the mode to `TaxMode` in `src/types/index.ts`, and wire it
into `createTaxEngine` in `src/taxes/index.ts`. Add a UI branch in `src/pages/TaxesCountries.tsx`.

## Adding a stress scenario

Append a `StressScenario` (a sequence of `{stocks, bonds, cash, inflation}` years) to
`STRESS_SCENARIOS` in `src/simulation/stress.ts`. It appears in the Assumptions page automatically.
