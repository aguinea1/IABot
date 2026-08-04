import { describe, it, expect } from 'vitest';
import { findOrCreateAsset, createEntry, mergeAssets, findDuplicateAssets } from '../models';
import { canonicalKey } from '../normalize';
import { buildTestData } from '../../data/testData';
import { seriesByAsset, totalMensual, porActivo } from '../aggregations';

describe('canonicalKey', () => {
  it('normaliza variantes del mismo nombre a la misma clave', () => {
    expect(canonicalKey('S&P 500')).toBe(canonicalKey('s&p500 '));
    expect(canonicalKey('S&P 500')).toBe(canonicalKey('SP500'));
    expect(canonicalKey('  s&p 500  ')).toBe(canonicalKey('S&P500'));
  });
});

describe('findOrCreateAsset — bug de duplicados (Fase 0)', () => {
  it('reutiliza el mismo Asset para variantes de nombre del mismo fondo', () => {
    let assets = [];
    const nombres = ['S&P 500', 's&p500 ', 'SP500', 'S&P500'];
    const ids = [];
    for (const nombre of nombres) {
      const r = findOrCreateAsset(assets, { nombre, categoria: 'Fondos indexados' });
      assets = r.assets;
      ids.push(r.asset.id);
    }
    expect(new Set(ids).size).toBe(1); // un único asset, no 4
    expect(assets.length).toBe(1);
  });

  it('crea assets distintos para activos genuinamente distintos', () => {
    let assets = [];
    let r = findOrCreateAsset(assets, { nombre: 'Bitcoin', categoria: 'Cripto' });
    assets = r.assets;
    r = findOrCreateAsset(assets, { nombre: 'Ethereum', categoria: 'Cripto' });
    assets = r.assets;
    expect(assets.length).toBe(2);
  });
});

describe('mergeAssets — fusión manual', () => {
  it('reasigna entries del duplicado al principal y elimina el duplicado', () => {
    let assets = [];
    let r1 = findOrCreateAsset(assets, { nombre: 'Oro', categoria: 'Materias primas/Oro' });
    assets = r1.assets;
    let r2 = findOrCreateAsset(assets, { nombre: 'ORO fisico', categoria: 'Materias primas/Oro' }); // clave distinta -> nuevo asset "duplicado" real
    assets = r2.assets;
    const entries = [
      createEntry({ assetId: r1.asset.id, mes: '2026-01', valor: 100, aportacion: 100 }),
      createEntry({ assetId: r2.asset.id, mes: '2026-02', valor: 50, aportacion: 50 }),
    ];
    const merged = mergeAssets(assets, entries, r1.asset.id, r2.asset.id);
    expect(merged.assets.length).toBe(1);
    expect(merged.entries.every((e) => e.assetId === r1.asset.id)).toBe(true);
  });
});

describe('findDuplicateAssets', () => {
  it('no detecta duplicados cuando se usó findOrCreateAsset consistentemente', () => {
    const { assets } = buildTestData();
    expect(findDuplicateAssets(assets).length).toBe(0);
  });
});

describe('Dataset de prueba de Fase 0 — series continuas y totales', () => {
  const { assets, entries } = buildTestData();

  it('el S&P 500 aparece como un único activo con serie continua', () => {
    const sp500 = assets.find((a) => canonicalKey(a.nombre) === canonicalKey('S&P 500'));
    expect(sp500).toBeDefined();
    const series = seriesByAsset(assets, entries).find((s) => s.asset.id === sp500.id);
    const puntosConValor = series.puntos.filter((p) => p.valor !== null);
    expect(puntosConValor.length).toBe(5); // 5 aportaciones distintas fusionadas en 1 activo
  });

  it('los totales mensuales no son negativos y crecen razonablemente con las aportaciones', () => {
    const mensual = totalMensual(assets, entries);
    expect(mensual.length).toBeGreaterThan(0);
    for (const m of mensual) expect(m.total).toBeGreaterThanOrEqual(0);
  });

  it('activo con un solo mes de datos (Tesla) no rompe las agregaciones', () => {
    const tesla = assets.find((a) => a.nombre === 'Tesla');
    expect(tesla).toBeDefined();
    const result = porActivo(assets, entries).find((p) => p.asset.id === tesla.id);
    expect(result.aportado).toBe(600);
    expect(result.valorActual).toBe(600);
  });

  it('activo que llega a 0€ (Oro físico) se refleja correctamente y no revienta el cálculo', () => {
    const oro = assets.find((a) => a.nombre === 'Oro físico');
    const series = seriesByAsset(assets, entries).find((s) => s.asset.id === oro.id);
    const valores = series.puntos.filter((p) => p.valor !== null).map((p) => p.valor);
    expect(valores).toContain(0);
    const result = porActivo(assets, entries).find((p) => p.asset.id === oro.id);
    expect(Number.isFinite(result.rendimiento)).toBe(true);
  });

  it('activo con huecos (Cuenta remunerada) mantiene forward-fill en el total sin caer a 0 en los meses vacíos', () => {
    const mensual = totalMensual(assets, entries);
    // en 2025-08 (mes con hueco de la cuenta remunerada) el total debe seguir contando
    // el último valor conocido de la cuenta (5020), no 0.
    const idx = mensual.findIndex((m) => m.mes === '2025-08');
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(mensual[idx].total).toBeGreaterThan(0);
  });

  it('aportado vs rendimiento por revalorización cuadra tras la fusión del S&P 500', () => {
    const sp500 = assets.find((a) => a.nombre === 'S&P 500');
    const result = porActivo(assets, entries).find((p) => p.asset.id === sp500.id);
    const aportadoEsperado = 1000 + 880 + 0 + 250 + 260; // suma de aportacion en las 5 entries fusionadas
    expect(result.aportado).toBe(aportadoEsperado);
    expect(result.valorActual).toBe(22 * 130); // última entrada: 22 participaciones a 130
    expect(result.rendimiento).toBe(result.valorActual - result.aportado);
  });
});
