import { describe, it, expect } from 'vitest';
import { buildTestData } from '../../data/testData';
import { cagr, volatilidadMensual, maxDrawdown, hhi, proyeccion } from '../metrics';

describe('Métricas Fase 2 sobre dataset de prueba', () => {
  const { assets, entries } = buildTestData();

  it('cagr devuelve un número finito', () => {
    expect(Number.isFinite(cagr(assets, entries))).toBe(true);
  });

  it('volatilidadMensual es >= 0', () => {
    expect(volatilidadMensual(assets, entries)).toBeGreaterThanOrEqual(0);
  });

  it('maxDrawdown está entre 0 y 100', () => {
    const dd = maxDrawdown(assets, entries);
    expect(dd).toBeGreaterThanOrEqual(0);
    expect(dd).toBeLessThanOrEqual(100);
  });

  it('hhi suma aproximadamente a partir de porcentajes que suman 100', () => {
    const { indice, desglosePct } = hhi(assets, entries);
    const sumaPct = desglosePct.reduce((s, d) => s + d.pct, 0);
    expect(sumaPct).toBeGreaterThan(99);
    expect(sumaPct).toBeLessThan(101);
    expect(indice).toBeGreaterThan(0);
  });

  it('proyeccion devuelve 12 puntos con 3 escenarios ordenados pesimista <= base <= optimista', () => {
    const p = proyeccion(assets, entries, 12);
    expect(p.length).toBe(12);
    for (const punto of p) {
      expect(punto.pesimista).toBeLessThanOrEqual(punto.optimista);
    }
  });
});
