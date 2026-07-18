import { useMemo, useState } from 'react';
import { useScenario } from '../state/ScenarioContext';
import { NumberField, Panel, PercentField, SelectField, StatCard } from '../components/ui';
import { InlineIssues } from './issues';
import { compareFees } from '../simulation/compare';
import { formatCompactCurrency, formatPercent } from '../utils/format';
import type { FeeModelType } from '../types';

export function FeesPage(): JSX.Element {
  const { scenario, updateDeep } = useScenario();
  const f = scenario.fees;
  const [ran, setRan] = useState(false);
  const rows = useMemo(() => (ran ? compareFees(scenario, 1200) : []), [ran, scenario]);

  const portfolio = scenario.accounts.reduce((a, x) => a + x.balance, 0);

  return (
    <div>
      <h1>Fees &amp; Advice</h1>
      <InlineIssues prefix="fees" />

      <Panel title="Your fee configuration">
        <div className="grid grid-3">
          <SelectField<FeeModelType>
            label="Advisor model"
            value={f.model}
            onChange={(v) => updateDeep((d) => { d.fees.model = v; })}
            options={[
              { value: 'none', label: 'Self-directed (no advisor)' },
              { value: 'aum', label: 'AUM %' },
              { value: 'robo', label: 'Robo-advisor' },
              { value: 'flatRetainer', label: 'Flat annual retainer' },
              { value: 'subscription', label: 'Monthly subscription' },
              { value: 'hourly', label: 'Hourly / project' },
            ]}
          />
          <PercentField label="AUM / robo rate" value={f.aumRate} step={0.05} onChange={(v) => updateDeep((d) => { d.fees.aumRate = v; })} />
          <NumberField label="Flat annual fee" value={f.flatAnnual} step={500} onChange={(v) => updateDeep((d) => { d.fees.flatAnnual = v; })} />
          <PercentField label="Fund expense ratio" value={f.fundExpenseRatio} step={0.01} onChange={(v) => updateDeep((d) => { d.fees.fundExpenseRatio = v; })} tip="The weighted expense ratio of your funds. Distinct from the advisor fee, and applies even without an advisor." />
          <PercentField label="Platform fee" value={f.platformFee} step={0.01} onChange={(v) => updateDeep((d) => { d.fees.platformFee = v; })} />
          <PercentField label="Estimated advisor value added" value={f.advisorValueAdded} step={0.05} onChange={(v) => updateDeep((d) => { d.fees.advisorValueAdded = v; })} tip="A SUBJECTIVE estimate of annual value an advisor adds (tax management, behavioral coaching, planning). Label it as your assumption, not a fact." />
        </div>
      </Panel>

      <Panel title="Cost of advice — comparison" tip="Re-runs the plan under standard fee arrangements so you can see the compounding drag." actions={<button className="btn small primary" onClick={() => setRan(true)}>Run comparison</button>}>
        {!ran && <p className="muted">Click “Run comparison” to model your plan under a self-directed portfolio, a robo-advisor, and 0.50% / 1.00% / 1.50% AUM and flat-fee advisors.</p>}
        {ran && (
          <div className="table-scroll">
            <table className="data">
              <thead>
                <tr>
                  <th>Arrangement</th>
                  <th>Median lifetime fees</th>
                  <th>Median ending wealth</th>
                  <th>Ending-wealth reduction</th>
                  <th>P(desired funded)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.label}</td>
                    <td>{formatCompactCurrency(r.lifetimeFees)}</td>
                    <td>{formatCompactCurrency(r.medianEndingWealth)}</td>
                    <td>{r.endingWealthReduction > 0 ? `− ${formatCompactCurrency(r.endingWealthReduction)}` : '—'}</td>
                    <td>{formatPercent(r.desiredSuccess)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title="Break-even value of advice">
        <div className="grid grid-3">
          <StatCard label="Current portfolio" value={formatCompactCurrency(portfolio)} />
          <StatCard
            label="Annual advisor fee at current rate"
            value={f.model === 'aum' || f.model === 'robo' ? formatCompactCurrency(portfolio * f.aumRate) : formatCompactCurrency(f.flatAnnual)}
          />
          <StatCard
            label="Value advisor must add to break even"
            value={f.model === 'aum' || f.model === 'robo' ? formatPercent(f.aumRate) : formatCompactCurrency(f.flatAnnual)}
            tip="An advisor need not add zero value. This is the annual return (or dollar) improvement the advisor must deliver — through tax management, behavioral coaching, planning — just to offset the fee."
          />
        </div>
        <p className="muted small" style={{ marginTop: 10 }}>
          Fees compound: a 1% annual fee over a multi-decade retirement can consume a large share of
          ending wealth. Separate quantifiable investment/tax effects from potential behavioral and
          planning value, and from convenience. Assign your own value estimate above — but label it
          as a subjective assumption.
        </p>
      </Panel>
    </div>
  );
}
