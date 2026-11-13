/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Download,
  Info,
  Layers,
  FileCheck2,
  Calendar,
  DollarSign,
  TrendingUp,
} from 'lucide-react';
import { AuditLogItem, DatasetDiagnosis, ModelType } from '../types/pricing';
import { formatCurrency, formatNumber } from '../utils/numberFormat';

interface DiagnosticPanelProps {
  diagnosis: DatasetDiagnosis;
  auditLog: AuditLogItem[];
  currency: 'COP' | 'USD';
  onSelectModel: (model: ModelType) => void;
  selectedModel: ModelType;
  fileName: string;
}

export const DiagnosticPanel: React.FC<DiagnosticPanelProps> = ({
  diagnosis,
  auditLog,
  currency,
  onSelectModel,
  selectedModel,
  fileName,
}) => {
  const downloadAuditLog = () => {
    let content = `BITÁCORA DE TRANSFORMACIONES Y DIAGNÓSTICO DE DATOS\n`;
    content += `Laboratorio de Precios | Zoraya Forero\n`;
    content += `Archivo analizado: ${fileName}\n`;
    content += `Fecha de ejecución: ${new Date().toLocaleString('es-CO')}\n\n`;
    content += `RESUMEN DE DIAGNÓSTICO:\n`;
    content += `- Total filas recibidas: ${diagnosis.totalRows}\n`;
    content += `- Filas depuradas utilizables: ${diagnosis.usableRows}\n`;
    content += `- Granularidad detectada: ${diagnosis.granularity}\n`;
    content += `- Períodos analizados: ${diagnosis.periodsCount}\n`;
    content += `- Precios distintos: ${diagnosis.uniquePricesCount} (Rango: ${diagnosis.minPrice} a ${diagnosis.maxPrice})\n`;
    content += `- Unidades totales observadas: ${diagnosis.totalQuantity}\n`;
    content += `- Modelo recomendado: ${diagnosis.recommendedModel} (${diagnosis.recommendationReason})\n\n`;
    content += `REGLAS DE DEPURACIÓN APLICADAS:\n`;
    content += `ID\tHora\tRegla Aplicada\tRegistros Afectados\tEfecto Económico\n`;

    auditLog.forEach(log => {
      content += `${log.id}\t${log.timestamp}\t${log.rule}\t${log.affectedRows}\t${log.effect}\n`;
    });

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bitacora_depuracion_${fileName.replace(/\.[^/.]+$/, '')}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const granularityLabels = {
    transaction: 'Transacciones individuales (agregadas por período)',
    period_summary: 'Resumen periódico consolidado (1 fila por período)',
    catalog: 'Catálogo de productos (precios de lista)',
    survey_response: 'Encuesta de disposición a pagar (WTP)',
  };

  return (
    <div className="space-y-6">
      {/* High-level status cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Card 1: Records */}
        <div className="bg-white p-4 rounded-xl border border-[#EBE5D8] shadow-xs">
          <div className="flex items-center justify-between text-[#5A687D] mb-1">
            <span className="text-xs">Registros Útiles</span>
            <FileCheck2 className="w-4 h-4 text-[#0A5C5A]" />
          </div>
          <div className="text-xl font-bold text-[#0F1E36] font-mono tabular-nums">
            {formatNumber(diagnosis.usableRows, 0)}
          </div>
          <span className="text-[11px] text-[#8A95A5] block mt-1">
            De {formatNumber(diagnosis.totalRows, 0)} filas recibidas ({diagnosis.removedRows} descartadas)
          </span>
        </div>

        {/* Card 2: Periods */}
        <div className="bg-white p-4 rounded-xl border border-[#EBE5D8] shadow-xs">
          <div className="flex items-center justify-between text-[#5A687D] mb-1">
            <span className="text-xs">Períodos Observados</span>
            <Calendar className="w-4 h-4 text-[#0A5C5A]" />
          </div>
          <div className="text-xl font-bold text-[#0F1E36] font-mono tabular-nums">
            {diagnosis.periodsCount}
          </div>
          <span className="text-[11px] text-[#8A95A5] block mt-1">
            {diagnosis.granularity === 'transaction' ? 'Agregados semanal/mensual' : 'Períodos directos'}
          </span>
        </div>

        {/* Card 3: Price Points */}
        <div className="bg-white p-4 rounded-xl border border-[#EBE5D8] shadow-xs">
          <div className="flex items-center justify-between text-[#5A687D] mb-1">
            <span className="text-xs">Precios Distintos</span>
            <DollarSign className="w-4 h-4 text-[#0A5C5A]" />
          </div>
          <div className="text-xl font-bold text-[#0F1E36] font-mono tabular-nums">
            {diagnosis.uniquePricesCount}
          </div>
          <span className="text-[11px] text-[#8A95A5] block mt-1">
            Rango: {formatCurrency(diagnosis.minPrice, currency)} - {formatCurrency(diagnosis.maxPrice, currency)}
          </span>
        </div>

        {/* Card 4: Granularity */}
        <div className="bg-white p-4 rounded-xl border border-[#EBE5D8] shadow-xs">
          <div className="flex items-center justify-between text-[#5A687D] mb-1">
            <span className="text-xs">Granularidad Base</span>
            <Layers className="w-4 h-4 text-[#0A5C5A]" />
          </div>
          <div className="text-sm font-bold text-[#0F1E36] truncate" title={granularityLabels[diagnosis.granularity]}>
            {diagnosis.granularity === 'transaction'
              ? 'Transaccional'
              : diagnosis.granularity === 'period_summary'
              ? 'Resumen Período'
              : diagnosis.granularity === 'survey_response'
              ? 'Encuesta WTP'
              : 'Catálogo'}
          </div>
          <span className="text-[11px] text-[#8A95A5] block mt-1 truncate">
            {granularityLabels[diagnosis.granularity]}
          </span>
        </div>
      </div>

      {/* Recommendation banner & method picker */}
      <div className="bg-[#FAF8F5] border border-[#E2DDD2] rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#EBE5D8]">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#0A5C5A]" />
            <h3 className="text-sm font-bold text-[#0F1E36]">
              Método Econométrico Recomendado
            </h3>
          </div>

          <button
            onClick={() => onSelectModel(diagnosis.recommendedModel)}
            className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-[#0A5C5A] bg-[#E8F2F1] hover:bg-[#D5E8E6] rounded-md transition-colors cursor-pointer self-start md:self-auto"
          >
            Usar método recomendado
          </button>
        </div>

        <p className="text-xs text-[#0F1E36] leading-relaxed">
          {diagnosis.recommendationReason}
        </p>

        {/* Method selector tabs */}
        <div className="space-y-2">
          <span className="text-xs font-semibold text-[#5A687D] block">
            Seleccionar Método de Estimación:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
            {/* Linear */}
            <button
              onClick={() => onSelectModel('linear')}
              disabled={!diagnosis.enabledModels.includes('linear')}
              className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                selectedModel === 'linear'
                  ? 'border-[#0A5C5A] bg-[#F0F7F6] text-[#0A5C5A] shadow-xs'
                  : !diagnosis.enabledModels.includes('linear')
                  ? 'opacity-40 border-[#EBE5D8] bg-white cursor-not-allowed'
                  : 'border-[#EBE5D8] bg-white text-[#0F1E36] hover:border-[#D5CFC2]'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold">Demanda Lineal</span>
                {selectedModel === 'linear' && <CheckCircle2 className="w-3.5 h-3.5 text-[#0A5C5A]" />}
              </div>
              <span className="text-[11px] block font-mono text-[#5A687D]">Q = a + b·P</span>
              <span className="text-[10px] text-[#8A95A5] block mt-1">Historial periódico con variación</span>
            </button>

            {/* Power */}
            <button
              onClick={() => onSelectModel('power')}
              disabled={!diagnosis.enabledModels.includes('power')}
              className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                selectedModel === 'power'
                  ? 'border-[#0A5C5A] bg-[#F0F7F6] text-[#0A5C5A] shadow-xs'
                  : !diagnosis.enabledModels.includes('power')
                  ? 'opacity-40 border-[#EBE5D8] bg-white cursor-not-allowed'
                  : 'border-[#EBE5D8] bg-white text-[#0F1E36] hover:border-[#D5CFC2]'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold">Demanda de Potencia</span>
                {selectedModel === 'power' && <CheckCircle2 className="w-3.5 h-3.5 text-[#0A5C5A]" />}
              </div>
              <span className="text-[11px] block font-mono text-[#5A687D]">ln(Q) = a + b·ln(P)</span>
              <span className="text-[10px] text-[#8A95A5] block mt-1">Elasticidad constante log-log</span>
            </button>

            {/* Quadratic 3-points */}
            <button
              onClick={() => onSelectModel('quadratic_3p')}
              disabled={!diagnosis.enabledModels.includes('quadratic_3p')}
              className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                selectedModel === 'quadratic_3p'
                  ? 'border-[#0A5C5A] bg-[#F0F7F6] text-[#0A5C5A] shadow-xs'
                  : !diagnosis.enabledModels.includes('quadratic_3p')
                  ? 'opacity-40 border-[#EBE5D8] bg-white cursor-not-allowed'
                  : 'border-[#EBE5D8] bg-white text-[#0F1E36] hover:border-[#D5CFC2]'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold">Curva Cuadrática 3P</span>
                {selectedModel === 'quadratic_3p' && <CheckCircle2 className="w-3.5 h-3.5 text-[#0A5C5A]" />}
              </div>
              <span className="text-[11px] block font-mono text-[#5A687D]">Q = aP² + bP + c</span>
              <span className="text-[10px] text-[#8A95A5] block mt-1">Caso ChapStick / Subjetivo</span>
            </button>

            {/* Arc */}
            <button
              onClick={() => onSelectModel('arc')}
              disabled={!diagnosis.enabledModels.includes('arc')}
              className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                selectedModel === 'arc'
                  ? 'border-[#0A5C5A] bg-[#F0F7F6] text-[#0A5C5A] shadow-xs'
                  : !diagnosis.enabledModels.includes('arc')
                  ? 'opacity-40 border-[#EBE5D8] bg-white cursor-not-allowed'
                  : 'border-[#EBE5D8] bg-white text-[#0F1E36] hover:border-[#D5CFC2]'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold">Elasticidad Arco</span>
                {selectedModel === 'arc' && <CheckCircle2 className="w-3.5 h-3.5 text-[#0A5C5A]" />}
              </div>
              <span className="text-[11px] block font-mono text-[#5A687D]">Punto Medio (OpenStax)</span>
              <span className="text-[10px] text-[#8A95A5] block mt-1">2 puntos observados</span>
            </button>

            {/* Survey WTP */}
            <button
              onClick={() => onSelectModel('wtp_survey')}
              disabled={!diagnosis.enabledModels.includes('wtp_survey')}
              className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                selectedModel === 'wtp_survey'
                  ? 'border-[#0A5C5A] bg-[#F0F7F6] text-[#0A5C5A] shadow-xs'
                  : !diagnosis.enabledModels.includes('wtp_survey')
                  ? 'opacity-40 border-[#EBE5D8] bg-white cursor-not-allowed'
                  : 'border-[#EBE5D8] bg-white text-[#0F1E36] hover:border-[#D5CFC2]'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold">Encuesta WTP</span>
                {selectedModel === 'wtp_survey' && <CheckCircle2 className="w-3.5 h-3.5 text-[#0A5C5A]" />}
              </div>
              <span className="text-[11px] block font-mono text-[#5A687D]">Reserva Acumulada</span>
              <span className="text-[10px] text-[#8A95A5] block mt-1">Disposición a pagar de clientes</span>
            </button>
          </div>
        </div>

        {/* Warnings & Suggestions */}
        {diagnosis.warnings.length > 0 && (
          <div className="p-3 bg-[#FFFBEB] border border-[#FDE68A] rounded-lg space-y-1 text-xs text-[#92400E]">
            {diagnosis.warnings.map((w, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-[#D97706] shrink-0 mt-0.5" />
                <span>{w}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Audit Log Table */}
      <div className="bg-white border border-[#EBE5D8] rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-[#F0ECE1] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#0F1E36]">Bitácora de Transformaciones y Depuración</h3>
            <p className="text-xs text-[#5A687D]">Registro auditable de cada regla aplicada sobre la base cruda</p>
          </div>
          <button
            onClick={downloadAuditLog}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#0F1E36] bg-[#FAF8F5] hover:bg-[#F3EFE6] border border-[#E2DDD2] rounded-lg transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#0A5C5A]" />
            Descargar Bitácora (.txt)
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#FAF8F5] text-[#5A687D] border-b border-[#EBE5D8] font-semibold">
                <th className="py-2.5 px-3 w-20">ID</th>
                <th className="py-2.5 px-3 w-24">Hora</th>
                <th className="py-2.5 px-3">Regla Aplicada</th>
                <th className="py-2.5 px-3 w-24 text-right">Filas Afectadas</th>
                <th className="py-2.5 px-3">Efecto / Tratamiento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0ECE1]">
              {auditLog.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-[#8A95A5]">
                    No se requirieron transformaciones adicionales. Todos los registros eran válidos.
                  </td>
                </tr>
              ) : (
                auditLog.map(log => (
                  <tr key={log.id} className="hover:bg-[#FAF8F5]">
                    <td className="py-2 px-3 font-mono text-[#8A95A5]">{log.id}</td>
                    <td className="py-2 px-3 font-mono text-[#5A687D]">{log.timestamp}</td>
                    <td className="py-2 px-3 font-medium text-[#0F1E36]">{log.rule}</td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums text-[#0F1E36]">
                      {log.affectedRows}
                    </td>
                    <td className="py-2 px-3 text-[#5A687D]">{log.effect}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
