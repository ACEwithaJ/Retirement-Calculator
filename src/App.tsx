import { useEffect, useState } from 'react';
import { ScenarioProvider, useScenario } from './state/ScenarioContext';
import { OverviewPage } from './pages/Overview';
import { HouseholdPage } from './pages/Household';
import { SpendingIncomePage } from './pages/SpendingIncome';
import { AssetsPage } from './pages/Assets';
import { AllocationPage } from './pages/Allocation';
import { StrategyPage } from './pages/Strategy';
import { TaxesCountriesPage } from './pages/TaxesCountries';
import { FeesPage } from './pages/Fees';
import { AssumptionsPage } from './pages/Assumptions';
import { ResultsPage } from './pages/Results';
import { ComparePage } from './pages/Compare';
import { MethodologyPage } from './pages/Methodology';

type Route = string;

const NAV: Array<{ id: Route; label: string; icon: string }> = [
  { id: 'overview', label: 'Overview', icon: '◎' },
  { id: 'household', label: 'Household', icon: '⌂' },
  { id: 'spending', label: 'Spending & Income', icon: '↔' },
  { id: 'assets', label: 'Assets', icon: '▣' },
  { id: 'allocation', label: 'Allocation', icon: '◐' },
  { id: 'strategy', label: 'Withdrawal Strategy', icon: '⇣' },
  { id: 'taxes', label: 'Taxes & Countries', icon: '⚖' },
  { id: 'fees', label: 'Fees & Advice', icon: '%' },
  { id: 'assumptions', label: 'Assumptions', icon: '⚙' },
  { id: 'results', label: 'Results', icon: '★' },
  { id: 'compare', label: 'Compare', icon: '⇄' },
  { id: 'methodology', label: 'Methodology', icon: '📖' },
];

function useTheme(): [string, () => void] {
  const [theme, setTheme] = useState<string>(() => {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('rc-theme') ?? 'light';
    }
    return 'light';
  });
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    if (typeof localStorage !== 'undefined') localStorage.setItem('rc-theme', theme);
  }, [theme]);
  return [theme, () => setTheme((t) => (t === 'light' ? 'dark' : 'light'))];
}

function Shell(): JSX.Element {
  const [route, setRoute] = useState<Route>('overview');
  const [theme, toggleTheme] = useTheme();
  const { scenario, running, saveCurrent, issues } = useScenario();
  const errorCount = issues.filter((i) => i.severity === 'error').length;

  const page = (() => {
    switch (route) {
      case 'household': return <HouseholdPage />;
      case 'spending': return <SpendingIncomePage />;
      case 'assets': return <AssetsPage />;
      case 'allocation': return <AllocationPage />;
      case 'strategy': return <StrategyPage />;
      case 'taxes': return <TaxesCountriesPage />;
      case 'fees': return <FeesPage />;
      case 'assumptions': return <AssumptionsPage />;
      case 'results': return <ResultsPage />;
      case 'compare': return <ComparePage />;
      case 'methodology': return <MethodologyPage />;
      case 'overview':
      default: return <OverviewPage onNavigate={setRoute} />;
    }
  })();

  return (
    <div className="app">
      <nav className="sidebar no-print">
        <div className="brand">📈 Retirement<br />Calculator</div>
        {NAV.map((n, i) => (
          <button
            key={n.id}
            className={`nav-item ${route === n.id ? 'active' : ''}`}
            onClick={() => setRoute(n.id)}
          >
            <span className="nav-num">{i + 1}</span>
            <span>{n.label}</span>
          </button>
        ))}
      </nav>
      <main className="main">
        <div className="topbar no-print">
          <div>
            <strong>{scenario.name}</strong>
            {running && <span className="muted small"> · calculating…</span>}
            {errorCount > 0 && (
              <span className="inline-error"> · {errorCount} input issue{errorCount > 1 ? 's' : ''}</span>
            )}
          </div>
          <div className="row-actions">
            <button className="btn small" onClick={saveCurrent}>Save</button>
            <button className="btn small" onClick={() => window.print()}>Print</button>
            <button className="btn small" onClick={toggleTheme}>
              {theme === 'light' ? '🌙 Dark' : '☀ Light'}
            </button>
          </div>
        </div>
        {page}
      </main>
    </div>
  );
}

export default function App(): JSX.Element {
  return (
    <ScenarioProvider>
      <Shell />
    </ScenarioProvider>
  );
}
