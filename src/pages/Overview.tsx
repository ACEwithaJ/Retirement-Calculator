import { useScenario } from '../state/ScenarioContext';
import { Disclaimer, Panel, StatCard } from '../components/ui';
import { formatCompactCurrency, formatCurrency, formatPercent } from '../utils/format';
import { sampleScenarios } from '../models/scenarios';
import { READINESS_META } from './readiness';

export function OverviewPage({ onNavigate }: { onNavigate: (r: string) => void }): JSX.Element {
  const { scenario, results, loadScenario, resetDefault } = useScenario();
  const meta = results ? READINESS_META[results.readiness] : undefined;

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
        </div>
      )}

      <div className="grid grid-4" style={{ marginBottom: 18 }}>
        <StatCard
          label="Desired monthly (after-tax)"
          value={formatCurrency(scenario.spending.desiredMonthly, scenario.household.baseCurrency)}
          tip="The central planning input: the monthly amount you want to spend, in today's dollars."
        />
        <StatCard
          label="Median sustainable monthly"
          value={results ? formatCurrency(results.metrics.medianLifetimeSpending / Math.max(1, spendingYears(scenario)) / 12, scenario.household.baseCurrency) : '—'}
          tip="Median of average yearly spending actually delivered across all simulated futures, per month."
        />
        <StatCard
          label="P(desired funded)"
          value={results ? formatPercent(results.metrics.desiredFunded) : '—'}
          tip="Share of simulated futures in which desired spending is fully funded every year. A probability, not a guarantee."
        />
        <StatCard
          label="P(essential funded)"
          value={results ? formatPercent(results.metrics.essentialFunded) : '—'}
          tip="Share of simulated futures in which your essential spending floor is always covered."
        />
      </div>

      <div className="grid grid-4" style={{ marginBottom: 18 }}>
        <StatCard label="P(portfolio positive)" value={results ? formatPercent(results.metrics.portfolioSurvival) : '—'} />
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

function spendingYears(scenario: ReturnType<typeof useScenario>['scenario']): number {
  const ret = scenario.household.people[0]?.retirementAge ?? 65;
  const end = scenario.household.planningEndAge ?? 100;
  return Math.max(1, end - ret);
}
