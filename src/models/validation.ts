import type { AssetAllocation, Scenario } from '../types';

export interface ValidationIssue {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

/** Validate an allocation's weights sum to 1 (within tolerance). */
export function validateAllocation(alloc: AssetAllocation): ValidationIssue[] {
  const sum = Object.values(alloc.weights).reduce<number>((a, b) => a + (b ?? 0), 0);
  if (Math.abs(sum - 1) > 0.001) {
    return [
      {
        field: `allocation:${alloc.id}`,
        message: `Allocation "${alloc.name}" weights sum to ${(sum * 100).toFixed(1)}%, not 100%.`,
        severity: 'error',
      },
    ];
  }
  return [];
}

/**
 * Validate a full scenario. Returns errors (block simulation) and warnings
 * (surface but allow). Mirrors the guardrails required by the specification.
 */
export function validateScenario(scenario: Scenario): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const add = (field: string, message: string, severity: 'error' | 'warning' = 'error'): void => {
    issues.push({ field, message, severity });
  };

  // People & horizon.
  for (const p of scenario.household.people) {
    if (p.retirementAge <= p.currentAge)
      add(`person:${p.id}`, `${p.label}: retirement age must exceed current age.`);
    if (p.longevityAge <= p.retirementAge)
      add(`person:${p.id}`, `${p.label}: longevity age must exceed retirement age.`);
  }
  const endAge = scenario.household.planningEndAge;
  const retAge = scenario.household.people[0]?.retirementAge ?? 0;
  if (endAge !== undefined && endAge <= retAge)
    add('planningEndAge', 'Planning end age must exceed retirement age.');

  // Spending.
  if (scenario.spending.desiredMonthly < 0) add('spending.desired', 'Desired spending cannot be negative.');
  if (scenario.spending.essentialMonthly < 0) add('spending.essential', 'Essential spending cannot be negative.');
  if (scenario.spending.essentialMonthly > scenario.spending.desiredMonthly)
    add('spending.essential', 'Essential spending exceeds desired spending.', 'warning');

  // Accounts.
  for (const a of scenario.accounts) {
    if (a.balance < 0) add(`account:${a.id}`, `Account "${a.name}" cannot start with a negative balance.`);
    if (a.costBasis !== undefined && a.costBasis < 0)
      add(`account:${a.id}`, `Account "${a.name}" cost basis cannot be negative.`);
  }

  // Allocations.
  for (const alloc of scenario.allocations) {
    if (scenario.accounts.some((a) => a.allocationId === alloc.id) || alloc.id === scenario.allocationPolicy.allocationId) {
      issues.push(...validateAllocation(alloc));
    }
  }

  // Tax rates.
  const flat = scenario.taxes.flat.effectiveRate;
  if (flat < 0 || flat > 1) add('taxes.flat', 'Flat tax rate must be between 0% and 100%.');

  // Fee tiers must not overlap and must ascend.
  const tiers = [...scenario.fees.aumTiers].sort((a, b) => a.threshold - b.threshold);
  for (let i = 1; i < tiers.length; i++) {
    if (tiers[i].threshold <= tiers[i - 1].threshold)
      add('fees.aumTiers', 'AUM fee tier thresholds must be strictly increasing.');
  }

  // Country transitions must be ordered and valid.
  const trans = scenario.household.countryTransitions;
  for (let i = 1; i < trans.length; i++) {
    if (trans[i].effectiveAge <= trans[i - 1].effectiveAge)
      add('countryTransitions', 'Country transition ages must be strictly increasing.');
  }

  // Monte Carlo parameters.
  if (scenario.simulation.trials < 1) add('simulation.trials', 'Number of trials must be at least 1.');
  if (scenario.assumptions.returnModel.studentTDf <= 2)
    add('returnModel.studentTDf', "Student's t degrees of freedom must exceed 2 for finite variance.", 'warning');

  // Withdrawal floor sanity.
  const floor = scenario.strategy.spendingFloor;
  if (floor !== undefined && floor > scenario.spending.desiredMonthly * 12 * 2)
    add('strategy.spendingFloor', 'Spending floor is far above desired spending — check units (annual vs monthly).', 'warning');

  return issues;
}

export function hasBlockingErrors(issues: ValidationIssue[]): boolean {
  return issues.some((i) => i.severity === 'error');
}
