/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Parses numbers considering Latin American / Colombian formats ($ 12.500,50),
 * standard English formats ($12,500.50), and ambiguous thousand/decimal dots.
 */
export function parseLocalizedNumber(
  value: any,
  preferDotAsThousands: boolean = true
): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') {
    return isNaN(value) ? null : value;
  }

  let str = String(value).trim();
  if (!str) return null;

  // Clean monetary symbols and common prefixes
  str = str.replace(/[$€£COPUSDU$S/]/gi, '').trim();

  // Handle accounting parentheses (120) -> -120
  let isNegative = false;
  if (str.startsWith('(') && str.endsWith(')')) {
    isNegative = true;
    str = str.slice(1, -1).trim();
  } else if (str.startsWith('-')) {
    isNegative = true;
    str = str.slice(1).trim();
  }

  // Check if contains both dot and comma
  const hasDot = str.includes('.');
  const hasComma = str.includes(',');

  if (hasDot && hasComma) {
    const lastDotIndex = str.lastIndexOf('.');
    const lastCommaIndex = str.lastIndexOf(',');
    if (lastCommaIndex > lastDotIndex) {
      // Colombian / European format: 12.500,50
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      // Standard US format: 12,500.50
      str = str.replace(/,/g, '');
    }
  } else if (hasComma && !hasDot) {
    // 12500,50 (comma as decimal) OR 12,500 (comma as thousands)
    const parts = str.split(',');
    if (parts.length === 2 && parts[1].length === 3 && preferDotAsThousands === false) {
      // Likely thousands separator: 12,500
      str = str.replace(/,/g, '');
    } else {
      // Decimal comma: 12500,50
      str = str.replace(',', '.');
    }
  } else if (hasDot && !hasComma) {
    // 12.500 (could be 12.5k or 12.5)
    const parts = str.split('.');
    if (parts.length === 2 && parts[1].length === 3 && preferDotAsThousands) {
      // e.g. 12.500 in Colombia is twelve thousand five hundred
      str = str.replace(/\./g, '');
    } else if (parts.length > 2) {
      // Multiple dots: 1.500.000
      str = str.replace(/\./g, '');
    }
  }

  // Strip anything that is not digit, dot, or minus
  str = str.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(str);
  if (isNaN(parsed)) return null;
  return isNegative ? -Math.abs(parsed) : parsed;
}

/**
 * Formats monetary amounts with tabular-nums and proper currency styling
 */
export function formatCurrency(
  value: number,
  currency: 'COP' | 'USD' = 'COP',
  compact: boolean = false
): string {
  if (value === null || value === undefined || isNaN(value)) return '—';

  if (compact && Math.abs(value) >= 1_000_000) {
    const millions = value / 1_000_000;
    return `$ ${millions.toFixed(2)}M`;
  }

  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: value % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  // Colombian COP standard: $ 12.500 or $ 12.500,50 if decimal exists
  const hasDecimals = Math.abs(value % 1) > 0.001;
  const formatted = new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(value);

  return `$ ${formatted}`;
}

export function formatNumber(value: number, decimals: number = 2): string {
  if (value === null || value === undefined || isNaN(value)) return '—';
  return new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: value % 1 === 0 ? 0 : Math.min(decimals, 2),
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatPercent(value: number, decimals: number = 1): string {
  if (value === null || value === undefined || isNaN(value)) return '—';
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${value.toFixed(decimals)} %`;
}
