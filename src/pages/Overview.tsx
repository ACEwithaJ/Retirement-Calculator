import { useScenario } from '../state/ScenarioContext';
import { Disclaimer, Panel, StatCard } from '../components/ui';
import { formatCompactCurrency, formatCurrency, formatPercent } from '../utils/format';
import { sampleScenarios } from '../models/scenarios';
import { READINESS_META, returnMethodNote } from './readiness';
import { SUCCESS_TARGET, useTargetSpending } from '../hooks/useTargetSpending';

export function OverviewPage({ onNavigate }: { onNavigate: (r: string) => void }): JSX.Element {
  const { scenario, results, loadScenario, resetDefault } = useScenario();
  const meta = results ? READINESS_META[results.readiness] : undefined;
  const targetSpending = useTargetSpending(scenario);

  return (
    <div>
      <h1>Overview</h1>
      <Disclaimer />

      {results && meta && (
        <div
          className="readiness-banner"
          style={{ background: `color-mix(in srgb, ${meta.color} 12%, var(--panel))`, borderColor: `color-mix(in srgb, ${meta.color} 45%, var(--border))` }}
        >
          <div className="muted small">Retirement readiness</div>
          <div className="status" style={{ color: meta.color }}>{meta.label}</div>
          <div className="muted" style={{ marginTop: 6 }}>{results.primaryRisk}</div>
          <div className="muted small" style={{ marginTop: 6 }}>{returnMethodNote(scenario.assumptions.returnModel.method)}</div>
        </div>
      )}

      <div className="grid grid-4" style={{ marginBottom: 18 }}>
        <StatCard
          label="Chance of success"
          value={results ? formatPercent(results.metrics.desiredFunded, 0) : '—'}
          sub={results ? (results.metrics.desiredFunded >= SUCCESS_TARGET ? 'At or above the 85% planning target' : 'Below the 85% planning target') : undefined}
          tip="The share of simulations that fully fund desired spending in EVERY retirement year — a stricter test than most calculators. FIRECalc/Trinity-style tools instead report 'portfolio ended above zero'; see 'P(portfolio positive)' below for that comparable figure."
        />
        <StatCard
          label="Monthly spending at 85%"
          value={targetSpending.monthly === null ? (targetSpending.solving ? 'Calculating…' : '—') : formatCurrency(targetSpending.monthly, scenario.household.baseCurrency)}
          tip="Estimated maximum desired monthly spending that reaches an 85% chance of fully funding the target in a reduced-trial solver run."
        />
        <StatCard
          label="Desired monthly spending"
          value={formatCurrency(scenario.spending.desiredMonthly, scenario.household.baseCurrency)}
          tip="Your target lifestyle spending in today's dollars."
        />
        <StatCard
          label="P(essential funded)"
          value={results ? formatPercent(results.metrics.essentialFunded, 0) : '—'}
          tip="Share of simulated futures in which your essential spending floor is always covered."
        />
      </div>

      <div className="grid grid-4" style={{ marginBottom: 18 }}>
        <StatCard label="P(portfolio positive)" value={results ? formatPercent(results.metrics.portfolioSurvival, 0) : '—'} tip="Share of futures where the portfolio never hits zero. This is the definition FIRECalc, cFIREsim, and the Trinity Study use — use it when comparing to those tools." />
        <StatCard label="Median ending wealth" value={results ? formatCompactCurrency(results.metrics.medianEndingWealth) : '—'} />
        <StatCard label="Worst-decile ending" value={results ? formatCompactCurrency(results.metrics.p10EndingWealth) : '—'} />
        <StatCard label="Funded ratio" value={results ? results.fundedRatio.toFixed(2) : '—'} tip="Assets ÷ present value of net withdrawals. Depends on the discount rate; use as one indicator among many." />
      </div>

      <Panel title="Where to go next">
        <div className="grid grid-3">
          <NextCard title="Set up your household" body="Ages, retirement dates, longevity, and where you live." onClick={() => onNavigate('household')} />
          <NextCard title="Enter spending & income" body="Your desired monthly spending is the heart of the plan." onClick={() => onNavigate('spending')} />
          <NextCard title="Review the results" body="Probabilities, charts, and the sustainable-spending solver." onClick={() => onNavigate('results')} />
        </div>
      </Panel>

      <Panel title="Sample scenarios" tip="Load an illustrative starting point. Everything remains fully editable.">
        <div className="grid grid-2">
          {sampleScenarios().map((s) => (
            <button key={s.id} className="btn" style={{ textAlign: 'left' }} onClick={() => loadScenario(s)}>
              {s.name}
            </button>
          ))}
        </div>
        <div style={{ marginTop: 12 }}>
          <button className="btn" onClick={resetDefault}>Reset to demonstration default</button>
        </div>
      </Panel>
    </div>
  );
}

function NextCard({ title, body, onClick }: { title: string; body: string; onClick: () => void }): JSX.Element {
  return (
    <button className="stat" style={{ textAlign: 'left', cursor: 'pointer' }} onClick={onClick}>
      <div style={{ fontWeight: 650, marginBottom: 4 }}>{title}</div>
      <div className="muted small">{body}</div>
    </button>
  );
}
