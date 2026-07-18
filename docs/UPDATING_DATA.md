# Updating the Historical Dataset

The historical rolling-period and bootstrap return models use the annual series in
`src/simulation/historicalData.ts`.

> ⚠️ The bundled series is a **representative approximation** assembled for demonstration and testing.
> It is close in spirit to well-known long-run datasets but is **not** an authoritative or licensed
> reproduction. Replace it with a licensed dataset before relying on the historical methods for real
> analysis.

## Data shape

Each row is one calendar year of **nominal** total returns plus CPI inflation, as decimals:

```ts
export interface HistoricalYear {
  year: number;      // e.g. 1972
  stocks: number;    // nominal total return of a broad equity index, e.g. 0.189
  bonds: number;     // nominal total return of intermediate government bonds
  cash: number;      // nominal T-bill return
  inflation: number; // CPI inflation, e.g. 0.034
}

export const HISTORICAL_SERIES: HistoricalYear[] = [ /* one row per year, ascending */ ];
```

`HISTORICAL_RANGE` (start, end, count) is derived from the array and shown in the UI so the available
range is never silently extrapolated.

## Steps to replace

1. Obtain a licensed annual dataset (equity total return, an intermediate government-bond total
   return, T-bill/cash return, and CPI inflation), ideally spanning many decades.
2. Convert each year to the four decimal fields above.
3. Replace the contents of `HISTORICAL_SERIES`, keeping rows in **ascending year order** with no
   gaps (the engine assumes consecutive years for rolling periods).
4. Update the file's header comment to cite your source and license.
5. Run `npm run test` — the historical/bootstrap generators are exercised through the Monte Carlo
   reproducibility tests. Add a spot-check test if you want to assert specific known years.

## Notes

- The engine blends stock/bond/cash by the allocation's equity/bond/cash buckets; asset classes such
  as REITs, gold, and alternatives are treated as risk assets in historical blending. If you add a
  bond-like class, list its id in `BOND_CLASSES` in `src/simulation/returns.ts`.
- If your horizon exceeds the dataset length, rolling periods wrap around; prefer a dataset at least
  as long as your longest planned retirement to avoid wrapping.
- Real returns are computed per year as `(1 + nominal) / (1 + inflation) − 1`, so the inflation
  column matters as much as the return columns.
