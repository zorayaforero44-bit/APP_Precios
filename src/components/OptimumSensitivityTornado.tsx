/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Activity, AlertCircle, ArrowLeftRight, Info } from 'lucide-react';
import { OptimumSensitivityResult, SensitivityDriverResult } from '../types/pricing';
import { formatCurrency, formatNumber, formatPercent } from '../utils/numberFormat';

interface OptimumSensitivityTornadoProps {
  sensitivity: OptimumSensitivityResult;
  currency: 'COP' | 'USD';
  variationPercent: number;
  onVariationPercentChange: (pct: number) => void;
  optimalDemand: number;
  onApplyReferenceCapacity: (cap: number) => void;
  onApplyReferenceCost: (cost: number) => void;
  currentPrice: number;
}

export const OptimumSensitivityTornado: React.FC<OptimumSensitivityTornadoProps> = ({
  sensitivity,
  currency,
  variationPercent,
  onVariationPercentChange,
  optimalDemand,
  onApplyReferenceCapacity,
  onApplyReferenceCost,
  currentPrice,
}) => {
  const [hoveredDriverId, setHoveredDriverId] = useState<string | null>(null);

  const { baseOptimalPrice, drivers, target } = sensitivity;

  // Compute domain centered at baseOptimalPrice
  const allPrices = [
    baseOptimalPrice,
    ...drivers.flatMap(d => [d.lowScenario.optimalPrice, d.highScenario.optimalPrice]),
  ];
  const minP = Math.min(...allPrices);
  const maxP = Math.max(...allPrices);
  const rawMaxDev = Math.max(baseOptimalPrice - minP, maxP - baseOptimalPrice);
  const effectiveDev =
    rawMaxDev > 0.0001 ? rawMaxDev * 1.08 : Math.max(0.5, baseOptimalPrice * 0.12);

  const domainMin = Math.max(0, baseOptimalPrice - effectiveDev);
  const domainMax = baseOptimalPrice + effectiveDev;

  // SVG layout geometry with dedicated label gutters
  const width = 820;
  const driverLabelEndX = 178;
  const pad = { top: 40, right: 125, bottom: 42, left: 295 };
  const rowHeight = 76;
  const height = pad.top + drivers.length * rowHeight + pad.bottom;
  const plotW = width - pad.left - pad.right;

  const scaleX = (p: number) =>
    pad.left + ((p - domainMin) / (domainMax - domainMin || 1)) * plotW;

  const baseX = scaleX(baseOptimalPrice);

  const truncateLabel = (text: string, maxLen: number = 26) =>
    text.length > maxLen ? `${text.slice(0, maxLen - 1)}…` : text;

  // Format axis tick cleanly
  const formatTick = (p: number) => {
    if (currency === 'COP' && p >= 1000) {
      return `$${(p / 1000).toFixed(p % 1000 === 0 ? 0 : 1)}k`;
    }
    return formatCurrency(p, currency);
  };

  const formatParamValue = (driver: SensitivityDriverResult, val: number | null) => {
    if (val === null) return 'Ilimitada';
    if (driver.id === 'capacity') return `${formatNumber(val, 1)} u.`;
    return formatCurrency(val, currency);
  };

  const activeDriver =
    drivers.find(d => d.id === hoveredDriverId) ||
    drivers.find(d => d.priceSwing > 0) ||
    drivers[0];

  const targetLabel =
    target === 'contribution'
      ? 'Contribución Total'
      : target === 'revenue'
      ? 'Ingresos Brutos'
      : 'Utilidad Neta';

  const hasCapacityDriverUnconfigured = drivers.some(
    d => d.id === 'capacity' && !d.isConfigured
  );
  const hasCostDriverZero = drivers.some(
    d => d.id === 'unit_cost' && (d.baseParameterValue === null || d.baseParameterValue <= 0)
  );

  return (
    <div className="bg-white border border-[#EBE5D8] rounded-xl p-5 shadow-xs space-y-5">
      {/* Header & Fluctuation Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#F0ECE1]">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#0A5C5A]" />
            <h3 className="text-base font-bold text-[#0F1E36]">
              Sensibilidad del Óptimo (Gráfico de Tornado)
            </h3>
          </div>
          <p className="text-xs text-[#5A687D] mt-0.5">
            Evalúa cómo cambia el precio sugerido para maximizar <strong>{targetLabel}</strong> si el costo variable unitario o la capacidad fluctúan en ±{variationPercent} %
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Legend */}
          <div className="flex items-center gap-3 text-xs text-[#5A687D] mr-1">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-2.5 rounded-xs bg-[#0A5C5A]"></span>
              -{variationPercent} % en variable
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-2.5 rounded-xs bg-[#C25438]"></span>
              +{variationPercent} % en variable
            </span>
          </div>

          {/* Variation Percentage Selector */}
          <div className="flex items-center bg-[#F3EFE6] p-0.5 rounded-lg text-xs">
            {[5, 10, 15, 20].map(pct => (
              <button
                key={pct}
                onClick={() => onVariationPercentChange(pct)}
                className={`px-2.5 py-1 rounded-md font-mono font-medium transition-colors cursor-pointer ${
                  variationPercent === pct
                    ? 'bg-white text-[#0F1E36] shadow-xs'
                    : 'text-[#5A687D] hover:text-[#0F1E36]'
                }`}
              >
                ±{pct}%
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content: Tornado SVG + Companion Summary Table */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left/Center: Tornado SVG Chart */}
        <div className="xl:col-span-7 bg-[#FAF8F5] border border-[#EDE8DD] rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-[#5A687D] mb-2">
            <span className="font-semibold text-[#0F1E36]">
              Impacto en Precio Óptimo Sugerido ({currency})
            </span>
            <span className="font-mono">
              Referencia Base P*: <strong className="text-[#0A5C5A]">{formatCurrency(baseOptimalPrice, currency)}</strong>
            </span>
          </div>

          <div className="w-full overflow-x-auto">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto min-w-[580px] select-none">
              {/* Vertical Grid Ticks */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                const tickP = domainMin + (domainMax - domainMin) * ratio;
                const x = scaleX(tickP);
                return (
                  <g key={`tick_${idx}`}>
                    <line
                      x1={x}
                      y1={pad.top - 8}
                      x2={x}
                      y2={height - pad.bottom}
                      stroke="#E5DFD2"
                      strokeWidth="1"
                      strokeDasharray="3 3"
                    />
                    <text
                      x={x}
                      y={height - pad.bottom + 18}
                      textAnchor="middle"
                      className="text-[10px] font-mono fill-[#8A95A5]"
                    >
                      {formatTick(tickP)}
                    </text>
                  </g>
                );
              })}

              {/* Center Base Price Axis Line */}
              <line
                x1={baseX}
                y1={pad.top - 10}
                x2={baseX}
                y2={height - pad.bottom}
                stroke="#0F1E36"
                strokeWidth="1.5"
                strokeDasharray="4 3"
              />

              {/* Center Base Price Label at Top */}
              <text
                x={baseX}
                y={pad.top - 16}
                textAnchor="middle"
                className="text-[11px] font-mono font-bold fill-[#0F1E36]"
              >
                Óptimo Base: {formatCurrency(baseOptimalPrice, currency)}
              </text>

              {/* Tornado Rows */}
              {drivers.map((driver, idx) => {
                const rowTop = pad.top + idx * rowHeight;
                const centerY = rowTop + rowHeight / 2;
                const isHovered = hoveredDriverId === driver.id;

                const lowX = scaleX(driver.lowScenario.optimalPrice);
                const highX = scaleX(driver.highScenario.optimalPrice);

                const lowDelta = driver.lowScenario.deltaPrice;
                const highDelta = driver.highScenario.deltaPrice;

                // Check if both non-zero deltas lie on the same side of baseX
                const sameSide =
                  (lowDelta > 0 && highDelta > 0) || (lowDelta < 0 && highDelta < 0);

                const lowBarX = Math.min(baseX, lowX);
                const lowBarW = Math.abs(lowX - baseX);

                const highBarX = Math.min(baseX, highX);
                const highBarW = Math.abs(highX - baseX);

                return (
                  <g
                    key={driver.id}
                    onMouseEnter={() => setHoveredDriverId(driver.id)}
                    onMouseLeave={() => setHoveredDriverId(null)}
                    className="cursor-pointer"
                  >
                    {/* Row hover background */}
                    <rect
                      x={4}
                      y={rowTop + 4}
                      width={width - 8}
                      height={rowHeight - 8}
                      rx={8}
                      fill={isHovered ? '#F0ECE1' : 'transparent'}
                      opacity={0.7}
                    />

                    {/* Row bottom divider */}
                    {idx < drivers.length - 1 && (
                      <line
                        x1={10}
                        y1={rowTop + rowHeight}
                        x2={width - 10}
                        y2={rowTop + rowHeight}
                        stroke="#EBE5D8"
                      />
                    )}

                    {/* Left Label Block */}
                    <text
                      x={driverLabelEndX}
                      y={centerY - 4}
                      textAnchor="end"
                      className="text-[12px] font-bold fill-[#0F1E36]"
                    >
                      {truncateLabel(driver.label)}
                    </text>
                    <text
                      x={driverLabelEndX}
                      y={centerY + 13}
                      textAnchor="end"
                      className="text-[10px] font-mono fill-[#5A687D]"
                    >
                      Base: {formatParamValue(driver, driver.baseParameterValue)}
                    </text>

                    {/* Bars */}
                    {driver.priceSwing === 0 ? (
                      <g>
                        <circle cx={baseX} cy={centerY} r="4.5" fill="#8A95A5" />
                        <text
                          x={baseX + 10}
                          y={centerY + 3}
                          className="text-[10px] fill-[#8A95A5] italic"
                        >
                          Sin variación en P* ({driver.isConfigured ? 'óptimo invariante' : 'sin límite'})
                        </text>
                      </g>
                    ) : sameSide ? (
                      <>
                        {/* Stacked bars to prevent overlap when both move same direction */}
                        {lowBarW > 0.5 && (
                          <rect
                            x={lowBarX}
                            y={centerY - 15}
                            width={Math.max(3, lowBarW)}
                            height={13}
                            rx={3}
                            fill="#0A5C5A"
                          />
                        )}
                        {highBarW > 0.5 && (
                          <rect
                            x={highBarX}
                            y={centerY + 2}
                            width={Math.max(3, highBarW)}
                            height={13}
                            rx={3}
                            fill="#C25438"
                          />
                        )}
                      </>
                    ) : (
                      <>
                        {/* Standard opposing Tornado bars */}
                        {lowBarW > 0.5 && (
                          <rect
                            x={lowBarX}
                            y={centerY - 13}
                            width={Math.max(3, lowBarW)}
                            height={26}
                            rx={3}
                            fill="#0A5C5A"
                          />
                        )}
                        {highBarW > 0.5 && (
                          <rect
                            x={highBarX}
                            y={centerY - 13}
                            width={Math.max(3, highBarW)}
                            height={26}
                            rx={3}
                            fill="#C25438"
                          />
                        )}
                      </>
                    )}

                    {/* Value Labels outside bar ends */}
                    {driver.priceSwing > 0 && lowDelta !== 0 && (
                      <text
                        x={lowDelta < 0 ? lowBarX - 6 : lowBarX + lowBarW + 6}
                        y={sameSide ? centerY - 5 : centerY + 4}
                        textAnchor={lowDelta < 0 ? 'end' : 'start'}
                        className="text-[10px] font-mono font-semibold fill-[#0A5C5A]"
                      >
                        {formatCurrency(driver.lowScenario.optimalPrice, currency)} (-{variationPercent}%)
                      </text>
                    )}

                    {driver.priceSwing > 0 && highDelta !== 0 && (
                      <text
                        x={highDelta < 0 ? highBarX - 6 : highBarX + highBarW + 6}
                        y={sameSide ? centerY + 12 : centerY + 4}
                        textAnchor={highDelta < 0 ? 'end' : 'start'}
                        className="text-[10px] font-mono font-semibold fill-[#C25438]"
                      >
                        {formatCurrency(driver.highScenario.optimalPrice, currency)} (+{variationPercent}%)
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Bottom X-axis title */}
              <text
                x={pad.left + plotW / 2}
                y={height - 6}
                textAnchor="middle"
                className="text-[11px] fill-[#5A687D] font-medium"
              >
                Precio Sugerido Resultante ({currency})
              </text>
            </svg>
          </div>

          {/* Active Driver Inspection Strip */}
          {activeDriver && (
            <div className="mt-3 pt-3 border-t border-[#E2DDD2] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="text-[#0F1E36]">
                <span className="font-semibold text-[#0A5C5A]">{activeDriver.label}:</span>{' '}
                {activeDriver.inactiveReason ? (
                  <span className="text-[#5A687D]">{activeDriver.inactiveReason}</span>
                ) : (
                  <span>
                    Rango del precio óptimo entre{' '}
                    <strong className="font-mono">
                      {formatCurrency(
                        Math.min(
                          activeDriver.lowScenario.optimalPrice,
                          activeDriver.highScenario.optimalPrice,
                          baseOptimalPrice
                        ),
                        currency
                      )}
                    </strong>{' '}
                    y{' '}
                    <strong className="font-mono">
                      {formatCurrency(
                        Math.max(
                          activeDriver.lowScenario.optimalPrice,
                          activeDriver.highScenario.optimalPrice,
                          baseOptimalPrice
                        ),
                        currency
                      )}
                    </strong>{' '}
                    (amplitud total de{' '}
                    <strong className="font-mono">
                      {formatCurrency(activeDriver.priceSwing, currency)}
                    </strong>
                    ).
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: Exact Tabular Breakdown */}
        <div className="xl:col-span-5 space-y-4">
          <div className="border border-[#EBE5D8] rounded-xl overflow-hidden">
            <div className="bg-[#FAF8F5] px-4 py-2.5 border-b border-[#EBE5D8] flex items-center justify-between">
              <span className="text-xs font-bold text-[#0F1E36]">
                Detalle Numérico (±{variationPercent} %)
              </span>
              <ArrowLeftRight className="w-3.5 h-3.5 text-[#0A5C5A]" />
            </div>

            <div className="divide-y divide-[#F0ECE1]">
              {drivers.map(driver => (
                <div key={`tbl_${driver.id}`} className="p-3.5 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-[#0F1E36] block">{driver.label}</span>
                      <span className="text-[11px] text-[#5A687D]">
                        Base: <strong className="font-mono text-[#0F1E36]">{formatParamValue(driver, driver.baseParameterValue)}</strong>
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-[#5A687D] block">Amplitud P*</span>
                      <span className="font-mono font-bold text-[#0F1E36]">
                        {formatCurrency(driver.priceSwing, currency)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {/* -10% box */}
                    <div className="p-2.5 rounded-lg bg-[#F0F7F6] border border-[#D5E8E6]">
                      <div className="flex items-center justify-between text-[11px] text-[#0A5C5A] font-semibold mb-0.5">
                        <span>-{variationPercent} %</span>
                        <span className="font-mono">
                          {formatParamValue(driver, driver.lowScenario.parameterValue)}
                        </span>
                      </div>
                      <div className="text-sm font-bold font-mono tabular-nums text-[#0F1E36]">
                        P*: {formatCurrency(driver.lowScenario.optimalPrice, currency)}
                      </div>
                      <div className="text-[11px] font-mono text-[#5A687D]">
                        Δ: {driver.lowScenario.deltaPrice >= 0 ? '+' : ''}
                        {formatCurrency(driver.lowScenario.deltaPrice, currency)} (
                        {formatPercent(driver.lowScenario.deltaPricePercent, 1)})
                      </div>
                    </div>

                    {/* +10% box */}
                    <div className="p-2.5 rounded-lg bg-[#FDF5F3] border border-[#F3D8D1]">
                      <div className="flex items-center justify-between text-[11px] text-[#C25438] font-semibold mb-0.5">
                        <span>+{variationPercent} %</span>
                        <span className="font-mono">
                          {formatParamValue(driver, driver.highScenario.parameterValue)}
                        </span>
                      </div>
                      <div className="text-sm font-bold font-mono tabular-nums text-[#0F1E36]">
                        P*: {formatCurrency(driver.highScenario.optimalPrice, currency)}
                      </div>
                      <div className="text-[11px] font-mono text-[#5A687D]">
                        Δ: {driver.highScenario.deltaPrice >= 0 ? '+' : ''}
                        {formatCurrency(driver.highScenario.deltaPrice, currency)} (
                        {formatPercent(driver.highScenario.deltaPricePercent, 1)})
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Helpful 1-click activation when Capacity is Unlimited or Cost is 0 */}
          {(hasCapacityDriverUnconfigured || hasCostDriverZero) && (
            <div className="p-3.5 bg-[#FFFBEB] border border-[#FDE68A] rounded-xl space-y-2 text-xs text-[#92400E]">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
                <div className="space-y-2">
                  {hasCapacityDriverUnconfigured && (
                    <div>
                      <p className="leading-relaxed">
                        Actualmente no hay un tope de capacidad definido, por lo que una variación del ±{variationPercent} % en capacidad no restringe las ventas.
                      </p>
                      {optimalDemand > 1 && (
                        <button
                          onClick={() => onApplyReferenceCapacity(Math.max(1, Math.round(optimalDemand * 0.95)))}
                          className="mt-1.5 inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-white text-[#92400E] border border-[#F59E0B] hover:bg-[#FEF3C7] rounded-md transition-colors cursor-pointer"
                        >
                          Probar con tope de capacidad ({Math.max(1, Math.round(optimalDemand * 0.95))} u.)
                        </button>
                      )}
                    </div>
                  )}
                  {hasCostDriverZero && (
                    <div>
                      <p className="leading-relaxed">
                        El costo variable unitario está en $0.
                      </p>
                      <button
                        onClick={() => onApplyReferenceCost(Math.round(currentPrice * 0.45 * 100) / 100)}
                        className="mt-1.5 inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-white text-[#92400E] border border-[#F59E0B] hover:bg-[#FEF3C7] rounded-md transition-colors cursor-pointer"
                      >
                        Asignar costo estimado ({formatCurrency(Math.round(currentPrice * 0.45 * 100) / 100, currency)})
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
