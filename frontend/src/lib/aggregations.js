// Agregaciones derivadas de Asset[] + Entry[]. Nunca comparan strings de
// nombre: todo pasa por assetId.

export function sortedMonths(entries) {
  return [...new Set(entries.map((e) => e.mes))].sort();
}

// Serie continua por activo: para cada mes en el rango total, el valor de
// la posición de ese activo (o null si no había entrada ese mes -> no se
// dibuja punto, en vez de caer a 0, para reflejar "no hay dato" frente a
// "vale 0€").
export function seriesByAsset(assets, entries) {
  const months = sortedMonths(entries);
  return assets.map((asset) => {
    const byMonth = new Map(entries.filter((e) => e.assetId === asset.id).map((e) => [e.mes, e]));
    const puntos = months.map((mes) => {
      const e = byMonth.get(mes);
      return { mes, valor: e ? e.valor : null, aportacion: e ? e.aportacion : 0 };
    });
    return { asset, puntos };
  });
}

// Total mensual (suma de todos los activos, tratando null como "mantiene el
// último valor conocido" para el total de cartera, ya que un activo sin
// entrada ese mes no ha desaparecido, simplemente no se registró movimiento).
export function totalMensual(assets, entries) {
  const months = sortedMonths(entries);
  const series = seriesByAsset(assets, entries);
  return months.map((mes, idx) => {
    let total = 0;
    let aportado = 0;
    for (const { puntos } of series) {
      // último valor conocido hasta este mes (forward-fill)
      let ultimo = null;
      for (let i = idx; i >= 0; i--) {
        if (puntos[i].valor !== null) {
          ultimo = puntos[i].valor;
          break;
        }
      }
      if (ultimo !== null) total += ultimo;
      aportado += puntos[idx].aportacion;
    }
    return { mes, total, aportacionMes: aportado };
  });
}

export function totalAportadoAcumulado(assets, entries) {
  const mensual = totalMensual(assets, entries);
  let acumulado = 0;
  return mensual.map((m) => {
    acumulado += m.aportacionMes;
    return { mes: m.mes, aportado: acumulado };
  });
}

// Rendimiento por revalorización = valor de mercado actual - aportado acumulado.
export function rendimientoTotal(assets, entries) {
  const mensual = totalMensual(assets, entries);
  const aportado = totalAportadoAcumulado(assets, entries);
  return mensual.map((m, i) => ({
    mes: m.mes,
    total: m.total,
    aportado: aportado[i].aportado,
    rendimiento: m.total - aportado[i].aportado,
  }));
}

// Desglose por categoría en el último mes disponible.
export function desgloseCategoria(assets, entries) {
  const months = sortedMonths(entries);
  const lastMonth = months[months.length - 1];
  const porAsset = new Map();
  for (const asset of assets) {
    const es = entries.filter((e) => e.assetId === asset.id && e.mes <= lastMonth);
    if (es.length === 0) continue;
    const last = es.sort((a, b) => (a.mes < b.mes ? -1 : a.mes > b.mes ? 1 : 0)).at(-1);
    porAsset.set(asset.id, last.valor);
  }
  const porCategoria = new Map();
  for (const asset of assets) {
    // Solo activos con al menos una entrada hasta este mes contribuyen al
    // desglose: un activo sin entradas (huérfano tras borrar todas sus
    // entradas, o recién creado sin datos) no debe generar una categoría
    // "fantasma" con valor 0€ (bug encontrado en la revisión de calidad del
    // 2026-08-06).
    if (!porAsset.has(asset.id)) continue;
    const v = porAsset.get(asset.id);
    porCategoria.set(asset.categoria, (porCategoria.get(asset.categoria) || 0) + v);
  }
  return [...porCategoria.entries()].map(([categoria, valor]) => ({ categoria, valor }));
}

// Aportado y rendimiento desglosados por activo (TWR aproximado simplificado:
// valor actual - aportado acumulado de ese activo).
export function porActivo(assets, entries) {
  return assets.map((asset) => {
    const es = entries.filter((e) => e.assetId === asset.id).sort((a, b) => (a.mes < b.mes ? -1 : a.mes > b.mes ? 1 : 0));
    if (es.length === 0) return { asset, aportado: 0, valorActual: 0, rendimiento: 0, rentabilidadPct: 0 };
    const aportado = es.reduce((s, e) => s + (e.aportacion || 0), 0);
    const valorActual = es.at(-1).valor;
    const rendimiento = valorActual - aportado;
    const rentabilidadPct = aportado > 0 ? (rendimiento / aportado) * 100 : 0;
    return { asset, aportado, valorActual, rendimiento, rentabilidadPct };
  });
}
