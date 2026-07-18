# Glossary

Plain-language definitions for nontechnical users. These mirror the in-app glossary
(`src/pages/glossary.ts`).

- **Arithmetic return** — The simple average of yearly returns. Higher than the compound (geometric)
  return because of volatility.
- **Geometric return** — The compound annual growth rate — what actually builds wealth over time.
  Lower than the arithmetic return by roughly half the variance.
- **Real vs. nominal** — Real values are adjusted for inflation (today's purchasing power); nominal
  values are not. This tool reports spending and balances in real dollars.
- **Monte Carlo simulation** — Running thousands of randomized futures to estimate the range and
  probability of outcomes, rather than a single point forecast.
- **Bootstrap** — Building simulated futures by resampling actual historical years, optionally in
  multi-year blocks to keep some real sequencing.
- **Sequence-of-returns risk** — The danger that poor returns early in retirement — while withdrawals
  are taken from a large balance — permanently damage the plan, even if average returns are fine.
- **Success probability** — The share of simulated futures meeting a goal (e.g. funding desired
  spending every year). A probability under assumptions, not a guarantee.
- **Withdrawal rate** — The percentage of the portfolio withdrawn in a year. The "4% rule" is a
  starting heuristic, not a universal guarantee.
- **Guardrails (Guyton-Klinger)** — Rules that cut spending after the withdrawal rate climbs too high
  (bad markets) and raise it when the rate falls too low (good markets).
- **VPW (Variable Percentage Withdrawal)** — A rule where the withdrawal percentage rises with age,
  spending the portfolio down by plan-end. It never technically runs out, but spending can swing.
- **RMD method** — Withdrawing the portfolio divided by a life-expectancy factor each year, similar
  to Required Minimum Distributions.
- **Funded ratio** — Assets divided by the present value of future net withdrawals. Above 1 suggests
  the plan is over-funded — but it depends on the discount rate chosen.
- **Essential vs. discretionary spending** — Essential is what you must cover (housing, food,
  healthcare); discretionary is flexible (travel, gifts). Guaranteed income is applied to essentials
  first.
- **Cost basis** — The original amount invested in a taxable account. Only the gain above basis is
  taxed when you sell.
- **AUM fee** — An advisor fee charged as a percentage of assets under management. Compounds over
  time and can be a large lifetime cost.
- **Glidepath** — A planned change in the stock/bond mix over time — for example, holding more bonds
  near retirement, then rising equity afterward.
- **Legacy** — Wealth remaining at the end of the plan that can be left to heirs or charity.
