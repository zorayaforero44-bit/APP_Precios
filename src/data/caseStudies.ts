/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaseStudy } from '../types/pricing';

export const CASE_STUDIES: CaseStudy[] = [
  {
    id: 'chapstick_class',
    title: 'Caso ChapStick (Hugo Martínez - Clase)',
    category: 'Hugo Martínez (Clase)',
    shortDesc: 'Curva cuadrática de 3 puntos y optimización con Solver para maximizar ganancia semanal.',
    context:
      'Una farmacia paga $0.90 por cada unidad de ChapStick. Considera cobrar entre $1.50 y $2.50. Cree que a $1.50 venderá 60 u., a $2.00 venderá 51 u. y a $2.50 venderá 20 u. Con la curva cuadrática estimada Q = -44P² + 136P - 45, Solver encuentra que cobrar $2.04 produce 49.33 unidades y una ganancia de $56.24 por semana.',
    productName: 'Bálsamo Labial ChapStick',
    unitCost: 0.9,
    defaultPrice: 2.0,
    recommendedModel: 'quadratic_3p',
    dataPoints: [
      { price: 1.5, quantity: 60, period: 'Semana 1' },
      { price: 2.0, quantity: 51, period: 'Semana 2' },
      { price: 2.5, quantity: 20, period: 'Semana 3' },
    ],
    theoreticalOptimal: {
      price: 2.04,
      demand: 49.33,
      profit: 56.24,
    },
    notes: 'Referencia directa: Diapositivas 65–68 del material de Hugo Martínez.',
  },
  {
    id: 'razors_blades',
    title: 'Maquinillas y Hojas Complementarias (Hugo Martínez)',
    category: 'Hugo Martínez (Clase)',
    shortDesc: 'Efecto de productos vinculados en la fijación óptima del producto principal.',
    context:
      'Se cobra $5.00 por maquinilla y se venden 6 millones con costo de $2.00 y elasticidad 2 (Q = 18 - 2.4P). Sin hojas, el precio óptimo es $4.75 con ganancia de $18.15M. Pero si cada comprador adquiere 50 hojas y la empresa gana $0.15 por hoja ($7.50 adicionales por navaja), ¡el precio óptimo baja a $1.00 (la mitad del costo unitario!) logrando una ganancia total de $101.40M.',
    productName: 'Maquinilla de Afeitar Ergonómica',
    unitCost: 2.0,
    defaultPrice: 5.0,
    recommendedModel: 'linear',
    dataPoints: [
      { price: 4.8, quantity: 6.48, period: 'Período 1' },
      { price: 5.0, quantity: 6.0, period: 'Período 2' },
      { price: 5.05, quantity: 5.88, period: 'Período 3' },
      { price: 5.2, quantity: 5.52, period: 'Período 4' },
      { price: 5.4, quantity: 5.04, period: 'Período 5' },
    ],
    complementaryConfig: {
      enabled: true,
      name: 'Cartucho de 50 Hojas de Afeitar',
      unitsPerPrimarySale: 50,
      unitMargin: 0.15,
    },
    theoreticalOptimal: {
      price: 1.0,
      demand: 15.6,
      profit: 101.4,
    },
    notes: 'Referencia directa: Diapositivas 56–63 del material de Hugo Martínez.',
  },
  {
    id: 'theory_linear_check',
    title: 'Demanda Lineal Conocida: Q = 100 - 2P',
    category: 'Economía Teórica',
    shortDesc: 'Verificación analítica con resultados exactos: P=20 -> Q=60, Ed=-0.67; P=25 -> Q=50, Ed=-1.00.',
    context:
      'Prueba de calibración analítica. Con la función teórica Q = 100 - 2P, a un precio de $20 la demanda es 60 y la elasticidad puntual es -2 · (20/60) = -0.67 (inelástica). Al subir el precio a $25, la demanda baja a 50 y la elasticidad alcanza exactamente -1.00 (unitaria), punto en el que los ingresos alcanzan su máximo ($1.250).',
    productName: 'Bien Teórico de Control',
    unitCost: 10.0,
    defaultPrice: 20.0,
    recommendedModel: 'linear',
    dataPoints: [
      { price: 15.0, quantity: 70, period: 'T1' },
      { price: 18.0, quantity: 64, period: 'T2' },
      { price: 20.0, quantity: 60, period: 'T3' },
      { price: 22.0, quantity: 56, period: 'T4' },
      { price: 25.0, quantity: 50, period: 'T5' },
      { price: 28.0, quantity: 44, period: 'T6' },
      { price: 30.0, quantity: 40, period: 'T7' },
    ],
    theoreticalOptimal: {
      price: 30.0, // With cost=10, max profit is at (100 - 2P)(P - 10) => -2P^2 + 120P - 1000 => P* = 120/4 = 30
      demand: 40.0,
      profit: 800.0,
    },
    notes: 'Verificación matemática de elasticidad puntual y optimización bajo costo constante.',
  },
  {
    id: 'retail_coffee_demo',
    title: 'Historial Real Retail: Café Especial Huila 250g',
    category: 'Demostración de Negocio',
    shortDesc: '24 semanas con variación de precios por promociones, cantidades vendidas y costo variable.',
    context:
      'Historial semanal de ventas de una tostaduría artesanal en canal e-commerce y tiendas gourmet. Muestra variación de tarifas ($18.500 a $24.900 COP), costo variable de $11.200 COP y ventas semanales entre 420 y 890 unidades.',
    productName: 'Café Especial Huila Lavado 250g',
    unitCost: 11200,
    defaultPrice: 22500,
    recommendedModel: 'linear',
    dataPoints: [
      { price: 18500, quantity: 890, period: '2024-W01' },
      { price: 18900, quantity: 850, period: '2024-W02' },
      { price: 19500, quantity: 810, period: '2024-W03' },
      { price: 19900, quantity: 780, period: '2024-W04' },
      { price: 20500, quantity: 740, period: '2024-W05' },
      { price: 20900, quantity: 700, period: '2024-W06' },
      { price: 21500, quantity: 660, period: '2024-W07' },
      { price: 21900, quantity: 630, period: '2024-W08' },
      { price: 22500, quantity: 590, period: '2024-W09' },
      { price: 22900, quantity: 560, period: '2024-W10' },
      { price: 23500, quantity: 520, period: '2024-W11' },
      { price: 23900, quantity: 490, period: '2024-W12' },
      { price: 24500, quantity: 450, period: '2024-W13' },
      { price: 24900, quantity: 420, period: '2024-W14' },
      { price: 21900, quantity: 640, period: '2024-W15' },
      { price: 22500, quantity: 600, period: '2024-W16' },
      { price: 20900, quantity: 710, period: '2024-W17' },
      { price: 19900, quantity: 770, period: '2024-W18' },
      { price: 22900, quantity: 550, period: '2024-W19' },
      { price: 23500, quantity: 530, period: '2024-W20' },
      { price: 21500, quantity: 670, period: '2024-W21' },
      { price: 22500, quantity: 580, period: '2024-W22' },
      { price: 23900, quantity: 480, period: '2024-W23' },
      { price: 24900, quantity: 430, period: '2024-W24' },
    ],
    notes: 'Base real en formato colombiano con precios en COP y validación temporal por semanas.',
  },
  {
    id: 'services_clinic_demo',
    title: 'Servicios de Salud: Consultas Clínicas con Capacidad',
    category: 'Demostración de Negocio',
    shortDesc: 'Tarifas por consulta, citas atendidas y tope de capacidad física de 80 pacientes/semana.',
    context:
      'Clínica dermatológica que evalúa la tarifa de consulta médica especializada. El consultorio tiene una capacidad física máxima de 80 consultas por semana. Si la tarifa baja demasiado, la demanda estimada sobrepasa el aforo, limitando las unidades vendibles reales.',
    productName: 'Consulta Dermatológica Especializada',
    unitCost: 65000,
    defaultPrice: 175000,
    capacity: 80,
    recommendedModel: 'linear',
    dataPoints: [
      { price: 140000, quantity: 80, period: 'Semana 01' }, // Capped by capacity (demand was 95)
      { price: 145000, quantity: 80, period: 'Semana 02' }, // Capped
      { price: 150000, quantity: 80, period: 'Semana 03' }, // Capped
      { price: 160000, quantity: 76, period: 'Semana 04' },
      { price: 165000, quantity: 72, period: 'Semana 05' },
      { price: 170000, quantity: 68, period: 'Semana 06' },
      { price: 175000, quantity: 64, period: 'Semana 07' },
      { price: 180000, quantity: 60, period: 'Semana 08' },
      { price: 185000, quantity: 56, period: 'Semana 09' },
      { price: 190000, quantity: 51, period: 'Semana 10' },
      { price: 195000, quantity: 47, period: 'Semana 11' },
      { price: 200000, quantity: 43, period: 'Semana 12' },
      { price: 205000, quantity: 38, period: 'Semana 13' },
      { price: 210000, quantity: 34, period: 'Semana 14' },
    ],
    notes: 'Demuestra el reconocimiento de encabezados clínicos (tarifa, consultas atendidas) y la restricción de aforo.',
  },
  {
    id: 'wtp_survey_demo',
    title: 'Encuesta Disposición a Pagar: Curso Online Marketing Analytics',
    category: 'Hugo Martínez (Clase)',
    shortDesc: 'Curva acumulada de aceptación según precios de reserva de 120 participantes.',
    context:
      'Inspirado en el formulario de encuesta de Hugo Martínez (diapositivas 18–20 y 71) para el Curso de Marketing Analytics con 48 horas de clase, plantillas en Excel y R. 120 profesionales respondieron el precio máximo que pagarían entre US$ 199, US$ 499, US$ 999 y US$ 1999.',
    productName: 'Curso Online Marketing Analytics (48h)',
    unitCost: 45, // Variable platform/materials cost per student
    defaultPrice: 499,
    recommendedModel: 'wtp_survey',
    dataPoints: [
      // 120 simulated respondents with realistic reservation prices
      ...Array(38).fill({ price: 199, quantity: 1 }),
      ...Array(44).fill({ price: 499, quantity: 1 }),
      ...Array(26).fill({ price: 999, quantity: 1 }),
      ...Array(12).fill({ price: 1999, quantity: 1 }),
    ],
    notes: 'Curva de aceptación acumulada (100% a 199, 68.3% a 499, 31.7% a 999, 10% a 1999).',
  },
];

export function generateSampleCsvContent(type: 'products' | 'services'): string {
  if (type === 'products') {
    return `fecha;producto;precio_unitario;unidades_vendidas;ingreso_neto;costo_variable;canal;promocion
2024-W01;Cafe Huila 250g;18.500,00;890;16.465.000,00;11.200,00;E-commerce;Descuento Fin de Año
2024-W02;Cafe Huila 250g;18.900,00;850;16.065.000,00;11.200,00;E-commerce;Normal
2024-W03;Cafe Huila 250g;19.500,00;810;15.795.000,00;11.200,00;Tienda Gourmet;Normal
2024-W04;Cafe Huila 250g;19.900,00;780;15.522.000,00;11.200,00;Tienda Gourmet;Normal
2024-W05;Cafe Huila 250g;20.500,00;740;15.170.000,00;11.200,00;E-commerce;Normal
2024-W06;Cafe Huila 250g;20.900,00;700;14.630.000,00;11.200,00;E-commerce;Normal
2024-W07;Cafe Huila 250g;21.500,00;660;14.190.000,00;11.200,00;Tienda Gourmet;Normal
2024-W08;Cafe Huila 250g;21.900,00;630;13.797.000,00;11.200,00;Tienda Gourmet;Normal
2024-W09;Cafe Huila 250g;22.500,00;590;13.275.000,00;11.200,00;E-commerce;Precio Regular
2024-W10;Cafe Huila 250g;22.900,00;560;12.824.000,00;11.200,00;E-commerce;Precio Regular
2024-W11;Cafe Huila 250g;23.500,00;520;12.220.000,00;11.200,00;Tienda Gourmet;Precio Regular
2024-W12;Cafe Huila 250g;23.900,00;490;11.711.000,00;11.200,00;Tienda Gourmet;Precio Regular
2024-W13;Cafe Huila 250g;24.500,00;450;11.025.000,00;11.200,00;E-commerce;Alza Insumos
2024-W14;Cafe Huila 250g;24.900,00;420;10.458.000,00;11.200,00;E-commerce;Alza Insumos`;
  }

  return `periodo;procedimiento;tarifa;consultas_atendidas;ingreso_total;costo_medico;capacidad_maxima;sede
Semana 01;Consulta Dermatologica;140.000,00;80;11.200.000,00;65.000,00;80;Sede Norte
Semana 02;Consulta Dermatologica;145.000,00;80;11.600.000,00;65.000,00;80;Sede Norte
Semana 03;Consulta Dermatologica;150.000,00;80;12.000.000,00;65.000,00;80;Sede Norte
Semana 04;Consulta Dermatologica;160.000,00;76;12.160.000,00;65.000,00;80;Sede Norte
Semana 05;Consulta Dermatologica;165.000,00;72;11.880.000,00;65.000,00;80;Sede Norte
Semana 06;Consulta Dermatologica;170.000,00;68;11.560.000,00;65.000,00;80;Sede Norte
Semana 07;Consulta Dermatologica;175.000,00;64;11.200.000,00;65.000,00;80;Sede Norte
Semana 08;Consulta Dermatologica;180.000,00;60;10.800.000,00;65.000,00;80;Sede Norte
Semana 09;Consulta Dermatologica;185.000,00;56;10.360.000,00;65.000,00;80;Sede Norte
Semana 10;Consulta Dermatologica;190.000,00;51;9.690.000,00;65.000,00;80;Sede Norte
Semana 11;Consulta Dermatologica;195.000,00;47;9.165.000,00;65.000,00;80;Sede Norte
Semana 12;Consulta Dermatologica;200.000,00;43;8.600.000,00;65.000,00;80;Sede Norte
Semana 13;Consulta Dermatologica;205.000,00;38;7.790.000,00;65.000,00;80;Sede Norte
Semana 14;Consulta Dermatologica;210.000,00;34;7.140.000,00;65.000,00;80;Sede Norte`;
}
