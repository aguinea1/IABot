export function fmtEUR(v) {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);
}

export function fmtPct(v, decimals = 1) {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  return `${v.toFixed(decimals)}%`;
}

export function fmtMes(mes) {
  if (!mes) return '';
  const [y, m] = mes.split('-');
  const nombres = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${nombres[parseInt(m, 10) - 1]} ${y.slice(2)}`;
}

const SERIES_VARS = ['--series-1', '--series-2', '--series-3', '--series-4', '--series-5', '--series-6', '--series-7', '--series-8'];

// Asigna color por índice fijo (identidad de la entidad), nunca por rank/orden dinámico.
export function colorForIndex(idx) {
  const varName = SERIES_VARS[idx % SERIES_VARS.length];
  if (typeof window !== 'undefined') {
    const v = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    if (v) return v;
  }
  const fallback = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'];
  return fallback[idx % fallback.length];
}

const CATEGORIA_COLOR_IDX = {
  'Acciones/ETFs': 0,
  'Fondos indexados': 2,
  Cripto: 3,
  'Cuenta remunerada': 6,
  'Materias primas/Oro': 1,
  Otros: 4,
};

export function colorForCategoria(categoria) {
  const idx = CATEGORIA_COLOR_IDX[categoria] ?? 7;
  return colorForIndex(idx);
}
