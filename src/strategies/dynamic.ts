import { clamp } from '../utils/finance';
import { applyBounds } from './static';
import type {
  StrategyContext,
  StrategyDecision,
  WithdrawalStrategy,
} from './types';

/**
 * Guyton-Klinger guardrails. Start from an initial withdrawal rate applied to
 * the portfolio at retirement; each year adjust spending with inflation
 * (implicit in real terms), but apply guardrail rules:
 *   - Capital preservation: if the current withdrawal rate rises above the
 *     upper guardrail, cut spending by the adjustment percentage.
 *   - Prosperity: if it falls below the lower guardrail, raise spending.
 * Bounded by optional real floor and ceiling.
 */
export class GuytonKlingerStrategy implements WithdrawalStrategy {
  readonly id = 'guytonKlinger' as const;
  readonly label = 'Guyton-Klinger guardrails';
  readonly description =
    'Spend a set amount, but if withdrawals grow too large relative to the portfolio (a market drop), cut back; if they shrink (strong markets), spend more. Guardrails keep the plan on track by making modest, rules-based adjustments.';

  decide(ctx: StrategyContext): StrategyDecision {
    const initialRate = ctx.config.initialRate ?? 0.05;
    const upper = ctx.config.upperGuardrail ?? 0.2; // +20% band
    const lower = ctx.config.lowerGuardrail ?? 0.2; // -20% band
    const adjust = ctx.config.adjustment ?? 0.1; // 10% spending change

    // Base spending in the first retired year.
    let spend =
      ctx.prevRealSpending > 0 && ctx.yearIndex > 0
        ? ctx.prevRealSpending
        : ctx.initialPortfolioAtRetirement * initialRate;

    if (ctx.portfolioValue > 0 && ctx.yearIndex > 0) {
      const currentRate = spend / ctx.portfolioValue;
      const upperTrigger = initialRate * (1 + upper);
      const lowerTrigger = initialRate * (1 - lower);
      // Capital-preservation rule (skip in final ~15% of horizon).
      if (currentRate > upperTrigger && ctx.remainingYears > 3) {
        spend *= 1 - adjust;
      } else if (currentRate < lowerTrigger) {
        // Prosperity rule.
        spend *= 1 + adjust;
      }
    }
    return { targetRealSpending: applyBounds(spend, ctx) };
  }
}

/**
 * Vanguard-style dynamic spending. Target a percentage of the portfolio, but
 * limit how much spending can rise or fall from the prior year (a "ceiling and
 * floor" on the CHANGE, distinct from absolute floor/ceiling).
 */
export class VanguardDynamicStrategy implements WithdrawalStrategy {
  readonly id = 'vanguardDynamic' as const;
  readonly label = 'Vanguard dynamic spending';
  readonly description =
    'Target a percentage of the portfolio, but cap how much spending can increase or decrease each year. Blends the stability of constant spending with the sustainability of percentage-based spending.';

  decide(ctx: StrategyContext): StrategyDecision {
    const rate = ctx.config.initialRate ?? 0.05;
    const maxInc = ctx.config.maxIncrease ?? 0.05;
    const maxDec = ctx.config.maxDecrease ?? 0.025;

    const target = ctx.portfolioValue * rate;
    let spend = target;
    if (ctx.prevRealSpending > 0 && ctx.yearIndex > 0) {
      const upper = ctx.prevRealSpending * (1 + maxInc);
      const lower = ctx.prevRealSpending * (1 - maxDec);
      spend = clamp(target, lower, upper);
    }
    return {
      targetRealSpending: applyBounds(spend + ctx.guaranteedRealIncome, ctx),
    };
  }
}

/**
 * Variable Percentage Withdrawal (VPW). Withdraw a percentage that increases
 * with age (shorter remaining horizon), computed as an amortization factor over
 * remaining years at an assumed real return. Bogleheads-style. A guaranteed
 * income floor can support essential spending when portfolio draws fall.
 */
export class VpwStrategy implements WithdrawalStrategy {
  readonly id = 'vpw' as const;
  readonly label = 'Variable Percentage Withdrawal';
  readonly description =
    'The withdrawal percentage rises with age as the horizon shortens, spending the portfolio down deliberately by the end of the plan. It never technically runs out — but spending can fall sharply after poor markets, so a guaranteed-income floor matters.';

  decide(ctx: StrategyContext): StrategyDecision {
    const r = ctx.assumedRealReturn;
    const n = Math.max(1, ctx.remainingYears);
    // Amortization factor = r / (1 - (1+r)^-n); reduces to 1/n when r ~ 0.
    const factor =
      Math.abs(r) < 1e-9 ? 1 / n : r / (1 - Math.pow(1 + r, -n));
    const draw = ctx.portfolioValue * factor;
    const floor = ctx.config.spendingFloor;
    let spend = draw + ctx.guaranteedRealIncome;
    if (floor !== undefined) spend = Math.max(spend, Math.min(floor, ctx.guaranteedRealIncome + draw + floor));
    return { targetRealSpending: applyBounds(spend, ctx) };
  }
}

/**
 * RMD-style withdrawal: divide the portfolio by a life-expectancy divisor that
 * declines with age. Uses a simplified IRS-Uniform-Lifetime-like table.
 */
const RMD_DIVISORS: Record<number, number> = {
  // age -> divisor (approximate IRS Uniform Lifetime Table)
  72: 27.4, 75: 24.6, 80: 20.2, 85: 16.0, 90: 12.2, 95: 8.9, 100: 6.4, 105: 4.6,
};

function rmdDivisor(age: number): number {
  const ages = Object.keys(RMD_DIVISORS).map(Number).sort((a, b) => a - b);
  if (age <= ages[0]) return RMD_DIVISORS[ages[0]] + (ages[0] - age);
  if (age >= ages[ages.length - 1]) return Math.max(1.9, RMD_DIVISORS[ages[ages.length - 1]] - (age - ages[ages.length - 1]) * 0.4);
  for (let i = 0; i < ages.length - 1; i++) {
    if (age >= ages[i] && age <= ages[i + 1]) {
      const t = (age - ages[i]) / (ages[i + 1] - ages[i]);
      return RMD_DIVISORS[ages[i]] * (1 - t) + RMD_DIVISORS[ages[i + 1]] * t;
    }
  }
  return 15;
}

export class RmdMethodStrategy implements WithdrawalStrategy {
  readonly id = 'rmdMethod' as const;
  readonly label = 'RMD-style (life expectancy)';
  readonly description =
    'Withdraw the portfolio divided by a life-expectancy factor each year, mirroring how Required Minimum Distributions work. Simple, self-adjusting, and naturally spends more as life expectancy shortens.';

  decide(ctx: StrategyContext): StrategyDecision {
    const divisor = rmdDivisor(ctx.ageP1);
    const draw = ctx.portfolioValue / divisor;
    return {
      targetRealSpending: applyBounds(draw + ctx.guaranteedRealIncome, ctx),
    };
  }
}

/**
 * Endowment strategy: spend a percentage of the trailing average portfolio
 * value (smoothed over N years), the way university endowments do. Smoothing
 * dampens year-to-year spending swings.
 */
export class EndowmentStrategy implements WithdrawalStrategy {
  readonly id = 'endowment' as const;
  readonly label = 'Endowment (smoothed)';
  readonly description =
    'Spend a fixed percentage of a multi-year AVERAGE of the portfolio value, smoothing out market swings. Used by university endowments to keep spending stable through volatility.';

  decide(ctx: StrategyContext): StrategyDecision {
    const rate = ctx.config.initialRate ?? 0.045;
    const window = ctx.config.smoothingYears ?? 3;
    const vals = ctx.trailingPortfolio.slice(-window);
    const avg =
      vals.length > 0
        ? vals.reduce((a, b) => a + b, 0) / vals.length
        : ctx.portfolioValue;
    const draw = avg * rate;
    return {
      targetRealSpending: applyBounds(draw + ctx.guaranteedRealIncome, ctx),
    };
  }
}

/**
 * Floor-and-ceiling: withdraw a percentage of the portfolio, but never below a
 * real floor or above a real ceiling. A middle ground between constant and
 * percentage strategies.
 */
export class FloorCeilingStrategy implements WithdrawalStrategy {
  readonly id = 'floorCeiling' as const;
  readonly label = 'Floor-and-ceiling';
  readonly description =
    'Withdraw a percentage of the portfolio, but clamp spending between a real floor (never spend less) and a real ceiling (never spend more). Protects essential spending while capturing some upside.';

  decide(ctx: StrategyContext): StrategyDecision {
    const rate = ctx.config.initialRate ?? 0.05;
    const draw = ctx.portfolioValue * rate + ctx.guaranteedRealIncome;
    const floor = ctx.config.spendingFloor ?? ctx.essentialRealSpending;
    const ceiling = ctx.config.spendingCeiling ?? ctx.desiredRealSpending;
    return { targetRealSpending: clamp(draw, floor, Math.max(floor, ceiling)) };
  }
}
