import { useScenario } from '../state/ScenarioContext';
import { NumberField, Panel, PercentField, SelectField, StatCard, TextField } from '../components/ui';
import { InlineIssues } from './issues';
import { formatCompactCurrency } from '../utils/format';
import type { AccountTaxClass } from '../types';
import { projectContributions } from '../simulation/contributionProjection';

const TAX_CLASSES: Array<{ value: AccountTaxClass; label: string }> = [
  { value: 'taxable', label: 'Taxable brokerage' },
  { value: 'tax-deferred', label: 'Tax-deferred (IRA/401k)' },
  { value: 'tax-free', label: 'Tax-free (Roth/ISA)' },
  { value: 'cash', label: 'Cash' },
  { value: 'hsa', label: 'HSA' },
];

export function AssetsPage(): JSX.Element {
  const { scenario, updateDeep } = useScenario();
  const total = scenario.accounts.reduce((a, x) => a + x.balance, 0);
  const allocOpts = scenario.allocations.map((a) => ({ value: a.id, label: a.name }));
  const projection = projectContributions(scenario);
  const investableAccounts = scenario.accounts.filter((a) => a.assetType !== 'homeEquity');

  return (
    <div>
      <h1>Assets</h1>
      <InlineIssues prefix="account" />
      <Panel title={`Assets — total ${formatCompactCurrency(total, scenario.household.baseCurrency)}`}>
        {scenario.accounts.map((a, i) => (
          <div key={a.id} className="panel" style={{ background: 'var(--panel-2)' }}>
            <div className="grid grid-3">
              <TextField label="Name" value={a.name} onChange={(v) => updateDeep((d) => { d.accounts[i].name = v; })} />
              <SelectField label="Asset type" value={a.assetType ?? 'portfolio'} onChange={(v) => updateDeep((d) => { d.accounts[i].assetType = v; if (v === 'homeEquity') { d.accounts[i].taxClass = 'taxable'; d.accounts[i].allocation = { id: `home-${d.accounts[i].id}`, name: 'Home Equity', weights: { homeEquity: 1 } }; } else { d.accounts[i].allocation = undefined; } })} options={[{ value: 'portfolio', label: 'Investment / cash account' }, { value: 'homeEquity', label: 'Home equity' }]} />
              {a.assetType !== 'homeEquity' && <SelectField<AccountTaxClass> label="Tax class" value={a.taxClass} onChange={(v) => updateDeep((d) => { d.accounts[i].taxClass = v; })} options={TAX_CLASSES} />}
              <NumberField label="Balance" value={a.balance} step={1000} onChange={(v) => updateDeep((d) => { d.accounts[i].balance = v; })} />
              {a.taxClass === 'taxable' && (
                <NumberField label="Cost basis" value={a.costBasis ?? a.balance} step={1000} onChange={(v) => updateDeep((d) => { d.accounts[i].costBasis = v; })} tip="The portion of the balance that is your original investment. Gains above basis are taxed when sold." />
              )}
              {a.assetType !== 'homeEquity' && <SelectField label="Allocation" value={a.allocationId ?? scenario.allocationPolicy.allocationId} onChange={(v) => updateDeep((d) => { d.accounts[i].allocationId = v; })} options={allocOpts} />}
              <NumberField label={a.assetType === 'homeEquity' ? 'Available after sale at age' : 'Availability age'} value={a.availabilityAge ?? 0} onChange={(v) => updateDeep((d) => { d.accounts[i].availabilityAge = v || undefined; })} tip={a.assetType === 'homeEquity' ? 'Home equity is not available for retirement spending unless you enter an age when you expect to sell, downsize, or otherwise access it.' : 'Age before which the account cannot be tapped (e.g. 59½ for penalty-free 401k access).'} />
              <PercentField label="Annual account fee" value={a.annualFee ?? 0} onChange={(v) => updateDeep((d) => { d.accounts[i].annualFee = v; })} />
            </div>
            <button className="btn small" style={{ marginTop: 10 }} onClick={() => updateDeep((d) => { d.accounts.splice(i, 1); })}>Remove account</button>
          </div>
        ))}
        <button className="btn small" onClick={() => updateDeep((d) => {
          d.accounts.push({ id: `acct-${Date.now()}`, name: 'New account', taxClass: 'taxable', balance: 100000, costBasis: 100000, allocationId: scenario.allocationPolicy.allocationId });
        })}>Add account</button>
      </Panel>

      <Panel title="Portfolio contributions until retirement" tip="Add what you expect to invest each month from now until retirement. Employer match is modeled separately.">
        {scenario.contributions.map((c, i) => (
          <div key={`${c.accountId}-${i}`} className="grid grid-4" style={{ marginBottom: 10 }}>
            <SelectField label="Destination account" value={c.accountId} onChange={(v) => updateDeep((d) => { d.contributions[i].accountId = v; })} options={investableAccounts.map((a) => ({ value: a.id, label: a.name }))} />
            <NumberField label="Monthly contribution" value={c.monthlyAmount} step={100} min={0} onChange={(v) => updateDeep((d) => { d.contributions[i].monthlyAmount = v; })} />
            <PercentField label="Annual increase" value={c.annualIncrease ?? 0} onChange={(v) => updateDeep((d) => { d.contributions[i].annualIncrease = v; })} />
            <PercentField label="Employer match" value={c.employerMatch ?? 0} onChange={(v) => updateDeep((d) => { d.contributions[i].employerMatch = v; })} />
            <NumberField label="Stop at age" value={c.endAge ?? scenario.household.people[0]?.retirementAge ?? 65} onChange={(v) => updateDeep((d) => { d.contributions[i].endAge = v; })} />
            <div style={{ display: 'flex', alignItems: 'flex-end' }}><button className="btn small" onClick={() => updateDeep((d) => { d.contributions.splice(i, 1); })}>Remove</button></div>
          </div>
        ))}
        <button className="btn small" disabled={investableAccounts.length === 0} onClick={() => updateDeep((d) => { const accountId = d.accounts.find((a) => a.assetType !== 'homeEquity')?.id; if (accountId) d.contributions.push({ accountId, monthlyAmount: 500, endAge: d.household.people[0]?.retirementAge }); })}>Add contribution</button>
        <div className="grid grid-4" style={{ marginTop: 16 }}>
          <StatCard label="Starting portfolio" value={formatCompactCurrency(projection.startingPortfolio, scenario.household.baseCurrency)} />
          <StatCard label="Your contributions" value={formatCompactCurrency(projection.employeeContributions, scenario.household.baseCurrency)} />
          <StatCard label="Employer contributions" value={formatCompactCurrency(projection.employerContributions, scenario.household.baseCurrency)} />
          <StatCard label="Estimated market growth" value={formatCompactCurrency(projection.projectedGrowth, scenario.household.baseCurrency)} sub={`${projection.years} years to retirement`} />
        </div>
        <p className="muted small" style={{ marginTop: 10 }}>Estimated portfolio at retirement: <strong>{formatCompactCurrency(projection.projectedPortfolioAtRetirement, scenario.household.baseCurrency)}</strong> in today's dollars. This is a deterministic illustration using the selected allocations' geometric returns, not a guarantee.</p>
      </Panel>

      <Panel title="One-time future flows" tip="Positive amounts are inflows (inheritance, home sale); negative amounts are large one-time expenses.">
        {scenario.oneTimeFlows.map((f, i) => (
          <div key={f.id} className="grid grid-4" style={{ marginBottom: 8 }}>
            <TextField label="Label" value={f.label} onChange={(v) => updateDeep((d) => { d.oneTimeFlows[i].label = v; })} />
            <NumberField label="At age" value={f.age} onChange={(v) => updateDeep((d) => { d.oneTimeFlows[i].age = v; })} />
            <NumberField label="Amount (+/−)" value={f.amount} step={1000} onChange={(v) => updateDeep((d) => { d.oneTimeFlows[i].amount = v; })} />
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button className="btn small" onClick={() => updateDeep((d) => { d.oneTimeFlows.splice(i, 1); })}>Remove</button>
            </div>
          </div>
        ))}
        <button className="btn small" onClick={() => updateDeep((d) => {
          d.oneTimeFlows.push({ id: `flow-${Date.now()}`, label: 'One-time flow', age: 70, amount: 50000, accountId: scenario.accounts[0]?.id });
        })}>Add one-time flow</button>
      </Panel>
    </div>
  );
}
