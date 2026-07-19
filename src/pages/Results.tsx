import { useMemo, useState } from 'react';
import { useScenario } from '../state/ScenarioContext';
import { HowCalculated, Panel, StatCard } from '../components/ui';
import { BandChart, SimpleBarChart, TwoLineChart } from '../components/charts';
import { AllIssues } from './issues';
import { READINESS_META, returnMethodNote } from './readiness';
import { formatCompactCurrency, formatCurrency, formatPercent } from '../utils/format';
import { solveSpendingCurve } from '../simulation/solver';
import { resultsToCSV, downloadText } from '../utils/export';
import { exportScenarioJSON } from '../models/store';
import { SUCCESS_TARGET, useTargetSpending } from '../hooks/useTargetSpending';

export function ResultsPage(): JSX.Element {
  const { scenario, results, running, runFull } = useScenario();
  const [curve, setCurve] = useState<Array<{ probability: number; monthlySpending: number }>>([]);
  const [solving, setSolving] = useState(false);
  const cur = scenario.household.baseCurrency;
  const targetSpending = useTargetSpending(scenario);

  const runSolver = (): void => {
    setSolving(true);
    window.setTimeout(() => {
      try {
        setCurve(solveSpendingCurve(scenario, 'desiredFunded', 800));
      } finally {
        setSolving(false);
      }
    }, 20);
  };

  const meta = results ? READINESS_META[results.readiness] : undefined;

  const desiredVsActual = useMemo(() => {
    if (!results) return [];
    return results.spendingBands
      .filter((b) => b.p50 > 0)
      .map((b) => ({ age: b.age, actual: b.p50, desired: desiredAt(scenario, b.age), low: b.p10 }));
  }, [results, scenario]);

  const depletionData = useMemo(() => {
    if (!results) return [];
    return Object.entries(results.metrics.depletionBefore).map(([age, p]) => ({ age: `<${age}`, prob: p * 100 }));
  }, [results]);

  if (!results) {
    return (
      <div>
        <h1>Results</h1>
        <AllIssues />
        <Panel><p className="muted">{running ? 'Calculating…' : 'Adjust any input to run the simulation. Live previews use up to 1,500 trials.'}</p></Panel>
      </div>
    );
  }

  return (
    <div>
      <div className="topbar">
        <h1 style={{ margin: 0 }}>Results</h1>
        <div className="row-actions no-print">
          <button className="btn small" onClick={runFull}>Run full ({scenario.simulation.trials.toLocaleString()} trials)</button>
          <button className="btn small" onClick={() => downloadText(`${scenario.name}-results.csv`, resultsToCSV(results), 'text/csv')}>Export CSV</button>
          <button className="btn small" onClick={() => downloadText(`${scenario.name}.json`, exportScenarioJSON(scenario), 'application/json')}>Export JSON</button>
        </div>
      </div>

      <AllIssues />

      {meta && (
        <div className="readiness-banner" style={{ background: `color-mix(in srgb, ${meta.color} 12%, var(--panel))`, borderColor: `color-mix(in srgb, ${meta.color} 45%, var(--border))` }}>
          <div className="muted small">Retirement readiness · {results.trials.toLocaleString()} trials · seed {results.seed}</div>
          <div className="status" style={{ color: meta.color }}>{meta.label}</div>
          <div className="muted" style={{ marginTop: 6 }}><strong>Most important risk:</strong> {results.primaryRisk}</div>
          <div className="muted small" style={{ marginTop: 6 }}>{returnMethodNote(scenario.assumptions.returnModel.method)}</div>
        </div>
      )}

      <div className="grid grid-4">
        <StatCard label="Chance of success" value={formatPercent(results.metrics.desiredFunded, 0)} sub={results.metrics.desiredFunded >= SUCCESS_TARGET ? 'Meets the 85% target' : 'Below the 85% target'} tip="Chance that desired spending is fully funded in EVERY retirement year — stricter than the 'portfolio ended above zero' definition used by FIRECalc/Trinity. See 'Portfolio remains positive' in Success metrics for that comparable figure." />
        <StatCard label="Monthly spending at 85%" value={targetSpending.monthly === null ? (targetSpending.solving ? 'Calculating…' : '—') : formatCurrency(targetSpending.monthly, cur)} tip="Approximate max desired monthly spending reaching an 85% chance of full funding. Solved with a reduced-trial search, so treat it as a rounded estimate." />
        <StatCard label="Desired monthly" value={formatCurrency(scenario.spending.desiredMonthly, cur)} />
        <StatCard label="P(essential funded)" value={formatPercent(results.metrics.essentialFunded, 0)} tip="Probability the essential floor is covered every year." />
      </div>
      <div className="grid grid-4" style={{ marginTop: 14 }}>
        <StatCard label="Median ending wealth" value={formatCompactCurrency(results.metrics.medianEndingWealth)} />
        <StatCard label="Worst-decile ending" value={formatCompactCurrency(results.metrics.p10EndingWealth)} />
        <StatCard label="Lifetime taxes (median)" value={formatCompactCurrency(results.metrics.lifetimeTaxesMedian)} />
        <StatCard label="Lifetime fees (median)" value={formatCompactCurrency(results.metrics.lifetimeFeesMedian)} />
      </div>
      <div className="grid grid-4" style={{ marginTop: 14, marginBottom: 4 }}>
        <StatCard label="Max likely spending cut" value={formatPercent(results.metrics.maxRealSpendingCut)} tip="Median across futures of each path's largest single-year cut below desired spending." />
        <StatCard label="Avg years below desired" value={results.metrics.avgYearsBelowDesired.toFixed(1)} />
        <StatCard label="Median first-cut age" value={results.metrics.medianFirstReductionAge ?? '—'} />
        <StatCard label="Funded ratio" value={results.fundedRatio.toFixed(2)} />
      </div>

      <Panel title="Portfolio balance over time" tip="Real (today's) dollars. Shaded bands show the 10th–90th and 25th–75th percentiles across all futures; the line is the median.">
        <BandChart bands={results.balanceBands} label="Median balance" />
        <HowCalculated>
          Each simulated future applies your withdrawal strategy, taxes, and fees month-by-month
          (presented annually), then applies a randomly generated real return for the year. We record
          the ending balance of every path at every age and report percentiles — never thousands of
          individual lines. Values are inflation-adjusted to today's dollars.
        </HowCalculated>
      </Panel>

      <Panel title="Real spending over time" tip="What you actually get to spend each year, in today's dollars, across futures.">
        <BandChart bands={results.spendingBands} label="Median spending" />
      </Panel>

      {desiredVsActual.length > 0 && (
        <Panel title="Desired vs. delivered spending (median & worst decile)">
          <TwoLineChart data={desiredVsActual as unknown as Array<Record<string, number>>} xKey="age" aKey="actual" bKey="desired" aLabel="Median delivered" bLabel="Desired" />
        </Panel>
      )}

      <Panel title="Withdrawal rate over time" tip="Gross withdrawal ÷ start-of-year portfolio. Dynamic strategies push this around to preserve the portfolio.">
        <BandChart bands={results.withdrawalRateBands} label="Median withdrawal rate" yFormat={(v) => `${(v * 100).toFixed(1)}%`} height={240} />
      </Panel>

      {depletionData.length > 0 && (
        <Panel title="Probability of depletion by age">
          <SimpleBarChart data={depletionData} xKey="age" yKey="prob" yFormat={(v) => `${v.toFixed(0)}%`} height={220} color="var(--bad)" />
        </Panel>
      )}

      <Panel title="Success metrics" tip="Success is more than 'a dollar left at the end'. We report spending coverage and stability alongside portfolio survival.">
        <div className="table-scroll">
          <table className="data">
            <tbody>
              <MetricRow label="Portfolio remains positive" value={formatPercent(results.metrics.portfolioSurvival)} />
              <MetricRow label="Essential spending always funded" value={formatPercent(results.metrics.essentialFunded)} />
              <MetricRow label="Desired spending always funded" value={formatPercent(results.metrics.desiredFunded)} />
              <MetricRow label="Spending never below 90% of target" value={formatPercent(results.metrics.spendingAbove90)} />
              <MetricRow label="Spending never below 80% of target" value={formatPercent(results.metrics.spendingAbove80)} />
              <MetricRow label="Median lifetime spending" value={formatCompactCurrency(results.metrics.medianLifetimeSpending)} />
              <MetricRow label="Median depletion age (failed paths)" value={results.metrics.medianDepletionAge ?? 'n/a'} />
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel
        title="Sustainable-spending solver"
        tip="The maximum monthly spending (today's dollars) that still meets each confidence target for funding desired spending."
        actions={<button className="btn small primary no-print" onClick={runSolver} disabled={solving}>{solving ? 'Solving…' : 'Solve spending curve'}</button>}
      >
        {curve.length === 0 && <p className="muted">Runs a binary search across confidence targets. This takes a few seconds.</p>}
        {curve.length > 0 && (
          <div className="table-scroll">
            <table className="data">
              <thead><tr><th>Confidence target</th><th>Max sustainable monthly spending</th></tr></thead>
              <tbody>
                {curve.map((c) => (
                  <tr key={c.probability}>
                    <td>{formatPercent(c.probability, 0)}</td>
                    <td>{formatCurrency(c.monthlySpending, cur)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="muted small" style={{ marginTop: 8 }}>
              A high-confidence target implies meaningful expected surplus (you may be underspending);
              a lower target requires more flexibility and active monitoring. Neither number is a promise.
            </p>
          </div>
        )}
      </Panel>

      <Panel title="Representative paths" tip="Four illustrative futures ranked by ending wealth. These show what changed the outcome — not a claim about causation beyond the model.">
        <div className="grid grid-4">
          <PathCard title="Favorable (90th pct)" p={results.representative.success} cur={cur} />
          <PathCard title="Median (50th pct)" p={results.representative.median} cur={cur} />
          <PathCard title="Borderline (25th pct)" p={results.representative.borderline} cur={cur} />
          <PathCard title="Worst (min ending)" p={results.representative.failure} cur={cur} />
        </div>
      </Panel>
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: React.ReactNode }): JSX.Element {
  return (
    <tr>
      <td>{label}</td>
      <td>{value}</td>
    </tr>
  );
}

function PathCard({ title, p, cur }: { title: string; p: { endingBalance: number; depleted: boolean; depletionAge?: number; minRealSpending: number; maxRealSpendingCut: number; yearsBelowDesired: number }; cur: string }): JSX.Element {
  return (
    <div className="stat">
      <div style={{ fontWeight: 650, marginBottom: 6 }}>{title}</div>
      <div className="small">Ending wealth: <strong>{formatCompactCurrency(p.endingBalance, cur)}</strong></div>
      <div className="small">Min real spending: {formatCompactCurrency(p.minRealSpending, cur)}/yr</div>
      <div className="small">Max spending cut: {formatPercent(p.maxRealSpendingCut)}</div>
      <div className="small">Years below desired: {p.yearsBelowDesired}</div>
      <div className="small">{p.depleted ? `Depleted at age ${p.depletionAge}` : 'Never depleted'}</div>
    </div>
  );
}

/** Desired spending in real dollars at an age, honoring phases & decline. */
function desiredAt(scenario: ReturnType<typeof useScenario>['scenario'], age: number): number {
  const sp = scenario.spending;
  const retAge = scenario.household.people[0]?.retirementAge ?? 65;
  let phaseMult = 1;
  for (const p of [...sp.phases].sort((a, b) => a.startAge - b.startAge)) {
    if (age >= p.startAge) phaseMult = p.multiplier;
  }
  const decline = sp.realDeclineRate ? Math.pow(1 - sp.realDeclineRate, Math.max(0, age - retAge)) : 1;
  return sp.desiredMonthly * 12 * phaseMult * decline;
}
