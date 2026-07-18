import { useMemo, useState } from 'react';
import { useScenario } from '../state/ScenarioContext';
import { Panel } from '../components/ui';
import { compareStrategies, compareAllocations } from '../simulation/compare';
import { allStrategies } from '../strategies';
import { formatCompactCurrency, formatCurrency, formatPercent } from '../utils/format';
import { importScenarioJSON } from '../models/store';

type SortKey = string;

export function ComparePage(): JSX.Element {
  const { scenario, scenarios, setActive, duplicate, remove, loadScenario } = useScenario();
  const [ranStrat, setRanStrat] = useState(false);
  const [ranAlloc, setRanAlloc] = useState(false);
  const [sortStrat, setSortStrat] = useState<SortKey>('desiredSuccess');
  const cur = scenario.household.baseCurrency;

  const labels = useMemo(() => {
    const m: Record<string, string> = {};
    for (const s of allStrategies()) m[s.id] = s.label;
    return m;
  }, []);

  const stratRows = useMemo(() => {
    if (!ranStrat) return [];
    const rows = compareStrategies(scenario, labels, 1000);
    return [...rows].sort((a, b) => (b[sortStrat as keyof typeof b] as number) - (a[sortStrat as keyof typeof a] as number));
  }, [ranStrat, scenario, labels, sortStrat]);

  const allocRows = useMemo(() => (ranAlloc ? compareAllocations(scenario, 1000) : []), [ranAlloc, scenario]);

  const onImport = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        loadScenario(importScenarioJSON(String(reader.result)));
      } catch (err) {
        alert(`Import failed: ${(err as Error).message}`);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div>
      <h1>Compare</h1>

      <Panel title="Saved scenarios" tip="Save, duplicate, load, or delete scenarios. Everything is stored locally in your browser.">
        <div className="table-scroll">
          <table className="data">
            <thead><tr><th>Name</th><th>Strategy</th><th>Desired monthly</th><th>Actions</th></tr></thead>
            <tbody>
              {scenarios.map((s) => (
                <tr key={s.id}>
                  <td>{s.name}{s.id === scenario.id && <span className="tag" style={{ marginLeft: 8 }}>active</span>}</td>
                  <td>{labels[s.strategy.id] ?? s.strategy.id}</td>
                  <td>{formatCurrency(s.spending.desiredMonthly, s.household.baseCurrency)}</td>
                  <td>
                    <div className="row-actions">
                      <button className="btn small" onClick={() => setActive(s.id)}>Load</button>
                      <button className="btn small" onClick={() => remove(s.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="row-actions" style={{ marginTop: 12 }}>
          <button className="btn small" onClick={duplicate}>Duplicate current</button>
          <label className="btn small" style={{ cursor: 'pointer' }}>
            Import JSON
            <input type="file" accept="application/json" style={{ display: 'none' }} onChange={onImport} />
          </label>
        </div>
      </Panel>

      <Panel
        title="Strategy comparison"
        tip="Runs every withdrawal strategy on the current scenario. Click a column header to sort."
        actions={<button className="btn small primary" onClick={() => setRanStrat(true)}>Run comparison</button>}
      >
        {!ranStrat && <p className="muted">Compares all {allStrategies().length} strategies side by side on spending, success, ending wealth, and stability.</p>}
        {stratRows.length > 0 && (
          <div className="table-scroll">
            <table className="data">
              <thead>
                <tr>
                  <th onClick={() => setSortStrat('label')}>Strategy</th>
                  <th onClick={() => setSortStrat('initialMonthly')}>Initial monthly</th>
                  <th onClick={() => setSortStrat('medianMonthly')}>Median monthly</th>
                  <th onClick={() => setSortStrat('lowestMonthly')}>Lowest monthly</th>
                  <th onClick={() => setSortStrat('essentialSuccess')}>Essential ✓</th>
                  <th onClick={() => setSortStrat('desiredSuccess')}>Desired ✓</th>
                  <th onClick={() => setSortStrat('portfolioSurvival')}>Survival</th>
                  <th onClick={() => setSortStrat('medianEndingWealth')}>Median end</th>
                  <th onClick={() => setSortStrat('maxSpendingCut')}>Max cut</th>
                </tr>
              </thead>
              <tbody>
                {stratRows.map((r) => (
                  <tr key={r.strategyId}>
                    <td>{r.label}</td>
                    <td>{formatCurrency(r.initialMonthly, cur)}</td>
                    <td>{formatCurrency(r.medianMonthly, cur)}</td>
                    <td>{formatCurrency(r.lowestMonthly, cur)}</td>
                    <td>{formatPercent(r.essentialSuccess, 0)}</td>
                    <td>{formatPercent(r.desiredSuccess, 0)}</td>
                    <td>{formatPercent(r.portfolioSurvival, 0)}</td>
                    <td>{formatCompactCurrency(r.medianEndingWealth)}</td>
                    <td>{formatPercent(r.maxSpendingCut, 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="muted small" style={{ marginTop: 8 }}>
          Strategies that "never run out" (percentage, VPW) do so by transferring risk into spending
          variability — note their lowest-monthly figures. A high survival rate can hide deep cuts.
        </p>
      </Panel>

      <Panel
        title="Allocation comparison"
        tip="Runs the plan across a range of stock/bond mixes."
        actions={<button className="btn small primary" onClick={() => setRanAlloc(true)}>Run comparison</button>}
      >
        {!ranAlloc && <p className="muted">Compares allocations from 100% stocks to defensive mixes.</p>}
        {allocRows.length > 0 && (
          <div className="table-scroll">
            <table className="data">
              <thead>
                <tr><th>Allocation</th><th>Desired ✓</th><th>Survival</th><th>Median end</th><th>Worst decile</th><th>Max cut</th></tr>
              </thead>
              <tbody>
                {allocRows.map((r) => (
                  <tr key={r.allocationId}>
                    <td>{r.label}</td>
                    <td>{formatPercent(r.desiredSuccess, 0)}</td>
                    <td>{formatPercent(r.portfolioSurvival, 0)}</td>
                    <td>{formatCompactCurrency(r.medianEndingWealth)}</td>
                    <td>{formatCompactCurrency(r.p10EndingWealth)}</td>
                    <td>{formatPercent(r.maxSpendingCut, 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="muted small" style={{ marginTop: 8 }}>
          The allocation with the highest median ending wealth is often not the one with the best
          downside protection or spending stability. Read the worst-decile and max-cut columns together.
        </p>
      </Panel>
    </div>
  );
}
