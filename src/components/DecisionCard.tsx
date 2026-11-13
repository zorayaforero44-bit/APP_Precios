/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ArrowDownRight, ArrowUpRight, CheckCircle2, AlertTriangle, HelpCircle } from 'lucide-react';
import { ElasticityResult, OptimizationResult, OptimizationTarget } from '../types/pricing';
import { formatCurrency, formatNumber, formatPercent } from '../utils/numberFormat';

interface DecisionCardProps {
  productName: string;
  optimization: OptimizationResult;
  model: ElasticityResult;
  target: OptimizationTarget;
  currency: 'COP' | 'USD';
  unitCost: number;
  capacity?: number;
  onOpenHowItWasCalculated: () => void;
}

export const DecisionCard: React.FC<DecisionCardProps> = ({
  productName,
  optimization,
  model,
  target,
  currency,
  unitCost,
  capacity,
  onOpenHowItWasCalculated,
}) => {
  const isIncrease = optimization.optimalPrice > optimization.currentPrice;
  const isDecrease = optimization.optimalPrice < optimization.currentPrice;
  const isSame = optimization.optimalPrice === optimization.currentPrice;

  const targetLabel =
    target === 'contribution'
      ? 'Maximizar Contribución Total'
      : target === 'revenue'
      ? 'Maximizar Ingresos Brutos'
      : 'Maximizar Utilidad Neta';

  const isCapacityLimiting = capacity && capacity > 0 && optimization.optimalDemand > capacity;

  return (
    <div className="bg-[#FAF8F5] border border-[#E2DDD2] rounded-xl p-6 shadow-xs relative overflow-hidden">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#EBE5D8]">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#5A687D] uppercase tracking-wider font-semibold mb-1">
            <span>1. La Decisión Comercial</span>
            <span aria-hidden="true">·</span>
            <span className="text-[#0A5C5A]">{targetLabel}</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-[#0F1E36] tracking-tight">
            {productName}
          </h2>
        </div>

        <button
          onClick={onOpenHowItWasCalculated}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-[#0A5C5A] bg-[#E8F2F1] hover:bg-[#D5E8E6] rounded-lg transition-colors whitespace-nowrap self-start md:self-auto cursor-pointer"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          Ver cómo se calculó
        </button>
      </div>

      {/* Main KPI Quad */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-5 border-b border-[#EBE5D8]">
        {/* Current Price */}
        <div className="bg-white p-4 rounded-lg border border-[#EBE5D8]">
          <span className="text-xs text-[#5A687D] block mb-1">Precio Actual</span>
          <div className="text-xl font-bold text-[#0F1E36] font-mono tabular-nums">
            {formatCurrency(optimization.currentPrice, currency)}
          </div>
          <span className="text-[11px] text-[#8A95A5] block mt-1">Punto de referencia base</span>
        </div>

        {/* Suggested Price */}
        <div className="bg-[#F0F7F6] p-4 rounded-lg border border-[#C5E3DF]">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-[#0A5C5A]">Precio Sugerido</span>
            {isIncrease && <ArrowUpRight className="w-3.5 h-3.5 text-[#0A5C5A]" />}
            {isDecrease && <ArrowDownRight className="w-3.5 h-3.5 text-[#D97706]" />}
            {isSame && <CheckCircle2 className="w-3.5 h-3.5 text-[#0A5C5A]" />}
          </div>
          <div className="text-2xl font-extrabold text-[#0A5C5A] font-mono tabular-nums">
            {formatCurrency(optimization.optimalPrice, currency)}
          </div>
          <span className="text-[11px] text-[#0A5C5A] font-medium block mt-1">
            {isSame
              ? 'Precio en nivel óptimo'
              : `${formatPercent(((optimization.optimalPrice - optimization.currentPrice) / optimization.currentPrice) * 100, 1)} frente al actual`}
          </span>
        </div>

        {/* Expected Change in Contribution/Revenue */}
        <div className="bg-white p-4 rounded-lg border border-[#EBE5D8]">
          <span className="text-xs text-[#5A687D] block mb-1">Impacto en Contribución</span>
          <div
            className={`text-xl font-bold font-mono tabular-nums ${
              optimization.deltaContribution >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'
            }`}
          >
            {optimization.deltaContribution >= 0 ? '+' : ''}
            {formatCurrency(optimization.deltaContribution, currency)}
          </div>
          <span className="text-[11px] text-[#5A687D] block mt-1">
            {formatPercent(optimization.deltaContributionPercent, 1)} vs escenario base
          </span>
        </div>

        {/* Units Sold / Vendible Units */}
        <div className="bg-white p-4 rounded-lg border border-[#EBE5D8]">
          <span className="text-xs text-[#5A687D] block mb-1">Volumen Vendible</span>
          <div className="text-xl font-bold text-[#0F1E36] font-mono tabular-nums">
            {formatNumber(optimization.optimalVendibleUnits, 1)} u.
          </div>
          <span className="text-[11px] text-[#5A687D] block mt-1">
            {isCapacityLimiting ? (
              <span className="text-[#D97706] font-medium">Tope por capacidad ({capacity} u.)</span>
            ) : (
              `Demanda proyectada al precio sugerido`
            )}
          </span>
        </div>
      </div>

      {/* Decision Rationale and Assumptions */}
      <div className="pt-4 flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="space-y-1.5 flex-1">
          <p className="text-sm text-[#0F1E36] font-medium leading-relaxed">
            {optimization.decisionRationale}
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#5A687D]">
            <span>Sensibilidad: <strong className="text-[#0F1E36]">{model.elasticityLabel} (Ed = {model.elasticityValue.toFixed(2)})</strong></span>
            <span aria-hidden="true">·</span>
            <span>Costo Unitario: <strong className="text-[#0F1E36]">{formatCurrency(unitCost, currency)}</strong></span>
            {capacity && capacity > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span>Capacidad: <strong className="text-[#0F1E36]">{capacity} u./período</strong></span>
              </>
            )}
          </div>
        </div>

        {optimization.isBoundary && (
          <div className="flex items-center gap-2 px-3 py-2 bg-[#FFFBEB] border border-[#FDE68A] text-[#92400E] rounded-lg text-xs shrink-0 max-w-sm">
            <AlertTriangle className="w-4 h-4 shrink-0 text-[#D97706]" />
            <span>El precio sugerido alcanzó el límite del rango evaluado. Verifique si conviene probar precios más allá de los extremos observados.</span>
          </div>
        )}
      </div>
    </div>
  );
};
