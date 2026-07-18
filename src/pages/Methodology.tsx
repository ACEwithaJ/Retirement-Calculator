import { Panel } from '../components/ui';
import { HISTORICAL_RANGE } from '../simulation/historicalData';
import { GLOSSARY } from './glossary';

export function MethodologyPage(): JSX.Element {
  return (
    <div>
      <h1>Methodology &amp; Glossary</h1>

      <Panel title="What this tool does — and doesn't">
        <p>
          This calculator estimates whether a household's desired monthly spending can be sustained
          across retirement, under explicit and editable assumptions. It is an <strong>educational
          model</strong>, not individualized financial, tax, investment, or legal advice, and it does
          not claim endorsement by any financial educator. It is built in the spirit of low-cost,
          broadly diversified, evidence-oriented investing, and it deliberately implements multiple
          competing methods rather than declaring one universally correct.
        </p>
      </Panel>

      <Panel title="Returns: arithmetic vs. geometric, nominal vs. real">
        <p>
          The <strong>arithmetic</strong> return is the average of single-year returns; the{' '}
          <strong>geometric</strong> return is the compound rate that actually grows wealth and is
          lower by roughly σ²/2 (the "volatility drag"). We generate arithmetic single-year returns
          and let compounding produce the geometric outcome. All portfolio values and spending are
          reported in <strong>real</strong> (today's) dollars; nominal values are used only where
          taxes require them (bracket thresholds are indexed by cumulative inflation).
        </p>
      </Panel>

      <Panel title="Sequence-of-returns risk">
        <p>
          Two retirements with the same average return can end very differently depending on{' '}
          <em>when</em> the poor years arrive. Losses early in retirement, while the portfolio is
          largest and withdrawals are being taken, do disproportionate damage. This is why a fixed
          real-spending plan (the basis of the "4% rule") can fail even when average returns are fine,
          and why spending flexibility helps so much. Explore the "Poor returns in first decade" stress
          scenario to see it directly.
        </p>
      </Panel>

      <Panel title="How futures are generated">
        <ul>
          <li><strong>Parametric Monte Carlo</strong> — draws each year's portfolio return from a distribution (normal, fat-tailed Student's t, or a lognormal wealth process) using your expected returns, volatilities, and the correlation matrix. Optional mild mean reversion.</li>
          <li><strong>Historical rolling periods</strong> — replays consecutive real history from a random start year ({HISTORICAL_RANGE.start}–{HISTORICAL_RANGE.end}). The dataset range is shown and never silently extrapolated.</li>
          <li><strong>Historical bootstrap</strong> — resamples historical years, optionally in multi-year blocks to preserve some sequence behavior.</li>
          <li><strong>Deterministic stress tests</strong> — scripted analogues (Great Depression, 1970s stagflation, dot-com, 2008, lost decade, immediate crashes). These are labeled scenarios, not forecasts.</li>
        </ul>
        <p className="muted small">
          The bundled historical series is a clearly-labeled representative approximation for
          demonstration. Replace it with a licensed dataset for real analysis (see the repo's
          docs/UPDATING_DATA.md).
        </p>
      </Panel>

      <Panel title="Success is not just 'a dollar left at the end'">
        <p>
          We report portfolio survival, but also the probability that essential and desired spending
          are funded every year, how often and how deeply spending falls below target, spending
          stability, and legacy. Dynamic strategies frequently improve portfolio survival by{' '}
          <strong>transferring risk into spending variability</strong> — a strategy that "never runs
          out" (like VPW or a fixed percentage) can still deliver unacceptably low spending in bad
          markets. We surface the lowest-spending outcomes so this trade-off is visible.
        </p>
      </Panel>

      <Panel title="Taxes, international residency, and fees">
        <p>
          Taxes are modeled in three modes: a flat effective rate, a progressive bracket model, and a
          custom international model by income category, country, and age. Country profiles are{' '}
          <strong>simplified examples</strong> — cross-border taxation is genuinely complex and this is
          scenario planning, not tax advice. Withdrawals are taxed by account type and cost basis, and
          taxes and fees are deducted in the correct order (fees on post-withdrawal balances; taxes on
          the withdrawal's composition). Fees compound: a 1% annual advisory fee over decades can
          consume a large share of ending wealth, which the Cost of Advice section quantifies. We do
          not assume advisor value is zero — we separate quantifiable effects from subjective value you
          assign yourself.
        </p>
      </Panel>

      <Panel title="Funded ratio">
        <p>
          The funded ratio is investable assets divided by the present value of projected net portfolio
          withdrawals (spending not covered by guaranteed income), discounted at an assumed real return.
          It is a useful supplementary indicator but is <strong>sensitive to the discount rate</strong>:
          a higher assumed return flatters the ratio. Use it alongside, not instead of, the probability
          metrics.
        </p>
      </Panel>

      <Panel title="Why assumptions matter more than decimals">
        <p>
          The gap between a 90% and a 75% "success probability" is usually smaller than the effect of
          changing your inflation, return, or longevity assumptions. Treat the single success number as
          one input to judgment — not a guarantee — compare multiple calculators and methods, and favor
          flexibility over false precision. Reproducibility is preserved through seeded random numbers:
          the same seed always yields the same results.
        </p>
      </Panel>

      <Panel title="Glossary">
        <dl>
          {GLOSSARY.map((g) => (
            <div key={g.term} style={{ marginBottom: 10 }}>
              <dt style={{ fontWeight: 650 }}>{g.term}</dt>
              <dd style={{ margin: '2px 0 0', color: 'var(--text-dim)' }}>{g.definition}</dd>
            </div>
          ))}
        </dl>
      </Panel>
    </div>
  );
}
