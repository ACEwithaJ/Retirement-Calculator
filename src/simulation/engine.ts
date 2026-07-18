import type {
  Scenario,
  SinglePathResult,
  YearRecord,
} from '../types';
import { createStrategy } from '../strategies';
import type { StrategyContext } from '../strategies';
import { createTaxEngine } from '../taxes';
import type { TaxEngine, TaxableIncome } from '../taxes';
import { totalAnnualFee } from '../fees/fees';
import { findCountry } from '../countries/profiles';
import { portfolioArithmeticReturn } from '../allocations/portfolio';
import { findAllocation } from '../allocations/presets';
import type { AssetAllocation } from '../types';
import { resolveAllocation } from './allocationSchedule';
import {
  availableAccounts,
  withdraw,
  type AccountState,
} from './withdrawalOrder';
import type { ReturnGenerator } from './returns';
import {
  applyReturns,
  buildHoldings,
  holdingsValue,
  rebalance,
  syncHoldings,
  type Holdings,
} from './rebalance';
import { SeededRandom } from '../utils/random';

const SURVIVOR_SPENDING_FACTOR = 0.75;

/** Build initial mutable account state from the scenario (real dollars). */
function initAccounts(scenario: Scenario): AccountState[] {
  return scenario.accounts.map((a) => ({
    id: a.id,
    taxClass: a.taxClass,
    value: a.balance,
    basisFraction:
      a.taxClass === 'taxable'
      ? Math.min(1, (a.costBasis ?? a.balance) / Math.max(1, a.balance))
      : a.taxClass === 'cash'
        ? 1
        : 0,
    availabilityAge: a.availabilityAge,
  }));
}

/** Resolve an account's own target allocation (used in 'fixed' glidepath mode). */
function accountBaseAllocation(scenario: Scenario, accountId: string): AssetAllocation {
  const acct = scenario.accounts.find((a) => a.id === accountId);
  const fallback =
    findAllocation(scenario.allocations, scenario.allocationPolicy.allocationId) ??
    scenario.allocations[0];
  if (!acct) return fallback;
  if (acct.allocation) return acct.allocation;
  return findAllocation(scenario.allocations, acct.allocationId ?? '') ?? fallback;
}

/** Person1 anchor age for the scenario. */
function anchorAge(scenario: Scenario): number {
  return scenario.household.people[0]?.currentAge ?? 47;
}

function horizonEndAge(scenario: Scenario): number {
  const explicit = scenario.household.planningEndAge;
  if (explicit) return explicit;
  return Math.max(...scenario.household.people.map((p) => p.longevityAge));
}

/** Guaranteed real income for the year, with inflation and survivor handling. */
function computeIncome(
  scenario: Scenario,
  age: number,
  inflationIndex: number,
  survivor: boolean,
): { gross: number; taxable: TaxableIncome } {
  const taxable: TaxableIncome = {
    ordinary: 0,
    taxDeferredDistribution: 0,
    capitalGains: 0,
    dividends: 0,
    pension: 0,
    socialSecurity: 0,
    rental: 0,
    annuity: 0,
    taxFreeWithdrawal: 0,
  };
  let gross = 0;
  for (const src of scenario.incomeSources) {
    if (!src.enabled) continue;
    if (age < src.startAge) continue;
    if (src.endAge !== undefined && age > src.endAge) continue;
    // Real value: inflation-adjusted portion holds real value; the rest erodes.
    const realFactor = src.inflationAdjust + (1 - src.inflationAdjust) / inflationIndex;
    let annual = src.monthlyAmount * 12 * realFactor;
    if (survivor) annual *= src.survivorFraction > 0 ? src.survivorFraction : 1;
    gross += annual;
    const taxablePart = annual * src.taxablePortion;
    switch (src.type) {
      case 'pension':
        taxable.pension += taxablePart;
        break;
      case 'socialSecurity':
        taxable.socialSecurity += taxablePart;
        break;
      case 'annuity':
        taxable.annuity += taxablePart;
        break;
      case 'rental':
        taxable.rental += taxablePart;
        break;
      case 'inheritance':
      case 'oneTime':
        break; // treated as non-taxable inflow
      default:
        taxable.ordinary += taxablePart;
    }
  }
  return { gross, taxable };
}

/** Desired/essential spending for the year after phases, decline, and COL. */
function computeSpending(
  scenario: Scenario,
  age: number,
  yearsRetired: number,
  colMultiplier: number,
  survivor: boolean,
): { desired: number; essential: number } {
  const sp = scenario.spending;
  let phaseMult = 1;
  const phases = [...sp.phases].sort((a, b) => a.startAge - b.startAge);
  for (const p of phases) {
    if (age >= p.startAge) phaseMult = p.multiplier;
  }
  const declineMult = sp.realDeclineRate
    ? Math.pow(1 - sp.realDeclineRate, Math.max(0, yearsRetired))
    : 1;
  const survivorMult = survivor ? SURVIVOR_SPENDING_FACTOR : 1;
  const factor = phaseMult * declineMult * colMultiplier * survivorMult;
  return {
    desired: sp.desiredMonthly * 12 * factor,
    essential: sp.essentialMonthly * 12 * factor,
  };
}

/**
 * Solve for the gross portfolio withdrawal needed to fund a target after-tax
 * spending level, given fixed guaranteed income. Iterates because taxes depend
 * on the withdrawal's composition. Returns the realized net spending and taxes.
 */
function solveWithdrawal(
  states: AccountState[],
  scenario: Scenario,
  taxEngine: TaxEngine,
  incomeGross: number,
  incomeTaxable: TaxableIncome,
  targetSpending: number,
  age: number,
  yearIndex: number,
  inflationIndex: number,
  inflation: number,
  countryId: string,
): { gross: number; taxes: number; netSpending: number } {
  const country = findCountry(scenario.countries, countryId);
  const pool = availableAccounts(states, age);
  const availablePortfolio = pool.reduce((a, s) => a + s.value, 0);

  const taxOf = (comp: TaxableIncome): number => {
    // Nominalize, tax, then back to real so bracket thresholds are comparable.
    const nominal: TaxableIncome = {
      ordinary: comp.ordinary * inflationIndex,
      taxDeferredDistribution: comp.taxDeferredDistribution * inflationIndex,
      capitalGains: comp.capitalGains * inflationIndex,
      dividends: comp.dividends * inflationIndex,
      pension: comp.pension * inflationIndex,
      socialSecurity: comp.socialSecurity * inflationIndex,
      rental: comp.rental * inflationIndex,
      annuity: comp.annuity * inflationIndex,
      taxFreeWithdrawal: comp.taxFreeWithdrawal * inflationIndex,
    };
    const res = taxEngine.compute(nominal, {
      settings: scenario.taxes,
      country,
      yearIndex,
      inflation,
      age,
    });
    return res.totalTax / inflationIndex;
  };

  // Snapshot values so we can simulate compositions without committing.
  const snapshot = states.map((s) => ({ ...s }));
  const restore = (): void => {
    for (let i = 0; i < states.length; i++) states[i].value = snapshot[i].value;
  };

  // Tax on income alone (withdrawal = 0).
  const incomeTax = taxOf(incomeTaxable);
  const netFromIncome = incomeGross - incomeTax;

  // If income already covers spending, no withdrawal needed.
  if (netFromIncome >= targetSpending) {
    return { gross: 0, taxes: incomeTax, netSpending: targetSpending };
  }

  let gross = Math.max(0, targetSpending - netFromIncome);
  let taxes = incomeTax;
  for (let iter = 0; iter < 8; iter++) {
    restore();
    const capped = Math.min(gross, availablePortfolio);
    const comp = withdraw(states, scenario.withdrawalOrder, capped, age);
    const combined: TaxableIncome = {
      ordinary: incomeTaxable.ordinary,
      taxDeferredDistribution: incomeTaxable.taxDeferredDistribution + comp.deferred,
      capitalGains: incomeTaxable.capitalGains + comp.taxableGains,
      dividends: incomeTaxable.dividends,
      pension: incomeTaxable.pension,
      socialSecurity: incomeTaxable.socialSecurity,
      rental: incomeTaxable.rental,
      annuity: incomeTaxable.annuity,
      taxFreeWithdrawal: incomeTaxable.taxFreeWithdrawal + comp.taxFree,
    };
    taxes = taxOf(combined);
    const net = incomeGross + capped - taxes;
    const error = targetSpending - net;
    if (Math.abs(error) < 1 || capped >= availablePortfolio) {
      // Commit this composition.
      const netSpending = Math.min(targetSpending, incomeGross + capped - taxes);
      return { gross: capped, taxes, netSpending };
    }
    // Newton-ish step using an estimated marginal rate.
    const mr = Math.min(0.9, Math.max(0, taxes > incomeTax && gross > 0 ? (taxes - incomeTax) / gross : 0.25));
    gross = Math.max(0, gross + error / (1 - mr));
  }
  // Final commit at last gross.
  restore();
  const capped = Math.min(gross, availablePortfolio);
  const comp = withdraw(states, scenario.withdrawalOrder, capped, age);
  const combined: TaxableIncome = {
    ...incomeTaxable,
    taxDeferredDistribution: incomeTaxable.taxDeferredDistribution + comp.deferred,
    capitalGains: incomeTaxable.capitalGains + comp.taxableGains,
    taxFreeWithdrawal: incomeTaxable.taxFreeWithdrawal + comp.taxFree,
  };
  taxes = taxOf(combined);
  const netSpending = Math.min(targetSpending, incomeGross + capped - taxes);
  return { gross: capped, taxes, netSpending };
}

/** Country id in effect at a given person1 age, honoring transitions. */
function countryForAge(scenario: Scenario, age: number): string {
  const transitions = [...scenario.household.countryTransitions].sort(
    (a, b) => a.effectiveAge - b.effectiveAge,
  );
  let current = scenario.household.currentCountryId;
  const retAge = scenario.household.people[0]?.retirementAge ?? 65;
  if (age >= retAge) current = scenario.household.retirementCountryId;
  for (const t of transitions) {
    if (age >= t.effectiveAge) current = t.countryId;
  }
  return current;
}

/**
 * Simulate a single path. `generator.beginPath` must already have been called.
 * All monetary values in the returned records are REAL (today's currency).
 */
export function simulatePath(
  scenario: Scenario,
  generator: ReturnGenerator,
  rng: SeededRandom,
): SinglePathResult {
  const states = initAccounts(scenario);
  const taxEngine = createTaxEngine(scenario.taxes);
  const strategy = createStrategy(scenario.strategy);

  // Per-account asset-class holdings, so rebalancing modes and per-account
  // allocations affect returns distinctly (see rebalance.ts).
  const baseAlloc: Record<string, AssetAllocation> = {};
  const holdings: Record<string, Holdings> = {};
  for (const s of states) {
    baseAlloc[s.id] = accountBaseAllocation(scenario, s.id);
    holdings[s.id] = buildHoldings(s.value, baseAlloc[s.id]);
  }
  const classIds = scenario.assumptions.assetClasses.map((a) => a.id);
  const rebalanceMode = scenario.allocationPolicy.rebalance;
  const rebalanceBand = scenario.allocationPolicy.rebalanceThreshold ?? 0.05;
  const glidepathActive = scenario.allocationPolicy.glidepath !== 'fixed';

  const startAge = anchorAge(scenario);
  const endAge = horizonEndAge(scenario);
  const retAge = scenario.household.people[0]?.retirementAge ?? 65;
  const initialPeople = scenario.household.people.length;
  const horizon = Math.max(1, endAge - startAge + 1);

  const records: YearRecord[] = [];
  let inflationIndex = 1;
  let prevRealSpending = 0;
  let prevRealReturn = 0;
  let portfolioAtRetirement = 0;
  const trailingPortfolio: number[] = [];

  let depleted = false;
  let depletionAge: number | undefined;
  let firstReductionAge: number | undefined;
  let lifetimeTaxes = 0;
  let lifetimeFees = 0;
  let lifetimeSpending = 0;
  let minRealSpending = Infinity;
  let maxRealSpendingCut = 0;
  let yearsBelowDesired = 0;
  let essentialAlwaysFunded = true;
  let desiredAlwaysFunded = true;

  const assumedReal =
    portfolioArithmeticReturn(
      scenario.allocations.find((a) => a.id === scenario.allocationPolicy.allocationId) ??
        scenario.allocations[0],
      scenario.assumptions.assetClasses,
    ) - scenario.assumptions.inflation.general;

  for (let y = 0; y < horizon; y++) {
    const age = startAge + y;
    const aliveCount = scenario.household.people.filter(
      (p) => p.currentAge + y <= p.longevityAge,
    ).length;
    if (aliveCount === 0) break;
    const survivor = aliveCount < initialPeople;
    const isRetired = age >= retAge;

    const countryId = countryForAge(scenario, age);
    const country = findCountry(scenario.countries, countryId);
    const colMultiplier = country.costOfLivingMultiplier;

    // Resolve allocation & realized return for the year.
    const alloc = resolveAllocation(
      scenario.allocationPolicy,
      scenario.allocations,
      age,
      retAge,
      endAge,
    );
    const assets = generator.yearAssets(rng, y, classIds);
    const inflation = assets.inflation;

    const totalStart = states.reduce((a, s) => a + s.value, 0);
    if (isRetired && portfolioAtRetirement === 0) portfolioAtRetirement = totalStart;

    // One-time flows scheduled at this age.
    for (const f of scenario.oneTimeFlows) {
      if (f.age === age) {
        const target = states.find((s) => s.id === f.accountId) ?? states[0];
        if (target) target.value = Math.max(0, target.value + f.amount);
      }
    }

    let income = 0;
    let grossWithdrawal = 0;
    let taxes = 0;
    let netSpending = 0;
    let desired = 0;
    let essential = 0;

    if (!isRetired) {
      // Accumulation: add contributions, no withdrawals.
      for (const c of scenario.contributions) {
        const end = c.endAge ?? retAge;
        if (age >= end) continue;
        const grow = c.annualIncrease ? Math.pow(1 + c.annualIncrease, y) : 1;
        const annual = c.monthlyAmount * 12 * grow * (1 + (c.employerMatch ?? 0));
        const acct = states.find((s) => s.id === c.accountId) ?? states[0];
        if (acct) acct.value += annual;
      }
    } else {
      const inc = computeIncome(scenario, age, inflationIndex, survivor);
      income = inc.gross;
      const spend = computeSpending(
        scenario,
        age,
        age - retAge,
        colMultiplier,
        survivor,
      );
      desired = spend.desired;
      essential = spend.essential;

      const pool = availableAccounts(states, age);
      const availablePortfolio = pool.reduce((a, s) => a + s.value, 0);

      const ctx: StrategyContext = {
        config: scenario.strategy,
        ageP1: age,
        yearIndex: y,
        isRetired,
        remainingYears: Math.max(1, endAge - age + 1),
        portfolioValue: availablePortfolio,
        initialPortfolioAtRetirement: portfolioAtRetirement || totalStart,
        desiredRealSpending: desired,
        essentialRealSpending: essential,
        guaranteedRealIncome: income,
        prevRealSpending,
        prevRealReturn,
        assumedRealReturn: assumedReal,
        trailingPortfolio: [...trailingPortfolio],
      };
      const decision = strategy.decide(ctx);
      const target = Math.max(essential * 0 + 0, decision.targetRealSpending);

      const solved = solveWithdrawal(
        states,
        scenario,
        taxEngine,
        income,
        inc.taxable,
        target,
        age,
        y,
        inflationIndex,
        inflation,
        countryId,
      );
      grossWithdrawal = solved.gross;
      taxes = solved.taxes;
      netSpending = solved.netSpending;

      // Surplus income beyond spending is reinvested into the largest account.
      if (income > 0 && grossWithdrawal === 0 && income - taxes > netSpending) {
        const surplus = income - taxes - netSpending;
        const acct = [...states].sort((a, b) => b.value - a.value)[0];
        if (acct && surplus > 0) acct.value += surplus;
      }
    }

    // Fees on the post-withdrawal balance (real).
    const postWithdrawal = states.reduce((a, s) => a + s.value, 0);
    const feeThisYear = postWithdrawal > 0 ? totalAnnualFee(postWithdrawal, scenario.fees) : 0;
    if (feeThisYear > 0) {
      lifetimeFees += feeThisYear;
      const factor = Math.max(0, 1 - feeThisYear / postWithdrawal);
      for (const s of states) s.value *= factor;
    }

    // Reconcile holdings to each account's post-cash-flow value, then apply the
    // year's per-asset-class real returns and rebalance per the policy. This is
    // what makes 'annual', 'threshold', and 'none' rebalancing — and per-account
    // allocations — produce distinct outcomes.
    let preReturn = 0;
    let postReturn = 0;
    for (const s of states) {
      const h = holdings[s.id];
      syncHoldings(h, s.value, baseAlloc[s.id]);
      preReturn += holdingsValue(h);
      applyReturns(h, assets.real);
      s.value = holdingsValue(h);
      postReturn += s.value;
      const target = glidepathActive ? alloc : baseAlloc[s.id];
      rebalance(h, target, rebalanceMode, rebalanceBand);
    }
    // Portfolio real return this year (investment only, net of the classes held).
    const realReturn = preReturn > 0 ? postReturn / preReturn - 1 : 0;

    const endBalance = states.reduce((a, s) => a + s.value, 0);

    // Track outcomes (retirement years only for spending metrics).
    if (isRetired) {
      lifetimeTaxes += taxes;
      lifetimeSpending += netSpending;
      const fundedThisYear = netSpending >= desired - 1;
      const essentialFundedThisYear = netSpending >= essential - 1;
      if (!fundedThisYear) {
        yearsBelowDesired += 1;
        desiredAlwaysFunded = false;
        if (firstReductionAge === undefined) firstReductionAge = age;
        const cut = desired > 0 ? (desired - netSpending) / desired : 0;
        if (cut > maxRealSpendingCut) maxRealSpendingCut = cut;
      }
      if (!essentialFundedThisYear) essentialAlwaysFunded = false;
      if (netSpending < minRealSpending) minRealSpending = netSpending;

      if (endBalance <= 1 && !depleted) {
        depleted = true;
        depletionAge = age;
      }

      records.push({
        age,
        year: y,
        startBalance: totalStart,
        income,
        grossWithdrawal,
        taxes,
        fees: feeThisYear,
        netSpending,
        desiredSpending: desired,
        essentialSpending: essential,
        endBalance,
        withdrawalRate: totalStart > 0 ? grossWithdrawal / totalStart : 0,
        inflationIndex,
        fundedThisYear,
        essentialFundedThisYear,
      });

      prevRealSpending = netSpending;
    } else {
      records.push({
        age,
        year: y,
        startBalance: totalStart,
        income: 0,
        grossWithdrawal: 0,
        taxes: 0,
        fees: 0,
        netSpending: 0,
        desiredSpending: 0,
        essentialSpending: 0,
        endBalance,
        withdrawalRate: 0,
        inflationIndex,
        fundedThisYear: true,
        essentialFundedThisYear: true,
      });
    }

    prevRealReturn = realReturn;
    trailingPortfolio.push(endBalance);
    inflationIndex *= 1 + inflation;
  }

  if (!Number.isFinite(minRealSpending)) minRealSpending = 0;

  return {
    records,
    depleted,
    depletionAge,
    endingBalance: records.length ? records[records.length - 1].endBalance : 0,
    lifetimeTaxes,
    lifetimeFees,
    lifetimeSpending,
    minRealSpending,
    maxRealSpendingCut,
    yearsBelowDesired,
    firstReductionAge,
    essentialAlwaysFunded,
    desiredAlwaysFunded,
  };
}
