import type { StrategyConfig, StrategyId } from '../types';

/**
 * The context passed to a withdrawal strategy each simulated year.
 *
 * IMPORTANT: the simulation engine works in REAL (today's) dollars. Strategies
 * therefore reason entirely in today's purchasing power; the engine converts to
 * nominal only where taxes require it. Returns provided here are REAL returns.
 */
export interface StrategyContext {
  config: StrategyConfig;

  ageP1: number;
  yearIndex: number; // 0-based years since simulation start
  isRetired: boolean;
  /** Years remaining in the planning horizon (>= 1 while planning). */
  remainingYears: number;

  /** Portfolio value at the start of the year, in real dollars. */
  portfolioValue: number;
  /** Portfolio value at retirement, in real dollars (baseline for rates). */
  initialPortfolioAtRetirement: number;

  /** This year's desired total spending (after phase/decline), real, after-tax. */
  desiredRealSpending: number;
  /** This year's essential spending floor, real, after-tax. */
  essentialRealSpending: number;
  /** Guaranteed real income available this year (gross). */
  guaranteedRealIncome: number;

  /** Last year's actual total spending (real). */
  prevRealSpending: number;
  /** Last year's real portfolio return (fraction). */
  prevRealReturn: number;

  /** Assumed real return used by amortization / VPW-style strategies. */
  assumedRealReturn: number;

  /** Trailing real portfolio values for smoothing (most recent last). */
  trailingPortfolio: number[];
}

export interface StrategyDecision {
  /** Target total after-tax spending for the year, in real dollars. */
  targetRealSpending: number;
}

/**
 * Every withdrawal strategy implements this interface. A strategy is a pure
 * function of the context plus its own config; it must not mutate the context.
 */
export interface WithdrawalStrategy {
  readonly id: StrategyId;
  readonly label: string;
  readonly description: string;
  decide(ctx: StrategyContext): StrategyDecision;
}
