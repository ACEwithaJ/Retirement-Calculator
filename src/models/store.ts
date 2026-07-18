import type { Scenario } from '../types';

/**
 * Local-first scenario persistence. Everything lives in the browser's
 * localStorage — no personal financial data is ever transmitted anywhere.
 */
const STORAGE_KEY = 'retirement-calculator:scenarios:v1';
const ACTIVE_KEY = 'retirement-calculator:active:v1';

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function loadScenarios(): Scenario[] {
  if (typeof localStorage === 'undefined') return [];
  return safeParse<Scenario[]>(localStorage.getItem(STORAGE_KEY), []);
}

export function saveScenarios(scenarios: Scenario[]): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scenarios));
}

export function saveScenario(scenario: Scenario): Scenario[] {
  const all = loadScenarios();
  const updated = { ...scenario, updatedAt: new Date().toISOString() };
  const idx = all.findIndex((s) => s.id === scenario.id);
  if (idx >= 0) all[idx] = updated;
  else all.push(updated);
  saveScenarios(all);
  return all;
}

export function deleteScenario(id: string): Scenario[] {
  const all = loadScenarios().filter((s) => s.id !== id);
  saveScenarios(all);
  return all;
}

export function duplicateScenario(scenario: Scenario, newName?: string): Scenario {
  return {
    ...JSON.parse(JSON.stringify(scenario)),
    id: `scn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: newName ?? `${scenario.name} (copy)`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function getActiveScenarioId(): string | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(ACTIVE_KEY);
}

export function setActiveScenarioId(id: string): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(ACTIVE_KEY, id);
}

// --- Import / export -------------------------------------------------------

export function exportScenarioJSON(scenario: Scenario): string {
  return JSON.stringify(scenario, null, 2);
}

export function importScenarioJSON(json: string): Scenario {
  const parsed = JSON.parse(json) as Scenario;
  if (!parsed.household || !parsed.spending || !parsed.accounts) {
    throw new Error('Invalid scenario file: missing required sections.');
  }
  return {
    ...parsed,
    id: `scn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    updatedAt: new Date().toISOString(),
  };
}
