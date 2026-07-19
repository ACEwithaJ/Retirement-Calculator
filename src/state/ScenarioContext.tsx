/* eslint-disable react-refresh/only-export-components -- context module intentionally exports both the provider and its hook */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import type { Scenario, SimulationResults } from '../types';
import { defaultScenario } from '../models/defaults';
import { previewSimulation } from '../workers/simulationClient';
import { validateScenario, type ValidationIssue } from '../models/validation';
import {
  deleteScenario as deleteFromStore,
  duplicateScenario,
  getActiveScenarioId,
  loadScenarios,
  saveScenario,
  setActiveScenarioId,
} from '../models/store';

/** Cap live auto-run trials for responsiveness; full runs use scenario.trials. */
const LIVE_TRIAL_CAP = 1500;

interface ScenarioContextValue {
  scenario: Scenario;
  scenarios: Scenario[];
  results: SimulationResults | null;
  running: boolean;
  issues: ValidationIssue[];
  update: (patch: Partial<Scenario>) => void;
  updateDeep: (updater: (draft: Scenario) => void) => void;
  runFull: () => void;
  setActive: (id: string) => void;
  saveCurrent: () => void;
  duplicate: () => void;
  remove: (id: string) => void;
  loadScenario: (s: Scenario) => void;
  resetDefault: () => void;
}

const Ctx = createContext<ScenarioContextValue | null>(null);

export function ScenarioProvider({ children }: { children: ReactNode }): JSX.Element {
  const [scenario, setScenario] = useState<Scenario>(() => {
    const saved = loadScenarios();
    const activeId = getActiveScenarioId();
    return saved.find((s) => s.id === activeId) ?? saved[0] ?? defaultScenario();
  });
  const [scenarios, setScenarios] = useState<Scenario[]>(() => {
    const saved = loadScenarios();
    return saved.length ? saved : [defaultScenario()];
  });
  const [results, setResults] = useState<SimulationResults | null>(null);
  const [running, setRunning] = useState(false);
  const debounceRef = useRef<number | undefined>(undefined);

  const issues = useMemo(() => validateScenario(scenario), [scenario]);

  /** Run a (possibly capped) simulation in the Web Worker (off the main thread). */
  const run = useCallback((s: Scenario, cap: number) => {
    setRunning(true);
    previewSimulation(s, cap)
      .then((res) => {
        // `null` means a newer request superseded this one; keep waiting for it.
        if (res) {
          setResults(res);
          setRunning(false);
        }
      })
      .catch(() => setRunning(false));
  }, []);

  // Auto-run a capped live preview when the scenario changes (debounced).
  useEffect(() => {
    if (validateScenario(scenario).some((i) => i.severity === 'error')) return;
    window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => run(scenario, LIVE_TRIAL_CAP), 350);
    return () => window.clearTimeout(debounceRef.current);
  }, [scenario, run]);

  const update = useCallback((patch: Partial<Scenario>) => {
    setScenario((prev) => ({ ...prev, ...patch, updatedAt: new Date().toISOString() }));
  }, []);

  const updateDeep = useCallback((updater: (draft: Scenario) => void) => {
    setScenario((prev) => {
      const draft = JSON.parse(JSON.stringify(prev)) as Scenario;
      updater(draft);
      draft.updatedAt = new Date().toISOString();
      return draft;
    });
  }, []);

  const runFull = useCallback(() => run(scenario, scenario.simulation.trials), [run, scenario]);

  const setActive = useCallback((id: string) => {
    setScenarios((all) => {
      const found = all.find((s) => s.id === id);
      if (found) {
        setScenario(found);
        setActiveScenarioId(id);
      }
      return all;
    });
  }, []);

  const saveCurrent = useCallback(() => {
    const all = saveScenario(scenario);
    setScenarios(all);
    setActiveScenarioId(scenario.id);
  }, [scenario]);

  const duplicate = useCallback(() => {
    const copy = duplicateScenario(scenario);
    const all = saveScenario(copy);
    setScenarios(all);
    setScenario(copy);
    setActiveScenarioId(copy.id);
  }, [scenario]);

  const remove = useCallback((id: string) => {
    const all = deleteFromStore(id);
    setScenarios(all.length ? all : [defaultScenario()]);
    if (scenario.id === id) setScenario(all[0] ?? defaultScenario());
  }, [scenario.id]);

  const loadScenario = useCallback((s: Scenario) => {
    setScenario(s);
    const all = saveScenario(s);
    setScenarios(all);
    setActiveScenarioId(s.id);
  }, []);

  const resetDefault = useCallback(() => {
    const d = defaultScenario();
    setScenario(d);
  }, []);

  const value: ScenarioContextValue = {
    scenario,
    scenarios,
    results,
    running,
    issues,
    update,
    updateDeep,
    runFull,
    setActive,
    saveCurrent,
    duplicate,
    remove,
    loadScenario,
    resetDefault,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useScenario(): ScenarioContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useScenario must be used within ScenarioProvider');
  return ctx;
}
