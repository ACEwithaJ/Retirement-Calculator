import type { ReactNode } from 'react';

export function Tooltip({ text }: { text: string }): JSX.Element {
  return (
    <span className="tooltip" tabIndex={0} aria-label={text}>
      ?<span className="tip">{text}</span>
    </span>
  );
}

export function Panel({
  title,
  children,
  tip,
  actions,
}: {
  title?: string;
  children: ReactNode;
  tip?: string;
  actions?: ReactNode;
}): JSX.Element {
  return (
    <section className="panel">
      {title && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>
            {title}
            {tip && <Tooltip text={tip} />}
          </h2>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function StatCard({
  label,
  value,
  sub,
  tip,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tip?: string;
}): JSX.Element {
  return (
    <div className="stat">
      <div className="label">
        {label}
        {tip && <Tooltip text={tip} />}
      </div>
      <div className="value">{value}</div>
      {sub && <div className="sub">{sub}</div>}
    </div>
  );
}

interface NumFieldProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  tip?: string;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
  prefix?: string;
}

export function NumberField({
  label,
  value,
  onChange,
  tip,
  step = 1,
  min,
  max,
}: NumFieldProps): JSX.Element {
  return (
    <label className="field">
      <span>
        {label}
        {tip && <Tooltip text={tip} />}
      </span>
      <input
        type="number"
        value={Number.isFinite(value) ? value : ''}
        step={step}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
      />
    </label>
  );
}

/** Percent field: displays as % but stores a fraction (0.25 <-> 25). */
export function PercentField({
  label,
  value,
  onChange,
  tip,
  step = 0.1,
}: NumFieldProps): JSX.Element {
  return (
    <label className="field">
      <span>
        {label}
        {tip && <Tooltip text={tip} />}
      </span>
      <input
        type="number"
        value={Number.isFinite(value) ? +(value * 100).toFixed(4) : ''}
        step={step}
        onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value) / 100)}
      />
    </label>
  );
}

export function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
  tip,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: string }>;
  tip?: string;
}): JSX.Element {
  return (
    <label className="field">
      <span>
        {label}
        {tip && <Tooltip text={tip} />}
      </span>
      <select value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function TextField({
  label,
  value,
  onChange,
  tip,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  tip?: string;
}): JSX.Element {
  return (
    <label className="field">
      <span>
        {label}
        {tip && <Tooltip text={tip} />}
      </span>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

export function Checkbox({
  label,
  checked,
  onChange,
  tip,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  tip?: string;
}): JSX.Element {
  return (
    <label className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        {label}
        {tip && <Tooltip text={tip} />}
      </span>
    </label>
  );
}

export function HowCalculated({ children }: { children: ReactNode }): JSX.Element {
  return (
    <details className="how">
      <summary>How this was calculated</summary>
      <div>{children}</div>
    </details>
  );
}

export function Disclaimer(): JSX.Element {
  return (
    <div className="disclaimer">
      <strong>Educational tool — not financial, tax, investment, or legal advice.</strong>{' '}
      This calculator models possibilities under explicit assumptions. Results are
      probabilities, not guarantees. Country tax profiles are simplified examples, not
      authoritative calculations. Consult qualified professionals before making decisions.
    </div>
  );
}
