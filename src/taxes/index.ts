import type { TaxSettings } from '../types';
import { CustomTaxEngine } from './custom';
import { FlatTaxEngine } from './flat';
import { MarginalTaxEngine } from './marginal';
import type { TaxEngine } from './types';

export * from './types';
export { FlatTaxEngine } from './flat';
export { MarginalTaxEngine, taxFromBrackets, marginalRateFor } from './marginal';
export { CustomTaxEngine } from './custom';

/** Factory: build the tax engine selected by the scenario's tax settings. */
export function createTaxEngine(settings: TaxSettings): TaxEngine {
  switch (settings.mode) {
    case 'marginal':
      return new MarginalTaxEngine();
    case 'custom':
      return new CustomTaxEngine();
    case 'flat':
    default:
      return new FlatTaxEngine();
  }
}
