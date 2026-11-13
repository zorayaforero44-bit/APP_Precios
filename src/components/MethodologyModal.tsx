/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, BookOpen, ExternalLink, Award, FileText, Check } from 'lucide-react';

interface MethodologyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MethodologyModal: React.FC<MethodologyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-[#FAF8F5] border border-[#E2DDD2] rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#EBE5D8] sticky top-0 bg-[#FAF8F5]/95 backdrop-blur-xs z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#E8F2F1] text-[#0A5C5A] flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#0F1E36]">Metodología y Fuentes Académicas</h2>
              <p className="text-xs text-[#5A687D]">Fundamentación econométrica, algoritmos de optimización y enlaces verificados</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#5A687D] hover:text-[#0F1E36] hover:bg-[#F0ECE1] rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 text-xs text-[#0F1E36]">
          {/* Source 1: Hugo Martinez */}
          <div className="bg-white border border-[#EBE5D8] rounded-xl p-5 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-[#0A5C5A]" />
                <h3 className="text-sm font-bold text-[#0F1E36]">
                  1. Hugo Martínez Gallego — Marketing Analytics: Fijación de Precios
                </h3>
              </div>
              <span className="text-[10px] font-mono text-[#0A5C5A] bg-[#E8F2F1] px-2 py-0.5 rounded">
                Referencia Principal
              </span>
            </div>
            <p className="text-[#5A687D] leading-relaxed">
              Material del curso sobre principios de marketing aplicando modelos analíticos y optimización numérica con Solver (motores Simplex LP, GRG Nonlinear y Evolutionary).
            </p>
            <div className="p-3 bg-[#FAF8F5] rounded-lg border border-[#EDE8DD] space-y-2">
              <strong className="block text-[#0A5C5A] text-[11px] uppercase tracking-wider">
                Uso e integración directa en la aplicación:
              </strong>
              <ul className="list-disc list-inside space-y-1 text-[#5A687D]">
                <li>
                  <strong>Curva Cuadrática de 3 Puntos (Caso ChapStick, Diaps. 64–68):</strong> Estimación subjetiva a partir de precio bajo ($1.50, Q=60), medio ($2.00, Q=51) y alto ($2.50, Q=20). La app ajusta Q = -44P² + 136P - 45 y optimiza con costo $0.90 para obtener exactamente $2.04 (ganancia $56.24).
                </li>
                <li>
                  <strong>Productos Complementarios / Vinculados (Caso Maquinillas y Hojas, Diaps. 56–63):</strong> Modelo Profit = Q(P)·(P - CVU) + Q(P)·hojas·margen_hoja. Demuestra cómo el precio óptimo del producto principal desciende de $4.75 a $1.00 (mitad del costo) al maximizar el beneficio cruzado del cartucho ($101.40M ganancia).
                </li>
                <li>
                  <strong>Encuestas de Disposición a Pagar (Diaps. 18–20, 69–71):</strong> Construcción de curvas acumuladas de demanda por precio de reserva a partir de cuestionarios online.
                </li>
              </ul>
            </div>
          </div>

          {/* Source 2: OpenStax Economics 3e */}
          <div className="bg-white border border-[#EBE5D8] rounded-xl p-5 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#0A5C5A]" />
                <h3 className="text-sm font-bold text-[#0F1E36]">
                  2. OpenStax — Principles of Economics 3e (Capítulos 5.1 y 5.3)
                </h3>
              </div>
              <a
                href="https://openstax.org/books/principles-economics-3e/pages/5-1-price-elasticity-of-demand-and-price-elasticity-of-supply"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-[#0A5C5A] hover:underline whitespace-nowrap"
              >
                Capítulo 5.1 OpenStax <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-[#5A687D] leading-relaxed">
              Texto de referencia internacional revisado por pares para la microeconomía de la elasticidad precio y la relación matemática con los ingresos totales.
            </p>
            <div className="p-3 bg-[#FAF8F5] rounded-lg border border-[#EDE8DD] space-y-2">
              <strong className="block text-[#0A5C5A] text-[11px] uppercase tracking-wider">
                Uso e integración directa en la aplicación:
              </strong>
              <ul className="list-disc list-inside space-y-1 text-[#5A687D]">
                <li>
                  <strong>Método del Punto Medio (Arc Elasticity, Cap. 5.1):</strong> Cálculo simétrico sin sesgo de dirección: Ed = [(Q₂ - Q₁) / ((Q₁ + Q₂)/2)] / [(P₂ - P₁) / ((P₁ + P₂)/2)]. Habilitado cuando se disponen de dos precios y cantidades comparables.
                </li>
                <li>
                  <strong>Relación entre Elasticidad e Ingresos Totales (Cap. 5.3):</strong> Interpretación económica: si |Ed| &gt; 1 (elástica), un recorte de precios incrementa los ingresos; si |Ed| &lt; 1 (inelástica), un alza de precios incrementa los ingresos; si |Ed| = 1 (unitaria), los ingresos se maximizan.
                </li>
              </ul>
            </div>
          </div>

          {/* Source 3: Forecasting: Principles and Practice */}
          <div className="bg-white border border-[#EBE5D8] rounded-xl p-5 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#0A5C5A]" />
                <h3 className="text-sm font-bold text-[#0F1E36]">
                  3. Hyndman & Athanasopoulos — Forecasting: Principles and Practice (3rd ed.)
                </h3>
              </div>
              <a
                href="https://otexts.com/fpp3/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-[#0A5C5A] hover:underline whitespace-nowrap"
              >
                FPP3 Online <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-[#5A687D] leading-relaxed">
              Tratado estándar en ciencia de datos para evaluación de pronósticos, validación en series de tiempo y referencias comparativas sin fuga de información (data leakage).
            </p>
            <div className="p-3 bg-[#FAF8F5] rounded-lg border border-[#EDE8DD] space-y-2">
              <strong className="block text-[#0A5C5A] text-[11px] uppercase tracking-wider">
                Uso e integración directa en la aplicación:
              </strong>
              <ul className="list-disc list-inside space-y-1 text-[#5A687D]">
                <li>
                  <strong>Validación Fuera de Muestra Cronológica (Train/Test Split):</strong> En bases con historial fechado (&ge; 6 períodos), se entrena en los primeros períodos y se evalúa el Error Absoluto Medio (MAE) exclusivamente en los períodos más recientes.
                </li>
                <li>
                  <strong>Benchmark de Referencia Ingenuo (Naive Forecast):</strong> Comparación rigurosa contra el pronóstico simple Q(t) = Q(t-1) para certificar si el modelo de precios supera la inercia comercial básica.
                </li>
              </ul>
            </div>
          </div>

          {/* Signature / Brand */}
          <div className="p-4 bg-[#F0F7F6] border border-[#C5E3DF] rounded-xl flex items-center justify-between text-xs">
            <div>
              <span className="font-bold text-[#0A5C5A] block">Laboratorio de Precios | Zoraya Forero</span>
              <span className="text-[#5A687D]">Economista especializada en análisis de datos, automatización y decisiones estratégicas de negocio.</span>
            </div>
            <Check className="w-5 h-5 text-[#0A5C5A]" />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#EBE5D8] flex items-center justify-end bg-white">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-white bg-[#0A5C5A] hover:bg-[#074745] rounded-lg transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
