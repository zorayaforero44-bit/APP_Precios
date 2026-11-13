/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CleanRecord,
  ComplementaryProductConfig,
  ElasticityResult,
  ModelType,
  OptimizationConstraints,
  OptimizationResult,
  OptimizationTarget,
  OptimumSensitivityResult,
  ScenarioPoint,
  SensitivityDriverResult,
  SensitivityVariationPoint,
} from '../types/pricing';

/**
 * Estimates elasticity and fits econometric demand curve
 */
export function estimateDemandModel(
  records: CleanRecord[],
  modelType: ModelType,
  currentPrice: number,
  custom3Points?: Array<{ price: number; quantity: number }>
): ElasticityResult {
  const n = records.length;
  const prices = records.map(r => r.price);
  const quantities = records.map(r => r.quantity);

  const minP = Math.min(...prices, currentPrice * 0.5);
  const maxP = Math.max(...prices, currentPrice * 1.5);

  // 1. Arc Elasticity (OpenStax 5.1 Midpoint Method)
  if (modelType === 'arc') {
    let p1 = prices[0];
    let q1 = quantities[0];
    let p2 = prices[1] || prices[0] * 1.1;
    let q2 = quantities[1] || quantities[0] * 0.9;

    // Sort by price
    if (p1 > p2) {
      [p1, p2] = [p2, p1];
      [q1, q2] = [q2, q1];
    }

    const deltaQ = q2 - q1;
    const avgQ = (q1 + q2) / 2 || 1;
    const deltaP = p2 - p1;
    const avgP = (p1 + p2) / 2 || 1;

    const pctDeltaQ = deltaQ / avgQ;
    const pctDeltaP = deltaP / avgP;
    const elasticityValue = deltaP !== 0 ? pctDeltaQ / pctDeltaP : 0;

    const slope = deltaP !== 0 ? deltaQ / deltaP : 0;
    const intercept = q1 - slope * p1;

    const predict = (p: number) => Math.max(0, intercept + slope * p);

    return {
      modelType: 'arc',
      elasticityValue,
      elasticityLabel: getElasticityLabel(elasticityValue),
      formulaExplanation: `Elasticidad Arco (Punto Medio OpenStax 5.1):
Ed = [(Q2 - Q1) / ((Q1 + Q2)/2)] / [(P2 - P1) / ((P1 + P2)/2)]
Ed = [(${q2} - ${q1}) / ${avgQ.toFixed(2)}] / [(${p2.toFixed(2)} - ${p1.toFixed(2)}) / ${avgP.toFixed(2)}]
Ed = ${(pctDeltaQ * 100).toFixed(2)}% / ${(pctDeltaP * 100).toFixed(2)}% = ${elasticityValue.toFixed(2)}`,
      modelEquation: `Q(P) = ${intercept.toFixed(2)} ${slope >= 0 ? '+' : '-'} ${Math.abs(slope).toFixed(2)} · P`,
      coefficients: { slope, intercept },
      sampleSize: records.length,
      interpretation: interpretElasticity(elasticityValue, currentPrice, predict(currentPrice)),
      validRange: { min: p1, max: p2 },
      predictQuantity: predict,
    };
  }

  // 2. Quadratic 3-Point Demand (Hugo Martínez ChapStick Method)
  if (modelType === 'quadratic_3p') {
    let pts = custom3Points && custom3Points.length === 3 ? custom3Points : [];

    if (pts.length !== 3) {
      if (records.length === 3) {
        pts = records.map(r => ({ price: r.price, quantity: r.quantity }));
      } else if (records.length > 3) {
        // Pick min, median, max price records
        const sorted = [...records].sort((a, b) => a.price - b.price);
        const midIdx = Math.floor(sorted.length / 2);
        pts = [
          { price: sorted[0].price, quantity: sorted[0].quantity },
          { price: sorted[midIdx].price, quantity: sorted[midIdx].quantity },
          { price: sorted[sorted.length - 1].price, quantity: sorted[sorted.length - 1].quantity },
        ];
      } else {
        // Fallback default 3 points around current price
        pts = [
          { price: currentPrice * 0.85, quantity: 60 },
          { price: currentPrice, quantity: 51 },
          { price: currentPrice * 1.15, quantity: 20 },
        ];
      }
    }

    pts.sort((a, b) => a.price - b.price);
    const [p1, p2, p3] = [pts[0].price, pts[1].price, pts[2].price];
    const [q1, q2, q3] = [pts[0].quantity, pts[1].quantity, pts[2].quantity];

    // Solve 3x3 system for a, b, c:
    // a*p1^2 + b*p1 + c = q1
    // a*p2^2 + b*p2 + c = q2
    // a*p3^2 + b*p3 + c = q3
    const denom = (p1 - p2) * (p1 - p3) * (p2 - p3);
    let a = 0;
    let b = 0;
    let c = 0;

    if (Math.abs(denom) > 1e-9) {
      a = (p3 * (q2 - q1) + p2 * (q1 - q3) + p1 * (q3 - q2)) / denom;
      b = (p3 * p3 * (q1 - q2) + p2 * p2 * (q3 - q1) + p1 * p1 * (q2 - q3)) / denom;
      c =
        (p2 * p3 * (p2 - p3) * q1 + p3 * p1 * (p3 - p1) * q2 + p1 * p2 * (p1 - p2) * q3) /
        denom;
    }

    const predict = (p: number) => Math.max(0, a * p * p + b * p + c);
    const qAtCurrent = predict(currentPrice);
    const derivative = 2 * a * currentPrice + b;
    const elasticityValue = qAtCurrent > 0 ? (derivative * currentPrice) / qAtCurrent : 0;

    return {
      modelType: 'quadratic_3p',
      elasticityValue,
      elasticityLabel: getElasticityLabel(elasticityValue),
      formulaExplanation: `Curva Cuadrática de Tres Puntos (Hugo Martínez):
Ecuación: Q = a·P² + b·P + c
Puntos evaluados:
· Bajo: P1 = ${p1.toFixed(2)}, Q1 = ${q1}
· Medio: P2 = ${p2.toFixed(2)}, Q2 = ${q2}
· Alto: P3 = ${p3.toFixed(2)}, Q3 = ${q3}
Coeficientes calculados: a = ${a.toFixed(4)}, b = ${b.toFixed(4)}, c = ${c.toFixed(4)}
Elasticidad puntual a P=${currentPrice.toFixed(2)}: (dQ/dP)·(P/Q) = (2aP + b)·(P/Q) = ${elasticityValue.toFixed(2)}`,
      modelEquation: `Q(P) = ${a.toFixed(2)}·P² + ${b.toFixed(2)}·P + ${c.toFixed(2)}`,
      coefficients: { a, b, c },
      sampleSize: pts.length,
      interpretation: interpretElasticity(elasticityValue, currentPrice, qAtCurrent),
      validRange: { min: p1, max: p3 },
      predictQuantity: predict,
    };
  }

  // 3. WTP Survey Curve
  if (modelType === 'wtp_survey') {
    // Sort reservation prices ascending
    const sortedPrices = [...prices].sort((a, b) => a - b);
    const totalRespondents = sortedPrices.length;

    // Cumulative fraction willing to pay >= P
    const predict = (p: number) => {
      const willingCount = sortedPrices.filter(rp => rp >= p).length;
      return willingCount;
    };

    const qAtCurrent = predict(currentPrice);
    // Local arc elasticity around current price (+- 5%)
    const pLow = currentPrice * 0.95;
    const pHigh = currentPrice * 1.05;
    const qLow = predict(pLow);
    const qHigh = predict(pHigh);

    const deltaQ = qHigh - qLow;
    const avgQ = (qHigh + qLow) / 2 || 1;
    const deltaP = pHigh - pLow;
    const avgP = (pHigh + pLow) / 2 || 1;
    const elasticityValue = deltaP !== 0 ? (deltaQ / avgQ) / (deltaP / avgP) : 0;

    return {
      modelType: 'wtp_survey',
      elasticityValue,
      elasticityLabel: getElasticityLabel(elasticityValue),
      formulaExplanation: `Curva de Disposición a Pagar (Hugo Martínez / Encuesta WTP):
Aceptación = Clientes cuya WTP >= P / Total Encuestados (${totalRespondents})
Aceptación al precio actual ($${currentPrice.toFixed(2)}): ${((qAtCurrent / totalRespondents) * 100).toFixed(1)}% (${qAtCurrent} personas).`,
      modelEquation: `Demanda(P) = Encuestados con Reserva ≥ P`,
      coefficients: { totalRespondents },
      sampleSize: totalRespondents,
      interpretation: `El ${( (qAtCurrent / totalRespondents) * 100 ).toFixed(1)}% de los clientes encuestados pagaría $${currentPrice.toFixed(2)} o más. Sensibilidad estimada local: ${elasticityValue.toFixed(2)}.`,
      validRange: { min: sortedPrices[0], max: sortedPrices[sortedPrices.length - 1] },
      predictQuantity: predict,
    };
  }

  // 4. Power Demand: ln(Q) = ln(a) + b*ln(P) => Q = a * P^b
  if (modelType === 'power') {
    const validPairs = records.filter(r => r.price > 0 && r.quantity > 0);
    const lnP = validPairs.map(r => Math.log(r.price));
    const lnQ = validPairs.map(r => Math.log(r.quantity));

    const meanLnP = lnP.reduce((s, v) => s + v, 0) / lnP.length;
    const meanLnQ = lnQ.reduce((s, v) => s + v, 0) / lnQ.length;

    let cov = 0;
    let varLnP = 0;
    for (let i = 0; i < lnP.length; i++) {
      cov += (lnP[i] - meanLnP) * (lnQ[i] - meanLnQ);
      varLnP += (lnP[i] - meanLnP) ** 2;
    }

    const b = varLnP !== 0 ? cov / varLnP : 0;
    const lnA = meanLnQ - b * meanLnP;
    const a = Math.exp(lnA);

    // R-squared
    let ssTot = 0;
    let ssRes = 0;
    for (let i = 0; i < lnQ.length; i++) {
      const predLnQ = lnA + b * lnP[i];
      ssTot += (lnQ[i] - meanLnQ) ** 2;
      ssRes += (lnQ[i] - predLnQ) ** 2;
    }
    const rSquared = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0;

    const predict = (p: number) => (p > 0 ? Math.max(0, a * Math.pow(p, b)) : 0);
    const elasticityValue = b;

    const validation = computeTemporalValidation(records, predict);

    return {
      modelType: 'power',
      elasticityValue,
      elasticityLabel: getElasticityLabel(elasticityValue),
      formulaExplanation: `Demanda de Potencia Isoelástica:
ln(Q) = ln(a) + b · ln(P)  ⟺  Q = a · P^b
Elasticidad constante: b = ${b.toFixed(3)}
Parámetro de escala: a = ${a.toFixed(2)}
R² = ${(rSquared * 100).toFixed(1)}%`,
      modelEquation: `Q(P) = ${a.toFixed(2)} · P^(${b.toFixed(3)})`,
      coefficients: { a, b, lnA },
      rSquared,
      mae: validation?.mae,
      naiveMae: validation?.naiveMae,
      testPeriodCount: validation?.testCount,
      sampleSize: validPairs.length,
      interpretation: interpretElasticity(elasticityValue, currentPrice, predict(currentPrice)),
      validRange: { min: minP, max: maxP },
      predictQuantity: predict,
    };
  }

  // 5. Default: Linear Demand Q = a + b*P
  const meanP = prices.reduce((s, v) => s + v, 0) / n;
  const meanQ = quantities.reduce((s, v) => s + v, 0) / n;

  let cov = 0;
  let varP = 0;
  for (let i = 0; i < n; i++) {
    cov += (prices[i] - meanP) * (quantities[i] - meanQ);
    varP += (prices[i] - meanP) ** 2;
  }

  const b = varP !== 0 ? cov / varP : 0;
  const a = meanQ - b * meanP;

  // R-squared
  let ssTot = 0;
  let ssRes = 0;
  for (let i = 0; i < n; i++) {
    const pred = a + b * prices[i];
    ssTot += (quantities[i] - meanQ) ** 2;
    ssRes += (quantities[i] - pred) ** 2;
  }
  const rSquared = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0;

  const predict = (p: number) => Math.max(0, a + b * p);
  const qAtCurrent = predict(currentPrice);
  const elasticityValue = qAtCurrent > 0 ? b * (currentPrice / qAtCurrent) : 0;

  const validation = computeTemporalValidation(records, predict);

  return {
    modelType: 'linear',
    elasticityValue,
    elasticityLabel: getElasticityLabel(elasticityValue),
    formulaExplanation: `Curva de Demanda Lineal (OLS):
Q = a + b·P
Pendiente b = Cov(P,Q)/Var(P) = ${b.toFixed(4)}
Intercepto a = Q̄ - b·P̄ = ${a.toFixed(2)}
Elasticidad puntual a P=${currentPrice.toFixed(2)}: Ed = b · (P / Q) = ${b.toFixed(4)} · (${currentPrice.toFixed(2)} / ${qAtCurrent.toFixed(2)}) = ${elasticityValue.toFixed(2)}
R² = ${(rSquared * 100).toFixed(1)}%`,
    modelEquation: `Q(P) = ${a.toFixed(2)} ${b >= 0 ? '+' : '-'} ${Math.abs(b).toFixed(2)} · P`,
    coefficients: { a, b },
    rSquared,
    mae: validation?.mae,
    naiveMae: validation?.naiveMae,
    testPeriodCount: validation?.testCount,
    sampleSize: n,
    interpretation: interpretElasticity(elasticityValue, currentPrice, qAtCurrent),
    validRange: { min: minP, max: maxP },
    predictQuantity: predict,
  };
}

function getElasticityLabel(
  e: number
): 'Elástica' | 'Inelástica' | 'Unitaria' | 'Demanda atípica (positiva)' {
  if (e > 0) return 'Demanda atípica (positiva)';
  const abs = Math.abs(e);
  if (Math.abs(abs - 1) < 0.05) return 'Unitaria';
  if (abs > 1) return 'Elástica';
  return 'Inelástica';
}

function interpretElasticity(e: number, price: number, q: number): string {
  const abs = Math.abs(e);
  if (e > 0) {
    return `Demanda con pendiente positiva (+${e.toFixed(2)}). En el historial, mayores precios coincidieron con mayores ventas. Verifique si existieron campañas promocionales, estacionalidad o cambios en la mezcla de segmentos.`;
  }
  if (Math.abs(abs - 1) < 0.05) {
    return `Elasticidad unitaria (|Ed| ≈ 1,0). Cerca del precio de $${price.toFixed(2)}, una variación del 1 % en el precio se compensa casi con exactitud con un cambio del 1 % en volumen, manteniendo los ingresos estables.`;
  }
  if (abs > 1) {
    return `Demanda elástica (|Ed| = ${abs.toFixed(2)} > 1). Los clientes son altamente sensibles al precio. Un incremento del 1 % en el precio reduce el volumen en aproximadamente ${abs.toFixed(2)} %, lo que reduce los ingresos brutos. Conviene evaluar promociones o eficiencias.`;
  }
  return `Demanda inelástica (|Ed| = ${abs.toFixed(2)} < 1). Los compradores presentan baja sensibilidad al precio. Un incremento del 1 % solo disminuye las cantidades en un ${abs.toFixed(2)} %, permitiendo aumentar el ingreso total neto.`;
}

/**
 * Temporal Validation (Hyndman & Athanasopoulos)
 * Train/Test split chronologically and comparison vs Naive benchmark Q_t = Q_{t-1}
 */
function computeTemporalValidation(
  records: CleanRecord[],
  modelPredict: (p: number) => number
): { mae: number; naiveMae: number; testCount: number } | null {
  if (records.length < 6) return null;

  const splitIdx = Math.floor(records.length * 0.75);
  const testSet = records.slice(splitIdx);
  if (testSet.length < 2) return null;

  let modelErrorSum = 0;
  let naiveErrorSum = 0;

  for (let i = 0; i < testSet.length; i++) {
    const actual = testSet[i].quantity;
    const pred = modelPredict(testSet[i].price);
    modelErrorSum += Math.abs(actual - pred);

    const prevActual = i === 0 ? records[splitIdx - 1].quantity : testSet[i - 1].quantity;
    naiveErrorSum += Math.abs(actual - prevActual);
  }

  return {
    mae: modelErrorSum / testSet.length,
    naiveMae: naiveErrorSum / testSet.length,
    testCount: testSet.length,
  };
}

/**
 * Scenario Simulator and Numerical Solver (matching Excel Solver GRG Nonlinear / Evolutionary)
 */
export function simulateAndOptimize(
  model: ElasticityResult,
  currentPrice: number,
  unitCost: number = 0,
  target: OptimizationTarget = 'contribution',
  constraints: OptimizationConstraints,
  complementaryConfig?: ComplementaryProductConfig
): {
  scenarios: ScenarioPoint[];
  optimization: OptimizationResult;
} {
  const minP = Math.max(0.01, constraints.minPrice);
  const maxP = Math.max(minP + 0.1, constraints.maxPrice);
  const step = Math.max(0.01, constraints.step);
  const capacity = constraints.maxCapacity && constraints.maxCapacity > 0 ? constraints.maxCapacity : Infinity;
  const fixedCosts = constraints.fixedCosts || 0;

  // Complementary product contribution per primary unit
  const compUnitContribution =
    complementaryConfig && complementaryConfig.enabled
      ? complementaryConfig.unitsPerPrimarySale * complementaryConfig.unitMargin
      : 0;

  // Evaluate candidate prices
  let bestPrice = currentPrice;
  let bestScore = -Infinity;
  let withoutCompBestPrice = currentPrice;
  let withoutCompBestScore = -Infinity;

  const evaluatePoint = (p: number, includeComp: boolean) => {
    const rawDemand = model.predictQuantity(p);
    const vendible = Math.min(rawDemand, capacity);
    const revenue = p * vendible;
    const varCost = unitCost * vendible;
    const directContrib = (p - unitCost) * vendible;
    const compContrib = includeComp ? vendible * compUnitContribution : 0;
    const totalContrib = directContrib + compContrib;
    const profit = totalContrib - fixedCosts;

    let score = directContrib;
    if (target === 'revenue') score = revenue;
    else if (target === 'contribution') score = totalContrib;
    else if (target === 'profit') score = profit;

    // Check margin constraint
    if (constraints.minMarginPercent && constraints.minMarginPercent > 0 && p > 0) {
      const margin = ((p - unitCost) / p) * 100;
      if (margin < constraints.minMarginPercent) {
        score = -Infinity;
      }
    }

    return { rawDemand, vendible, revenue, varCost, directContrib, compContrib, totalContrib, profit, score };
  };

  for (let p = minP; p <= maxP + 1e-6; p += step) {
    const pRounded = Math.round(p * 100) / 100;
    const res = evaluatePoint(pRounded, true);
    if (res.score > bestScore) {
      bestScore = res.score;
      bestPrice = pRounded;
    }

    if (complementaryConfig && complementaryConfig.enabled) {
      const resWithout = evaluatePoint(pRounded, false);
      if (resWithout.score > withoutCompBestScore) {
        withoutCompBestScore = resWithout.score;
        withoutCompBestPrice = pRounded;
      }
    }
  }

  // Base point calculation
  const baseRes = evaluatePoint(currentPrice, true);
  const optRes = evaluatePoint(bestPrice, true);

  const deltaRev = optRes.revenue - baseRes.revenue;
  const deltaRevPct = baseRes.revenue > 0 ? (deltaRev / baseRes.revenue) * 100 : 0;

  const deltaContrib = optRes.totalContrib - baseRes.totalContrib;
  const deltaContribPct = baseRes.totalContrib > 0 ? (deltaContrib / baseRes.totalContrib) * 100 : 0;

  const isBoundary = Math.abs(bestPrice - minP) < step || Math.abs(bestPrice - maxP) < step;

  // Build key scenarios: -10%, -5%, Base, +5%, +10%, and Optimal
  const presetPcts = [-0.1, -0.05, 0, 0.05, 0.1];
  const scenarios: ScenarioPoint[] = [];

  presetPcts.forEach(pct => {
    const p = Math.round(currentPrice * (1 + pct) * 100) / 100;
    const isBase = pct === 0;
    const evalP = evaluatePoint(p, true);
    const isExtrapolated = p < model.validRange.min || p > model.validRange.max;

    const deltaR = baseRes.revenue > 0 ? ((evalP.revenue - baseRes.revenue) / baseRes.revenue) * 100 : 0;
    const deltaC = baseRes.totalContrib > 0 ? ((evalP.totalContrib - baseRes.totalContrib) / baseRes.totalContrib) * 100 : 0;
    const margin = p > 0 ? ((p - unitCost) / p) * 100 : 0;

    scenarios.push({
      id: `scen_${pct}`,
      name: isBase ? 'Precio Actual (Base)' : `${pct > 0 ? '+' : ''}${Math.round(pct * 100)}%`,
      price: p,
      isBase,
      isSuggested: Math.abs(p - bestPrice) < step,
      demand: evalP.rawDemand,
      vendibleUnits: evalP.vendible,
      revenue: evalP.revenue,
      variableCosts: evalP.varCost,
      contribution: evalP.directContrib,
      complementaryContribution: evalP.compContrib,
      totalContribution: evalP.totalContrib,
      fixedCosts,
      netProfit: evalP.profit,
      marginPercent: margin,
      deltaRevenuePercent: deltaR,
      deltaContributionPercent: deltaC,
      isExtrapolated,
      violatesCapacity: evalP.rawDemand > capacity,
    });
  });

  // Add Optimal if not already in scenarios
  const hasOpt = scenarios.some(s => Math.abs(s.price - bestPrice) < step);
  if (!hasOpt) {
    const isExtrapolated = bestPrice < model.validRange.min || bestPrice > model.validRange.max;
    const margin = bestPrice > 0 ? ((bestPrice - unitCost) / bestPrice) * 100 : 0;
    scenarios.push({
      id: `scen_opt`,
      name: 'Precio Óptimo Sugerido',
      price: bestPrice,
      isSuggested: true,
      demand: optRes.rawDemand,
      vendibleUnits: optRes.vendible,
      revenue: optRes.revenue,
      variableCosts: optRes.varCost,
      contribution: optRes.directContrib,
      complementaryContribution: optRes.compContrib,
      totalContribution: optRes.totalContrib,
      fixedCosts,
      netProfit: optRes.profit,
      marginPercent: margin,
      deltaRevenuePercent: deltaRevPct,
      deltaContributionPercent: deltaContribPct,
      isExtrapolated,
      violatesCapacity: optRes.rawDemand > capacity,
    });
  }

  // Sort scenarios by price
  scenarios.sort((a, b) => a.price - b.price);

  // Decision formulation
  let headline = '';
  if (Math.abs(bestPrice - currentPrice) < step) {
    headline = `Mantener precio actual en $${bestPrice.toFixed(2)}`;
  } else if (bestPrice > currentPrice) {
    headline = `Incrementar precio a $${bestPrice.toFixed(2)} (+${(((bestPrice - currentPrice) / currentPrice) * 100).toFixed(1)}%)`;
  } else {
    headline = `Reducir precio a $${bestPrice.toFixed(2)} (${(((bestPrice - currentPrice) / currentPrice) * 100).toFixed(1)}%)`;
  }

  let rationale = `Para el objetivo de maximizar ${
    target === 'contribution' ? 'la contribución total' : target === 'revenue' ? 'los ingresos brutos' : 'la utilidad neta'
  }, se sugiere fijar $${bestPrice.toFixed(2)}. `;

  if (deltaContrib !== 0) {
    rationale += `Esto generaría un cambio proyectado de ${deltaContribPct > 0 ? '+' : ''}${deltaContribPct.toFixed(1)}% en contribución ($${deltaContrib >= 0 ? '+' : ''}${deltaContrib.toFixed(2)})`;
  }
  if (capacity < Infinity && optRes.rawDemand > capacity) {
    rationale += `. Demanda estimada (${optRes.rawDemand.toFixed(1)}) excede la capacidad instalada (${capacity} u.), limitando las ventas reales a dicho tope.`;
  }
  if (complementaryConfig && complementaryConfig.enabled) {
    rationale += `. Al incorporar el beneficio cruzado de ${complementaryConfig.name} ($${compUnitContribution.toFixed(2)}/u.), el precio óptimo es $${bestPrice.toFixed(2)} (frente a $${withoutCompBestPrice.toFixed(2)} sin considerar el producto vinculado).`;
  }

  const sensitiveAssumptions: string[] = [];
  if (unitCost > 0) sensitiveAssumptions.push(`Costo variable unitario de $${unitCost.toFixed(2)}`);
  if (capacity < Infinity) sensitiveAssumptions.push(`Tope de capacidad de ${capacity} unidades por período`);
  if (complementaryConfig && complementaryConfig.enabled) {
    sensitiveAssumptions.push(
      `Venta vinculada de ${complementaryConfig.unitsPerPrimarySale} unidades de ${complementaryConfig.name} con margen de $${complementaryConfig.unitMargin.toFixed(2)}/u.`
    );
  }
  if (isBoundary) {
    sensitiveAssumptions.push(`El óptimo se encuentra en el límite del rango evaluado ($${bestPrice.toFixed(2)}). Puede requerir ampliar restricciones comerciales.`);
  }

  const optimization: OptimizationResult = {
    target,
    optimalPrice: bestPrice,
    currentPrice,
    optimalDemand: optRes.rawDemand,
    optimalVendibleUnits: optRes.vendible,
    optimalRevenue: optRes.revenue,
    optimalContribution: optRes.totalContrib,
    currentContribution: baseRes.totalContrib,
    currentRevenue: baseRes.revenue,
    deltaRevenue: deltaRev,
    deltaRevenuePercent: deltaRevPct,
    deltaContribution: deltaContrib,
    deltaContributionPercent: deltaContribPct,
    isBoundary,
    decisionHeadline: headline,
    decisionRationale: rationale,
    sensitiveAssumptions,
    withoutComplementaryOptimalPrice:
      complementaryConfig && complementaryConfig.enabled ? withoutCompBestPrice : undefined,
  };

  return { scenarios, optimization };
}

/**
 * Computes sensitivity of the optimal price when key parameters
 * (unit variable cost, production capacity, and optional complementary margin)
 * fluctuate by +/- variationPercent (default +/- 10%).
 */
export function computeOptimumSensitivity(
  model: ElasticityResult,
  currentPrice: number,
  unitCost: number = 0,
  target: OptimizationTarget = 'contribution',
  constraints: OptimizationConstraints,
  complementaryConfig?: ComplementaryProductConfig,
  variationPercent: number = 10
): OptimumSensitivityResult {
  const ratio = Math.max(0.01, variationPercent / 100);
  const fixedCosts = constraints.fixedCosts || 0;

  const extractObjectiveValue = (opt: OptimizationResult) => {
    if (target === 'revenue') return opt.optimalRevenue;
    if (target === 'profit') return opt.optimalContribution - fixedCosts;
    return opt.optimalContribution;
  };

  const baseRun = simulateAndOptimize(
    model,
    currentPrice,
    unitCost,
    target,
    constraints,
    complementaryConfig
  );
  const baseOptimalPrice = baseRun.optimization.optimalPrice;
  const baseObjectiveValue = extractObjectiveValue(baseRun.optimization);

  const buildPoint = (
    paramVal: number | null,
    opt: OptimizationResult
  ): SensitivityVariationPoint => {
    const deltaPrice = Math.round((opt.optimalPrice - baseOptimalPrice) * 100) / 100;
    const deltaPricePercent =
      baseOptimalPrice > 0 ? (deltaPrice / baseOptimalPrice) * 100 : 0;
    return {
      parameterValue: paramVal,
      optimalPrice: opt.optimalPrice,
      deltaPrice,
      deltaPricePercent,
      optimalVendibleUnits: opt.optimalVendibleUnits,
      optimalObjectiveValue: extractObjectiveValue(opt),
      isBoundary: opt.isBoundary,
    };
  };

  const drivers: SensitivityDriverResult[] = [];

  // 1. Unit Variable Cost (+/- variationPercent)
  {
    const isCostPositive = unitCost > 0;
    const lowCost = isCostPositive ? Math.max(0, unitCost * (1 - ratio)) : 0;
    const highCost = isCostPositive ? unitCost * (1 + ratio) : 0;

    const lowRun = isCostPositive
      ? simulateAndOptimize(model, currentPrice, lowCost, target, constraints, complementaryConfig)
      : baseRun;
    const highRun = isCostPositive
      ? simulateAndOptimize(model, currentPrice, highCost, target, constraints, complementaryConfig)
      : baseRun;

    const lowPt = buildPoint(lowCost, lowRun.optimization);
    const highPt = buildPoint(highCost, highRun.optimization);
    const allPrices = [baseOptimalPrice, lowPt.optimalPrice, highPt.optimalPrice];
    const swing = Math.round((Math.max(...allPrices) - Math.min(...allPrices)) * 100) / 100;

    let inactiveReason: string | undefined;
    if (!isCostPositive) {
      inactiveReason = 'Costo variable unitario actual es $0; asigne un costo para medir sensibilidad.';
    } else if (target === 'revenue' && !constraints.minMarginPercent) {
      inactiveReason = 'Al maximizar ingresos brutos, el precio óptimo no depende del costo variable.';
    }

    drivers.push({
      id: 'unit_cost',
      label: 'Costo Variable Unitario',
      unitLabel: 'moneda / u.',
      baseParameterValue: unitCost,
      isConfigured: isCostPositive && (target !== 'revenue' || !!constraints.minMarginPercent),
      inactiveReason,
      lowScenario: lowPt,
      highScenario: highPt,
      priceSwing: swing,
      maxAbsDelta: Math.max(Math.abs(lowPt.deltaPrice), Math.abs(highPt.deltaPrice)),
    });
  }

  // 2. Production Capacity (+/- variationPercent)
  {
    const baseCap = constraints.maxCapacity;
    const hasCap = baseCap !== undefined && baseCap > 0;
    const lowCap = hasCap ? Math.max(1, Math.round(baseCap * (1 - ratio) * 100) / 100) : null;
    const highCap = hasCap ? Math.round(baseCap * (1 + ratio) * 100) / 100 : null;

    const lowRun =
      hasCap && lowCap !== null
        ? simulateAndOptimize(
            model,
            currentPrice,
            unitCost,
            target,
            { ...constraints, maxCapacity: lowCap },
            complementaryConfig
          )
        : baseRun;

    const highRun =
      hasCap && highCap !== null
        ? simulateAndOptimize(
            model,
            currentPrice,
            unitCost,
            target,
            { ...constraints, maxCapacity: highCap },
            complementaryConfig
          )
        : baseRun;

    const lowPt = buildPoint(lowCap, lowRun.optimization);
    const highPt = buildPoint(highCap, highRun.optimization);
    const allPrices = [baseOptimalPrice, lowPt.optimalPrice, highPt.optimalPrice];
    const swing = Math.round((Math.max(...allPrices) - Math.min(...allPrices)) * 100) / 100;

    let inactiveReason: string | undefined;
    if (!hasCap) {
      inactiveReason = 'Capacidad ilimitada (sin tope activo). Defina una capacidad máxima para evaluar cuellos de botella.';
    } else if (swing === 0) {
      inactiveReason = `La demanda óptima (${baseRun.optimization.optimalDemand.toFixed(1)} u.) está por debajo de la capacidad mínima evaluada (${lowCap} u.), por lo que no restringe el óptimo.`;
    }

    drivers.push({
      id: 'capacity',
      label: 'Capacidad de Producción',
      unitLabel: 'unidades',
      baseParameterValue: hasCap ? baseCap! : null,
      isConfigured: hasCap,
      inactiveReason,
      lowScenario: lowPt,
      highScenario: highPt,
      priceSwing: swing,
      maxAbsDelta: Math.max(Math.abs(lowPt.deltaPrice), Math.abs(highPt.deltaPrice)),
    });
  }

  // 3. Optional: Complementary Product Margin if enabled
  if (complementaryConfig && complementaryConfig.enabled && complementaryConfig.unitMargin !== 0) {
    const baseMargin = complementaryConfig.unitMargin;
    const lowMargin = Math.round(baseMargin * (1 - ratio) * 1000) / 1000;
    const highMargin = Math.round(baseMargin * (1 + ratio) * 1000) / 1000;

    const lowRun = simulateAndOptimize(
      model,
      currentPrice,
      unitCost,
      target,
      constraints,
      { ...complementaryConfig, unitMargin: lowMargin }
    );
    const highRun = simulateAndOptimize(
      model,
      currentPrice,
      unitCost,
      target,
      constraints,
      { ...complementaryConfig, unitMargin: highMargin }
    );

    const lowPt = buildPoint(lowMargin, lowRun.optimization);
    const highPt = buildPoint(highMargin, highRun.optimization);
    const allPrices = [baseOptimalPrice, lowPt.optimalPrice, highPt.optimalPrice];
    const swing = Math.round((Math.max(...allPrices) - Math.min(...allPrices)) * 100) / 100;

    drivers.push({
      id: 'complementary_margin',
      label: `Margen Vinculado (${complementaryConfig.name})`,
      unitLabel: 'moneda / u.',
      baseParameterValue: baseMargin,
      isConfigured: true,
      lowScenario: lowPt,
      highScenario: highPt,
      priceSwing: swing,
      maxAbsDelta: Math.max(Math.abs(lowPt.deltaPrice), Math.abs(highPt.deltaPrice)),
    });
  }

  // Tornado sorting: largest price swing at the top
  drivers.sort((a, b) => b.priceSwing - a.priceSwing);

  return {
    variationPercent,
    baseOptimalPrice,
    baseObjectiveValue,
    target,
    drivers,
  };
}

