import { useScenario } from '../state/ScenarioContext';
import { Checkbox, NumberField, Panel, PercentField, SelectField } from '../components/ui';
import { allStrategies, createStrategy } from '../strategies';
import type { StrategyId, WithdrawalOrderMode } from '../types';

export function StrategyPage(): JSX.Element {
  const { scenario, updateDeep } = useScenario();
  const cfg = scenario.strategy;
  const strategies = allStrategies();
  const active = createStrategy(cfg);

  return (
    <div>
      <h1>Withdrawal Strategy</h1>

      <Panel title="Strategy">
        <SelectField<StrategyId>
          label="Withdrawal strategy"
          value={cfg.id}
          onChange={(v) => updateDeep((d) => { d.strategy.id = v; })}
          options={strategies.map((s) => ({ value: s.id, label: s.label }))}
        />
        <p className="muted" style={{ marginTop: 10 }}>{active.description}</p>
      </Panel>

      <Panel title="Strategy parameters" tip="Only the parameters relevant to the selected strategy affect results.">
        <div className="grid grid-3">
          <PercentField label="Initial / target rate" value={cfg.initialRate ?? 0.04} step={0.1} onChange={(v) => updateDeep((d) => { d.strategy.initialRate = v; })} tip="The withdrawal rate applied to the portfolio (used by percentage, guardrail, Vanguard, floor-ceiling, endowment strategies)." />
          <NumberField label="Spending floor (annual)" value={cfg.spendingFloor ?? 0} step={1000} onChange={(v) => updateDeep((d) => { d.strategy.spendingFloor = v || undefined; })} tip="A real annual spending amount the strategy will not go below (where supported)." />
          <NumberField label="Spending ceiling (annual)" value={cfg.spendingCeiling ?? 0} step={1000} onChange={(v) => updateDeep((d) => { d.strategy.spendingCeiling = v || undefined; })} />
          <PercentField label="Upper guardrail" value={cfg.upperGuardrail ?? 0.2} onChange={(v) => updateDeep((d) => { d.strategy.upperGuardrail = v; })} tip="Guyton-Klinger: cut spending when the withdrawal rate rises this far above the initial rate." />
          <PercentField label="Lower guardrail" value={cfg.lowerGuardrail ?? 0.2} onChange={(v) => updateDeep((d) => { d.strategy.lowerGuardrail = v; })} tip="Guyton-Klinger: raise spending when the withdrawal rate falls this far below the initial rate." />
          <PercentField label="Guardrail adjustment" value={cfg.adjustment ?? 0.1} onChange={(v) => updateDeep((d) => { d.strategy.adjustment = v; })} />
          <PercentField label="Max annual increase" value={cfg.maxIncrease ?? 0.05} onChange={(v) => updateDeep((d) => { d.strategy.maxIncrease = v; })} tip="Vanguard dynamic: cap on how much spending can rise year over year." />
          <PercentField label="Max annual decrease" value={cfg.maxDecrease ?? 0.025} onChange={(v) => updateDeep((d) => { d.strategy.maxDecrease = v; })} tip="Vanguard dynamic: cap on how much spending can fall year over year." />
          <NumberField label="Smoothing years" value={cfg.smoothingYears ?? 3} onChange={(v) => updateDeep((d) => { d.strategy.smoothingYears = v; })} tip="Endowment strategy: number of years averaged to smooth spending." />
        </div>
        <div style={{ marginTop: 12 }}>
          <Checkbox label="Skip inflation raise after a losing year (constant-real)" checked={cfg.skipRaiseAfterLoss ?? false} onChange={(v) => updateDeep((d) => { d.strategy.skipRaiseAfterLoss = v; })} />
        </div>
      </Panel>

      <Panel title="Withdrawal ordering" tip="Which accounts are tapped first. Order affects lifetime taxes and how long tax-advantaged growth compounds.">
        <SelectField<WithdrawalOrderMode>
          label="Order"
          value={scenario.withdrawalOrder.mode}
          onChange={(v) => updateDeep((d) => { d.withdrawalOrder.mode = v; })}
          options={[
            { value: 'taxableFirst', label: 'Taxable → tax-deferred → tax-free' },
            { value: 'taxDeferredFirst', label: 'Tax-deferred first' },
            { value: 'proRata', label: 'Pro rata across accounts' },
            { value: 'preserveTaxFree', label: 'Preserve tax-free (Roth last)' },
            { value: 'bracketFill', label: 'Tax-bracket filling (simplified)' },
          ]}
        />
      </Panel>
    </div>
  );
}
