import { describe, it, expect } from 'vitest';
import { desgloseCategoria, porActivo } from '../aggregations';

// Tests de regresión para dos bugs encontrados en la revisión de calidad del
// 2026-08-06 (ver PROGRESS.md, sesión 2026-08-06).

describe('desgloseCategoria — no genera categorías fantasma con valor 0', () => {
  it('omite del desglose un activo sin ninguna entrada', () => {
    const assets = [
      { id: 'a1', nombre: 'S&P 500', categoria: 'Fondos indexados' },
      { id: 'a2', nombre: 'Cuenta huérfana', categoria: 'Cuenta remunerada' }, // sin entries
    ];
    const entries = [
      { id: 'e1', assetId: 'a1', mes: '2026-01', valor: 1000, aportacion: 1000 },
    ];
    const desglose = desgloseCategoria(assets, entries);
    const categorias = desglose.map((d) => d.categoria);
    expect(categorias).toContain('Fondos indexados');
    expect(categorias).not.toContain('Cuenta remunerada');
  });
});

describe('porActivo / desgloseCategoria — orden estable cuando hay dos entradas del mismo mes', () => {
  it('usa la última entrada insertada como valor vigente de ese mes, de forma determinista', () => {
    const assets = [{ id: 'a1', nombre: 'Cripto X', categoria: 'Cripto' }];
    // Dos entradas para el mismo mes (p. ej. una corrección manual): la
    // segunda insertada debe "ganar" de forma determinista, no depender de
    // un comparador de sort inestable que nunca devuelve 0 para mes==mes.
    const entries = [
      { id: 'e1', assetId: 'a1', mes: '2026-01', valor: 100, aportacion: 100 },
      { id: 'e2', assetId: 'a1', mes: '2026-01', valor: 150, aportacion: 0 },
    ];
    const resultado = porActivo(assets, entries).find((p) => p.asset.id === 'a1');
    expect(resultado.valorActual).toBe(150);

    const desglose = desgloseCategoria(assets, entries);
    expect(desglose.find((d) => d.categoria === 'Cripto').valor).toBe(150);
  });
});
