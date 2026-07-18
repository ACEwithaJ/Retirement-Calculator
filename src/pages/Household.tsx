import { useScenario } from '../state/ScenarioContext';
import { NumberField, Panel, SelectField, TextField } from '../components/ui';
import { InlineIssues } from './issues';
import type { MaritalStatus } from '../types';

export function HouseholdPage(): JSX.Element {
  const { scenario, updateDeep } = useScenario();
  const h = scenario.household;
  const countryOpts = scenario.countries.map((c) => ({ value: c.id, label: c.name }));

  return (
    <div>
      <h1>Household</h1>
      <InlineIssues prefix="person" />
      <InlineIssues prefix="planningEndAge" />

      {h.people.map((p, i) => (
        <Panel key={p.id} title={p.label}>
          <div className="grid grid-4">
            <TextField label="Label" value={p.label} onChange={(v) => updateDeep((d) => { d.household.people[i].label = v; })} />
            <NumberField label="Current age" value={p.currentAge} min={0} max={120} onChange={(v) => updateDeep((d) => { d.household.people[i].currentAge = v; })} />
            <NumberField label="Retirement age" value={p.retirementAge} min={0} max={120} onChange={(v) => updateDeep((d) => { d.household.people[i].retirementAge = v; })} tip="Retirement is driven by Person 1's retirement age in this model." />
            <NumberField label="Longevity age" value={p.longevityAge} min={0} max={120} onChange={(v) => updateDeep((d) => { d.household.people[i].longevityAge = v; })} tip="The age through which this person is modeled as alive. When one spouse dies, spending falls to 75% and survivor income fractions apply." />
          </div>
          {h.people.length > 1 && (
            <button className="btn small" style={{ marginTop: 10 }} onClick={() => updateDeep((d) => { d.household.people.splice(i, 1); })}>Remove person</button>
          )}
        </Panel>
      ))}

      {h.people.length < 2 && (
        <button className="btn" style={{ marginBottom: 18 }} onClick={() => updateDeep((d) => {
          d.household.people.push({ id: `p${d.household.people.length + 1}`, label: `Person ${d.household.people.length + 1}`, currentAge: 47, retirementAge: 55, longevityAge: 95 });
        })}>Add spouse / partner</button>
      )}

      <Panel title="Planning parameters">
        <div className="grid grid-3">
          <SelectField<MaritalStatus>
            label="Marital status"
            value={h.maritalStatus}
            onChange={(v) => updateDeep((d) => { d.household.maritalStatus = v; })}
            options={[
              { value: 'single', label: 'Single' },
              { value: 'married', label: 'Married' },
              { value: 'partnered', label: 'Partnered' },
            ]}
          />
          <NumberField label="Dependents" value={h.dependents} min={0} onChange={(v) => updateDeep((d) => { d.household.dependents = v; })} />
          <NumberField label="Planning end age" value={h.planningEndAge ?? 100} min={1} max={120} onChange={(v) => updateDeep((d) => { d.household.planningEndAge = v; })} tip="The horizon of the plan. For early retirement, model to 100–105 to stress longevity." />
          <SelectField label="Current country" value={h.currentCountryId} onChange={(v) => updateDeep((d) => { d.household.currentCountryId = v; })} options={countryOpts} />
          <SelectField label="Retirement country" value={h.retirementCountryId} onChange={(v) => updateDeep((d) => { d.household.retirementCountryId = v; })} options={countryOpts} />
          <TextField label="Base reporting currency" value={h.baseCurrency} onChange={(v) => updateDeep((d) => { d.household.baseCurrency = v; })} />
        </div>
      </Panel>

      <Panel title="Residency transitions" tip="Model moving between countries at specific ages. Tax rules change at each transition date.">
        {h.countryTransitions.map((t, i) => (
          <div key={i} className="grid grid-3" style={{ marginBottom: 8 }}>
            <SelectField label="Country" value={t.countryId} onChange={(v) => updateDeep((d) => { d.household.countryTransitions[i].countryId = v; })} options={countryOpts} />
            <NumberField label="Effective at age (Person 1)" value={t.effectiveAge} onChange={(v) => updateDeep((d) => { d.household.countryTransitions[i].effectiveAge = v; })} />
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button className="btn small" onClick={() => updateDeep((d) => { d.household.countryTransitions.splice(i, 1); })}>Remove</button>
            </div>
          </div>
        ))}
        <button className="btn small" onClick={() => updateDeep((d) => { d.household.countryTransitions.push({ countryId: h.retirementCountryId, effectiveAge: (h.people[0]?.retirementAge ?? 65) }); })}>Add transition</button>
      </Panel>
    </div>
  );
}
