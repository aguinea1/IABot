// Fase 0 — datos de prueba sintéticos.
// Incluye deliberadamente:
//  - Un mismo fondo aportado varios meses con nombres inconsistentes
//    ("S&P 500", "s&p500 ", "SP500") para verificar que se fusiona en un
//    único activo.
//  - Una cripto con participaciones fraccionarias (BTC).
//  - Datos del año anterior y del actual (14 meses en total).
//  - Un activo que solo tiene una entrada (edge case "un solo mes de datos").
//  - Un activo que desaparece y reaparece (huecos en la serie).
//  - Un activo que llega a valer 0€ en un mes.
//
// buildTestData() usa findOrCreateAsset para que las variantes de nombre se
// fusionen automáticamente en el mismo Asset (así queda demostrado el fix).

import { findOrCreateAsset, createEntry } from '../lib/models';

const MESES = [
  '2025-06', '2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12',
  '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07',
];

export function buildTestData() {
  let assets = [];
  const entries = [];

  function addEntry(nombre, categoria, mes, opts) {
    const r = findOrCreateAsset(assets, { nombre, categoria });
    assets = r.assets;
    entries.push(createEntry({ assetId: r.asset.id, mes, ...opts }));
    return r.asset;
  }

  // --- S&P 500: mismo fondo, nombres inconsistentes en distintos meses ---
  addEntry('S&P 500', 'Fondos indexados', '2025-06', { modo: 'participaciones', participaciones: 10, precio: 100, aportacion: 1000 });
  addEntry('s&p500 ', 'Fondos indexados', '2025-09', { modo: 'participaciones', participaciones: 8, precio: 110, aportacion: 880 });
  addEntry('SP500', 'Fondos indexados', '2026-01', { modo: 'participaciones', participaciones: 18, precio: 118, aportacion: 0 }); // acumulado 18 participaciones
  addEntry('S&P500', 'Fondos indexados', '2026-04', { modo: 'participaciones', participaciones: 20, precio: 125, aportacion: 250 });
  addEntry('  s&p 500  ', 'Fondos indexados', '2026-07', { modo: 'participaciones', participaciones: 22, precio: 130, aportacion: 260 });

  // --- Bitcoin: participaciones fraccionarias ---
  addEntry('Bitcoin', 'Cripto', '2025-06', { modo: 'participaciones', participaciones: 0.015, precio: 60000, aportacion: 900 });
  addEntry('Bitcoin', 'Cripto', '2025-08', { modo: 'participaciones', participaciones: 0.025, precio: 58000, aportacion: 580 });
  addEntry('Bitcoin', 'Cripto', '2025-12', { modo: 'participaciones', participaciones: 0.032, precio: 65000, aportacion: 455 });
  addEntry('Bitcoin', 'Cripto', '2026-03', { modo: 'participaciones', participaciones: 0.04, precio: 70000, aportacion: 560 });
  addEntry('Bitcoin', 'Cripto', '2026-06', { modo: 'participaciones', participaciones: 0.045, precio: 68000, aportacion: 340 });
  addEntry('Bitcoin', 'Cripto', '2026-07', { modo: 'participaciones', participaciones: 0.05, precio: 72000, aportacion: 360 });

  // --- Acción individual (Acciones/ETFs), un solo mes de datos (edge case) ---
  addEntry('Tesla', 'Acciones/ETFs', '2026-05', { modo: 'participaciones', participaciones: 2, precio: 300, aportacion: 600 });

  // --- Cuenta remunerada: aparece, desaparece 3 meses, reaparece (huecos) ---
  addEntry('Cuenta remunerada MyInvestor', 'Cuenta remunerada', '2025-06', { modo: 'valor', valor: 5000, aportacion: 5000 });
  addEntry('Cuenta remunerada MyInvestor', 'Cuenta remunerada', '2025-07', { modo: 'valor', valor: 5020, aportacion: 0 });
  // hueco: 2025-08, 2025-09, 2025-10 sin entrada
  addEntry('Cuenta remunerada MyInvestor', 'Cuenta remunerada', '2025-11', { modo: 'valor', valor: 5120, aportacion: 0 });
  addEntry('Cuenta remunerada MyInvestor', 'Cuenta remunerada', '2026-02', { modo: 'valor', valor: 5300, aportacion: 100 });
  addEntry('Cuenta remunerada MyInvestor', 'Cuenta remunerada', '2026-07', { modo: 'valor', valor: 5450, aportacion: 0 });

  // --- Oro: activo que llega a valer 0€ en un mes (venta total) y luego se recompra ---
  addEntry('Oro físico', 'Materias primas/Oro', '2025-06', { modo: 'valor', valor: 1200, aportacion: 1200 });
  addEntry('Oro físico', 'Materias primas/Oro', '2025-10', { modo: 'valor', valor: 1350, aportacion: 0 });
  addEntry('Oro físico', 'Materias primas/Oro', '2026-01', { modo: 'valor', valor: 0, aportacion: 0 }); // vendido todo
  addEntry('Oro físico', 'Materias primas/Oro', '2026-05', { modo: 'valor', valor: 400, aportacion: 400 }); // recompra parcial

  // --- Otro ETF normal, aportaciones regulares ---
  addEntry('MSCI World', 'Acciones/ETFs', '2025-06', { modo: 'participaciones', participaciones: 5, precio: 80, aportacion: 400 });
  addEntry('MSCI World', 'Acciones/ETFs', '2025-08', { modo: 'participaciones', participaciones: 9, precio: 83, aportacion: 332 });
  addEntry('MSCI World', 'Acciones/ETFs', '2025-11', { modo: 'participaciones', participaciones: 14, precio: 86, aportacion: 430 });
  addEntry('MSCI World', 'Acciones/ETFs', '2026-02', { modo: 'participaciones', participaciones: 19, precio: 90, aportacion: 450 });
  addEntry('MSCI World', 'Acciones/ETFs', '2026-06', { modo: 'participaciones', participaciones: 24, precio: 95, aportacion: 475 });

  return { assets, entries, meses: MESES };
}
