/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as XLSX from 'xlsx';
import { ColumnMapping, RawRow } from '../types/pricing';

export interface ParseResult {
  sheetNames?: string[];
  activeSheet?: string;
  rawRows: RawRow[];
  headers: string[];
  detectedDelimiter?: string;
  suggestedMapping: ColumnMapping;
  isExcel: boolean;
  sampleAmbiguities?: Array<{ raw: string; interpretedAsDot: number; interpretedAsComma: number }>;
}

export function detectDelimiter(text: string): string {
  const firstLines = text.split('\n').slice(0, 5).join('\n');
  const counts = {
    ';': (firstLines.match(/;/g) || []).length,
    ',': (firstLines.match(/,/g) || []).length,
    '\t': (firstLines.match(/\t/g) || []).length,
    '|': (firstLines.match(/\|/g) || []).length,
  };

  let best = ',';
  let max = -1;
  for (const [delim, count] of Object.entries(counts)) {
    if (count > max) {
      max = count;
      best = delim;
    }
  }
  return best;
}

export function parseDelimitedText(text: string, forcedDelimiter?: string): RawRow[] {
  const delimiter = forcedDelimiter || detectDelimiter(text);
  const lines = text
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0);

  if (lines.length === 0) return [];

  // Parse header
  const parseLine = (line: string): string[] => {
    // Regex or split handling quotes
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === delimiter && !inQuotes) {
        result.push(cur.trim());
        cur = '';
      } else {
        cur += c;
      }
    }
    result.push(cur.trim());
    return result;
  };

  const headers = parseLine(lines[0]);
  const rows: RawRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    const rowObj: RawRow = {};
    headers.forEach((h, idx) => {
      rowObj[h || `Columna_${idx + 1}`] = values[idx] !== undefined ? values[idx] : '';
    });
    rows.push(rowObj);
  }

  return rows;
}

export function parseExcelBuffer(buffer: ArrayBuffer, sheetName?: string): {
  sheetNames: string[];
  activeSheet: string;
  rows: RawRow[];
  headers: string[];
} {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetNames = workbook.SheetNames;
  const active = sheetName && sheetNames.includes(sheetName) ? sheetName : sheetNames[0];
  const worksheet = workbook.Sheets[active];
  const rows = XLSX.utils.sheet_to_json<RawRow>(worksheet, { defval: '' });
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];

  return {
    sheetNames,
    activeSheet: active,
    rows,
    headers,
  };
}

export function suggestColumnMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {
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
  };

  const normalize = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '_');

  const patterns: { [key in keyof ColumnMapping]: string[] } = {
    product: ['producto', 'servicio', 'item', 'sku', 'procedimiento', 'descripcion', 'concepto', 'plan', 'nombre', 'product'],
    period: ['fecha', 'periodo', 'semana', 'mes', 'dia', 'date', 'year', 'trimestre', 'quarter', 'semana_id', 'period'],
    price: ['precio', 'tarifa', 'valor_unitario', 'precio_unitario', 'price', 'pvp', 'honorario', 'canon', 'precio_neto'],
    quantity: ['cantidad', 'unidades', 'unidades_vendidas', 'volumen', 'consultas', 'reservas', 'suscripciones', 'qty', 'demand', 'demanda', 'alumnos'],
    revenue: ['ingreso', 'ingreso_neto', 'venta_neta', 'total', 'facturacion', 'ventas', 'revenue', 'importe', 'ventas_totales', 'ingresos'],
    unitCost: ['costo', 'costo_variable', 'costo_unitario', 'cost', 'unit_cost', 'costo_var', 'cvu', 'costo_directo'],
    channel: ['canal', 'tienda', 'sucursal', 'sede', 'channel', 'distribuidor', 'punto_venta'],
    segment: ['segmento', 'tipo_cliente', 'categoria', 'segment', 'estrato', 'perfil'],
    promotion: ['promocion', 'descuento', 'promo', 'campana', 'discount', 'oferta', 'rebaja'],
    capacity: ['capacidad', 'aforo', 'cupo', 'cupos', 'capacidad_maxima', 'capacity', 'limite'],
  };

  for (const field of Object.keys(patterns) as Array<keyof ColumnMapping>) {
    const matched = headers.find(h => {
      const norm = normalize(h);
      return patterns[field].some(p => norm.includes(p));
    });
    if (matched) {
      mapping[field] = matched;
    }
  }

  return mapping;
}
