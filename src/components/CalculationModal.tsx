/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, Calculator, Check, AlertCircle, BookOpen } from 'lucide-react';
import { ElasticityResult, OptimizationResult, OptimizationTarget } from '../types/pricing';
import { formatCurrency, formatNumber } from '../utils/numberFormat';

interface CalculationModalProps {
  isOpen: boolean;
  onClose: () => void;
  model: ElasticityResult;
  optimization: OptimizationResult;
  unitCost: number;
  capacity?: number;
  currency?: 'COP' | 'USD';
  target: OptimizationTarget;
  complementaryMarginPerUnit?: number;
}

export const CalculationModal: React.FC<CalculationModalProps> = ({
  isOpen,
  onClose,
  model,
  optimization,
  unitCost,
  capacity,
  currency = 'COP',
  target,
  complementaryMarginPerUnit = 0,
}) => {
  if (!isOpen) return null;

  const currentQ = model.predictQuantity(optimization.currentPrice);
  const optimalQ = model.predictQuantity(optimization.optimalPrice);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-[#FAF8F5] border border-[#E2DDD2] rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#EBE5D8] sticky top-0 bg-[#FAF8F5]/95 backdrop-blur-xs z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#E8F2F1] text-[#0A5C5A] flex items-center justify-center">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#0F1E36]">Memoria de Cálculo y Justificación</h2>
              <p className="text-xs text-[#5A687D]">Fórmulas aplicadas, sustitución con datos reales y validación estadística</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#5A687D] hover:text-[#0F1E36] hover:bg-[#F0ECE1] rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 text-sm text-[#0F1E36]">
          {/* Section 1: Demand Curve Formulation */}
          <div className="bg-white border border-[#EBE5D8] rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2 font-semibold text-xs text-[#0A5C5A] uppercase tracking-wider">
              <BookOpen className="w-4 h-4" />
              <span>1. Curva de Demanda Estimada</span>
            </div>
            <div className="p-3 bg-[#F9F7F2] rounded-lg font-mono text-xs text-[#0F1E36] leading-relaxed overflow-x-auto whitespace-pre-wrap border border-[#EDE8DD]">
              {model.formulaExplanation}
            </div>
            <p className="text-xs text-[#5A687D]">
              Ecuación empírica resultante: <strong className="text-[#0F1E36] font-mono">{model.modelEquation}</strong>
            </p>
          </div>

          {/* Section 2: Elasticity Evaluation */}
          <div className="bg-white border border-[#EBE5D8] rounded-xl p-5 space-y-3">
            <h3 className="font-semibold text-xs text-[#0A5C5A] uppercase tracking-wider">
              2. Elasticidad Precio de la Demanda (Ed)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3 bg-[#F9F7F2] rounded-lg border border-[#EDE8DD]">
                <span className="text-xs text-[#5A687D] block mb-1">Valor en Precio Actual</span>
                <span className="text-2xl font-bold font-mono text-[#0F1E36]">
                  {model.elasticityValue.toFixed(2)}
                </span>
                <span className="text-xs text-[#0A5C5A] font-medium block mt-1">
                  Clasificación: {model.elasticityLabel}
                </span>
              </div>
              <div className="p-3 bg-[#F9F7F2] rounded-lg border border-[#EDE8DD] text-xs space-y-1">
                <span className="text-[#5A687D] block font-semibold mb-1">Significado Económico:</span>
                <p className="text-[#0F1E36] leading-relaxed">{model.interpretation}</p>
              </div>
            </div>
          </div>

          {/* Section 3: Temporal Validation (Hyndman & Athanasopoulos) */}
          {model.mae !== undefined && (
            <div className="bg-white border border-[#EBE5D8] rounded-xl p-5 space-y-3">
              <h3 className="font-semibold text-xs text-[#0A5C5A] uppercase tracking-wider">
                3. Validación Temporal Fuera de Muestra (Forecasting: Hyndman & Athanasopoulos)
              </h3>
              <p className="text-xs text-[#5A687D]">
                Se reservaron los últimos {model.testPeriodCount} períodos para evaluar la capacidad predictiva del modelo frente a una referencia ingenua (repetir las ventas del período anterior).
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-[#F0F7F6] rounded-lg border border-[#C5E3DF]">
                  <span className="text-xs text-[#0A5C5A] block mb-1">MAE Modelo Estimado</span>
                  <span className="text-xl font-bold font-mono text-[#0A5C5A]">
                    {model.mae.toFixed(2)} u.
                  </span>
                  <span className="text-[11px] text-[#5A687D] block mt-1">Error Absoluto Medio</span>
                </div>
                <div className="p-3 bg-[#F9F7F2] rounded-lg border border-[#EDE8DD]">
                  <span className="text-xs text-[#5A687D] block mb-1">MAE Referencia Ingenua</span>
                  <span className="text-xl font-bold font-mono text-[#5A687D]">
                    {model.naiveMae !== undefined ? `${model.naiveMae.toFixed(2)} u.` : '—'}
                  </span>
                  <span className="text-[11px] text-[#5A687D] block mt-1">Benchmark Q(t) = Q(t-1)</span>
                </div>
              </div>
            </div>
          )}

          {/* Section 4: Optimization Solver Formulation (Hugo Martínez) */}
          <div className="bg-white border border-[#EBE5D8] rounded-xl p-5 space-y-3">
            <h3 className="font-semibold text-xs text-[#0A5C5A] uppercase tracking-wider">
              4. Formulación del Problema de Optimización (Solver)
            </h3>
            <p className="text-xs text-[#5A687D]">
              El motor evaluó precios admisibles en pasos discretos (equivalente al Solver no lineal de Excel) buscando la solución óptima:
            </p>
            <div className="p-3 bg-[#F9F7F2] rounded-lg font-mono text-xs text-[#0F1E36] leading-relaxed border border-[#EDE8DD] space-y-2">
              <div>
                <strong>Función Objetivo ({target}):</strong>
                {target === 'contribution' && (
                  <div>
                    Max Contribución(P) = (P - CVU) · min(Q(P), Capacidad)
                    {complementaryMarginPerUnit > 0 && ` + Q(P) · $${complementaryMarginPerUnit.toFixed(2)} (Margen Cruzado)`}
                  </div>
                )}
                {target === 'revenue' && <div>Max Ingresos(P) = P · min(Q(P), Capacidad)</div>}
                {target === 'profit' && <div>Max Utilidad(P) = Contribución Total(P) - Costos Fijos</div>}
              </div>
              <div className="pt-2 border-t border-[#EBE5D8]">
                <strong>Parámetros de Entrada Sustituidos:</strong>
                <div>· Costo Variable Unitario (CVU) = {formatCurrency(unitCost, currency)}</div>
                {capacity && capacity > 0 && <div>· Capacidad Máxima del Período = {capacity} unidades</div>}
                {complementaryMarginPerUnit > 0 && (
                  <div>· Beneficio de Productos Complementarios = {formatCurrency(complementaryMarginPerUnit, currency)} por venta principal</div>
                )}
              </div>
              <div className="pt-2 border-t border-[#EBE5D8]">
                <strong>Resultado Numérico:</strong>
                <div>· Precio Óptimo P* = {formatCurrency(optimization.optimalPrice, currency)}</div>
                <div>· Demanda Proyectada Q* = {formatNumber(optimalQ, 2)} u.</div>
                <div>· Unidades Vendibles = {formatNumber(optimization.optimalVendibleUnits, 2)} u.</div>
                <div>· Contribución Proyectada = {formatCurrency(optimization.optimalContribution, currency)}</div>
              </div>
            </div>
          </div>

          {/* Section 5: Methodological Notes & OpenStax/Martinez References */}
          <div className="p-4 bg-[#F0F7F6] border border-[#C5E3DF] rounded-xl text-xs space-y-1.5 text-[#0F1E36]">
            <div className="flex items-center gap-2 font-semibold text-[#0A5C5A]">
              <Check className="w-4 h-4" />
              <span>Rigor Metodológico y Causalidad</span>
            </div>
            <p className="text-[#5A687D] leading-relaxed">
              La elasticidad estimada refleja la relación histórica observada o declarada bajo la condición <em>ceteris paribus</em> (manteniendo constantes otros factores como competencia, estacionalidad y campañas publicitarias). Si se modifican simultáneamente la inversión en medios o la oferta de sustitutos, la curva de demanda real puede desplazarse.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#EBE5D8] flex items-center justify-end bg-white">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-white bg-[#0A5C5A] hover:bg-[#074745] rounded-lg transition-colors cursor-pointer"
          >
            Entendido, volver a resultados
          </button>
        </div>
      </div>
    </div>
  );
};
