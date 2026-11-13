/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { CleanRecord, ElasticityResult, OptimizationResult, OptimizationTarget } from '../types/pricing';
import { formatCurrency, formatNumber } from '../utils/numberFormat';

interface PricingChartsProps {
  records: CleanRecord[];
  model: ElasticityResult;
  optimization: OptimizationResult;
  unitCost: number;
  capacity?: number;
  currency?: 'COP' | 'USD';
  economicMetric: OptimizationTarget;
  onMetricChange: (metric: OptimizationTarget) => void;
  complementaryMarginPerUnit?: number;
}

export const PricingCharts: React.FC<PricingChartsProps> = ({
  records,
  model,
  optimization,
  unitCost,
  capacity,
  currency = 'COP',
  economicMetric,
  onMetricChange,
  complementaryMarginPerUnit = 0,
}) => {
  const [hoveredPrice, setHoveredPrice] = useState<number | null>(null);

  // Determine price bounds for continuous curve
  const observedPrices = records.map(r => r.price);
  const minObserved = observedPrices.length > 0 ? Math.min(...observedPrices) : optimization.currentPrice * 0.7;
  const maxObserved = observedPrices.length > 0 ? Math.max(...observedPrices) : optimization.currentPrice * 1.3;

  const chartMinP = Math.max(0.1, Math.min(minObserved, optimization.optimalPrice, optimization.currentPrice) * 0.75);
  const chartMaxP = Math.max(maxObserved, optimization.optimalPrice, optimization.currentPrice) * 1.25;

  // Generate 60 points for the continuous curve
  const curvePoints: Array<{
    price: number;
    demand: number;
    vendible: number;
    revenue: number;
    contribution: number;
    profit: number;
  }> = [];

  const pStep = (chartMaxP - chartMinP) / 60;
  for (let p = chartMinP; p <= chartMaxP; p += pStep) {
    const rawDemand = model.predictQuantity(p);
    const vendible = capacity && capacity > 0 ? Math.min(rawDemand, capacity) : rawDemand;
    const revenue = p * vendible;
    const directContrib = (p - unitCost) * vendible;
    const compContrib = vendible * complementaryMarginPerUnit;
    const contribution = directContrib + compContrib;
    const profit = contribution; // fixed costs excluded or offset
    curvePoints.push({ price: p, demand: rawDemand, vendible, revenue, contribution, profit });
  }

  // Max values for scaling
  const maxDemand = Math.max(
    ...curvePoints.map(p => p.demand),
    ...records.map(r => r.quantity),
    capacity || 0,
    1
  );

  const getMetricValue = (p: typeof curvePoints[0]) => {
    if (economicMetric === 'revenue') return p.revenue;
    if (economicMetric === 'contribution') return p.contribution;
    return p.profit;
  };

  const metricValues = curvePoints.map(getMetricValue);
  const maxMetric = Math.max(...metricValues, 1);
  const minMetric = Math.min(...metricValues, 0);

  // SVG dimensions
  const width = 640;
  const height = 300;
  const pad = { top: 35, right: 35, bottom: 45, left: 65 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  // Coordinates helper
  const scaleX = (p: number) => pad.left + ((p - chartMinP) / (chartMaxP - chartMinP)) * plotW;
  const scaleYDemand = (q: number) => pad.top + plotH - (Math.max(0, q) / maxDemand) * plotH;
  const scaleYMetric = (m: number) => {
    const range = maxMetric - minMetric || 1;
    return pad.top + plotH - ((m - minMetric) / range) * plotH;
  };

  // Build SVG path strings
  const demandPath = curvePoints
    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(pt.price).toFixed(1)} ${scaleYDemand(pt.demand).toFixed(1)}`)
    .join(' ');

  const metricPath = curvePoints
    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(pt.price).toFixed(1)} ${scaleYMetric(getMetricValue(pt)).toFixed(1)}`)
    .join(' ');

  // Current and Optimal markers
  const currentP = optimization.currentPrice;
  const optimalP = optimization.optimalPrice;

  const currentQ = model.predictQuantity(currentP);
  const currentVendible = capacity && capacity > 0 ? Math.min(currentQ, capacity) : currentQ;
  const currentMetricVal =
    economicMetric === 'revenue'
      ? currentP * currentVendible
      : (currentP - unitCost) * currentVendible + currentVendible * complementaryMarginPerUnit;

  const optimalQ = model.predictQuantity(optimalP);
  const optimalVendible = capacity && capacity > 0 ? Math.min(optimalQ, capacity) : optimalQ;
  const optimalMetricVal =
    economicMetric === 'revenue'
      ? optimalP * optimalVendible
      : (optimalP - unitCost) * optimalVendible + optimalVendible * complementaryMarginPerUnit;

  const activeHoverPoint =
    hoveredPrice !== null
      ? curvePoints.reduce((prev, curr) =>
          Math.abs(curr.price - hoveredPrice) < Math.abs(prev.price - hoveredPrice) ? curr : prev
        )
      : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* CHART 1: DEMAND CURVE */}
      <div className="bg-white border border-[#EBE5D8] rounded-xl p-5 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-sm font-semibold text-[#0F1E36]">1. Curva de Demanda Estimada</h3>
            <p className="text-xs text-[#5A687D]">Relación entre precio unitario y cantidad demandada</p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-[#0F1E36]">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#0A5C5A]"></span>
              Óptimo
            </span>
            <span className="flex items-center gap-1.5 text-[#5A687D]">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#C25438]"></span>
              Actual
            </span>
          </div>
        </div>

        <div className="relative w-full overflow-hidden">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto select-none"
            onMouseMove={e => {
              const rect = e.currentTarget.getBoundingClientRect();
              const svgX = ((e.clientX - rect.left) / rect.width) * width;
              const ratio = Math.max(0, Math.min(1, (svgX - pad.left) / plotW));
              setHoveredPrice(chartMinP + ratio * (chartMaxP - chartMinP));
            }}
            onMouseLeave={() => setHoveredPrice(null)}
          >
            {/* Background Grid */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
              const y = pad.top + plotH * (1 - pct);
              const val = maxDemand * pct;
              return (
                <g key={`y_grid_${i}`}>
                  <line x1={pad.left} y1={y} x2={pad.left + plotW} y2={y} stroke="#F0ECE1" strokeDasharray="3 3" />
                  <text x={pad.left - 8} y={y + 4} textAnchor="end" className="text-[10px] fill-[#8A95A5] font-mono">
                    {formatNumber(val, 0)}
                  </text>
                </g>
              );
            })}

            {/* X Axis ticks */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
              const x = pad.left + plotW * pct;
              const pVal = chartMinP + (chartMaxP - chartMinP) * pct;
              return (
                <g key={`x_grid_${i}`}>
                  <line x1={x} y1={pad.top} x2={x} y2={pad.top + plotH} stroke="#F0ECE1" strokeDasharray="3 3" />
                  <text x={x} y={pad.top + plotH + 18} textAnchor="middle" className="text-[10px] fill-[#8A95A5] font-mono">
                    {currency === 'COP' ? `$${(pVal / 1000).toFixed(0)}k` : `$${pVal.toFixed(1)}`}
                  </text>
                </g>
              );
            })}

            {/* Capacity ceiling line */}
            {capacity && capacity > 0 && (
              <g>
                <line
                  x1={pad.left}
                  y1={scaleYDemand(capacity)}
                  x2={pad.left + plotW}
                  y2={scaleYDemand(capacity)}
                  stroke="#D97706"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
                <text
                  x={pad.left + plotW - 6}
                  y={scaleYDemand(capacity) - 6}
                  textAnchor="end"
                  className="text-[10px] fill-[#D97706] font-medium"
                >
                  Capacidad Máx: {formatNumber(capacity, 0)} u.
                </text>
              </g>
            )}

            {/* Fitted Demand Curve */}
            <path d={demandPath} fill="none" stroke="#0A5C5A" strokeWidth="2.5" strokeLinecap="round" />

            {/* Observed historical points */}
            {records.map((r, idx) => (
              <circle
                key={`obs_${idx}`}
                cx={scaleX(r.price)}
                cy={scaleYDemand(r.quantity)}
                r="3.5"
                fill="#F3EFE6"
                stroke="#0F1E36"
                strokeWidth="1.5"
                className="transition-transform hover:scale-150"
              />
            ))}

            {/* Current Price Marker */}
            <line
              x1={scaleX(currentP)}
              y1={scaleYDemand(currentQ)}
              x2={scaleX(currentP)}
              y2={pad.top + plotH}
              stroke="#C25438"
              strokeWidth="1.5"
              strokeDasharray="2 2"
            />
            <circle
              cx={scaleX(currentP)}
              cy={scaleYDemand(currentQ)}
              r="6"
              fill="#C25438"
              stroke="#FFFFFF"
              strokeWidth="2"
            />

            {/* Optimal Price Marker */}
            <line
              x1={scaleX(optimalP)}
              y1={scaleYDemand(optimalQ)}
              x2={scaleX(optimalP)}
              y2={pad.top + plotH}
              stroke="#0A5C5A"
              strokeWidth="1.5"
              strokeDasharray="2 2"
            />
            <circle
              cx={scaleX(optimalP)}
              cy={scaleYDemand(optimalQ)}
              r="7"
              fill="#0A5C5A"
              stroke="#FFFFFF"
              strokeWidth="2.5"
            />

            {/* Hover crosshair */}
            {activeHoverPoint && (
              <g>
                <line
                  x1={scaleX(activeHoverPoint.price)}
                  y1={pad.top}
                  x2={scaleX(activeHoverPoint.price)}
                  y2={pad.top + plotH}
                  stroke="#8A95A5"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                />
                <circle
                  cx={scaleX(activeHoverPoint.price)}
                  cy={scaleYDemand(activeHoverPoint.demand)}
                  r="4"
                  fill="#0F1E36"
                />
              </g>
            )}

            {/* Axis labels */}
            <text x={pad.left + plotW / 2} y={height - 5} textAnchor="middle" className="text-[11px] fill-[#5A687D] font-medium">
              Precio Unitario ({currency})
            </text>
            <text
              transform={`rotate(-90 ${pad.left - 45} ${pad.top + plotH / 2})`}
              x={pad.left - 45}
              y={pad.top + plotH / 2}
              textAnchor="middle"
              className="text-[11px] fill-[#5A687D] font-medium"
            >
              Demanda (unidades)
            </text>
          </svg>
        </div>

        {/* Legend / Info strip */}
        <div className="pt-2 border-t border-[#F0ECE1] flex items-center justify-between text-xs text-[#5A687D]">
          <span>Modelo: <strong className="text-[#0F1E36] font-mono">{model.modelEquation}</strong></span>
          {activeHoverPoint && (
            <span className="font-mono text-[#0A5C5A]">
              P: {formatCurrency(activeHoverPoint.price, currency)} → Q: {formatNumber(activeHoverPoint.demand, 1)} u.
            </span>
          )}
        </div>
      </div>

      {/* CHART 2: ECONOMIC IMPACT CURVE (REVENUE / CONTRIBUTION) */}
      <div className="bg-white border border-[#EBE5D8] rounded-xl p-5 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-sm font-semibold text-[#0F1E36]">2. Curva de Retorno Económico</h3>
            <p className="text-xs text-[#5A687D]">Impacto financiero según nivel de precio fijado</p>
          </div>
          {/* Segmented Metric Switcher */}
          <div className="flex items-center bg-[#F3EFE6] p-0.5 rounded-lg text-xs">
            <button
              onClick={() => onMetricChange('contribution')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                economicMetric === 'contribution' ? 'bg-white text-[#0F1E36] shadow-xs' : 'text-[#5A687D] hover:text-[#0F1E36]'
              }`}
            >
              Contribución
            </button>
            <button
              onClick={() => onMetricChange('revenue')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                economicMetric === 'revenue' ? 'bg-white text-[#0F1E36] shadow-xs' : 'text-[#5A687D] hover:text-[#0F1E36]'
              }`}
            >
              Ingresos
            </button>
            <button
              onClick={() => onMetricChange('profit')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                economicMetric === 'profit' ? 'bg-white text-[#0F1E36] shadow-xs' : 'text-[#5A687D] hover:text-[#0F1E36]'
              }`}
            >
              Utilidad
            </button>
          </div>
        </div>

        <div className="relative w-full overflow-hidden">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto select-none"
            onMouseMove={e => {
              const rect = e.currentTarget.getBoundingClientRect();
              const svgX = ((e.clientX - rect.left) / rect.width) * width;
              const ratio = Math.max(0, Math.min(1, (svgX - pad.left) / plotW));
              setHoveredPrice(chartMinP + ratio * (chartMaxP - chartMinP));
            }}
            onMouseLeave={() => setHoveredPrice(null)}
          >
            {/* Background Grid */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
              const y = pad.top + plotH * (1 - pct);
              const val = minMetric + (maxMetric - minMetric) * pct;
              return (
                <g key={`y_metric_grid_${i}`}>
                  <line x1={pad.left} y1={y} x2={pad.left + plotW} y2={y} stroke="#F0ECE1" strokeDasharray="3 3" />
                  <text x={pad.left - 8} y={y + 4} textAnchor="end" className="text-[10px] fill-[#8A95A5] font-mono">
                    {formatCurrency(val, currency, true)}
                  </text>
                </g>
              );
            })}

            {/* X Axis ticks */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
              const x = pad.left + plotW * pct;
              const pVal = chartMinP + (chartMaxP - chartMinP) * pct;
              return (
                <g key={`x_metric_grid_${i}`}>
                  <line x1={x} y1={pad.top} x2={x} y2={pad.top + plotH} stroke="#F0ECE1" strokeDasharray="3 3" />
                  <text x={x} y={pad.top + plotH + 18} textAnchor="middle" className="text-[10px] fill-[#8A95A5] font-mono">
                    {currency === 'COP' ? `$${(pVal / 1000).toFixed(0)}k` : `$${pVal.toFixed(1)}`}
                  </text>
                </g>
              );
            })}

            {/* Economic Curve */}
            <path d={metricPath} fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" />

            {/* Current Price Marker */}
            <line
              x1={scaleX(currentP)}
              y1={scaleYMetric(currentMetricVal)}
              x2={scaleX(currentP)}
              y2={pad.top + plotH}
              stroke="#C25438"
              strokeWidth="1.5"
              strokeDasharray="2 2"
            />
            <circle
              cx={scaleX(currentP)}
              cy={scaleYMetric(currentMetricVal)}
              r="6"
              fill="#C25438"
              stroke="#FFFFFF"
              strokeWidth="2"
            />

            {/* Optimal Price Marker (Apex) */}
            <line
              x1={scaleX(optimalP)}
              y1={scaleYMetric(optimalMetricVal)}
              x2={scaleX(optimalP)}
              y2={pad.top + plotH}
              stroke="#0A5C5A"
              strokeWidth="1.5"
              strokeDasharray="2 2"
            />
            <circle
              cx={scaleX(optimalP)}
              cy={scaleYMetric(optimalMetricVal)}
              r="7"
              fill="#0A5C5A"
              stroke="#FFFFFF"
              strokeWidth="2.5"
            />

            {/* Hover crosshair */}
            {activeHoverPoint && (
              <g>
                <line
                  x1={scaleX(activeHoverPoint.price)}
                  y1={pad.top}
                  x2={scaleX(activeHoverPoint.price)}
                  y2={pad.top + plotH}
                  stroke="#8A95A5"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                />
                <circle
                  cx={scaleX(activeHoverPoint.price)}
                  cy={scaleYMetric(getMetricValue(activeHoverPoint))}
                  r="4"
                  fill="#0F1E36"
                />
              </g>
            )}

            {/* Axis labels */}
            <text x={pad.left + plotW / 2} y={height - 5} textAnchor="middle" className="text-[11px] fill-[#5A687D] font-medium">
              Precio Unitario ({currency})
            </text>
            <text
              transform={`rotate(-90 ${pad.left - 48} ${pad.top + plotH / 2})`}
              x={pad.left - 48}
              y={pad.top + plotH / 2}
              textAnchor="middle"
              className="text-[11px] fill-[#5A687D] font-medium"
            >
              {economicMetric === 'revenue' ? 'Ingresos' : 'Contribución Total'} ({currency})
            </text>
          </svg>
        </div>

        {/* Legend / Info strip */}
        <div className="pt-2 border-t border-[#F0ECE1] flex items-center justify-between text-xs text-[#5A687D]">
          <span>
            Máximo en óptimo: <strong className="text-[#0A5C5A] font-mono">{formatCurrency(optimalMetricVal, currency)}</strong>
          </span>
          {activeHoverPoint && (
            <span className="font-mono text-[#2563EB]">
              Retorno a P={formatCurrency(activeHoverPoint.price, currency)}: {formatCurrency(getMetricValue(activeHoverPoint), currency)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
