import { useScenario } from '../state/ScenarioContext';
import { Checkbox, NumberField, Panel, PercentField, SelectField } from '../components/ui';
import { InlineIssues } from './issues';
import type { TaxMode } from '../types';

export function TaxesCountriesPage(): JSX.Element {
  const { scenario, updateDeep } = useScenario();
  const t = scenario.taxes;

  return (
    <div>
      <h1>Taxes &amp; Countries</h1>
      <InlineIssues prefix="taxes" />
      <div className="disclaimer">
        Country profiles are <strong>simplified examples for scenario planning</strong>, not
        authoritative tax calculations. Cross-border taxation depends on treaties, residency
        rules, and account recognition (e.g. a Roth IRA is often not tax-free abroad). Treat this
        as scenario planning and consult a cross-border tax professional.
      </div>

      <Panel title="Tax mode">
        <SelectField<TaxMode>
          label="Tax model"
          value={t.mode}
          onChange={(v) => updateDeep((d) => { d.taxes.mode = v; })}
          options={[
            { value: 'flat', label: 'A · Flat effective rate' },
            { value: 'marginal', label: 'B · Marginal brackets' },
            { value: 'custom', label: 'C · Custom international' },
          ]}
        />

        {t.mode === 'flat' && (
          <div className="grid grid-2" style={{ marginTop: 12 }}>
            <PercentField label="Effective tax rate" value={t.flat.effectiveRate} onChange={(v) => updateDeep((d) => { d.taxes.flat.effectiveRate = v; })} />
          </div>
        )}

        {t.mode === 'marginal' && (
          <div style={{ marginTop: 12 }}>
            <div className="grid grid-3">
              <NumberField label="Standard deduction" value={t.marginal.standardDeduction} step={500} onChange={(v) => updateDeep((d) => { d.taxes.marginal.standardDeduction = v; })} />
              <PercentField label="State / regional rate" value={t.marginal.stateRate} onChange={(v) => updateDeep((d) => { d.taxes.marginal.stateRate = v; })} />
              <Checkbox label="Inflation-index brackets" checked={t.marginal.inflationIndexed} onChange={(v) => updateDeep((d) => { d.taxes.marginal.inflationIndexed = v; })} />
            </div>
            <h3 style={{ marginTop: 14 }}>Ordinary-income brackets</h3>
            <div className="table-scroll">
              <table className="data">
                <thead><tr><th>Threshold</th><th>Rate</th></tr></thead>
                <tbody>
                  {t.marginal.ordinaryBrackets.map((b, i) => (
                    <tr key={i}>
                      <td>${b.threshold.toLocaleString()}</td>
                      <td>{(b.rate * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="muted small">Default brackets are illustrative single-filer US brackets. Capital gains use a separate preferential schedule.</p>
          </div>
        )}

        {t.mode === 'custom' && (
          <div style={{ marginTop: 12 }}>
            <p className="muted small">Custom rules override the country profile's effective rates by income category. Add a rule for a country + category (ordinary, capitalGains, dividends, pension, taxDeferred, taxFree, socialSecurity, rental, annuity).</p>
            {t.custom.rules.map((r, i) => (
              <div key={i} className="grid grid-4" style={{ marginBottom: 8 }}>
                <SelectField label="Country" value={r.countryId} onChange={(v) => updateDeep((d) => { d.taxes.custom.rules[i].countryId = v; })} options={scenario.countries.map((c) => ({ value: c.id, label: c.name }))} />
                <SelectField label="Category" value={r.incomeCategory} onChange={(v) => updateDeep((d) => { d.taxes.custom.rules[i].incomeCategory = v; })} options={['ordinary', 'capitalGains', 'dividends', 'pension', 'taxDeferred', 'taxFree', 'socialSecurity', 'rental', 'annuity'].map((c) => ({ value: c, label: c }))} />
                <PercentField label="Rate" value={r.rate} onChange={(v) => updateDeep((d) => { d.taxes.custom.rules[i].rate = v; })} />
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                  <NumberField label="From age" value={r.fromAge ?? 0} onChange={(v) => updateDeep((d) => { d.taxes.custom.rules[i].fromAge = v || undefined; })} />
                  <button className="btn small" onClick={() => updateDeep((d) => { d.taxes.custom.rules.splice(i, 1); })}>×</button>
                </div>
              </div>
            ))}
            <button className="btn small" onClick={() => updateDeep((d) => { d.taxes.custom.rules.push({ countryId: scenario.household.retirementCountryId, incomeCategory: 'ordinary', rate: 0.3 }); })}>Add rule</button>
          </div>
        )}

        <div className="grid grid-3" style={{ marginTop: 14 }}>
          <Checkbox label="Model required minimum distributions" checked={t.enableRMD} onChange={(v) => updateDeep((d) => { d.taxes.enableRMD = v; })} />
          <NumberField label="RMD start age" value={t.rmdStartAge} onChange={(v) => updateDeep((d) => { d.taxes.rmdStartAge = v; })} />
        </div>
      </Panel>

      <Panel title="Country profiles (simplified)" tip="Edit any profile's effective rates and cost-of-living to fit your situation.">
        <div className="table-scroll">
          <table className="data">
            <thead>
              <tr><th>Country</th><th>Currency</th><th>Ordinary</th><th>Cap gains</th><th>Pension</th><th>Wealth</th><th>Cost of living</th></tr>
            </thead>
            <tbody>
              {scenario.countries.map((c, i) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>{c.currency}</td>
                  <td><EditPct value={c.ordinaryRate} onChange={(v) => updateDeep((d) => { d.countries[i].ordinaryRate = v; })} /></td>
                  <td><EditPct value={c.capitalGainsRate} onChange={(v) => updateDeep((d) => { d.countries[i].capitalGainsRate = v; })} /></td>
                  <td><EditPct value={c.pensionRate} onChange={(v) => updateDeep((d) => { d.countries[i].pensionRate = v; })} /></td>
                  <td><EditPct value={c.wealthTaxRate} onChange={(v) => updateDeep((d) => { d.countries[i].wealthTaxRate = v; })} /></td>
                  <td><EditNum value={c.costOfLivingMultiplier} onChange={(v) => updateDeep((d) => { d.countries[i].costOfLivingMultiplier = v; })} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {scenario.countries.filter((c) => c.notes).map((c) => (
          <p key={c.id} className="muted small" style={{ marginTop: 6 }}><strong>{c.name}:</strong> {c.notes}</p>
        ))}
      </Panel>
    </div>
  );
}

function EditPct({ value, onChange }: { value: number; onChange: (v: number) => void }): JSX.Element {
  return <input className="inp" style={{ width: 64 }} type="number" step={0.5} value={+(value * 100).toFixed(2)} onChange={(e) => onChange(Number(e.target.value) / 100)} />;
}
function EditNum({ value, onChange }: { value: number; onChange: (v: number) => void }): JSX.Element {
  return <input className="inp" style={{ width: 64 }} type="number" step={0.05} value={value} onChange={(e) => onChange(Number(e.target.value))} />;
}
