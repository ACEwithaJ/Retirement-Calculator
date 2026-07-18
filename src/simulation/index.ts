export { runSimulation } from './monteCarlo';
export { simulatePath } from './engine';
export { computeFundedRatio } from './fundedRatio';
export {
  solveSustainableSpending,
  solveSpendingCurve,
  solveRetirementAge,
  CONFIDENCE_TARGETS,
} from './solver';
export type { SuccessCriterion } from './solver';
export { buildBands, computeMetrics, classifyReadiness, primaryRisk } from './metrics';
export { createReturnGenerator } from './returns';
export { STRESS_SCENARIOS } from './stress';
export { HISTORICAL_RANGE, HISTORICAL_SERIES } from './historicalData';
