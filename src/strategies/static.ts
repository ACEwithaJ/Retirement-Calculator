import { amortizationPayment } from '../utils/finance';
import { clamp } from '../utils/finance';
import type {
  StrategyContext,
  StrategyDecision,
  WithdrawalStrategy,
} from './types';

/** Apply configured real floor/ceiling to a spending amount. */
function applyBounds(spend: number, ctx: StrategyContext): number {
  const { spendingFloor, spendingCeiling } = ctx.config;
  let out = spend;
  if (spendingFloor !== undefined) out = Math.max(out, spendingFloor);
  if (spendingCeiling !== undefined) out = Math.min(out, spendingCeiling);
  return Math.max(0, out);
}

/**
 * Constant real-dollar withdrawal: spend the desired amount, held constant in
 * real terms. Optionally skip the (implicit) inflation raise after a losing
 * year by cutting real spending slightly — modeled as a 0% real change while
 * others would grow; here spending is already real so "skip raise" trims 3%.
 */
export class ConstantRealStrategy implements WithdrawalStrategy {
  readonly id = 'constantReal' as const;
  readonly label = 'Constant real spending';
  readonly description =
    'Spend a fixed amount that keeps pace with inflation each year. Simple and predictable, but ignores portfolio performance — the classic basis for the 4% rule and its most important limitation.';

  decide(ctx: StrategyContext): StrategyDecision {
    let spend = ctx.desiredRealSpending;
    if (ctx.config.skipRaiseAfterLoss && ctx.prevRealReturn < 0 && ctx.yearIndex > 0) {
      // In real terms, "skipping the inflation raise" reduces real spending.
      spend = ctx.prevRealSpending * 0.97;
    }
    return { targetRealSpending: applyBounds(spend, ctx) };
  }
}

/**
 * Constant nominal-dollar withdrawal: the same nominal amount every year, so
 * real spending erodes with inflation. Modeled by deflating last year's real
 * spending by one year of assumed inflation embedded in prevRealSpending.
 */
export class ConstantNominalStrategy implements WithdrawalStrategy {
  readonly id = 'constantNominal' as const;
  readonly label = 'Constant nominal spending';
  readonly description =
    'Withdraw the same dollar amount every year with no inflation adjustment. Purchasing power falls steadily over time — rarely advisable for long retirements.';

  decide(ctx: StrategyContext): StrategyDecision {
    // First retired year sets the nominal anchor at desired; afterwards real
    // spending decays. The engine tracks inflationIndex; here we approximate a
    // 2.5% annual erosion baseline when no prior spending exists.
    const spend =
      ctx.yearIndex === 0 || ctx.prevRealSpending <= 0
        ? ctx.desiredRealSpending
        : ctx.prevRealSpending / 1.025;
    return { targetRealSpending: applyBounds(spend, ctx) };
  }
}

/**
 * Constant percentage of current portfolio: withdraw a fixed percentage of the
 * current (real) portfolio value each year. Never depletes to zero, but
 * spending is as volatile as the portfolio.
 */
export class ConstantPercentageStrategy implements WithdrawalStrategy {
  readonly id = 'constantPercentage' as const;
  readonly label = 'Constant percentage of portfolio';
  readonly description =
    'Withdraw a fixed percentage of the current portfolio each year. The portfolio can never be fully depleted, but spending rises and falls directly with the market.';

  decide(ctx: StrategyContext): StrategyDecision {
    const rate = ctx.config.initialRate ?? 0.04;
    const draw = ctx.portfolioValue * rate;
    return {
      targetRealSpending: applyBounds(draw + ctx.guaranteedRealIncome, ctx),
    };
  }
}

/**
 * Fixed amortization: amortize the current portfolio over the remaining horizon
 * at an assumed real return, recomputed annually (an "amortization based
 * withdrawal", conceptually similar to VPW).
 */
export class AmortizationStrategy implements WithdrawalStrategy {
  readonly id = 'amortization' as const;
  readonly label = 'Fixed amortization';
  readonly description =
    'Each year, amortize the current portfolio over the years remaining at an assumed real return — like a mortgage in reverse. Adapts to markets and horizon; spending varies year to year.';

  decide(ctx: StrategyContext): StrategyDecision {
    const n = Math.max(1, ctx.remainingYears);
    const draw = amortizationPayment(ctx.portfolioValue, ctx.assumedRealReturn, n);
    return {
      targetRealSpending: applyBounds(draw + ctx.guaranteedRealIncome, ctx),
    };
  }
}

/**
 * Interest-and-dividend-only: spend only the portfolio's income yield, never
 * touching principal. Modeled as a low percentage draw (assumed ~2.2% blended
 * yield) plus guaranteed income.
 */
export class InterestOnlyStrategy implements WithdrawalStrategy {
  readonly id = 'interestOnly' as const;
  readonly label = 'Interest & dividends only';
  readonly description =
    'Spend only the portfolio’s natural yield (interest and dividends), preserving principal. Very safe for the portfolio, but often produces low and uneven spending.';

  decide(ctx: StrategyContext): StrategyDecision {
    const yieldRate = ctx.config.initialRate ?? 0.022;
    const draw = ctx.portfolioValue * yieldRate;
    return {
      targetRealSpending: applyBounds(draw + ctx.guaranteedRealIncome, ctx),
    };
  }
}

export { applyBounds, clamp };
