/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ElasticityResult, OptimizationResult, OptimumSensitivityResult, ScenarioPoint } from '../types/pricing';
import { formatCurrency, formatNumber, formatPercent } from '../utils/numberFormat';

interface ExecutiveReportPrintProps {
  productName: string;
  optimization: OptimizationResult;
  model: ElasticityResult;
  scenarios: ScenarioPoint[];
  unitCost: number;
  capacity?: number;
  currency: 'COP' | 'USD';
  fileName: string;
  sensitivity?: OptimumSensitivityResult;
}

export const ExecutiveReportPrint: React.FC<ExecutiveReportPrintProps> = ({
  productName,
  optimization,
  model,
  scenarios,
  unitCost,
  capacity,
  currency,
  fileName,
  sensitivity,
}) => {
  return (
    <div className="print-only p-8 text-black bg-white max-w-4xl mx-auto space-y-6 text-sm font-sans">
      {/* Letterhead */}
      <div className="border-b-2 border-[#0A5C5A] pb-4 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F1E36]">
            LABORATORIO DE PRECIOS
          </h1>
          <p className="text-xs uppercase tracking-widest text-[#0A5C5A] font-semibold">
            Zoraya Forero · Análisis Econométrico y Decisiones de Negocio
          </p>
        </div>
        <div className="text-right text-xs text-gray-500 font-mono">
          <div>Fecha: {new Date().toLocaleDateString('es-CO')}</div>
          <div>Archivo: {fileName}</div>
        </div>
      </div>

      {/* Executive Summary */}
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[#0A5C5A]">
          1. Dictamen Ejecutivo de Fijación de Precios
        </h2>
        <div className="text-base font-bold text-[#0F1E36]">
          {productName}: {optimization.decisionHeadline}
        </div>
        <p className="text-xs text-gray-700 leading-relaxed">
          {optimization.decisionRationale}
        </p>
      </div>

      {/* KPI Quad Table */}
      <table className="w-full border border-gray-200 text-xs">
        <tbody>
          <tr className="bg-gray-100 font-semibold border-b border-gray-200 text-gray-600">
            <td className="p-2 border-r border-gray-200">Precio Actual</td>
            <td className="p-2 border-r border-gray-200">Precio Sugerido</td>
            <td className="p-2 border-r border-gray-200">Impacto en Contribución</td>
            <td className="p-2">Unidades Vendibles</td>
          </tr>
          <tr className="font-mono text-sm border-b border-gray-200 font-bold">
            <td className="p-2 border-r border-gray-200">
              {formatCurrency(optimization.currentPrice, currency)}
            </td>
            <td className="p-2 border-r border-gray-200 text-[#0A5C5A]">
              {formatCurrency(optimization.optimalPrice, currency)}
            </td>
            <td className="p-2 border-r border-gray-200">
              {formatCurrency(optimization.deltaContribution, currency)} ({formatPercent(optimization.deltaContributionPercent, 1)})
            </td>
            <td className="p-2">
              {formatNumber(optimization.optimalVendibleUnits, 1)} u.
            </td>
          </tr>
          <tr className="text-[11px] text-gray-500">
            <td className="p-2 border-r border-gray-200">Costo Unitario: {formatCurrency(unitCost, currency)}</td>
            <td className="p-2 border-r border-gray-200">Sensibilidad: {model.elasticityLabel} (Ed={model.elasticityValue.toFixed(2)})</td>
            <td className="p-2 border-r border-gray-200">Objetivo: {optimization.target}</td>
            <td className="p-2">Capacidad: {capacity ? `${capacity} u.` : 'Ilimitada'}</td>
          </tr>
        </tbody>
      </table>

      {/* Econometric Model Summary */}
      <div className="space-y-1">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#0A5C5A]">
          2. Modelo Econométrico de Demanda
        </h3>
        <p className="text-xs font-mono bg-gray-50 p-2.5 border border-gray-200 rounded">
          {model.modelEquation} · {model.formulaExplanation.split('\n')[0]}
        </p>
        <p className="text-xs text-gray-600">
          Interpretación: {model.interpretation}
        </p>
      </div>

      {/* Scenario Matrix Table */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#0A5C5A]">
          3. Matriz de Simulación de Escenarios
        </h3>
        <table className="w-full text-left text-xs border border-gray-200">
          <thead>
            <tr className="bg-gray-100 font-semibold border-b border-gray-200">
              <th className="p-2">Escenario</th>
              <th className="p-2 text-right">Precio</th>
              <th className="p-2 text-right">Demanda Proy.</th>
              <th className="p-2 text-right">U. Vendibles</th>
              <th className="p-2 text-right">Ingresos</th>
              <th className="p-2 text-right">Contribución Total</th>
              <th className="p-2 text-right">Margen %</th>
              <th className="p-2 text-right">Δ vs Base</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 font-mono">
            {scenarios.map(sc => (
              <tr key={sc.id} className={sc.isSuggested ? 'bg-gray-100 font-bold' : ''}>
                <td className="p-2 font-sans">{sc.name}</td>
                <td className="p-2 text-right">{formatCurrency(sc.price, currency)}</td>
                <td className="p-2 text-right">{formatNumber(sc.demand, 1)}</td>
                <td className="p-2 text-right">{formatNumber(sc.vendibleUnits, 1)}</td>
                <td className="p-2 text-right">{formatCurrency(sc.revenue, currency)}</td>
                <td className="p-2 text-right font-bold">{formatCurrency(sc.totalContribution, currency)}</td>
                <td className="p-2 text-right">{sc.marginPercent.toFixed(1)}%</td>
                <td className="p-2 text-right">{sc.isBase ? 'Base' : formatPercent(sc.deltaContributionPercent, 1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sensitivity && (
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#0A5C5A]">
            4. Sensibilidad del Óptimo (±{sensitivity.variationPercent} %)
          </h3>
          <table className="w-full text-left text-xs border border-gray-200">
            <thead>
              <tr className="bg-gray-100 font-semibold border-b border-gray-200">
                <th className="p-2">Variable Evaluada</th>
                <th className="p-2 text-right">Valor Base</th>
                <th className="p-2 text-right">P* (-{sensitivity.variationPercent} %)</th>
                <th className="p-2 text-right">P* Base</th>
                <th className="p-2 text-right">P* (+{sensitivity.variationPercent} %)</th>
                <th className="p-2 text-right">Amplitud P*</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 font-mono">
              {sensitivity.drivers.map(d => (
                <tr key={d.id}>
                  <td className="p-2 font-sans">{d.label}</td>
                  <td className="p-2 text-right">
                    {d.baseParameterValue === null
                      ? 'Ilimitada'
                      : d.id === 'capacity'
                      ? `${formatNumber(d.baseParameterValue, 1)} u.`
                      : formatCurrency(d.baseParameterValue, currency)}
                  </td>
                  <td className="p-2 text-right">{formatCurrency(d.lowScenario.optimalPrice, currency)}</td>
                  <td className="p-2 text-right font-bold">{formatCurrency(sensitivity.baseOptimalPrice, currency)}</td>
                  <td className="p-2 text-right">{formatCurrency(d.highScenario.optimalPrice, currency)}</td>
                  <td className="p-2 text-right font-bold">{formatCurrency(d.priceSwing, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footnote & Methodological References */}
      <div className="pt-4 border-t border-gray-300 text-[11px] text-gray-500 space-y-1">
        <div>
          <strong>Metodología:</strong> Hugo Martínez (Marketing Analytics: Precios y Solver), OpenStax Principles of Economics 3e (Cap. 5.1 y 5.3: Punto Medio y Relación de Ingresos), y Hyndman & Athanasopoulos (Forecasting: Principles and Practice).
        </div>
        <div>
          Reporte generado con rigor econométrico para la toma de decisiones comerciales ejecutivas.
        </div>
      </div>
    </div>
  );
};
