/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  Upload,
  Download,
  Printer,
  Sparkles,
  HelpCircle,
  FileSpreadsheet,
  CheckCircle,
  TrendingUp,
  BarChart3,
  Sliders,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  Layers,
} from 'lucide-react';
import {
  CleanRecord,
  ColumnMapping,
  ComplementaryProductConfig,
  DatasetDiagnosis,
  ModelType,
  OptimizationConstraints,
  OptimizationTarget,
  RawRow,
  ScenarioPoint,
} from './types/pricing';
import { CASE_STUDIES } from './data/caseStudies';
import { cleanAndDiagnoseData } from './utils/dataEngine';
import {
  computeOptimumSensitivity,
  estimateDemandModel,
  simulateAndOptimize,
} from './utils/econometricEngine';
import { DecisionCard } from './components/DecisionCard';
import { PricingCharts } from './components/PricingCharts';
import { OptimumSensitivityTornado } from './components/OptimumSensitivityTornado';
import { ScenarioTable } from './components/ScenarioTable';
import { DiagnosticPanel } from './components/DiagnosticPanel';
import { DataImportModal } from './components/DataImportModal';
import { CalculationModal } from './components/CalculationModal';
import { MethodologyModal } from './components/MethodologyModal';
import { ExecutiveReportPrint } from './components/ExecutiveReportPrint';

export default function App() {
  // Navigation / View State
  const [activeTab, setActiveTab] = useState<'simulator' | 'diagnosis' | 'cases'>('simulator');
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [isCalcModalOpen, setIsCalcModalOpen] = useState<boolean>(false);
  const [isMethodologyOpen, setIsMethodologyOpen] = useState<boolean>(false);

  // Active dataset state (defaults to preloaded ChapStick class case from Hugo Martinez)
  const [selectedCaseId, setSelectedCaseId] = useState<string>('chapstick_class');
  const [fileName, setFileName] = useState<string>('Caso_ChapStick_Hugo_Martinez.csv');
  const [activeProduct, setActiveProduct] = useState<string>('Bálsamo Labial ChapStick');
  const [currency, setCurrency] = useState<'COP' | 'USD'>('USD');

  // Economic Assumptions
  const [currentPrice, setCurrentPrice] = useState<number>(2.0);
  const [unitCost, setUnitCost] = useState<number>(0.9);
  const [fixedCosts, setFixedCosts] = useState<number>(0);
  const [capacity, setCapacity] = useState<number | undefined>(undefined);
  const [optimizationTarget, setOptimizationTarget] = useState<OptimizationTarget>('contribution');
  const [selectedModelType, setSelectedModelType] = useState<ModelType>('quadratic_3p');
  const [economicMetric, setEconomicMetric] = useState<OptimizationTarget>('contribution');
  const [sensitivityVariationPct, setSensitivityVariationPct] = useState<number>(10);

  // Complementary Product Config
  const [complementaryConfig, setComplementaryConfig] = useState<ComplementaryProductConfig>({
    enabled: false,
    name: 'Cartucho de 50 Hojas de Afeitar',
    unitsPerPrimarySale: 50,
    unitMargin: 0.15,
  });

  // Constraints
  const [constraints, setConstraints] = useState<OptimizationConstraints>({
    minPrice: 1.0,
    maxPrice: 3.5,
    step: 0.01,
  });

  // Raw dataset records (from user upload or preloaded case)
  const [rawRecords, setRawRecords] = useState<CleanRecord[]>(() => {
    const initialCase = CASE_STUDIES[0];
    return (initialCase.dataPoints || []).map((pt, i) => ({
      id: `INIT-${i + 1}`,
      product: initialCase.productName,
      period: pt.period || `Semana ${i + 1}`,
      price: pt.price,
      quantity: pt.quantity,
      revenue: pt.price * pt.quantity,
      unitCost: initialCase.unitCost,
    }));
  });

  const [diagnosis, setDiagnosis] = useState<DatasetDiagnosis>(() => {
    const initialCase = CASE_STUDIES[0];
    const prices = initialCase.dataPoints?.map(p => p.price) || [1.5, 2.0, 2.5];
    return {
      totalRows: 3,
      usableRows: 3,
      removedRows: 0,
      granularity: 'period_summary',
      productsFound: [initialCase.productName],
      periodsCount: 3,
      uniquePricesCount: 3,
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
      avgPrice: 2.0,
      totalQuantity: 131,
      totalRevenue: 242,
      hasUnitCost: true,
      hasCapacity: false,
      hasDates: true,
      enabledModels: ['quadratic_3p', 'arc', 'linear'],
      recommendedModel: 'quadratic_3p',
      recommendationReason: 'Ejercicio resuelto de la clase (Hugo Martínez): 3 puntos de demanda evaluados.',
      warnings: [],
    };
  });

  const [auditLog, setAuditLog] = useState<any[]>([
    {
      id: 'LOG-001',
      timestamp: '10:00:00',
      rule: 'Carga de Caso Preestablecido',
      affectedRows: 3,
      effect: 'Valores oficiales del caso ChapStick (Hugo Martínez).',
    },
  ]);

  // Custom user scenarios
  const [customScenarios, setCustomScenarios] = useState<Array<{ price: number; name: string }>>([]);

  // Load a built-in case study
  const handleLoadCaseStudy = (caseId: string) => {
    const found = CASE_STUDIES.find(c => c.id === caseId);
    if (!found) return;

    setSelectedCaseId(found.id);
    setFileName(`${found.id}.csv`);
    setActiveProduct(found.productName);
    setUnitCost(found.unitCost);
    setCurrentPrice(found.defaultPrice);
    setCapacity(found.capacity);
    setFixedCosts(found.fixedCosts || 0);
    setSelectedModelType(found.recommendedModel);

    // Currency setup
    if (found.id.includes('coffee') || found.id.includes('clinic')) {
      setCurrency('COP');
    } else {
      setCurrency('USD');
    }

    // Constraints setup
    const points = found.dataPoints || [];
    const prices = points.map(p => p.price);
    const minP = Math.max(0.01, Math.min(...prices) * 0.7);
    const maxP = Math.max(...prices) * 1.4;
    setConstraints({
      minPrice: minP,
      maxPrice: maxP,
      step: found.id.includes('coffee') || found.id.includes('clinic') ? 100 : 0.01,
      maxCapacity: found.capacity,
    });

    if (found.complementaryConfig) {
      setComplementaryConfig(found.complementaryConfig);
    } else {
      setComplementaryConfig({
        enabled: false,
        name: 'Producto Complementario',
        unitsPerPrimarySale: 1,
        unitMargin: 0,
      });
    }

    // Build raw records
    const cleanPts: CleanRecord[] = points.map((p, idx) => ({
      id: `CASE-${idx + 1}`,
      product: found.productName,
      period: p.period || `Período ${idx + 1}`,
      price: p.price,
      quantity: p.quantity,
      revenue: p.price * p.quantity,
      unitCost: found.unitCost,
      capacity: found.capacity,
    }));

    setRawRecords(cleanPts);
    setCustomScenarios([]);

    // Diagnosis
    setDiagnosis({
      totalRows: cleanPts.length,
      usableRows: cleanPts.length,
      removedRows: 0,
      granularity: found.recommendedModel === 'wtp_survey' ? 'survey_response' : 'period_summary',
      productsFound: [found.productName],
      periodsCount: cleanPts.length,
      uniquePricesCount: new Set(cleanPts.map(p => p.price)).size,
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
      avgPrice: prices.reduce((a, b) => a + b, 0) / prices.length,
      totalQuantity: cleanPts.reduce((a, b) => a + b.quantity, 0),
      totalRevenue: cleanPts.reduce((a, b) => a + b.revenue, 0),
      hasUnitCost: found.unitCost > 0,
      hasCapacity: !!found.capacity,
      hasDates: true,
      enabledModels: [found.recommendedModel, 'linear', 'arc'].filter((v, i, a) => a.indexOf(v) === i) as ModelType[],
      recommendedModel: found.recommendedModel,
      recommendationReason: found.context,
      warnings: [],
    });

    setAuditLog([
      {
        id: 'LOG-001',
        timestamp: new Date().toLocaleTimeString('es-CO'),
        rule: 'Carga de Caso Preestablecido',
        affectedRows: cleanPts.length,
        effect: `Se cargó "${found.title}" con ${cleanPts.length} observaciones y supuestos iniciales.`,
      },
    ]);

    setActiveTab('simulator');
  };

  // User upload handler
  const handleDataLoaded = (
    rows: RawRow[],
    mapping: ColumnMapping,
    options: {
      singleProductName?: string;
      preferDotAsThousands: boolean;
      fileName: string;
    }
  ) => {
    const cleaned = cleanAndDiagnoseData(rows, mapping, {
      singleProductName: options.singleProductName,
      preferDotAsThousands: options.preferDotAsThousands,
      defaultUnitCost: unitCost,
      defaultCapacity: capacity,
    });

    setRawRecords(cleaned.aggregatedRecords);
    setAuditLog(cleaned.auditLog);
    setDiagnosis(cleaned.diagnosis);
    setFileName(options.fileName);

    const firstProduct = cleaned.diagnosis.productsFound[0] || 'Producto Principal';
    setActiveProduct(firstProduct);

    // Auto-detect currency
    if (cleaned.diagnosis.avgPrice > 500) {
      setCurrency('COP');
    } else {
      setCurrency('USD');
    }

    // Set prices and constraints
    const prices = cleaned.aggregatedRecords.map(r => r.price);
    const minP = prices.length > 0 ? Math.min(...prices) : 10;
    const maxP = prices.length > 0 ? Math.max(...prices) : 100;
    const avgP = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 50;

    setCurrentPrice(Math.round(avgP * 100) / 100);
    setConstraints({
      minPrice: Math.max(0.01, Math.round(minP * 0.7 * 100) / 100),
      maxPrice: Math.round((maxP * 1.4 * 100)) / 100,
      step: cleaned.diagnosis.avgPrice > 500 ? 100 : 0.01,
      maxCapacity: capacity,
    });

    setSelectedModelType(cleaned.diagnosis.recommendedModel);
    setCustomScenarios([]);
    setSelectedCaseId('');
    setActiveTab('simulator');
  };

  // Filter records by active product
  const activeProductRecords = useMemo(() => {
    return rawRecords.filter(r => r.product === activeProduct);
  }, [rawRecords, activeProduct]);

  // Estimate Econometric Demand Model
  const demandModel = useMemo(() => {
    const records = activeProductRecords.length > 0 ? activeProductRecords : rawRecords;
    return estimateDemandModel(records, selectedModelType, currentPrice);
  }, [activeProductRecords, rawRecords, selectedModelType, currentPrice]);

  // Simulate Scenarios and Solve Optimum
  const simulation = useMemo(() => {
    const activeConstraints = {
      ...constraints,
      maxCapacity: capacity,
      fixedCosts,
    };
    const result = simulateAndOptimize(
      demandModel,
      currentPrice,
      unitCost,
      optimizationTarget,
      activeConstraints,
      complementaryConfig
    );

    // Append custom scenarios if any
    if (customScenarios.length > 0) {
      customScenarios.forEach((cs, idx) => {
        const rawDemand = demandModel.predictQuantity(cs.price);
        const vendible = capacity && capacity > 0 ? Math.min(rawDemand, capacity) : rawDemand;
        const revenue = cs.price * vendible;
        const varCost = unitCost * vendible;
        const directContrib = (cs.price - unitCost) * vendible;
        const compContrib =
          complementaryConfig.enabled
            ? vendible * complementaryConfig.unitsPerPrimarySale * complementaryConfig.unitMargin
            : 0;
        const totalContrib = directContrib + compContrib;
        const baseRev = result.optimization.currentRevenue;
        const baseContrib = result.optimization.currentContribution;

        result.scenarios.push({
          id: `custom_${idx}`,
          name: cs.name,
          price: cs.price,
          demand: rawDemand,
          vendibleUnits: vendible,
          revenue,
          variableCosts: varCost,
          contribution: directContrib,
          complementaryContribution: compContrib,
          totalContribution: totalContrib,
          fixedCosts,
          netProfit: totalContrib - fixedCosts,
          marginPercent: cs.price > 0 ? ((cs.price - unitCost) / cs.price) * 100 : 0,
          deltaRevenuePercent: baseRev > 0 ? ((revenue - baseRev) / baseRev) * 100 : 0,
          deltaContributionPercent: baseContrib > 0 ? ((totalContrib - baseContrib) / baseContrib) * 100 : 0,
          isExtrapolated: cs.price < demandModel.validRange.min || cs.price > demandModel.validRange.max,
          violatesCapacity: capacity !== undefined && rawDemand > capacity,
        });
      });
      result.scenarios.sort((a, b) => a.price - b.price);
    }

    return result;
  }, [
    demandModel,
    currentPrice,
    unitCost,
    optimizationTarget,
    constraints,
    capacity,
    fixedCosts,
    complementaryConfig,
    customScenarios,
  ]);

  // Optimum Sensitivity Analysis (+/- 10% by default on unit cost and production capacity)
  const optimumSensitivity = useMemo(() => {
    const activeConstraints = {
      ...constraints,
      maxCapacity: capacity,
      fixedCosts,
    };
    return computeOptimumSensitivity(
      demandModel,
      currentPrice,
      unitCost,
      optimizationTarget,
      activeConstraints,
      complementaryConfig,
      sensitivityVariationPct
    );
  }, [
    demandModel,
    currentPrice,
    unitCost,
    optimizationTarget,
    constraints,
    capacity,
    fixedCosts,
    complementaryConfig,
    sensitivityVariationPct,
  ]);

  const handleAddCustomScenario = (price: number, name: string) => {
    setCustomScenarios(prev => [...prev, { price, name }]);
  };

  // Export cleaned dataset as CSV
  const handleExportCleanCsv = () => {
    let csv = `id;producto;periodo;precio;cantidad;ingreso_neto;costo_unitario;capacidad\n`;
    rawRecords.forEach(r => {
      csv += `${r.id};${r.product};${r.period};${r.price};${r.quantity};${r.revenue};${r.unitCost || ''};${r.capacity || ''}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `base_depurada_${fileName.replace(/\.[^/.]+$/, '')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export scenarios as CSV
  const handleExportScenariosCsv = () => {
    let csv = `escenario;precio;demanda_estimada;unidades_vendibles;ingresos;contribucion_directa;contribucion_vinculada;contribucion_total;margen_porcentaje;delta_vs_base\n`;
    simulation.scenarios.forEach(s => {
      csv += `${s.name};${s.price};${s.demand.toFixed(2)};${s.vendibleUnits.toFixed(2)};${s.revenue.toFixed(2)};${s.contribution.toFixed(2)};${s.complementaryContribution.toFixed(2)};${s.totalContribution.toFixed(2)};${s.marginPercent.toFixed(1)}%;${s.deltaContributionPercent.toFixed(1)}%\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `simulacion_escenarios_${activeProduct.replace(/\s+/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] text-[#0F1E36]">
      {/* PRINT-ONLY EXECUTIVE MEMORANDUM */}
      <ExecutiveReportPrint
        productName={activeProduct}
        optimization={simulation.optimization}
        model={demandModel}
        scenarios={simulation.scenarios}
        unitCost={unitCost}
        capacity={capacity}
        currency={currency}
        fileName={fileName}
        sensitivity={optimumSensitivity}
      />

      {/* TOP BAR CONTRACT: Zone 1 (Wordmark) - Zone 2 (4-5 Nav Links) - Zone 3 (1 Primary Action) */}
      <header className="no-print border-b border-[#EBE5D8] bg-[#FAF8F5]/90 backdrop-blur-md sticky top-0 z-40 px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-8">
          {/* Zone 1: Single text element wordmark */}
          <div className="flex items-center gap-2 whitespace-nowrap shrink-0">
            <span className="text-lg font-bold tracking-tight text-[#0F1E36]">
              Laboratorio de Precios
            </span>
            <span className="text-xs text-[#0A5C5A] font-semibold tracking-wide">
              | Zoraya Forero
            </span>
          </div>

          {/* Zone 2: 4-5 clean single-line nav links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-[#5A687D]">
            <button
              onClick={() => setActiveTab('simulator')}
              className={`hover:text-[#0F1E36] transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'simulator' ? 'text-[#0A5C5A] border-b-2 border-[#0A5C5A] pb-1' : ''
              }`}
            >
              Simulador & Solver
            </button>
            <button
              onClick={() => setActiveTab('diagnosis')}
              className={`hover:text-[#0F1E36] transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'diagnosis' ? 'text-[#0A5C5A] border-b-2 border-[#0A5C5A] pb-1' : ''
              }`}
            >
              Diagnóstico & Datos ({diagnosis.usableRows})
            </button>
            <button
              onClick={() => setActiveTab('cases')}
              className={`hover:text-[#0F1E36] transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'cases' ? 'text-[#0A5C5A] border-b-2 border-[#0A5C5A] pb-1' : ''
              }`}
            >
              Casos de Clase & Demos
            </button>
            <button
              onClick={() => setIsMethodologyOpen(true)}
              className="hover:text-[#0F1E36] transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1"
            >
              <BookOpen className="w-3.5 h-3.5 text-[#0A5C5A]" />
              Metodología
            </button>
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#0A5C5A] hover:bg-[#074745] rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              Cargar Archivo Propio
            </button>
          </div>
        </div>
      </header>

      {/* SUB-HEADER / PRODUCT CONTEXT STRIP */}
      <div className="no-print bg-[#F3EFE6] border-b border-[#E2DDD2] px-6 py-2.5 text-xs text-[#5A687D]">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-[#0F1E36]">Base Activa:</span>
            <span className="font-mono text-[#0F1E36] bg-white px-2 py-0.5 rounded border border-[#D5CFC2]">
              {fileName}
            </span>

            {/* Product Switcher if multiple products exist */}
            {diagnosis.productsFound.length > 1 && (
              <div className="flex items-center gap-1.5 ml-2">
                <span className="text-[#5A687D]">Producto:</span>
                <select
                  value={activeProduct}
                  onChange={e => setActiveProduct(e.target.value)}
                  className="bg-white px-2 py-0.5 rounded border border-[#D5CFC2] text-[#0F1E36] font-medium"
                >
                  {diagnosis.productsFound.map(p => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Quick Exports Strip */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCleanCsv}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-[#0F1E36] hover:text-[#0A5C5A] px-2 py-1 rounded hover:bg-white transition-colors cursor-pointer"
              title="Descargar base limpia como CSV"
            >
              <Download className="w-3 h-3 text-[#0A5C5A]" />
              Base Depurada
            </button>
            <span className="text-[#D5CFC2]">|</span>
            <button
              onClick={handleExportScenariosCsv}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-[#0F1E36] hover:text-[#0A5C5A] px-2 py-1 rounded hover:bg-white transition-colors cursor-pointer"
              title="Descargar matriz de escenarios evaluados"
            >
              <Download className="w-3 h-3 text-[#0A5C5A]" />
              Escenarios (.csv)
            </button>
            <span className="text-[#D5CFC2]">|</span>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0A5C5A] bg-white px-2.5 py-1 rounded border border-[#D5CFC2] hover:bg-[#FAF8F5] transition-colors cursor-pointer shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimir Informe Ejecutivo
            </button>
          </div>
        </div>
      </div>

      {/* MAIN VIEWPORT */}
      <main className="no-print flex-1 max-w-7xl w-full mx-auto p-6 space-y-8">
        {/* THREE INITIAL HERO ENTRY ACTIONS (Requirement 2) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Action 1: Historical Sales */}
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="p-5 text-left bg-white border border-[#EBE5D8] hover:border-[#0A5C5A] rounded-xl transition-all shadow-xs group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-[#E8F2F1] text-[#0A5C5A] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-[#0F1E36] mb-1 flex items-center justify-between">
              Analizar mi historial de ventas
              <ArrowRight className="w-4 h-4 text-[#8A95A5] group-hover:text-[#0A5C5A] transition-colors" />
            </h3>
            <p className="text-xs text-[#5A687D] leading-relaxed">
              Cargue ventas, tarifas, reservas, consultas o suscripciones en CSV, Excel o tabla pegada para estimar la elasticidad real.
            </p>
          </button>

          {/* Action 2: New Product / WTP */}
          <button
            onClick={() => handleLoadCaseStudy('wtp_survey_demo')}
            className="p-5 text-left bg-white border border-[#EBE5D8] hover:border-[#0A5C5A] rounded-xl transition-all shadow-xs group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-[#E8F2F1] text-[#0A5C5A] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-[#0F1E36] mb-1 flex items-center justify-between">
              Evaluar un producto o servicio nuevo
              <ArrowRight className="w-4 h-4 text-[#8A95A5] group-hover:text-[#0A5C5A] transition-colors" />
            </h3>
            <p className="text-xs text-[#5A687D] leading-relaxed">
              Encuesta de disposición a pagar (WTP) o simulación de 3 combinaciones de precio y demanda esperada (método subjetivo).
            </p>
          </button>

          {/* Action 3: Class Case */}
          <button
            onClick={() => handleLoadCaseStudy('chapstick_class')}
            className="p-5 text-left bg-white border border-[#EBE5D8] hover:border-[#0A5C5A] rounded-xl transition-all shadow-xs group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-[#E8F2F1] text-[#0A5C5A] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-[#0F1E36] mb-1 flex items-center justify-between">
              Probar con el caso de clase
              <ArrowRight className="w-4 h-4 text-[#8A95A5] group-hover:text-[#0A5C5A] transition-colors" />
            </h3>
            <p className="text-xs text-[#5A687D] leading-relaxed">
              Caso ChapStick de Hugo Martínez: 3 puntos, optimización paso a paso con Solver (óptimo $2.04) y maquinillas complementarias.
            </p>
          </button>
        </div>

        {/* TAB CONTENT */}
        {activeTab === 'simulator' && (
          <div className="space-y-8">
            {/* 1. LA DECISIÓN (Requirement E.1) */}
            <DecisionCard
              productName={activeProduct}
              optimization={simulation.optimization}
              model={demandModel}
              target={optimizationTarget}
              currency={currency}
              unitCost={unitCost}
              capacity={capacity}
              onOpenHowItWasCalculated={() => setIsCalcModalOpen(true)}
            />

            {/* 2. LA EVIDENCIA (Requirement E.2 - Two Connected Charts) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-[#5A687D] uppercase tracking-wider">
                    2. La Evidencia Analítica
                  </h3>
                  <p className="text-sm font-semibold text-[#0F1E36]">
                    Curvas conectadas de Demanda y Retorno Económico
                  </p>
                </div>
                <div className="text-xs text-[#5A687D]">
                  Pasa el cursor sobre los gráficos para inspeccionar valores puntuales
                </div>
              </div>

              <PricingCharts
                records={activeProductRecords.length > 0 ? activeProductRecords : rawRecords}
                model={demandModel}
                optimization={simulation.optimization}
                unitCost={unitCost}
                capacity={capacity}
                currency={currency}
                economicMetric={economicMetric}
                onMetricChange={setEconomicMetric}
                complementaryMarginPerUnit={
                  complementaryConfig.enabled
                    ? complementaryConfig.unitsPerPrimarySale * complementaryConfig.unitMargin
                    : 0
                }
              />

              {/* SENSIBILIDAD DEL ÓPTIMO (TORNADO) */}
              <OptimumSensitivityTornado
                sensitivity={optimumSensitivity}
                currency={currency}
                variationPercent={sensitivityVariationPct}
                onVariationPercentChange={setSensitivityVariationPct}
                optimalDemand={simulation.optimization.optimalDemand}
                onApplyReferenceCapacity={cap => setCapacity(cap)}
                onApplyReferenceCost={cost => setUnitCost(cost)}
                currentPrice={currentPrice}
              />
            </div>

            {/* 3. SIMULACIÓN Y SUPUESTOS (Requirement D) */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-[#5A687D] uppercase tracking-wider">
                3. Simulación de Escenarios y Optimización
              </h3>
              <ScenarioTable
                scenarios={simulation.scenarios}
                currentPrice={currentPrice}
                onCurrentPriceChange={setCurrentPrice}
                unitCost={unitCost}
                onUnitCostChange={setUnitCost}
                fixedCosts={fixedCosts}
                onFixedCostsChange={setFixedCosts}
                capacity={capacity}
                onCapacityChange={setCapacity}
                currency={currency}
                target={optimizationTarget}
                onTargetChange={setOptimizationTarget}
                constraints={constraints}
                onConstraintsChange={setConstraints}
                complementaryConfig={complementaryConfig}
                onComplementaryChange={setComplementaryConfig}
                onAddCustomScenario={handleAddCustomScenario}
                optimalPrice={simulation.optimization.optimalPrice}
                periodLabel={diagnosis.granularity === 'survey_response' ? 'Mercado' : 'Semanal'}
              />
            </div>
          </div>
        )}

        {activeTab === 'diagnosis' && (
          <div className="space-y-6">
            <DiagnosticPanel
              diagnosis={diagnosis}
              auditLog={auditLog}
              currency={currency}
              onSelectModel={setSelectedModelType}
              selectedModel={selectedModelType}
              fileName={fileName}
            />
          </div>
        )}

        {activeTab === 'cases' && (
          <div className="space-y-6">
            <div className="bg-white border border-[#EBE5D8] rounded-xl p-6 shadow-xs">
              <h2 className="text-lg font-bold text-[#0F1E36] mb-1">
                Catálogo de Ejercicios y Casos de Prueba
              </h2>
              <p className="text-xs text-[#5A687D] max-w-2xl">
                Seleccione cualquiera de los casos para precargar sus supuestos y datos. Todos pasan exactamente por el mismo motor de estimación, simulación y optimización que sus bases propias.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {CASE_STUDIES.map(cs => {
                const isSelected = selectedCaseId === cs.id;
                return (
                  <div
                    key={cs.id}
                    className={`bg-white border rounded-xl p-5 shadow-xs flex flex-col justify-between transition-all ${
                      isSelected ? 'border-[#0A5C5A] ring-1 ring-[#0A5C5A]' : 'border-[#EBE5D8] hover:border-[#D5CFC2]'
                    }`}
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-[#0A5C5A]">{cs.category}</span>
                        {isSelected && (
                          <span className="text-[10px] bg-[#E8F2F1] text-[#0A5C5A] font-semibold px-2 py-0.5 rounded">
                            Activo
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-bold text-[#0F1E36] leading-snug">{cs.title}</h3>
                      <p className="text-xs text-[#5A687D] leading-relaxed">{cs.context}</p>

                      {cs.theoreticalOptimal && (
                        <div className="p-2.5 bg-[#FAF8F5] rounded-lg border border-[#EDE8DD] text-[11px] font-mono text-[#0F1E36] space-y-0.5">
                          <div>
                            Óptimo Teórico: P* = ${cs.theoreticalOptimal.price.toFixed(2)}
                          </div>
                          <div>
                            Demanda: {cs.theoreticalOptimal.demand} u. · Ganancia: ${cs.theoreticalOptimal.profit.toFixed(2)}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="pt-4 mt-4 border-t border-[#F0ECE1]">
                      <button
                        onClick={() => handleLoadCaseStudy(cs.id)}
                        className={`w-full py-2 px-3 text-xs font-semibold rounded-lg transition-colors cursor-pointer text-center ${
                          isSelected
                            ? 'bg-[#E8F2F1] text-[#0A5C5A]'
                            : 'bg-[#0A5C5A] text-white hover:bg-[#074745]'
                        }`}
                      >
                        {isSelected ? 'Caso Cargado' : 'Cargar este Caso'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="no-print border-t border-[#EBE5D8] bg-white py-6 px-6 text-xs text-[#5A687D] mt-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#0F1E36]">Laboratorio de Precios</span>
            <span>·</span>
            <span>Zoraya Forero, Economista</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <button onClick={() => setIsMethodologyOpen(true)} className="hover:text-[#0F1E36] underline cursor-pointer">
              Fuentes Académicas
            </button>
            <span>·</span>
            <button onClick={() => setIsCalcModalOpen(true)} className="hover:text-[#0F1E36] underline cursor-pointer">
              Memoria de Cálculo
            </button>
            <span>·</span>
            <button onClick={handlePrint} className="hover:text-[#0F1E36] underline cursor-pointer">
              Imprimir Informe
            </button>
          </div>
        </div>
      </footer>

      {/* MODALS */}
      <DataImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onDataLoaded={handleDataLoaded}
      />

      <CalculationModal
        isOpen={isCalcModalOpen}
        onClose={() => setIsCalcModalOpen(false)}
        model={demandModel}
        optimization={simulation.optimization}
        unitCost={unitCost}
        capacity={capacity}
        currency={currency}
        target={optimizationTarget}
        complementaryMarginPerUnit={
          complementaryConfig.enabled
            ? complementaryConfig.unitsPerPrimarySale * complementaryConfig.unitMargin
            : 0
        }
      />

      <MethodologyModal
        isOpen={isMethodologyOpen}
        onClose={() => setIsMethodologyOpen(false)}
      />
    </div>
  );
}
