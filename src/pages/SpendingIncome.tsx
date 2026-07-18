import { useScenario } from '../state/ScenarioContext';
import { Checkbox, NumberField, Panel, PercentField, SelectField, TextField } from '../components/ui';
import { InlineIssues } from './issues';
import type { IncomeType, SpendingBasis } from '../types';

const INCOME_TYPES: Array<{ value: IncomeType; label: string }> = [
  { value: 'socialSecurity', label: 'Social Security / state pension' },
  { value: 'pension', label: 'Pension' },
  { value: 'annuity', label: 'Annuity' },
  { value: 'partTime', label: 'Part-time work' },
  { value: 'consulting', label: 'Consulting' },
  { value: 'rental', label: 'Rental income' },
  { value: 'business', label: 'Business income' },
  { value: 'inheritance', label: 'Inheritance (one-time)' },
  { value: 'other', label: 'Other guaranteed income' },
];

export function SpendingIncomePage(): JSX.Element {
  const { scenario, updateDeep } = useScenario();
  const sp = scenario.spending;

  return (
    <div>
      <h1>Spending &amp; Income</h1>
      <InlineIssues prefix="spending" />

      <Panel title="Monthly spending (the central input)" tip="Spending is modeled in today's dollars. The essential floor is what you must cover; desired is your target lifestyle.">
        <div className="grid grid-3">
          <NumberField label="Desired monthly" value={sp.desiredMonthly} step={100} onChange={(v) => updateDeep((d) => { d.spending.desiredMonthly = v; })} />
          <NumberField label="Essential monthly (floor)" value={sp.essentialMonthly} step={100} onChange={(v) => updateDeep((d) => { d.spending.essentialMonthly = v; })} />
          <PercentField label="Real decline per year" value={sp.realDeclineRate ?? 0} step={0.1} onChange={(v) => updateDeep((d) => { d.spending.realDeclineRate = v; })} tip="Optional: many retirees spend less in real terms as they age (the 'go-go / slow-go / no-go' pattern)." />
        </div>
        <div className="grid grid-2" style={{ marginTop: 12 }}>
          <SelectField<SpendingBasis>
            label="Spending basis"
            value={sp.basis}
            onChange={(v) => updateDeep((d) => { d.spending.basis = v; })}
            options={[{ value: 'after-tax', label: 'After-tax spending' }, { value: 'before-tax', label: 'Before-tax withdrawal need' }]}
            tip="After-tax means the number is what you get to spend; the engine grosses up withdrawals to cover taxes."
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'flex-end' }}>
            <Checkbox label="Figure includes advisory fees" checked={sp.includesAdvisoryFees} onChange={(v) => updateDeep((d) => { d.spending.includesAdvisoryFees = v; })} />
            <Checkbox label="Figure includes housing" checked={sp.includesHousing} onChange={(v) => updateDeep((d) => { d.spending.includesHousing = v; })} />
          </div>
        </div>
      </Panel>

      <Panel title="Retirement spending phases" tip="Apply a multiplier to spending starting at each age — e.g. lower travel spending later in life.">
        {[...sp.phases].map((p, i) => (
          <div key={i} className="grid grid-3" style={{ marginBottom: 8 }}>
            <TextField label="Label" value={p.label} onChange={(v) => updateDeep((d) => { d.spending.phases[i].label = v; })} />
            <NumberField label="Starts at age" value={p.startAge} onChange={(v) => updateDeep((d) => { d.spending.phases[i].startAge = v; })} />
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <PercentField label="Multiplier" value={p.multiplier} onChange={(v) => updateDeep((d) => { d.spending.phases[i].multiplier = v; })} />
              <button className="btn small" onClick={() => updateDeep((d) => { d.spending.phases.splice(i, 1); })}>×</button>
            </div>
          </div>
        ))}
        <button className="btn small" onClick={() => updateDeep((d) => { d.spending.phases.push({ startAge: 75, multiplier: 0.9, label: 'New phase' }); })}>Add phase</button>
      </Panel>

      <Panel title="Income sources" tip="Guaranteed and expected income offsets portfolio withdrawals. Social Security is disabled by default — enable and configure it.">
        {scenario.incomeSources.map((src, i) => (
          <div key={src.id} className="panel" style={{ background: 'var(--panel-2)' }}>
            <div className="grid grid-3">
              <TextField label="Label" value={src.label} onChange={(v) => updateDeep((d) => { d.incomeSources[i].label = v; })} />
              <SelectField<IncomeType> label="Type" value={src.type} onChange={(v) => updateDeep((d) => { d.incomeSources[i].type = v; })} options={INCOME_TYPES} />
              <NumberField label="Monthly amount" value={src.monthlyAmount} step={100} onChange={(v) => updateDeep((d) => { d.incomeSources[i].monthlyAmount = v; })} />
              <NumberField label="Start age" value={src.startAge} onChange={(v) => updateDeep((d) => { d.incomeSources[i].startAge = v; })} />
              <NumberField label="End age (optional)" value={src.endAge ?? 0} onChange={(v) => updateDeep((d) => { d.incomeSources[i].endAge = v || undefined; })} />
              <PercentField label="Inflation-adjusted %" value={src.inflationAdjust} onChange={(v) => updateDeep((d) => { d.incomeSources[i].inflationAdjust = v; })} tip="Fraction of the benefit that keeps pace with inflation (1 = fully COLA-adjusted)." />
              <PercentField label="Taxable %" value={src.taxablePortion} onChange={(v) => updateDeep((d) => { d.incomeSources[i].taxablePortion = v; })} />
              <PercentField label="Survivor %" value={src.survivorFraction} onChange={(v) => updateDeep((d) => { d.incomeSources[i].survivorFraction = v; })} tip="Fraction that continues if a spouse dies." />
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
                <Checkbox label="Enabled" checked={src.enabled} onChange={(v) => updateDeep((d) => { d.incomeSources[i].enabled = v; })} />
                <button className="btn small" onClick={() => updateDeep((d) => { d.incomeSources.splice(i, 1); })}>Remove</button>
              </div>
            </div>
          </div>
        ))}
        <button className="btn small" onClick={() => updateDeep((d) => {
          d.incomeSources.push({ id: `inc-${Date.now()}`, label: 'New income', type: 'other', monthlyAmount: 1000, startAge: 65, inflationAdjust: 1, taxablePortion: 1, survivorFraction: 1, currency: scenario.household.baseCurrency, enabled: true });
        })}>Add income source</button>
      </Panel>
    </div>
  );
}
