import { describe, it, expect } from 'vitest';
import { desgloseCategoria, porActivo, rankingActivos } from '../aggregations';

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

// Test de regresión para un bug encontrado en la revisión de calidad del
// 2026-08-07 (sesión de madrugada): RankingChart.jsx filtraba por
// `aportado > 0` directamente en el componente, así que un activo con
// aportación neta acumulada <= 0 (p.ej. una retirada parcial superior a lo
// aportado ese mes) desaparecía en silencio del ranking pese a tener valor
// de mercado real — inconsistente con PanelDetalleActivo.jsx, que sí lo
// muestra usando el mismo `porActivo()`. Se extrajo la lógica a
// `rankingActivos()` en esta capa de lib para poder testearla sin depender
// del renderizado de Recharts. Ver PROGRESS.md.
describe('rankingActivos — no oculta activos con aportación neta <= 0', () => {
  it('incluye un activo con retirada neta superior a lo aportado si aún tiene valor de mercado', () => {
    const assets = [{ id: 'a1', nombre: 'Cripto Retirada Parcial', categoria: 'Criptomonedas' }];
    const entries = [
      { id: 'e1', assetId: 'a1', mes: '2026-01', valor: 2000, aportacion: 2000 },
      // Retirada de 2500€ en un mes en que solo se habían aportado 2000€
      // hasta la fecha: aportado acumulado = 2000 - 2500 = -500 (<= 0), pero
      // el activo sigue teniendo 500€ de valor de mercado.
      { id: 'e2', assetId: 'a1', mes: '2026-02', valor: 500, aportacion: -2500 },
    ];
    const ranking = rankingActivos(assets, entries);
    expect(ranking).toHaveLength(1);
    expect(ranking[0].nombre).toBe('Cripto Retirada Parcial');
  });

  it('sigue sin mostrar activos sin ninguna entrada (sin aportado ni valor)', () => {
    const assets = [{ id: 'a1', nombre: 'Activo Vacío', categoria: 'Fondos indexados' }];
    expect(rankingActivos(assets, [])).toHaveLength(0);
  });

  it('usa assetId, no el nombre, para poder distinguir activos con el mismo nombre normalizado', () => {
    // Dos activos con el mismo nombre que el usuario decide no fusionar
    // (DuplicadosPanel solo lo sugiere) deben conservar su assetId propio en
    // los datos del ranking, para que RankingChart.jsx use `assetId` como
    // key de React en vez de `nombre` (que colisionaría entre ambos).
    const assets = [
      { id: 'a1', nombre: 'Bitcoin', categoria: 'Criptomonedas' },
      { id: 'a2', nombre: 'Bitcoin', categoria: 'Criptomonedas' },
    ];
    const entries = [
      { id: 'e1', assetId: 'a1', mes: '2026-01', valor: 1200, aportacion: 1000 },
      { id: 'e2', assetId: 'a2', mes: '2026-01', valor: 900, aportacion: 1000 },
    ];
    const ranking = rankingActivos(assets, entries);
    expect(ranking.map((r) => r.assetId).sort()).toEqual(['a1', 'a2']);
  });
});
