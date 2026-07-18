import { useScenario } from '../state/ScenarioContext';
import { Checkbox, NumberField, Panel, PercentField, SelectField } from '../components/ui';
import { applyAssumptionPreset, PRESET_LABELS } from '../models/presets';
import type { AssumptionPresetId, DistributionType, ReturnMethod } from '../types';
import { STRESS_SCENARIOS } from '../simulation/stress';
import { HISTORICAL_RANGE } from '../simulation/historicalData';

export function AssumptionsPage(): JSX.Element {
  const { scenario, update, updateDeep } = useScenario();
  const a = scenario.assumptions;

  return (
    <div>
      <h1>Assumptions</h1>
      <div className="disclaimer">
        These are modeling assumptions, not forecasts. The default preset is <strong>Moderate</strong>.
        The app never silently selects optimistic assumptions — you always see which preset is active.
      </div>

      <Panel title="Assumption preset">
        <SelectField<AssumptionPresetId>
          label="Preset"
          value={a.presetId}
          onChange={(v) => update({ assumptions: applyAssumptionPreset(a, v) })}
          options={(Object.keys(PRESET_LABELS) as AssumptionPresetId[]).map((id) => ({ value: id, label: PRESET_LABELS[id] }))}
        />
      </Panel>

      <Panel title="Return model" tip="How future returns are generated. Compare methods — none is guaranteed to predict the future.">
        <div className="grid grid-2">
          <SelectField<ReturnMethod>
            label="Method"
            value={a.returnModel.method}
            onChange={(v) => updateDeep((d) => { d.assumptions.returnModel.method = v; })}
            options={[
              { value: 'parametric', label: 'Parametric Monte Carlo' },
              { value: 'historical', label: `Historical rolling (${HISTORICAL_RANGE.start}–${HISTORICAL_RANGE.end})` },
              { value: 'bootstrap', label: 'Historical bootstrap' },
              { value: 'stress', label: 'Deterministic stress test' },
            ]}
          />
          {a.returnModel.method === 'parametric' && (
            <SelectField<DistributionType>
              label="Distribution"
              value={a.returnModel.distribution}
              onChange={(v) => updateDeep((d) => { d.assumptions.returnModel.distribution = v; })}
              options={[
                { value: 'normal', label: 'Normal' },
                { value: 'studentT', label: "Student's t (fat tails)" },
                { value: 'lognormal', label: 'Lognormal wealth process' },
              ]}
            />
          )}
          {a.returnModel.method === 'bootstrap' && (
            <NumberField label="Block size (years)" value={a.returnModel.bootstrapBlockSize} min={1} onChange={(v) => updateDeep((d) => { d.assumptions.returnModel.bootstrapBlockSize = v; })} tip="Sampling in multi-year blocks preserves some sequence behavior instead of shuffling single years." />
          )}
          {a.returnModel.method === 'stress' && (
            <SelectField
              label="Stress scenario"
              value={a.returnModel.stressScenarioId ?? STRESS_SCENARIOS[0].id}
              onChange={(v) => updateDeep((d) => { d.assumptions.returnModel.stressScenarioId = v; })}
              options={STRESS_SCENARIOS.map((s) => ({ value: s.id, label: s.label }))}
            />
          )}
          {a.returnModel.method === 'parametric' && a.returnModel.distribution === 'studentT' && (
            <NumberField label="Student's t d.o.f." value={a.returnModel.studentTDf} min={3} onChange={(v) => updateDeep((d) => { d.assumptions.returnModel.studentTDf = v; })} />
          )}
        </div>
        {a.returnModel.method === 'parametric' && (
          <div style={{ marginTop: 10 }}>
            <Checkbox label="Enable mild mean reversion" checked={a.returnModel.meanReversion} onChange={(v) => updateDeep((d) => { d.assumptions.returnModel.meanReversion = v; })} />
          </div>
        )}
      </Panel>

      <Panel title="Inflation">
        <div className="grid grid-3">
          <PercentField label="General inflation" value={a.inflation.general} onChange={(v) => updateDeep((d) => { d.assumptions.inflation.general = v; })} />
          <PercentField label="Healthcare inflation" value={a.inflation.healthcare} onChange={(v) => updateDeep((d) => { d.assumptions.inflation.healthcare = v; })} />
          <PercentField label="Housing inflation" value={a.inflation.housing} onChange={(v) => updateDeep((d) => { d.assumptions.inflation.housing = v; })} />
          <PercentField label="Education inflation" value={a.inflation.education} onChange={(v) => updateDeep((d) => { d.assumptions.inflation.education = v; })} />
          <PercentField label="Inflation volatility" value={a.inflation.volatility} onChange={(v) => updateDeep((d) => { d.assumptions.inflation.volatility = v; })} />
          <Checkbox label="Stochastic inflation" checked={a.inflation.stochastic} onChange={(v) => updateDeep((d) => { d.assumptions.inflation.stochastic = v; })} />
        </div>
      </Panel>

      <Panel title="Currency (for international retirement)" tip="Exchange rates are not predictable. Treat these as scenario variables, not forecasts.">
        <div className="grid grid-3">
          <NumberField label="Initial rate (spend/base)" value={a.currency.initialRate} step={0.01} onChange={(v) => updateDeep((d) => { d.assumptions.currency.initialRate = v; })} />
          <PercentField label="Expected trend" value={a.currency.expectedTrend} onChange={(v) => updateDeep((d) => { d.assumptions.currency.expectedTrend = v; })} />
          <PercentField label="Currency volatility" value={a.currency.volatility} onChange={(v) => updateDeep((d) => { d.assumptions.currency.volatility = v; })} />
          <PercentField label="Hedged fraction" value={a.currency.hedgedFraction} onChange={(v) => updateDeep((d) => { d.assumptions.currency.hedgedFraction = v; })} />
        </div>
      </Panel>

      <Panel title="Asset-class assumptions" tip="Long-run nominal figures. Arithmetic is the average single-year return; volatility drives the gap to compound growth.">
        <div className="table-scroll">
          <table className="data">
            <thead><tr><th>Asset class</th><th>Arithmetic return</th><th>Volatility</th><th>Yield</th><th>Expense ratio</th></tr></thead>
            <tbody>
              {a.assetClasses.map((c, i) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td><PctCell value={c.arithmeticReturn} onChange={(v) => updateDeep((d) => { d.assumptions.assetClasses[i].arithmeticReturn = v; })} /></td>
                  <td><PctCell value={c.volatility} onChange={(v) => updateDeep((d) => { d.assumptions.assetClasses[i].volatility = v; })} /></td>
                  <td><PctCell value={c.yield} onChange={(v) => updateDeep((d) => { d.assumptions.assetClasses[i].yield = v; })} /></td>
                  <td><PctCell value={c.expenseRatio} step={0.01} onChange={(v) => updateDeep((d) => { d.assumptions.assetClasses[i].expenseRatio = v; })} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function PctCell({ value, onChange, step = 0.1 }: { value: number; onChange: (v: number) => void; step?: number }): JSX.Element {
  return <input className="inp" style={{ width: 68 }} type="number" step={step} value={+(value * 100).toFixed(3)} onChange={(e) => onChange(Number(e.target.value) / 100)} />;
}
