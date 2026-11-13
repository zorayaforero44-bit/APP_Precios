/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AuditLogItem,
  CleanRecord,
  ColumnMapping,
  DatasetDiagnosis,
  Granularity,
  ModelType,
  RawRow,
} from '../types/pricing';
import { parseLocalizedNumber } from './numberFormat';

export interface CleaningResult {
  cleanRecords: CleanRecord[];
  aggregatedRecords: CleanRecord[];
  auditLog: AuditLogItem[];
  diagnosis: DatasetDiagnosis;
}

export function cleanAndDiagnoseData(
  rawRows: RawRow[],
  mapping: ColumnMapping,
  options: {
    singleProductName?: string;
    preferDotAsThousands?: boolean;
    defaultUnitCost?: number;
    defaultCapacity?: number;
  } = {}
): CleaningResult {
  const auditLog: AuditLogItem[] = [];
  let logCounter = 1;

  const addLog = (rule: string, affectedRows: number, effect: string) => {
    auditLog.push({
      id: `LOG-${String(logCounter++).padStart(3, '0')}`,
      timestamp: new Date().toLocaleTimeString('es-CO'),
      rule,
      affectedRows,
      effect,
    });
  };

  if (!rawRows || rawRows.length === 0) {
    return {
      cleanRecords: [],
      aggregatedRecords: [],
      auditLog,
      diagnosis: {
        totalRows: 0,
        usableRows: 0,
        removedRows: 0,
        granularity: 'period_summary',
        productsFound: [],
        periodsCount: 0,
        uniquePricesCount: 0,
        minPrice: 0,
        maxPrice: 0,
        avgPrice: 0,
        totalQuantity: 0,
        totalRevenue: 0,
        hasUnitCost: false,
        hasCapacity: false,
        hasDates: false,
        enabledModels: [],
        recommendedModel: 'linear',
        recommendationReason: 'No se detectaron registros en el archivo.',
        warnings: ['Cargue un archivo con datos de precios y cantidades o ventas.'],
      },
    };
  }

  // 1. Initial row parsing and normalization
  const parsedRecords: CleanRecord[] = [];
  let nullRows = 0;
  let negativeQuantityRows = 0;
  let zeroOrNegativePriceRows = 0;
  let effectivePriceCount = 0;

  rawRows.forEach((row, idx) => {
    const rawProd = mapping.product ? String(row[mapping.product] ?? '').trim() : '';
    const product = options.singleProductName || rawProd || 'Producto Principal';
    const period = mapping.period ? String(row[mapping.period] ?? '').trim() : `P_${idx + 1}`;

    const rawPrice = mapping.price ? parseLocalizedNumber(row[mapping.price], options.preferDotAsThousands) : null;
    const rawQty = mapping.quantity ? parseLocalizedNumber(row[mapping.quantity], options.preferDotAsThousands) : null;
    const rawRev = mapping.revenue ? parseLocalizedNumber(row[mapping.revenue], options.preferDotAsThousands) : null;
    const rawCost = mapping.unitCost
      ? parseLocalizedNumber(row[mapping.unitCost], options.preferDotAsThousands)
      : options.defaultUnitCost;
    const rawCap = mapping.capacity
      ? parseLocalizedNumber(row[mapping.capacity], options.preferDotAsThousands)
      : options.defaultCapacity;

    const channel = mapping.channel ? String(row[mapping.channel] ?? '').trim() : undefined;
    const segment = mapping.segment ? String(row[mapping.segment] ?? '').trim() : undefined;
    const promotion = mapping.promotion ? String(row[mapping.promotion] ?? '').trim() : undefined;

    // Filter total empty rows
    if (rawPrice === null && rawQty === null && rawRev === null) {
      nullRows++;
      return;
    }

    // Determine quantity
    let quantity = rawQty !== null ? rawQty : 0;
    if (quantity < 0) {
      negativeQuantityRows++;
      return; // Discard negative returns or refunds for standard demand estimation
    }

    // Determine price and revenue
    let price = rawPrice;
    let revenue = rawRev;
    let effectivePriceCalculated = false;

    if (price === null && revenue !== null && quantity > 0) {
      price = revenue / quantity;
      effectivePriceCalculated = true;
      effectivePriceCount++;
    } else if (revenue === null && price !== null && quantity > 0) {
      revenue = price * quantity;
    }

    if (price === null || price <= 0) {
      zeroOrNegativePriceRows++;
      return;
    }

    if (revenue === null) {
      revenue = price * quantity;
    }

    const isCapacityConstrained =
      rawCap !== null && rawCap !== undefined && rawCap > 0 ? quantity >= rawCap : false;

    parsedRecords.push({
      id: `REC-${idx + 1}`,
      product,
      period,
      price,
      quantity,
      revenue,
      unitCost: rawCost !== null && rawCost !== undefined ? rawCost : undefined,
      channel,
      segment,
      promotion,
      capacity: rawCap !== null && rawCap !== undefined ? rawCap : undefined,
      effectivePriceCalculated,
      isCapacityConstrained,
    });
  });

  if (nullRows > 0) {
    addLog('Eliminación de registros vacíos', nullRows, 'Se descartaron filas sin precio ni cantidad.');
  }
  if (negativeQuantityRows > 0) {
    addLog(
      'Filtrado de devoluciones / cantidades negativas',
      negativeQuantityRows,
      'Se excluyeron transacciones de devolución para preservar la curva de demanda real.'
    );
  }
  if (zeroOrNegativePriceRows > 0) {
    addLog(
      'Eliminación de precios cero o no informados',
      zeroOrNegativePriceRows,
      'Se excluyeron registros con precio nulo o no positivo.'
    );
  }
  if (effectivePriceCount > 0) {
    addLog(
      'Cálculo de precio efectivo (Ingreso Neto / Cantidad)',
      effectivePriceCount,
      'Se calculó el precio unitario a partir del ingreso neto y las unidades.'
    );
  }

  // 2. Granularity detection
  // Check if multiple rows share the same period + product
  const periodProductKeys = new Set<string>();
  let hasPeriodOverlap = false;
  for (const r of parsedRecords) {
    const key = `${r.product}___${r.period}`;
    if (periodProductKeys.has(key)) {
      hasPeriodOverlap = true;
      break;
    }
    periodProductKeys.add(key);
  }

  let granularity: Granularity = 'period_summary';
  if (hasPeriodOverlap) {
    granularity = 'transaction';
  } else if (parsedRecords.every(r => r.quantity === 0 || r.quantity === 1) && parsedRecords.length > 10) {
    granularity = 'survey_response';
  } else if (!mapping.period && parsedRecords.length > 0) {
    granularity = 'catalog';
  }

  // 3. Aggregate if transaction granularity (Weighted average price)
  let aggregatedRecords: CleanRecord[] = [];
  if (granularity === 'transaction') {
    const groups = new Map<string, CleanRecord[]>();
    for (const r of parsedRecords) {
      const key = `${r.product}___${r.period}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(r);
    }

    let aggIndex = 1;
    groups.forEach((items, key) => {
      const [product, period] = key.split('___');
      const sumQty = items.reduce((acc, i) => acc + i.quantity, 0);
      const sumRev = items.reduce((acc, i) => acc + i.revenue, 0);
      const weightedPrice = sumQty > 0 ? sumRev / sumQty : items[0].price;

      // Variable cost weighted or first
      const costs = items.filter(i => i.unitCost !== undefined).map(i => i.unitCost!);
      const avgCost = costs.length > 0 ? costs.reduce((a, b) => a + b, 0) / costs.length : undefined;

      const capacities = items.filter(i => i.capacity !== undefined).map(i => i.capacity!);
      const cap = capacities.length > 0 ? Math.max(...capacities) : undefined;
      const isConstrained = cap !== undefined && cap > 0 && sumQty >= cap;

      aggregatedRecords.push({
        id: `AGG-${aggIndex++}`,
        product,
        period,
        price: weightedPrice,
        quantity: sumQty,
        revenue: sumRev,
        unitCost: avgCost,
        capacity: cap,
        channel: items[0].channel,
        segment: items[0].segment,
        promotion: items[0].promotion,
        isCapacityConstrained: isConstrained,
      });
    });

    addLog(
      'Agregación ponderada por período',
      parsedRecords.length,
      `Se consolidaron transacciones en ${aggregatedRecords.length} períodos usando Precio = ∑Ingresos / ∑Unidades.`
    );
  } else {
    aggregatedRecords = [...parsedRecords];
  }

  // Sort chronologically/period
  aggregatedRecords.sort((a, b) => a.period.localeCompare(b.period));

  // 4. Diagnostic Metrics
  const uniqueProducts = Array.from(new Set(aggregatedRecords.map(r => r.product)));
  const uniquePrices = Array.from(new Set(aggregatedRecords.map(r => Number(r.price.toFixed(2)))));
  const periodsCount = new Set(aggregatedRecords.map(r => r.period)).size;

  const prices = aggregatedRecords.map(r => r.price);
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
  const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;

  const totalQuantity = aggregatedRecords.reduce((acc, r) => acc + r.quantity, 0);
  const totalRevenue = aggregatedRecords.reduce((acc, r) => acc + r.revenue, 0);

  const hasUnitCost = aggregatedRecords.some(r => r.unitCost !== undefined && r.unitCost > 0);
  const hasCapacity = aggregatedRecords.some(r => r.capacity !== undefined && r.capacity > 0);
  const hasDates = aggregatedRecords.some(r => r.period && r.period.length > 2);

  // 5. Determine Enabled & Recommended Econometric Models
  const enabledModels: ModelType[] = [];
  let recommendedModel: ModelType = 'linear';
  let recommendationReason = '';
  const warnings: string[] = [];

  const priceVariance = maxPrice - minPrice;

  if (uniquePrices.length >= 2) {
    enabledModels.push('arc');
  }

  if (uniquePrices.length >= 3 && aggregatedRecords.length >= 3) {
    enabledModels.push('quadratic_3p');
  }

  if (aggregatedRecords.length >= 4 && priceVariance > 0.001) {
    enabledModels.push('linear');
    // Power model requires all positive prices and quantities
    const allPositive = aggregatedRecords.every(r => r.price > 0 && r.quantity > 0);
    if (allPositive) {
      enabledModels.push('power');
    }
  }

  if (granularity === 'survey_response' || parsedRecords.length >= 10) {
    enabledModels.push('wtp_survey');
  }

  // Recommendation logic
  if (granularity === 'survey_response') {
    recommendedModel = 'wtp_survey';
    recommendationReason =
      'Base identificada como encuesta de disposición a pagar (WTP). Se recomienda curva acumulada de aceptación.';
  } else if (uniquePrices.length === 2 && aggregatedRecords.length === 2) {
    recommendedModel = 'arc';
    recommendationReason =
      'Se detectaron exactamente dos observaciones comparables. El método del punto medio (OpenStax 5.1) es el método matemáticamente exacto para este intervalo.';
  } else if (uniquePrices.length === 3 && aggregatedRecords.length === 3) {
    recommendedModel = 'quadratic_3p';
    recommendationReason =
      'Se detectaron 3 combinaciones de precio y demanda (Bajo, Medio, Alto). Se recomienda el método cuadrático de Hugo Martínez (clase ChapStick).';
  } else if (aggregatedRecords.length >= 4 && priceVariance > 0) {
    // If power is enabled and prices span a wide ratio, power or linear
    const ratio = maxPrice / (minPrice || 1);
    if (enabledModels.includes('power') && ratio > 1.8) {
      recommendedModel = 'power';
      recommendationReason =
        'Historial con amplio rango de precios positivos. El modelo log-log (potencia) estima una elasticidad constante sin distorsiones en los extremos.';
    } else {
      recommendedModel = 'linear';
      recommendationReason =
        'Historial periódico con suficiente variación de precio. La demanda lineal Q = a + bP permite estimar la elasticidad puntual con máxima interpretabilidad.';
    }
  } else {
    recommendedModel = 'quadratic_3p';
    recommendationReason =
      'Los precios en la base son constantes o insuficientes para regresión. Se habilita la simulación con supuestos de 3 puntos (precio bajo, medio, alto).';
    warnings.push(
      'Para estimar elasticidad histórica con regresión se requiere variación de precios en períodos comparables. Puede continuar simulando escenarios subjetivos.'
    );
  }

  if (!hasUnitCost) {
    warnings.push(
      'No se detectó columna de costo variable unitario. Puede asignarlo manualmente en el simulador para optimizar contribución y margen.'
    );
  }

  const diagnosis: DatasetDiagnosis = {
    totalRows: rawRows.length,
    usableRows: parsedRecords.length,
    removedRows: rawRows.length - parsedRecords.length,
    granularity,
    productsFound: uniqueProducts,
    periodsCount,
    uniquePricesCount: uniquePrices.length,
    minPrice,
    maxPrice,
    avgPrice,
    totalQuantity,
    totalRevenue,
    hasUnitCost,
    hasCapacity,
    hasDates,
    enabledModels,
    recommendedModel,
    recommendationReason,
    warnings,
  };

  return {
    cleanRecords: parsedRecords,
    aggregatedRecords,
    auditLog,
    diagnosis,
  };
}
