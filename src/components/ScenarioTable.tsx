/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Plus, Sliders, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { ComplementaryProductConfig, OptimizationConstraints, OptimizationTarget, ScenarioPoint } from '../types/pricing';
import { formatCurrency, formatNumber, formatPercent } from '../utils/numberFormat';

interface ScenarioTableProps {
  scenarios: ScenarioPoint[];
  currentPrice: number;
  onCurrentPriceChange: (newPrice: number) => void;
  unitCost: number;
  onUnitCostChange: (newCost: number) => void;
  fixedCosts: number;
  onFixedCostsChange: (newFixed: number) => void;
  capacity?: number;
  onCapacityChange: (newCap?: number) => void;
  currency: 'COP' | 'USD';
  target: OptimizationTarget;
  onTargetChange: (newTarget: OptimizationTarget) => void;
  constraints: OptimizationConstraints;
  onConstraintsChange: (newConstraints: OptimizationConstraints) => void;
  complementaryConfig: ComplementaryProductConfig;
  onComplementaryChange: (newConfig: ComplementaryProductConfig) => void;
  onAddCustomScenario: (price: number, name: string) => void;
  optimalPrice: number;
  periodLabel?: string;
}

export const ScenarioTable: React.FC<ScenarioTableProps> = ({
  scenarios,
  currentPrice,
  onCurrentPriceChange,
  unitCost,
  onUnitCostChange,
  fixedCosts,
  onFixedCostsChange,
  capacity,
  onCapacityChange,
  currency,
  target,
  onTargetChange,
  constraints,
  onConstraintsChange,
  complementaryConfig,
  onComplementaryChange,
  onAddCustomScenario,
  optimalPrice,
  periodLabel = 'Período',
}) => {
  const [sliderPrice, setSliderPrice] = useState<number>(currentPrice);
  const [customPriceInput, setCustomPriceInput] = useState<string>('');
  const [customNameInput, setCustomNameInput] = useState<string>('');
  const [showAdvancedSettings, setShowAdvancedSettings] = useState<boolean>(false);

  // Sync slider when currentPrice changes externally
  React.useEffect(() => {
    setSliderPrice(currentPrice);
  }, [currentPrice]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setSliderPrice(val);
    onCurrentPriceChange(val);
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseFloat(customPriceInput.replace(/,/g, '.'));
    if (!isNaN(p) && p > 0) {
      onAddCustomScenario(p, customNameInput.trim() || `P = ${formatCurrency(p, currency)}`);
      setCustomPriceInput('');
      setCustomNameInput('');
    }
  };

  const minRange = Math.max(0.1, currentPrice * 0.5);
  const maxRange = currentPrice * 1.6;

  return (
    <div className="space-y-6">
      {/* SIMULATOR CONTROLS BAR */}
      <div className="bg-white border border-[#EBE5D8] rounded-xl p-5 shadow-xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#F0ECE1]">
          <div>
            <h3 className="text-base font-bold text-[#0F1E36]">Simulador de Precios y Supuestos Económicos</h3>
            <p className="text-xs text-[#5A687D]">
              Ajuste el precio base, modifique costos o capacidad y observe la actualización inmediata
            </p>
          </div>

          <button
            onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#0F1E36] bg-[#FAF8F5] hover:bg-[#F3EFE6] border border-[#E2DDD2] rounded-lg transition-colors cursor-pointer self-start md:self-auto"
          >
            <Sliders className="w-3.5 h-3.5 text-[#0A5C5A]" />
            {showAdvancedSettings ? 'Ocultar Restricciones' : 'Restricciones y Productos Vinculados'}
          </button>
        </div>

        {/* Primary Controls Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Base Price input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#0F1E36]">
              Precio Base Editable ({currency})
            </label>
            <input
              type="number"
              step="any"
              value={currentPrice}
              onChange={e => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val) && val > 0) {
                  onCurrentPriceChange(val);
                }
              }}
              className="w-full px-3 py-2 text-sm font-mono border border-[#D5CFC2] rounded-lg bg-[#FAF8F5] focus:outline-none focus:ring-1 focus:ring-[#0A5C5A]"
            />
          </div>

          {/* Unit Cost input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#0F1E36]">
              Costo Variable Unitario ({currency})
            </label>
            <input
              type="number"
              step="any"
              value={unitCost}
              onChange={e => {
                const val = parseFloat(e.target.value);
                onUnitCostChange(!isNaN(val) && val >= 0 ? val : 0);
              }}
              className="w-full px-3 py-2 text-sm font-mono border border-[#D5CFC2] rounded-lg bg-[#FAF8F5] focus:outline-none focus:ring-1 focus:ring-[#0A5C5A]"
            />
          </div>

          {/* Capacity Limit input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#0F1E36]">
              Tope Capacidad ({periodLabel})
            </label>
            <input
              type="number"
              placeholder="Ilimitada (0)"
              value={capacity || ''}
              onChange={e => {
                const val = parseFloat(e.target.value);
                onCapacityChange(!isNaN(val) && val > 0 ? val : undefined);
              }}
              className="w-full px-3 py-2 text-sm font-mono border border-[#D5CFC2] rounded-lg bg-[#FAF8F5] focus:outline-none focus:ring-1 focus:ring-[#0A5C5A]"
            />
          </div>

          {/* Optimization Target Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#0F1E36]">
              Objetivo Comercial
            </label>
            <select
              value={target}
              onChange={e => onTargetChange(e.target.value as OptimizationTarget)}
              className="w-full px-3 py-2 text-sm border border-[#D5CFC2] rounded-lg bg-[#FAF8F5] focus:outline-none focus:ring-1 focus:ring-[#0A5C5A] cursor-pointer"
            >
              <option value="contribution">Maximizar Contribución Total</option>
              <option value="revenue">Maximizar Ingresos Brutos</option>
              <option value="profit">Maximizar Utilidad Neta (con Costos Fijos)</option>
            </select>
          </div>
        </div>

        {/* Interactive Slider */}
        <div className="p-4 bg-[#FAF8F5] rounded-xl border border-[#EDE8DD] space-y-2">
          <div className="flex items-center justify-between text-xs text-[#5A687D]">
            <span>Control Deslizante de Precio Base:</span>
            <span className="font-mono font-bold text-[#0A5C5A] text-sm">
              {formatCurrency(sliderPrice, currency)}
            </span>
          </div>
          <input
            type="range"
            min={minRange}
            max={maxRange}
            step={(maxRange - minRange) / 200}
            value={sliderPrice}
            onChange={handleSliderChange}
            className="w-full accent-[#0A5C5A] cursor-pointer"
          />
          <div className="flex items-center justify-between text-[11px] text-[#8A95A5] font-mono">
            <span>{formatCurrency(minRange, currency)}</span>
            <span>Centro: {formatCurrency(currentPrice, currency)}</span>
            <span>{formatCurrency(maxRange, currency)}</span>
          </div>
        </div>

        {/* ADVANCED DRAWER: CONSTRAINTS & COMPLEMENTARY PRODUCTS */}
        {showAdvancedSettings && (
          <div className="p-4 bg-[#F9F7F2] rounded-xl border border-[#EDE8DD] space-y-5 animate-in fade-in duration-200">
            {/* Complementary Products Module (Hugo Martínez Razors & Blades) */}
            <div className="space-y-3 pb-4 border-b border-[#E2DDD2]">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-[#0F1E36] uppercase tracking-wider">
                    Efecto de Productos Complementarios (Hugo Martínez - Maquinillas y Hojas)
                  </h4>
                  <p className="text-[11px] text-[#5A687D]">
                    Incorpora el margen generado por consumibles, repuestos o servicios vinculados a cada venta principal
                  </p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#0A5C5A]">
                  <input
                    type="checkbox"
                    checked={complementaryConfig.enabled}
                    onChange={e =>
                      onComplementaryChange({
                        ...complementaryConfig,
                        enabled: e.target.checked,
                      })
                    }
                    className="accent-[#0A5C5A] w-4 h-4 cursor-pointer"
                  />
                  Activar producto vinculado
                </label>
              </div>

              {complementaryConfig.enabled && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="space-y-1">
                    <label className="text-[11px] text-[#5A687D] font-medium">Nombre del Complementario</label>
                    <input
                      type="text"
                      value={complementaryConfig.name}
                      onChange={e =>
                        onComplementaryChange({
                          ...complementaryConfig,
                          name: e.target.value,
                        })
                      }
                      className="w-full px-2.5 py-1.5 text-xs border border-[#D5CFC2] rounded-md bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-[#5A687D] font-medium">Unidades esperadas por venta principal</label>
                    <input
                      type="number"
                      step="any"
                      value={complementaryConfig.unitsPerPrimarySale}
                      onChange={e =>
                        onComplementaryChange({
                          ...complementaryConfig,
                          unitsPerPrimarySale: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full px-2.5 py-1.5 text-xs font-mono border border-[#D5CFC2] rounded-md bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-[#5A687D] font-medium">Margen/ganancia unitaria del complementario ({currency})</label>
                    <input
                      type="number"
                      step="any"
                      value={complementaryConfig.unitMargin}
                      onChange={e =>
                        onComplementaryChange({
                          ...complementaryConfig,
                          unitMargin: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full px-2.5 py-1.5 text-xs font-mono border border-[#D5CFC2] rounded-md bg-white"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Business Constraints */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] text-[#5A687D] font-medium">Precio Mínimo Permitido</label>
                <input
                  type="number"
                  step="any"
                  value={constraints.minPrice}
                  onChange={e =>
                    onConstraintsChange({
                      ...constraints,
                      minPrice: parseFloat(e.target.value) || 0.01,
                    })
                  }
                  className="w-full px-2.5 py-1.5 text-xs font-mono border border-[#D5CFC2] rounded-md bg-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-[#5A687D] font-medium">Precio Máximo Permitido</label>
                <input
                  type="number"
                  step="any"
                  value={constraints.maxPrice}
                  onChange={e =>
                    onConstraintsChange({
                      ...constraints,
                      maxPrice: parseFloat(e.target.value) || currentPrice * 2,
                    })
                  }
                  className="w-full px-2.5 py-1.5 text-xs font-mono border border-[#D5CFC2] rounded-md bg-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-[#5A687D] font-medium">Incremento Comercial (Paso)</label>
                <input
                  type="number"
                  step="any"
                  value={constraints.step}
                  onChange={e =>
                    onConstraintsChange({
                      ...constraints,
                      step: parseFloat(e.target.value) || 0.01,
                    })
                  }
                  className="w-full px-2.5 py-1.5 text-xs font-mono border border-[#D5CFC2] rounded-md bg-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-[#5A687D] font-medium">Margen Mínimo (%)</label>
                <input
                  type="number"
                  step="any"
                  placeholder="Sin restricción"
                  value={constraints.minMarginPercent || ''}
                  onChange={e =>
                    onConstraintsChange({
                      ...constraints,
                      minMarginPercent: parseFloat(e.target.value) || undefined,
                    })
                  }
                  className="w-full px-2.5 py-1.5 text-xs font-mono border border-[#D5CFC2] rounded-md bg-white"
                />
              </div>
            </div>

            {target === 'profit' && (
              <div className="pt-2">
                <div className="space-y-1 max-w-xs">
                  <label className="text-[11px] text-[#5A687D] font-medium">Costos Fijos del Período ({currency})</label>
                  <input
                    type="number"
                    step="any"
                    value={fixedCosts}
                    onChange={e => onFixedCostsChange(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 text-xs font-mono border border-[#D5CFC2] rounded-md bg-white"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* SCENARIO COMPARISON MATRIX */}
      <div className="bg-white border border-[#EBE5D8] rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-[#F0ECE1] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-[#0F1E36]">Matriz Comparativa de Escenarios de Precio</h3>
            <p className="text-xs text-[#5A687D]">
              Demanda, unidades vendibles con restricción de capacidad, ingresos y contribución total ({periodLabel})
            </p>
          </div>

          {/* Add custom scenario input */}
          <form onSubmit={handleAddCustom} className="flex items-center gap-2 self-start sm:self-auto">
            <input
              type="text"
              placeholder="Nombre (ej. Promo)"
              value={customNameInput}
              onChange={e => setCustomNameInput(e.target.value)}
              className="px-2.5 py-1 text-xs border border-[#D5CFC2] rounded-md w-28 bg-[#FAF8F5]"
            />
            <input
              type="number"
              step="any"
              placeholder={`Precio (${currency})`}
              value={customPriceInput}
              onChange={e => setCustomPriceInput(e.target.value)}
              className="px-2.5 py-1 text-xs font-mono border border-[#D5CFC2] rounded-md w-28 bg-[#FAF8F5]"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-white bg-[#0A5C5A] hover:bg-[#074745] rounded-md transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Simular
            </button>
          </form>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#FAF8F5] text-[#5A687D] border-b border-[#EBE5D8] font-semibold">
                <th className="py-2.5 px-3">Escenario</th>
                <th className="py-2.5 px-3 text-right">Precio</th>
                <th className="py-2.5 px-3 text-right">Demanda Proy.</th>
                <th className="py-2.5 px-3 text-right">U. Vendibles</th>
                <th className="py-2.5 px-3 text-right">Ingresos</th>
                <th className="py-2.5 px-3 text-right">Contrib. Directa</th>
                {complementaryConfig.enabled && (
                  <th className="py-2.5 px-3 text-right text-[#0A5C5A]">Contrib. Vinculada</th>
                )}
                <th className="py-2.5 px-3 text-right">Contrib. Total</th>
                <th className="py-2.5 px-3 text-right">Margen %</th>
                <th className="py-2.5 px-3 text-right">Δ vs Base</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0ECE1]">
              {scenarios.map(sc => {
                const isOptimal = sc.isSuggested;
                const isBase = sc.isBase;

                return (
                  <tr
                    key={sc.id}
                    className={`hover:bg-[#FAF8F5] transition-colors ${
                      isOptimal
                        ? 'bg-[#F0F7F6] font-semibold text-[#0A5C5A]'
                        : isBase
                        ? 'bg-[#FBF9F5]'
                        : 'text-[#0F1E36]'
                    }`}
                  >
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {isOptimal && (
                          <span className="inline-block w-2 h-2 rounded-full bg-[#0A5C5A]"></span>
                        )}
                        {isBase && !isOptimal && (
                          <span className="inline-block w-2 h-2 rounded-full bg-[#C25438]"></span>
                        )}
                        <span>{sc.name}</span>
                        {sc.violatesCapacity && (
                          <span
                            title="Demanda sobrepasa capacidad. Ventas limitadas al tope físico."
                            className="text-[#D97706] cursor-help"
                          >
                            <AlertCircle className="w-3.5 h-3.5" />
                          </span>
                        )}
                        {sc.isExtrapolated && (
                          <span
                            title="Precio fuera del rango histórico observado (extrapolación)."
                            className="text-[#8A95A5] text-[10px] bg-[#EDE8DD] px-1 rounded cursor-help"
                          >
                            Extrap.
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums whitespace-nowrap font-medium">
                      {formatCurrency(sc.price, currency)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums whitespace-nowrap text-[#5A687D]">
                      {formatNumber(sc.demand, 1)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums whitespace-nowrap font-medium">
                      {formatNumber(sc.vendibleUnits, 1)}
                      {sc.violatesCapacity && <span className="text-[#D97706] text-[10px] ml-1">★</span>}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                      {formatCurrency(sc.revenue, currency)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums whitespace-nowrap text-[#5A687D]">
                      {formatCurrency(sc.contribution, currency)}
                    </td>
                    {complementaryConfig.enabled && (
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums whitespace-nowrap text-[#0A5C5A]">
                        {formatCurrency(sc.complementaryContribution, currency)}
                      </td>
                    )}
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums whitespace-nowrap font-bold">
                      {formatCurrency(sc.totalContribution, currency)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                      {sc.marginPercent.toFixed(1)} %
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                      {isBase ? (
                        <span className="text-[#8A95A5]">Base</span>
                      ) : (
                        <span
                          className={
                            sc.deltaContributionPercent >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'
                          }
                        >
                          {formatPercent(sc.deltaContributionPercent, 1)}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
