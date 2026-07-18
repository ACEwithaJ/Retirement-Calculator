import type { AllocationPolicy, AssetAllocation } from '../types';
import { findAllocation } from '../allocations/presets';
import { clamp } from '../utils/finance';

/**
 * Resolve the allocation in effect at a given age, honoring the glidepath mode.
 * For glidepath modes we synthesize a simple two-asset (equity/bond) allocation
 * from an equity-fraction curve; for 'fixed'/'custom' we use the named
 * allocation directly. This keeps glidepaths transparent and testable.
 */
export function resolveAllocation(
  policy: AllocationPolicy,
  allocations: AssetAllocation[],
  age: number,
  retirementAge: number,
  endAge: number,
): AssetAllocation {
  const base =
    findAllocation(allocations, policy.allocationId) ?? allocations[0];

  const equityFrac = baseEquityFraction(base);

  let eq = equityFrac;
  const yearsToRet = retirementAge - age;
  const yearsInRet = age - retirementAge;
  const retSpan = Math.max(1, endAge - retirementAge);

  switch (policy.glidepath) {
    case 'ageBased':
      eq = clamp((110 - age) / 100, 0.2, 0.9);
      break;
    case 'risingEquity':
      // Start conservative at retirement, rise ~1%/yr (Kitces/Pfau bond tent tail).
      if (age >= retirementAge) eq = clamp(0.4 + 0.01 * yearsInRet, 0.4, 0.8);
      break;
    case 'decliningEquity':
      if (age >= retirementAge) eq = clamp(equityFrac - (0.01 * yearsInRet), 0.2, equityFrac);
      break;
    case 'bondTent':
      // Reduce equity into retirement, then rise afterwards.
      if (age < retirementAge) eq = clamp(equityFrac - 0.02 * Math.max(0, yearsToRet), 0.3, equityFrac);
      else eq = clamp(0.4 + 0.01 * yearsInRet, 0.4, 0.75);
      break;
    case 'custom': {
      const pts = policy.glidepathPoints ?? [];
      const applicable = [...pts].sort((a, b) => a.age - b.age).filter((p) => p.age <= age).pop();
      if (applicable) {
        return findAllocation(allocations, applicable.allocationId) ?? base;
      }
      return base;
    }
    case 'fixed':
    default:
      return base;
  }

  void retSpan;
  return {
    id: `glide-${policy.glidepath}-${age}`,
    name: `Glidepath (${Math.round(eq * 100)}% equity)`,
    weights: { globalStocks: eq, govBonds: clamp(1 - eq, 0, 1) },
  };
}

function baseEquityFraction(alloc: AssetAllocation): number {
  const equityIds = new Set([
    'usLargeCap',
    'usSmallCap',
    'usValue',
    'intlDeveloped',
    'emergingMarkets',
    'globalStocks',
    'reits',
    'gold',
    'alternatives',
  ]);
  let eq = 0;
  for (const [id, w] of Object.entries(alloc.weights)) {
    if (w && equityIds.has(id)) eq += w;
  }
  return eq;
}
