// Fase 2 — métricas avanzadas. Cada función lleva una nota de fórmula que se
// muestra en tooltip en la UI.

import { totalMensual, desgloseCategoria } from './aggregations';

export const FORMULAS = {
  cagr: 'CAGR = (Valor final / Valor inicial)^(12/nº meses) - 1. Mide el crecimiento anualizado compuesto de la cartera total.',
  volatilidad: 'Desviación estándar de las variaciones % mensuales (mes a mes). A mayor valor, mayor dispersión/riesgo mensual.',
  drawdown: 'Máximo drawdown = mayor caída porcentual desde un máximo previo hasta un mínimo posterior en la serie de valor total.',
  hhi: 'Índice de Herfindahl-Hirschman = suma de (peso_categoria%)^2 para todas las categorías. Rango 0-10000. >5000 se considera muy concentrado; avisamos a partir de que una categoría supere el 50% del total.',
  twr: 'TWR aproximado por activo = (Valor actual - Aportado acumulado) / Aportado acumulado. Aproximación simple que ignora el timing exacto de cada aportación dentro del mes.',
};

export function cagr(assets, entries) {
  const mensual = totalMensual(assets, entries);
  if (mensual.length < 2) return 0;
  const inicio = mensual[0].total;
  const fin = mensual.at(-1).total;
  if (inicio <= 0) return 0;
  const meses = mensual.length - 1;
  if (meses <= 0) return 0;
  return (Math.pow(fin / inicio, 12 / meses) - 1) * 100;
}

export function volatilidadMensual(assets, entries) {
  const mensual = totalMensual(assets, entries);
  const variaciones = [];
  for (let i = 1; i < mensual.length; i++) {
    const prev = mensual[i - 1].total;
    const cur = mensual[i].total;
    if (prev > 0) variaciones.push((cur - prev) / prev);
  }
  if (variaciones.length === 0) return 0;
  const media = variaciones.reduce((a, b) => a + b, 0) / variaciones.length;
  const varianza = variaciones.reduce((a, b) => a + (b - media) ** 2, 0) / variaciones.length;
  return Math.sqrt(varianza) * 100;
}

export function maxDrawdown(assets, entries) {
  const mensual = totalMensual(assets, entries);
  let peak = -Infinity;
  let maxDd = 0;
  for (const { total } of mensual) {
    if (total > peak) peak = total;
    if (peak > 0) {
      const dd = (peak - total) / peak;
      if (dd > maxDd) maxDd = dd;
    }
  }
  return maxDd * 100;
}

export function hhi(assets, entries) {
  const desglose = desgloseCategoria(assets, entries);
  const total = desglose.reduce((s, d) => s + d.valor, 0);
  if (total <= 0) return { indice: 0, alerta: false, desglosePct: [] };
  const desglosePct = desglose.map((d) => ({ categoria: d.categoria, pct: (d.valor / total) * 100 }));
  const indice = desglosePct.reduce((s, d) => s + d.pct ** 2, 0);
  const alerta = desglosePct.some((d) => d.pct > 50);
  return { indice, alerta, desglosePct };
}

// Proyección simple a N meses vista con 3 escenarios basados en el CAGR
// histórico ajustado por un factor pesimista/optimista.
export function proyeccion(assets, entries, mesesVista = 12) {
  const mensual = totalMensual(assets, entries);
  if (mensual.length === 0) return [];
  const valorActual = mensual.at(-1).total;
  const tasaBase = cagr(assets, entries) / 100 / 12; // tasa mensual
  const escenarios = {
    pesimista: tasaBase * 0.4 - 0.002,
    base: tasaBase,
    optimista: tasaBase * 1.6 + 0.002,
  };
  const out = [];
  for (let m = 1; m <= mesesVista; m++) {
    const punto = { mesRelativo: m };
    for (const [nombre, tasa] of Object.entries(escenarios)) {
      punto[nombre] = valorActual * Math.pow(1 + tasa, m);
    }
    out.push(punto);
  }
  return out;
}
