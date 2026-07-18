import type { Scenario } from '../types';
import { findAllocation } from '../allocations/presets';
import { portfolioArithmeticReturn, portfolioVolatility } from '../allocations/portfolio';
import { geometricFromArithmetic } from '../utils/finance';

export interface ContributionProjection {
  years: number;
  startingPortfolio: number;
  employeeContributions: number;
  employerContributions: number;
  projectedGrowth: number;
  projectedPortfolioAtRetirement: number;
}

/**
 * Deterministic accumulation illustration in today's dollars. Contributions
 * are added at mid-year and each account uses its own allocation when present.
 * Home equity is excluded because it is not an ongoing portfolio contribution.
 */
export function projectContributions(scenario: Scenario): ContributionProjection {
  const currentAge = scenario.household.people[0]?.currentAge ?? 0;
  const retirementAge = scenario.household.people[0]?.retirementAge ?? currentAge;
  const years = Math.max(0, Math.ceil(retirementAge - currentAge));
  const accounts = scenario.accounts.filter((a) => a.assetType !== 'homeEquity');
  const balances = new Map(accounts.map((a) => [a.id, a.balance]));
  const startingPortfolio = accounts.reduce((sum, a) => sum + a.balance, 0);
  let employeeContributions = 0;
  let employerContributions = 0;

  const realReturn = (accountId: string): number => {
    const account = accounts.find((a) => a.id === accountId);
    if (account?.customExpectedReturn !== undefined) {
      return account.customExpectedReturn - scenario.assumptions.inflation.general;
    }
    const allocation = account?.allocation ?? findAllocation(
      scenario.allocations,
      account?.allocationId ?? scenario.allocationPolicy.allocationId,
    ) ?? scenario.allocations[0];
    const arithmetic = portfolioArithmeticReturn(allocation, scenario.assumptions.assetClasses);
    const volatility = portfolioVolatility(allocation, scenario.assumptions);
    return geometricFromArithmetic(arithmetic, volatility) - scenario.assumptions.inflation.general;
  };

  for (let year = 0; year < years; year++) {
    const age = currentAge + year;
    for (const contribution of scenario.contributions) {
      if (!balances.has(contribution.accountId)) continue;
      if (age >= (contribution.endAge ?? retirementAge)) continue;
      const increase = Math.pow(1 + (contribution.annualIncrease ?? 0), year);
      const employee = contribution.monthlyAmount * 12 * increase;
      const employer = employee * (contribution.employerMatch ?? 0);
      employeeContributions += employee;
      employerContributions += employer;
      balances.set(contribution.accountId, (balances.get(contribution.accountId) ?? 0) + employee + employer);
    }
    for (const account of accounts) {
      const balance = balances.get(account.id) ?? 0;
      balances.set(account.id, balance * (1 + realReturn(account.id)));
    }
  }

  const projectedPortfolioAtRetirement = [...balances.values()].reduce((sum, value) => sum + value, 0);
  return {
    years,
    startingPortfolio,
    employeeContributions,
    employerContributions,
    projectedGrowth: projectedPortfolioAtRetirement - startingPortfolio - employeeContributions - employerContributions,
    projectedPortfolioAtRetirement,
  };
}
