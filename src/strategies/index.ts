import type { StrategyConfig, StrategyId } from '../types';
import {
  AmortizationStrategy,
  ConstantNominalStrategy,
  ConstantPercentageStrategy,
  ConstantRealStrategy,
  InterestOnlyStrategy,
} from './static';
import {
  EndowmentStrategy,
  FloorCeilingStrategy,
  GuytonKlingerStrategy,
  RmdMethodStrategy,
  VanguardDynamicStrategy,
  VpwStrategy,
} from './dynamic';
import type { WithdrawalStrategy } from './types';

export * from './types';

/**
 * The strategy registry. To add a new withdrawal strategy:
 *   1. Implement the WithdrawalStrategy interface in static.ts / dynamic.ts
 *      (or a new file).
 *   2. Add a StrategyId to src/types/index.ts.
 *   3. Register a factory entry here.
 *   4. Add a deterministic unit test in src/tests.
 * Nothing else in the engine or UI needs to change.
 */
const REGISTRY: Record<StrategyId, () => WithdrawalStrategy> = {
  constantReal: () => new ConstantRealStrategy(),
  constantNominal: () => new ConstantNominalStrategy(),
  constantPercentage: () => new ConstantPercentageStrategy(),
  amortization: () => new AmortizationStrategy(),
  interestOnly: () => new InterestOnlyStrategy(),
  guytonKlinger: () => new GuytonKlingerStrategy(),
  vanguardDynamic: () => new VanguardDynamicStrategy(),
  vpw: () => new VpwStrategy(),
  rmdMethod: () => new RmdMethodStrategy(),
  endowment: () => new EndowmentStrategy(),
  floorCeiling: () => new FloorCeilingStrategy(),
};

export function createStrategy(config: StrategyConfig): WithdrawalStrategy {
  const factory = REGISTRY[config.id] ?? REGISTRY.constantReal;
  return factory();
}

export function allStrategies(): WithdrawalStrategy[] {
  return (Object.keys(REGISTRY) as StrategyId[]).map((id) => REGISTRY[id]());
}

export const STRATEGY_IDS = Object.keys(REGISTRY) as StrategyId[];
