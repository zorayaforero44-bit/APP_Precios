/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Upload, FileSpreadsheet, Clipboard, Download, Check, AlertCircle, ArrowRight, X } from 'lucide-react';
import { ColumnMapping, RawRow } from '../types/pricing';
import {
  detectDelimiter,
  parseDelimitedText,
  parseExcelBuffer,
  suggestColumnMapping,
} from '../utils/fileParser';
import { generateSampleCsvContent } from '../data/caseStudies';

interface DataImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataLoaded: (
    rows: RawRow[],
    mapping: ColumnMapping,
    options: {
      singleProductName?: string;
      preferDotAsThousands: boolean;
      fileName: string;
    }
  ) => void;
}

export const DataImportModal: React.FC<DataImportModalProps> = ({
  isOpen,
  onClose,
  onDataLoaded,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste' | 'demos'>('upload');
  const [pastedText, setPastedText] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<RawRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>('datos_cargados.csv');
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [activeSheet, setActiveSheet] = useState<string>('');
  const [rawFileBuffer, setRawFileBuffer] = useState<ArrayBuffer | null>(null);

  // Mapping state
  const [mapping, setMapping] = useState<ColumnMapping>({
    product: '',
    period: '',
    price: '',
    quantity: '',
    revenue: '',
    unitCost: '',
    channel: '',
    segment: '',
    promotion: '',
    capacity: '',
  });

  // Colombian number ambiguity toggle
  const [preferDotAsThousands, setPreferDotAsThousands] = useState<boolean>(true);
  const [isSingleProduct, setIsSingleProduct] = useState<boolean>(false);
  const [singleProductName, setSingleProductName] = useState<string>('Producto Principal');
  const [step, setStep] = useState<'upload' | 'mapping'>('upload');

  if (!isOpen) return null;

  // File drop/selection handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const isXlsx = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

    if (isXlsx) {
      const reader = new FileReader();
      reader.onload = evt => {
        const buffer = evt.target?.result as ArrayBuffer;
        setRawFileBuffer(buffer);
        const parsed = parseExcelBuffer(buffer);
        setSheetNames(parsed.sheetNames);
        setActiveSheet(parsed.activeSheet);
        setParsedRows(parsed.rows);
        setHeaders(parsed.headers);
        setMapping(suggestColumnMapping(parsed.headers));
        setStep('mapping');
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = evt => {
        const text = evt.target?.result as string;
        if (file.name.endsWith('.json')) {
          try {
            const data = JSON.parse(text);
            const rows = Array.isArray(data) ? data : [data];
            setParsedRows(rows);
            const hdrs = rows.length > 0 ? Object.keys(rows[0]) : [];
            setHeaders(hdrs);
            setMapping(suggestColumnMapping(hdrs));
            setStep('mapping');
          } catch (err) {
            alert('Error al leer el archivo JSON.');
          }
        } else {
          const rows = parseDelimitedText(text);
          setParsedRows(rows);
          const hdrs = rows.length > 0 ? Object.keys(rows[0]) : [];
          setHeaders(hdrs);
          setMapping(suggestColumnMapping(hdrs));
          setStep('mapping');
        }
      };
      reader.readAsText(file, 'utf-8');
    }
  };

  const handlePasteProcess = () => {
    if (!pastedText.trim()) return;
    setFileName('tabla_pegada.tsv');
    const rows = parseDelimitedText(pastedText);
    setParsedRows(rows);
    const hdrs = rows.length > 0 ? Object.keys(rows[0]) : [];
    setHeaders(hdrs);
    setMapping(suggestColumnMapping(hdrs));
    setStep('mapping');
  };

  const handleSheetChange = (sheet: string) => {
    if (!rawFileBuffer) return;
    setActiveSheet(sheet);
    const parsed = parseExcelBuffer(rawFileBuffer, sheet);
    setParsedRows(parsed.rows);
    setHeaders(parsed.headers);
    setMapping(suggestColumnMapping(parsed.headers));
  };

  const handleDownloadDemo = (type: 'products' | 'services') => {
    const csvContent = generateSampleCsvContent(type);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = type === 'products' ? 'demo_productos_cafe_huila.csv' : 'demo_servicios_clinica.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleLoadDemoDirectly = (type: 'products' | 'services') => {
    const csvContent = generateSampleCsvContent(type);
    const rows = parseDelimitedText(csvContent, ';');
    setFileName(type === 'products' ? 'demo_productos_cafe_huila.csv' : 'demo_servicios_clinica.csv');
    setParsedRows(rows);
    const hdrs = rows.length > 0 ? Object.keys(rows[0]) : [];
    setHeaders(hdrs);
    setMapping(suggestColumnMapping(hdrs));
    setStep('mapping');
  };

  const applyPresetEquivalence = (preset: 'retail' | 'clinic' | 'saas' | 'hospitality') => {
    const current = { ...mapping };
    if (preset === 'retail') {
      current.product = headers.find(h => /sku|producto|item|articulo/i.test(h)) || current.product;
      current.price = headers.find(h => /precio|pvp|tarifa/i.test(h)) || current.price;
      current.quantity = headers.find(h => /unidad|cantidad|volumen/i.test(h)) || current.quantity;
    } else if (preset === 'clinic') {
      current.product = headers.find(h => /procedimiento|servicio|especialidad/i.test(h)) || current.product;
      current.price = headers.find(h => /tarifa|honorario|precio/i.test(h)) || current.price;
      current.quantity = headers.find(h => /consulta|atencion|cita|reserva/i.test(h)) || current.quantity;
    } else if (preset === 'saas') {
      current.product = headers.find(h => /plan|tier|suscripcion/i.test(h)) || current.product;
      current.price = headers.find(h => /cuota|tarifa|mrr|precio/i.test(h)) || current.price;
      current.quantity = headers.find(h => /usuario|cuenta|suscriptor|licencia/i.test(h)) || current.quantity;
    } else if (preset === 'hospitality') {
      current.product = headers.find(h => /habitacion|cabana|servicio/i.test(h)) || current.product;
      current.price = headers.find(h => /tarifa|noche|canon/i.test(h)) || current.price;
      current.quantity = headers.find(h => /reserva|estadia|huesped/i.test(h)) || current.quantity;
    }
    setMapping(current);
  };

  const handleConfirmAndProcess = () => {
    onDataLoaded(parsedRows, mapping, {
      singleProductName: isSingleProduct ? singleProductName : undefined,
      preferDotAsThousands,
      fileName,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-[#FAF8F5] border border-[#E2DDD2] rounded-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Modal Top Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#EBE5D8] sticky top-0 bg-[#FAF8F5]/95 backdrop-blur-xs z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#E8F2F1] text-[#0A5C5A] flex items-center justify-center">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#0F1E36]">Importación y Homologación de Datos</h2>
              <p className="text-xs text-[#5A687D]">
                CSV, TSV, TXT, Excel .xls/.xlsx, JSON o pegado directo de Excel y SQL
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#5A687D] hover:text-[#0F1E36] hover:bg-[#F0ECE1] rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {step === 'upload' && (
            <>
              {/* Tabs */}
              <div className="flex items-center gap-2 border-b border-[#EBE5D8] pb-3">
                <button
                  onClick={() => setActiveTab('upload')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    activeTab === 'upload'
                      ? 'bg-[#0A5C5A] text-white'
                      : 'text-[#5A687D] hover:text-[#0F1E36] hover:bg-[#F3EFE6]'
                  }`}
                >
                  Subir Archivo (.csv, .xlsx, .json)
                </button>
                <button
                  onClick={() => setActiveTab('paste')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    activeTab === 'paste'
                      ? 'bg-[#0A5C5A] text-white'
                      : 'text-[#5A687D] hover:text-[#0F1E36] hover:bg-[#F3EFE6]'
                  }`}
                >
                  Pegar Tabla Copiada
                </button>
                <button
                  onClick={() => setActiveTab('demos')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    activeTab === 'demos'
                      ? 'bg-[#0A5C5A] text-white'
                      : 'text-[#5A687D] hover:text-[#0F1E36] hover:bg-[#F3EFE6]'
                  }`}
                >
                  Bases de Demostración Descargables
                </button>
              </div>

              {activeTab === 'upload' && (
                <div className="border-2 border-dashed border-[#D5CFC2] hover:border-[#0A5C5A] rounded-xl p-10 text-center transition-colors bg-white">
                  <FileSpreadsheet className="w-12 h-12 text-[#0A5C5A] mx-auto mb-3" />
                  <h3 className="text-sm font-bold text-[#0F1E36] mb-1">
                    Arrastre su archivo aquí o haga clic para examinar
                  </h3>
                  <p className="text-xs text-[#5A687D] max-w-md mx-auto mb-4">
                    Soporta Excel (.xlsx, .xls con selección de hoja), CSV separados por punto y coma o coma, TSV y JSON tabular con formatos colombianos ($ 12.500,50).
                  </p>
                  <label className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#0A5C5A] hover:bg-[#074745] rounded-lg transition-colors cursor-pointer">
                    <Upload className="w-4 h-4" />
                    Seleccionar Archivo
                    <input
                      type="file"
                      accept=".csv,.tsv,.txt,.xlsx,.xls,.json"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              )}

              {activeTab === 'paste' && (
                <div className="space-y-3 bg-white p-5 border border-[#EBE5D8] rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#0F1E36]">
                      Pegar celdas copiadas de Excel, Google Sheets o consulta SQL:
                    </span>
                    <span className="text-[11px] text-[#8A95A5]">Detecta encabezados y tabulaciones</span>
                  </div>
                  <textarea
                    rows={8}
                    placeholder="Pegue aquí el contenido con encabezados (ej. Fecha | SKU | Precio | Unidades)..."
                    value={pastedText}
                    onChange={e => setPastedText(e.target.value)}
                    className="w-full p-3 font-mono text-xs border border-[#D5CFC2] rounded-lg bg-[#FAF8F5] focus:outline-none focus:ring-1 focus:ring-[#0A5C5A]"
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={handlePasteProcess}
                      disabled={!pastedText.trim()}
                      className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#0A5C5A] hover:bg-[#074745] disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
                    >
                      Procesar Tabla Pegada
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'demos' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Demo 1: Products */}
                  <div className="p-5 bg-white border border-[#EBE5D8] rounded-xl space-y-3 flex flex-col justify-between">
                    <div>
                      <span className="text-[11px] font-semibold text-[#0A5C5A] uppercase tracking-wider block mb-1">
                        Sector Retail / Alimentos
                      </span>
                      <h4 className="text-sm font-bold text-[#0F1E36]">
                        Demostración Productos: Café Huila 250g
                      </h4>
                      <p className="text-xs text-[#5A687D] mt-1 leading-relaxed">
                        Archivo CSV con punto y coma (;), decimales con coma, 24 semanas de precios entre $18.500 y $24.900 COP, ventas semanales, costos variables y promociones.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 pt-3 border-t border-[#F0ECE1]">
                      <button
                        onClick={() => handleLoadDemoDirectly('products')}
                        className="flex-1 py-1.5 px-3 text-xs font-semibold text-white bg-[#0A5C5A] hover:bg-[#074745] rounded-lg transition-colors cursor-pointer text-center"
                      >
                        Cargar en la App
                      </button>
                      <button
                        onClick={() => handleDownloadDemo('products')}
                        className="p-1.5 text-[#5A687D] hover:text-[#0F1E36] hover:bg-[#F3EFE6] rounded-lg border border-[#D5CFC2] transition-colors cursor-pointer"
                        title="Descargar archivo CSV"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Demo 2: Services */}
                  <div className="p-5 bg-white border border-[#EBE5D8] rounded-xl space-y-3 flex flex-col justify-between">
                    <div>
                      <span className="text-[11px] font-semibold text-[#0A5C5A] uppercase tracking-wider block mb-1">
                        Sector Salud / Servicios
                      </span>
                      <h4 className="text-sm font-bold text-[#0F1E36]">
                        Demostración Servicios: Clínica Especializada
                      </h4>
                      <p className="text-xs text-[#5A687D] mt-1 leading-relaxed">
                        Encabezados equivalentes (procedimiento, tarifa, consultas atendidas), tope de capacidad médica de 80 consultas/semana y costos directos.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 pt-3 border-t border-[#F0ECE1]">
                      <button
                        onClick={() => handleLoadDemoDirectly('services')}
                        className="flex-1 py-1.5 px-3 text-xs font-semibold text-white bg-[#0A5C5A] hover:bg-[#074745] rounded-lg transition-colors cursor-pointer text-center"
                      >
                        Cargar en la App
                      </button>
                      <button
                        onClick={() => handleDownloadDemo('services')}
                        className="p-1.5 text-[#5A687D] hover:text-[#0F1E36] hover:bg-[#F3EFE6] rounded-lg border border-[#D5CFC2] transition-colors cursor-pointer"
                        title="Descargar archivo CSV"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* STEP 2: COLUMN MAPPING & EQUIVALENCES */}
          {step === 'mapping' && (
            <div className="space-y-6">
              {/* File details bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white border border-[#EBE5D8] rounded-xl gap-3">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-[#0A5C5A]" />
                  <span className="text-xs font-bold text-[#0F1E36]">{fileName}</span>
                  <span className="text-[11px] text-[#5A687D]">({parsedRows.length} filas detectadas)</span>
                </div>

                {sheetNames.length > 1 && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-[#5A687D]">Hoja Excel:</span>
                    <select
                      value={activeSheet}
                      onChange={e => handleSheetChange(e.target.value)}
                      className="px-2 py-1 text-xs border border-[#D5CFC2] rounded-md bg-[#FAF8F5]"
                    >
                      {sheetNames.map(s => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <button
                  onClick={() => setStep('upload')}
                  className="text-xs text-[#5A687D] hover:text-[#0F1E36] underline cursor-pointer"
                >
                  Cambiar archivo
                </button>
              </div>

              {/* Business Equivalences Helper Bar */}
              <div className="p-4 bg-[#F0F7F6] border border-[#C5E3DF] rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#0A5C5A] uppercase tracking-wider">
                    Homologación Rápida por Negocio
                  </span>
                  <span className="text-[11px] text-[#5A687D]">
                    Ajusta automáticamente las columnas a la terminología de su industria
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    onClick={() => applyPresetEquivalence('retail')}
                    className="px-2.5 py-1 text-xs bg-white text-[#0F1E36] border border-[#D5CFC2] hover:border-[#0A5C5A] rounded-md transition-colors cursor-pointer"
                  >
                    Comercio (SKU / Precio / Unidades)
                  </button>
                  <button
                    onClick={() => applyPresetEquivalence('clinic')}
                    className="px-2.5 py-1 text-xs bg-white text-[#0F1E36] border border-[#D5CFC2] hover:border-[#0A5C5A] rounded-md transition-colors cursor-pointer"
                  >
                    Clínica / Salud (Procedimiento / Tarifa / Consultas)
                  </button>
                  <button
                    onClick={() => applyPresetEquivalence('saas')}
                    className="px-2.5 py-1 text-xs bg-white text-[#0F1E36] border border-[#D5CFC2] hover:border-[#0A5C5A] rounded-md transition-colors cursor-pointer"
                  >
                    SaaS / Membresía (Plan / Cuota / Suscriptores)
                  </button>
                  <button
                    onClick={() => applyPresetEquivalence('hospitality')}
                    className="px-2.5 py-1 text-xs bg-white text-[#0F1E36] border border-[#D5CFC2] hover:border-[#0A5C5A] rounded-md transition-colors cursor-pointer"
                  >
                    Hotel / Turismo (Habitación / Tarifa / Reservas)
                  </button>
                </div>
              </div>

              {/* Colombian Format & Single Product Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-white border border-[#EBE5D8] rounded-xl space-y-2">
                  <span className="text-xs font-semibold text-[#0F1E36] block">
                    Interpretación Numérica (Colombia / LatAm)
                  </span>
                  <label className="flex items-start gap-2 cursor-pointer text-xs text-[#5A687D]">
                    <input
                      type="checkbox"
                      checked={preferDotAsThousands}
                      onChange={e => setPreferDotAsThousands(e.target.checked)}
                      className="accent-[#0A5C5A] w-4 h-4 mt-0.5 cursor-pointer"
                    />
                    <span>
                      Interpretar punto como separador de miles: <strong>12.500</strong> = doce mil quinientos (formato colombiano habitual).
                    </span>
                  </label>
                </div>

                <div className="p-4 bg-white border border-[#EBE5D8] rounded-xl space-y-2">
                  <span className="text-xs font-semibold text-[#0F1E36] block">
                    Referencia de Producto / Servicio
                  </span>
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-[#5A687D] mb-1">
                    <input
                      type="checkbox"
                      checked={isSingleProduct}
                      onChange={e => setIsSingleProduct(e.target.checked)}
                      className="accent-[#0A5C5A] w-4 h-4 cursor-pointer"
                    />
                    <span>Toda la base corresponde a un solo producto o servicio</span>
                  </label>
                  {isSingleProduct && (
                    <input
                      type="text"
                      placeholder="Nombre del producto (ej. Consultoría Estratégica)"
                      value={singleProductName}
                      onChange={e => setSingleProductName(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-[#D5CFC2] rounded-md bg-[#FAF8F5]"
                    />
                  )}
                </div>
              </div>

              {/* Column Mapping Grid */}
              <div className="bg-white border border-[#EBE5D8] rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#F0ECE1]">
                  <div>
                    <h3 className="text-sm font-bold text-[#0F1E36]">Asignación de Columnas Detectadas</h3>
                    <p className="text-xs text-[#5A687D]">
                      Confirme o corrija las columnas de su archivo que corresponden a cada variable económica
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Product */}
                  {!isSingleProduct && (
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-[#0F1E36]">
                        Producto / Servicio / SKU *
                      </label>
                      <select
                        value={mapping.product}
                        onChange={e => setMapping({ ...mapping, product: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-xs border border-[#D5CFC2] rounded-md bg-[#FAF8F5]"
                      >
                        <option value="">-- No mapear / Único --</option>
                        {headers.map(h => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Period */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#0F1E36]">
                      Fecha / Período / Semana
                    </label>
                    <select
                      value={mapping.period}
                      onChange={e => setMapping({ ...mapping, period: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-xs border border-[#D5CFC2] rounded-md bg-[#FAF8F5]"
                    >
                      <option value="">-- No mapear (secuencial) --</option>
                      {headers.map(h => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Price */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#0F1E36]">
                      Precio / Tarifa Unitario
                    </label>
                    <select
                      value={mapping.price}
                      onChange={e => setMapping({ ...mapping, price: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-xs border border-[#D5CFC2] rounded-md bg-[#FAF8F5]"
                    >
                      <option value="">-- Calcular desde Ingreso / Cantidad --</option>
                      {headers.map(h => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Quantity */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#0F1E36]">
                      Cantidad / Unidades / Consultas *
                    </label>
                    <select
                      value={mapping.quantity}
                      onChange={e => setMapping({ ...mapping, quantity: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-xs border border-[#D5CFC2] rounded-md bg-[#FAF8F5]"
                    >
                      <option value="">-- No mapeado --</option>
                      {headers.map(h => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Revenue */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#0F1E36]">
                      Ingreso Neto / Venta Total
                    </label>
                    <select
                      value={mapping.revenue}
                      onChange={e => setMapping({ ...mapping, revenue: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-xs border border-[#D5CFC2] rounded-md bg-[#FAF8F5]"
                    >
                      <option value="">-- Calcular desde Precio × Cantidad --</option>
                      {headers.map(h => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Unit Cost */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#0F1E36]">
                      Costo Variable Unitario
                    </label>
                    <select
                      value={mapping.unitCost}
                      onChange={e => setMapping({ ...mapping, unitCost: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-xs border border-[#D5CFC2] rounded-md bg-[#FAF8F5]"
                    >
                      <option value="">-- Sin costo (ingresar en simulador) --</option>
                      {headers.map(h => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Capacity */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#0F1E36]">
                      Capacidad Máxima / Aforo
                    </label>
                    <select
                      value={mapping.capacity}
                      onChange={e => setMapping({ ...mapping, capacity: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-xs border border-[#D5CFC2] rounded-md bg-[#FAF8F5]"
                    >
                      <option value="">-- Ilimitada / Asignar en simulador --</option>
                      {headers.map(h => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Channel */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#0F1E36]">Canal / Tienda / Sede</label>
                    <select
                      value={mapping.channel}
                      onChange={e => setMapping({ ...mapping, channel: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-xs border border-[#D5CFC2] rounded-md bg-[#FAF8F5]"
                    >
                      <option value="">-- Opcional --</option>
                      {headers.map(h => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Promotion */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#0F1E36]">Promoción / Descuento</label>
                    <select
                      value={mapping.promotion}
                      onChange={e => setMapping({ ...mapping, promotion: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-xs border border-[#D5CFC2] rounded-md bg-[#FAF8F5]"
                    >
                      <option value="">-- Opcional --</option>
                      {headers.map(h => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Data Preview snippet */}
              <div className="bg-white border border-[#EBE5D8] rounded-xl p-4 space-y-2">
                <span className="text-xs font-bold text-[#0F1E36] block">
                  Vista Previa de Registros Crudos (Primeras 4 filas)
                </span>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-[#FAF8F5] text-[#5A687D]">
                        {headers.slice(0, 7).map(h => (
                          <th key={h} className="py-1.5 px-2 font-medium">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F0ECE1]">
                      {parsedRows.slice(0, 4).map((row, idx) => (
                        <tr key={idx}>
                          {headers.slice(0, 7).map(h => (
                            <td key={h} className="py-1.5 px-2 font-mono text-[#0F1E36]">
                              {String(row[h] ?? '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#EBE5D8] flex items-center justify-between bg-white sticky bottom-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-[#5A687D] hover:text-[#0F1E36] transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          {step === 'mapping' && (
            <button
              onClick={handleConfirmAndProcess}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-[#0A5C5A] hover:bg-[#074745] rounded-lg transition-colors cursor-pointer"
            >
              Confirmar y Analizar Base
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
