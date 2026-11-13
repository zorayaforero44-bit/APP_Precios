/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ModelType = 'linear' | 'power' | 'quadratic_3p' | 'arc' | 'wtp_survey';

export type OptimizationTarget = 'contribution' | 'revenue' | 'profit';

export type Granularity = 'transaction' | 'period_summary' | 'catalog' | 'survey_response';

export interface RawRow {
  [key: string]: any;
}

export interface ColumnMapping {
  product: string;
  period: string;
  price: string;
  quantity: string;
  revenue: string;
  unitCost: string;
  channel: string;
  segment: string;
  promotion: string;
  capacity: string;
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  rule: string;
  affectedRows: number;
  effect: string;
}

export interface CleanRecord {
  id: string;
  product: string;
  period: string;
  price: number;
  quantity: number;
  revenue: number;
  unitCost?: number;
  channel?: string;
  segment?: string;
  promotion?: string;
  capacity?: number;
  effectivePriceCalculated?: boolean;
  isCapacityConstrained?: boolean;
}

export interface DatasetDiagnosis {
  totalRows: number;
  usableRows: number;
  removedRows: number;
  granularity: Granularity;
  productsFound: string[];
  periodsCount: number;
  uniquePricesCount: number;
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
  totalQuantity: number;
  totalRevenue: number;
  hasUnitCost: boolean;
  hasCapacity: boolean;
  hasDates: boolean;
  enabledModels: ModelType[];
  recommendedModel: ModelType;
  recommendationReason: string;
  warnings: string[];
}

export interface ComplementaryProductConfig {
  enabled: boolean;
  name: string;
  unitsPerPrimarySale: number;
  unitMargin: number;
}

export interface OptimizationConstraints {
  minPrice: number;
  maxPrice: number;
  step: number;
  maxCapacity?: number;
  minMarginPercent?: number; // e.g. 20 for 20%
  fixedCosts?: number;
}

export interface ElasticityResult {
  modelType: ModelType;
  elasticityValue: number; // e.g. -1.6
  elasticityLabel: 'Elástica' | 'Inelástica' | 'Unitaria' | 'Demanda atípica (positiva)';
  formulaExplanation: string;
  modelEquation: string;
  coefficients: { [key: string]: number };
  rSquared?: number;
  mae?: number;
  naiveMae?: number;
  testPeriodCount?: number;
  sampleSize: number;
  interpretation: string;
  validRange: { min: number; max: number };
  predictQuantity: (price: number) => number;
}

export interface ScenarioPoint {
  id: string;
  name: string;
  price: number;
  isBase?: boolean;
  isSuggested?: boolean;
  demand: number;
  vendibleUnits: number;
  revenue: number;
  variableCosts: number;
  contribution: number;
  complementaryContribution: number;
  totalContribution: number;
  fixedCosts: number;
  netProfit: number;
  marginPercent: number;
  deltaRevenuePercent: number;
  deltaContributionPercent: number;
  isExtrapolated: boolean;
  violatesCapacity: boolean;
}

export interface OptimizationResult {
  target: OptimizationTarget;
  optimalPrice: number;
  currentPrice: number;
  optimalDemand: number;
  optimalVendibleUnits: number;
  optimalRevenue: number;
  optimalContribution: number;
  currentContribution: number;
  currentRevenue: number;
  deltaRevenue: number;
  deltaRevenuePercent: number;
  deltaContribution: number;
  deltaContributionPercent: number;
  isBoundary: boolean;
  decisionHeadline: string;
  decisionRationale: string;
  sensitiveAssumptions: string[];
  withoutComplementaryOptimalPrice?: number;
}

export interface CaseStudy {
  id: string;
  title: string;
  category: 'Hugo Martínez (Clase)' | 'Economía Teórica' | 'Demostración de Negocio';
  shortDesc: string;
  context: string;
  productName: string;
  unitCost: number;
  capacity?: number;
  fixedCosts?: number;
  recommendedModel: ModelType;
  dataPoints?: Array<{ price: number; quantity: number; period?: string }>;
  complementaryConfig?: ComplementaryProductConfig;
  defaultPrice: number;
  theoreticalOptimal?: {
    price: number;
    demand: number;
    profit: number;
  };
  notes: string;
}

export interface SensitivityVariationPoint {
  parameterValue: number | null;
  optimalPrice: number;
  deltaPrice: number;
  deltaPricePercent: number;
  optimalVendibleUnits: number;
  optimalObjectiveValue: number;
  isBoundary: boolean;
}

export interface SensitivityDriverResult {
  id: 'unit_cost' | 'capacity' | 'complementary_margin';
  label: string;
  unitLabel: string;
  baseParameterValue: number | null;
  isConfigured: boolean;
  inactiveReason?: string;
  lowScenario: SensitivityVariationPoint; // -pct (e.g. -10%)
  highScenario: SensitivityVariationPoint; // +pct (e.g. +10%)
  priceSwing: number; // |max(low, high, base) - min(low, high, base)|
  maxAbsDelta: number; // max(|low.deltaPrice|, |high.deltaPrice|)
}

export interface OptimumSensitivityResult {
  variationPercent: number; // default 10 for +/- 10%
  baseOptimalPrice: number;
  baseObjectiveValue: number;
  target: OptimizationTarget;
  drivers: SensitivityDriverResult[]; // sorted descending by priceSwing
}

