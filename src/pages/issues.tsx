import { useScenario } from '../state/ScenarioContext';

/** Render inline validation messages whose field starts with a given prefix. */
export function InlineIssues({ prefix }: { prefix: string }): JSX.Element | null {
  const { issues } = useScenario();
  const relevant = issues.filter((i) => i.field.startsWith(prefix));
  if (relevant.length === 0) return null;
  return (
    <div style={{ marginBottom: 12 }}>
      {relevant.map((i, idx) => (
        <div key={idx} className={i.severity === 'error' ? 'inline-error' : 'inline-warn'}>
          {i.severity === 'error' ? '⚠ ' : 'ℹ '}
          {i.message}
        </div>
      ))}
    </div>
  );
}

/** Render all issues (used on the Results/Overview pages). */
export function AllIssues(): JSX.Element | null {
  const { issues } = useScenario();
  if (issues.length === 0) return null;
  return (
    <div className="panel" style={{ borderColor: 'var(--warn)' }}>
      <h3>Input checks</h3>
      {issues.map((i, idx) => (
        <div key={idx} className={i.severity === 'error' ? 'inline-error' : 'inline-warn'}>
          {i.severity === 'error' ? '⚠ ' : 'ℹ '}
          {i.message}
        </div>
      ))}
    </div>
  );
}
