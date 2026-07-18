/**
 * Domain models for the retirement calculator.
 *
 * These types are the single source of truth shared by the calculation engine
 * and the UI. They intentionally separate:
 *   - user inputs (Scenario and its sub-objects)
 *   - modeling assumptions (Assumptions, ReturnModel)
 *   - simulation configuration (SimulationConfig)
 *   - results (SimulationResults and friends)
 *
 * Nothing in this file performs calculations. Keep it declarative.
 */

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

/** ISO currency code, e.g. "USD", "EUR", "GBP". */
export type CurrencyCode = string;

/** A tax classification for an account. */
export type AccountTaxClass =
  | 'taxable' // brokerage; basis + gains matter
  | 'tax-deferred' // Traditional IRA/401k; withdrawals taxed as ordinary income
  | 'tax-free' // Roth/ISA; qualified withdrawals untaxed
  | 'cash' // checking/savings; treated as taxable but ~no gains
  | 'hsa'; // health savings; treated as tax-free for qualified medical use

/** Asset-class identifiers used across allocations and return models. */
export type AssetClassId =
  | 'usLargeCap'
  | 'usSmallCap'
  | 'usValue'
  | 'intlDeveloped'
  | 'emergingMarkets'
  | 'globalStocks'
  | 'govBonds'
  | 'corpBonds'
  | 'intlBonds'
  | 'tips'
  | 'shortTermBonds'
  | 'cash'
  | 'reits'
  | 'gold'
  | 'alternatives'
  | string; // allow user-defined asset classes

// ---------------------------------------------------------------------------
// Household
// ---------------------------------------------------------------------------

export interface Person {
  id: string;
  label: string;
  currentAge: number;
  retirementAge: number;
  /** Age through which this person is modeled as alive. */
  longevityAge: number;
}

export type MaritalStatus = 'single' | 'married' | 'partnered';

export interface CountryTransition {
  /** Country profile id the household resides in from this age onward. */
  countryId: string;
  /** Age of person1 at which the transition takes effect. */
  effectiveAge: number;
}

export interface Household {
  people: Person[];
  maritalStatus: MaritalStatus;
  dependents: number;
  currentCountryId: string;
  retirementCountryId: string;
  /** Optional ordered residency transitions (by person1 age). */
  countryTransitions: CountryTransition[];
  baseCurrency: CurrencyCode;
  /**
   * Planning horizon. If `endAge` is set it wins; otherwise the max of the
   * people's longevity ages is used.
   */
  planningEndAge?: number;
}

// ---------------------------------------------------------------------------
// Accounts & contributions
// ---------------------------------------------------------------------------

export interface Account {
  id: string;
  name: string;
  taxClass: AccountTaxClass;
  balance: number;
  /** Cost basis for taxable accounts (fraction of balance that is basis). */
  costBasis?: number;
  /** Allocation by asset class; fractions should sum to 1. */
  allocationId?: string; // reference to a named allocation, else uses default
  allocation?: AssetAllocation; // inline override
  /** Age (person1) before which the account cannot be tapped. */
  availabilityAge?: number;
  /** Annual account fee as a fraction of balance (e.g. 0.001 = 0.1%). */
  annualFee?: number;
  /** Optional custom expected nominal geometric return override. */
  customExpectedReturn?: number;
}

export interface Contribution {
  accountId: string;
  /** Monthly contribution in today's currency. */
  monthlyAmount: number;
  /** Annual increase to the contribution (fraction, e.g. 0.03). */
  annualIncrease?: number;
  /** Employer match as a fraction of the contribution (e.g. 0.5 = 50%). */
  employerMatch?: number;
  /** Age (person1) at which contributions stop; defaults to retirement. */
  endAge?: number;
}

export interface OneTimeFlow {
  id: string;
  label: string;
  /** Age of person1 when the flow occurs. */
  age: number;
  /** Positive = inflow (contribution/inheritance), negative = outflow (expense). */
  amount: number;
  /** If true, `amount` is grown with inflation to the event date. */
  inflationAdjust?: boolean;
  accountId?: string;
}

// ---------------------------------------------------------------------------
// Spending
// ---------------------------------------------------------------------------

export type SpendingBasis = 'after-tax' | 'before-tax';

export interface SpendingPhase {
  /** Inclusive start age (person1). */
  startAge: number;
  /** Multiplier applied to base desired spending during this phase. */
  multiplier: number;
  label: string; // e.g. "Go-go", "Slow-go", "No-go"
}

export interface Spending {
  /** Desired monthly spending in today's currency. */
  desiredMonthly: number;
  /** Essential monthly spending floor in today's currency. */
  essentialMonthly: number;
  /** Whether the desired figure is stated after-tax or as a pre-tax need. */
  basis: SpendingBasis;
  /** Whether advisory fees are already included in the desired figure. */
  includesAdvisoryFees: boolean;
  /** Whether housing is included in the desired figure. */
  includesHousing: boolean;
  /** Optional retirement phases (go-go/slow-go/no-go). */
  phases: SpendingPhase[];
  /** Optional real decline in spending per year of retirement (fraction). */
  realDeclineRate?: number;
  /** One-time future expenses (stored as negative OneTimeFlows). */
  oneTimeExpenses: OneTimeFlow[];
}

// ---------------------------------------------------------------------------
// Income sources
// ---------------------------------------------------------------------------

export type IncomeType =
  | 'employment'
  | 'partTime'
  | 'consulting'
  | 'socialSecurity'
  | 'pension'
  | 'annuity'
  | 'rental'
  | 'business'
  | 'other'
  | 'inheritance'
  | 'oneTime';

export interface IncomeSource {
  id: string;
  label: string;
  type: IncomeType;
  /** Monthly amount in today's currency (annual amounts / 12). */
  monthlyAmount: number;
  startAge: number;
  endAge?: number;
  /** Fraction of the amount that adjusts with inflation (0..1). */
  inflationAdjust: number;
  /** Fraction of the income that is taxable (0..1). */
  taxablePortion: number;
  /** Fraction of the benefit that continues to a survivor (0..1). */
  survivorFraction: number;
  currency: CurrencyCode;
  /** Subjective certainty 0..1 (informational; scales nothing by default). */
  certainty?: number;
  enabled: boolean;
}

// ---------------------------------------------------------------------------
// Allocation & asset classes
// ---------------------------------------------------------------------------

export interface AssetAllocation {
  id: string;
  name: string;
  /** Weights by asset class; must sum to 1 (validated). */
  weights: Partial<Record<AssetClassId, number>>;
}

export interface AssetClassAssumption {
  id: AssetClassId;
  name: string;
  /** Arithmetic mean nominal annual return. */
  arithmeticReturn: number;
  /** Geometric mean nominal annual return (informational; derived if absent). */
  geometricReturn?: number;
  /** Annual volatility (standard deviation of returns). */
  volatility: number;
  /** Income yield fraction (used for interest/dividend-only strategy). */
  yield: number;
  /** Fund expense ratio typically associated with the class. */
  expenseRatio: number;
  /** How strongly the class tracks inflation (informational). */
  inflationSensitivity?: number;
}

export type RebalanceMode = 'annual' | 'quarterly' | 'threshold' | 'none';

export type GlidepathMode =
  | 'fixed'
  | 'risingEquity'
  | 'decliningEquity'
  | 'bondTent'
  | 'ageBased'
  | 'custom';

export interface GlidepathPoint {
  age: number;
  allocationId: string;
}

export interface AllocationPolicy {
  /** The primary allocation used (unless a glidepath overrides). */
  allocationId: string;
  rebalance: RebalanceMode;
  /** Threshold band for threshold rebalancing (e.g. 0.05 = 5%). */
  rebalanceThreshold?: number;
  glidepath: GlidepathMode;
  glidepathPoints?: GlidepathPoint[];
}

// ---------------------------------------------------------------------------
// Inflation & currency
// ---------------------------------------------------------------------------

export interface InflationAssumptions {
  general: number;
  healthcare: number;
  housing: number;
  education: number;
  /** Standard deviation of inflation if stochastic inflation is enabled. */
  volatility: number;
  stochastic: boolean;
}

export interface CurrencyAssumptions {
  baseCurrency: CurrencyCode;
  spendingCurrency: CurrencyCode;
  /** Units of spending currency per unit of base currency at start. */
  initialRate: number;
  /** Expected annual drift of the spending currency vs base (fraction). */
  expectedTrend: number;
  /** Annual volatility of the exchange rate. */
  volatility: number;
  /** Correlation of FX moves with equity returns (-1..1). */
  correlationWithEquity: number;
  /** Fraction of international holdings that are currency-hedged (0..1). */
  hedgedFraction: number;
}

// ---------------------------------------------------------------------------
// Taxes
// ---------------------------------------------------------------------------

export type TaxMode = 'flat' | 'marginal' | 'custom';

export interface FlatTaxConfig {
  /** Single effective rate applied to taxable income (0..1). */
  effectiveRate: number;
}

export interface TaxBracket {
  /** Lower bound of the bracket (annual income). */
  threshold: number;
  /** Marginal rate applied above the threshold (0..1). */
  rate: number;
}

export type FilingStatus = 'single' | 'married' | 'headOfHousehold';

export interface MarginalTaxConfig {
  ordinaryBrackets: TaxBracket[];
  capitalGainsBrackets: TaxBracket[];
  standardDeduction: number;
  filingStatus: FilingStatus;
  /** Flat additional rate for state/regional tax (0..1). */
  stateRate: number;
  /** Fraction of ordinary rate applied to qualified dividends. */
  dividendAsOrdinary?: boolean;
  /** Annual inflation indexing of brackets & deduction. */
  inflationIndexed: boolean;
}

/** A custom rule mapping (income type, account type) to a rate for a country. */
export interface CustomTaxRule {
  countryId: string;
  /** e.g. 'ordinary' | 'capitalGains' | 'dividends' | 'pension' | 'socialSecurity'. */
  incomeCategory: string;
  rate: number;
  /** Optional effective age (person1) at which the rule applies. */
  fromAge?: number;
}

export interface CustomTaxConfig {
  rules: CustomTaxRule[];
}

export interface TaxSettings {
  mode: TaxMode;
  flat: FlatTaxConfig;
  marginal: MarginalTaxConfig;
  custom: CustomTaxConfig;
  /** Enable required minimum distributions modeling. */
  enableRMD: boolean;
  /** Age at which RMDs begin. */
  rmdStartAge: number;
}

// ---------------------------------------------------------------------------
// Countries
// ---------------------------------------------------------------------------

export interface CountryProfile {
  id: string;
  name: string;
  currency: CurrencyCode;
  /** Effective rates (simplified international mode). */
  ordinaryRate: number;
  capitalGainsRate: number;
  dividendRate: number;
  pensionRate: number;
  taxDeferredDistributionRate: number;
  /** Fraction of tax-free withdrawals taxed locally (0 = respected). */
  taxFreeRate: number;
  wealthTaxRate: number;
  socialTaxRate: number;
  /** Multiplier on baseline cost of living (1 = same as US baseline). */
  costOfLivingMultiplier: number;
  /** Country-specific general inflation override (optional). */
  inflationOverride?: number;
  /** Estate/inheritance effective rate above exemption (informational). */
  estateTaxRate: number;
  /** One-time exit/entry tax as a fraction of portfolio (informational). */
  entryExitTaxRate: number;
  /** Simplified example flag — always true for built-ins. */
  simplified: boolean;
  notes?: string;
}

// ---------------------------------------------------------------------------
// Fees
// ---------------------------------------------------------------------------

export type FeeModelType =
  | 'none'
  | 'aum'
  | 'flatRetainer'
  | 'subscription'
  | 'hourly'
  | 'robo';

export interface AumTier {
  /** Portfolio value above which this rate applies. */
  threshold: number;
  rate: number;
}

export interface FeeSettings {
  model: FeeModelType;
  /** Flat AUM rate used when tiers are empty (fraction of assets / year). */
  aumRate: number;
  /** Optional tiered AUM schedule. */
  aumTiers: AumTier[];
  /** Annual flat retainer / subscription (already annualized). */
  flatAnnual: number;
  /** Blended fund expense ratio applied to the whole portfolio. */
  fundExpenseRatio: number;
  /** Annual platform fee (fraction of assets). */
  platformFee: number;
  /** Subjective annual value the advisor adds (fraction of assets). */
  advisorValueAdded: number;
}

// ---------------------------------------------------------------------------
// Assumptions & return model
// ---------------------------------------------------------------------------

export type ReturnMethod =
  | 'parametric'
  | 'historical'
  | 'bootstrap'
  | 'stress';

export type DistributionType = 'normal' | 'studentT' | 'lognormal';

export interface ReturnModel {
  method: ReturnMethod;
  distribution: DistributionType;
  /** Degrees of freedom for Student's t (fat tails). */
  studentTDf: number;
  /** Block size for block bootstrap (1 = simple bootstrap). */
  bootstrapBlockSize: number;
  /** Named stress scenario id when method = 'stress'. */
  stressScenarioId?: string;
  /** Enable mild mean reversion in parametric mode. */
  meanReversion: boolean;
}

export type AssumptionPresetId =
  | 'conservative'
  | 'moderate'
  | 'historical'
  | 'optimistic'
  | 'custom';

export interface Assumptions {
  presetId: AssumptionPresetId;
  assetClasses: AssetClassAssumption[];
  /** Correlation matrix keyed by asset class id pairs. */
  correlations: Record<string, Record<string, number>>;
  inflation: InflationAssumptions;
  currency: CurrencyAssumptions;
  returnModel: ReturnModel;
}

// ---------------------------------------------------------------------------
// Withdrawal strategy configuration
// ---------------------------------------------------------------------------

export type StrategyId =
  | 'constantReal'
  | 'constantNominal'
  | 'constantPercentage'
  | 'amortization'
  | 'interestOnly'
  | 'guytonKlinger'
  | 'vanguardDynamic'
  | 'vpw'
  | 'rmdMethod'
  | 'endowment'
  | 'floorCeiling';

export interface StrategyConfig {
  id: StrategyId;
  /** Initial withdrawal rate (fraction of portfolio) where applicable. */
  initialRate?: number;
  /** Real spending floor per year (today's currency). */
  spendingFloor?: number;
  /** Real spending ceiling per year (today's currency). */
  spendingCeiling?: number;
  /** Guyton-Klinger guardrails (fractional bands around initial rate). */
  upperGuardrail?: number;
  lowerGuardrail?: number;
  /** Adjustment size for guardrail breaches (fraction). */
  adjustment?: number;
  /** Vanguard-style max annual increase / decrease (fractions). */
  maxIncrease?: number;
  maxDecrease?: number;
  /** Smoothing window (years) for endowment / smoothed strategies. */
  smoothingYears?: number;
  /** Skip inflation raise after a negative portfolio year. */
  skipRaiseAfterLoss?: boolean;
}

// ---------------------------------------------------------------------------
// Withdrawal ordering
// ---------------------------------------------------------------------------

export type WithdrawalOrderMode =
  | 'taxableFirst'
  | 'taxDeferredFirst'
  | 'proRata'
  | 'preserveTaxFree'
  | 'bracketFill'
  | 'custom';

export interface WithdrawalOrder {
  mode: WithdrawalOrderMode;
  /** Explicit account-id order for custom mode. */
  customOrder?: string[];
  /** Annual Roth conversion target (advanced). */
  rothConversionTarget?: number;
}

// ---------------------------------------------------------------------------
// Simulation configuration
// ---------------------------------------------------------------------------

export type SimulationTimestep = 'annual' | 'monthly';

export interface SimulationConfig {
  trials: number;
  seed: number;
  timestep: SimulationTimestep;
}

// ---------------------------------------------------------------------------
// The complete scenario
// ---------------------------------------------------------------------------

export interface Scenario {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  household: Household;
  accounts: Account[];
  contributions: Contribution[];
  spending: Spending;
  incomeSources: IncomeSource[];
  allocations: AssetAllocation[];
  allocationPolicy: AllocationPolicy;
  strategy: StrategyConfig;
  withdrawalOrder: WithdrawalOrder;
  taxes: TaxSettings;
  fees: FeeSettings;
  assumptions: Assumptions;
  countries: CountryProfile[];
  simulation: SimulationConfig;
  oneTimeFlows: OneTimeFlow[];
}

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

/** A single simulated year's recorded state, in real (today's) dollars. */
export interface YearRecord {
  age: number;
  year: number;
  startBalance: number;
  income: number;
  grossWithdrawal: number;
  taxes: number;
  fees: number;
  netSpending: number;
  desiredSpending: number;
  essentialSpending: number;
  endBalance: number;
  withdrawalRate: number;
  inflationIndex: number;
  fundedThisYear: boolean; // desired spending fully met
  essentialFundedThisYear: boolean;
}

/** Aggregated per-year percentile bands across all trials. */
export interface PercentileBand {
  age: number;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
}

export interface SinglePathResult {
  records: YearRecord[];
  depleted: boolean;
  depletionAge?: number;
  endingBalance: number;
  lifetimeTaxes: number;
  lifetimeFees: number;
  lifetimeSpending: number;
  minRealSpending: number;
  maxRealSpendingCut: number; // largest single-year fractional cut vs desired
  yearsBelowDesired: number;
  firstReductionAge?: number;
  essentialAlwaysFunded: boolean;
  desiredAlwaysFunded: boolean;
}

export interface SuccessMetrics {
  portfolioSurvival: number; // P(balance > 0 through horizon)
  essentialFunded: number; // P(essential fully funded every year)
  desiredFunded: number; // P(desired fully funded every year)
  spendingAbove90: number; // P(spending never below 90% of desired)
  spendingAbove80: number;
  legacyProbability: number; // P(ending wealth >= legacy target)
  medianLifetimeSpending: number;
  medianEndingWealth: number;
  p10EndingWealth: number;
  p90EndingWealth: number;
  maxRealSpendingCut: number; // median across trials of each path's max cut
  avgRealSpendingCut: number;
  avgYearsBelowDesired: number;
  medianFirstReductionAge?: number;
  medianDepletionAge?: number;
  depletionBefore: Record<number, number>; // age -> probability
  lifetimeTaxesMedian: number;
  lifetimeFeesMedian: number;
}

export interface SimulationResults {
  scenarioId: string;
  trials: number;
  seed: number;
  balanceBands: PercentileBand[];
  spendingBands: PercentileBand[];
  withdrawalRateBands: PercentileBand[];
  fundedRatio: number;
  metrics: SuccessMetrics;
  /** Representative paths for narrative display. */
  representative: {
    success: SinglePathResult;
    median: SinglePathResult;
    borderline: SinglePathResult;
    failure: SinglePathResult;
  };
  readiness: ReadinessLevel;
  primaryRisk: string;
}

export type ReadinessLevel =
  | 'stronglyFunded'
  | 'reasonablyFunded'
  | 'borderline'
  | 'vulnerable'
  | 'notFunded';
