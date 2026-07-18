import { useScenario } from '../state/ScenarioContext';
import { NumberField, Panel, PercentField, SelectField } from '../components/ui';
import { StatCard } from '../components/ui';
import { formatPercent } from '../utils/format';
import { findAllocation } from '../allocations/presets';
import { portfolioArithmeticReturn, portfolioVolatility, equityFraction } from '../allocations/portfolio';
import { geometricFromArithmetic } from '../utils/finance';
import type { GlidepathMode, RebalanceMode } from '../types';

export function AllocationPage(): JSX.Element {
  const { scenario, updateDeep } = useScenario();
  const policy = scenario.allocationPolicy;
  const alloc = findAllocation(scenario.allocations, policy.allocationId) ?? scenario.allocations[0];
  const arith = portfolioArithmeticReturn(alloc, scenario.assumptions.assetClasses);
  const vol = portfolioVolatility(alloc, scenario.assumptions);
  const geo = geometricFromArithmetic(arith, vol);

  return (
    <div>
      <h1>Allocation</h1>

      <Panel title="Portfolio allocation">
        <div className="grid grid-2">
          <SelectField
            label="Allocation preset"
            value={policy.allocationId}
            onChange={(v) => updateDeep((d) => { d.allocationPolicy.allocationId = v; })}
            options={scenario.allocations.map((a) => ({ value: a.id, label: a.name }))}
          />
          <SelectField<RebalanceMode>
            label="Rebalancing"
            value={policy.rebalance}
            onChange={(v) => updateDeep((d) => { d.allocationPolicy.rebalance = v; })}
            options={[
              { value: 'annual', label: 'Annual' },
              { value: 'quarterly', label: 'Quarterly' },
              { value: 'threshold', label: 'Threshold band' },
              { value: 'none', label: 'No rebalancing' },
            ]}
            tip="The engine now tracks per-asset-class holdings, so annual/quarterly rebalance to target, threshold rebalances only outside the band, and 'none' lets weights drift with returns — each producing distinct outcomes."
          />
        </div>

        <div className="grid grid-4" style={{ marginTop: 14 }}>
          <StatCard label="Equity fraction" value={formatPercent(equityFraction(alloc))} />
          <StatCard label="Arithmetic return" value={formatPercent(arith)} tip="Average single-year nominal return." />
          <StatCard label="Geometric return" value={formatPercent(geo)} tip="Compound nominal return after volatility drag — what actually grows wealth." />
          <StatCard label="Volatility" value={formatPercent(vol)} tip="Standard deviation of annual returns, computed from the correlation matrix." />
        </div>

        <h3 style={{ marginTop: 18 }}>Weights</h3>
        <div className="table-scroll">
          <table className="data">
            <thead><tr><th>Asset class</th><th>Weight</th></tr></thead>
            <tbody>
              {Object.entries(alloc.weights).map(([id, w]) => (
                <tr key={id}>
                  <td>{scenario.assumptions.assetClasses.find((a) => a.id === id)?.name ?? id}</td>
                  <td>{formatPercent(w ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted small" style={{ marginTop: 8 }}>
          To edit individual weights, adjust the preset in code or use the Assumptions page to change
          per-asset-class returns. Weights must sum to 100% (validated).
        </p>
      </Panel>

      <Panel title="Glidepath" tip="How the equity/bond mix changes with age. A rising-equity glidepath can reduce sequence risk early in retirement.">
        <div className="grid grid-2">
          <SelectField<GlidepathMode>
            label="Glidepath mode"
            value={policy.glidepath}
            onChange={(v) => updateDeep((d) => { d.allocationPolicy.glidepath = v; })}
            options={[
              { value: 'fixed', label: 'Fixed (use preset)' },
              { value: 'ageBased', label: 'Age-based (110 − age)' },
              { value: 'risingEquity', label: 'Rising equity in retirement' },
              { value: 'decliningEquity', label: 'Declining equity in retirement' },
              { value: 'bondTent', label: 'Bond tent around retirement' },
            ]}
          />
          {policy.rebalance === 'threshold' && (
            <PercentField label="Rebalance threshold band" value={policy.rebalanceThreshold ?? 0.05} onChange={(v) => updateDeep((d) => { d.allocationPolicy.rebalanceThreshold = v; })} />
          )}
        </div>
      </Panel>

      <Panel title="Simulation trials & seed" tip="More trials reduce Monte Carlo noise. The seed makes results exactly reproducible.">
        <div className="grid grid-3">
          <NumberField label="Monte Carlo trials" value={scenario.simulation.trials} step={1000} min={1} onChange={(v) => updateDeep((d) => { d.simulation.trials = v; })} />
          <NumberField label="Random seed" value={scenario.simulation.seed} onChange={(v) => updateDeep((d) => { d.simulation.seed = v; })} />
          <SelectField label="Timestep" value={scenario.simulation.timestep} onChange={(v) => updateDeep((d) => { d.simulation.timestep = v; })} options={[{ value: 'annual', label: 'Annual (monthly cash-flow approx.)' }, { value: 'monthly', label: 'Monthly' }]} tip="This version uses an annual return model with monthly-presented cash flows." />
        </div>
      </Panel>
    </div>
  );
}
