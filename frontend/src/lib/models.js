// Modelo de datos (Fase 1).
//
// Asset: identidad estable de un activo.
//   { id, nombre, categoria, key }  // key = canonicalKey(nombre), uso interno
// Entry: un movimiento mensual sobre un asset.
//   {
//     id, assetId, mes /* 'YYYY-MM' */,
//     modo: 'valor' | 'participaciones',
//     valor,               // si modo === 'valor': valor total de la posición ese mes
//     participaciones, precio, // si modo === 'participaciones': valor = participaciones * precio
//     aportacion,           // opcional: dinero nuevo aportado ese mes (0 si no hubo aportación)
//   }
//
// Todas las agregaciones (totales mensuales, por categoría, por activo) se
// derivan ÚNICAMENTE de estas dos listas. Nunca se compara el string del
// nombre directamente: cada Entry referencia un assetId estable.

import { canonicalKey } from './normalize';

export const CATEGORIAS = [
  'Acciones/ETFs',
  'Fondos indexados',
  'Cripto',
  'Cuenta remunerada',
  'Materias primas/Oro',
  'Otros',
];

let _idCounter = 1;
export function nextId(prefix = 'id') {
  return `${prefix}_${_idCounter++}_${Math.floor(Math.random() * 1e6)}`;
}

export function createAsset({ nombre, categoria }) {
  return {
    id: nextId('asset'),
    nombre: nombre.trim(),
    key: canonicalKey(nombre),
    categoria: categoria || 'Otros',
  };
}

export function createEntry({ assetId, mes, modo = 'valor', valor = 0, participaciones = 0, precio = 0, aportacion = 0 }) {
  return {
    id: nextId('entry'),
    assetId,
    mes, // 'YYYY-MM'
    modo,
    valor: modo === 'valor' ? Number(valor) : Number(participaciones) * Number(precio),
    participaciones: modo === 'participaciones' ? Number(participaciones) : undefined,
    precio: modo === 'participaciones' ? Number(precio) : undefined,
    aportacion: Number(aportacion) || 0,
  };
}

// Busca (o crea) el Asset cuyo nombre canónico coincide. Esta es la función
// clave que soluciona el bug de duplicados: cualquier punto de entrada de
// datos (formulario manual, import CSV, datos de prueba) debe pasar por
// aquí antes de crear un Entry.
export function findOrCreateAsset(assets, { nombre, categoria }) {
  const key = canonicalKey(nombre);
  const existing = assets.find((a) => a.key === key);
  if (existing) return { assets, asset: existing };
  const asset = createAsset({ nombre, categoria });
  return { assets: [...assets, asset], asset };
}

// Fusión manual de duplicados que se hayan colado (p.ej. importados antes de
// que existiera la normalización). Reasigna todos los Entry del asset
// "duplicado" al asset "principal" y elimina el duplicado.
export function mergeAssets(assets, entries, keepId, mergeId) {
  if (keepId === mergeId) return { assets, entries };
  const newAssets = assets.filter((a) => a.id !== mergeId);
  const newEntries = entries.map((e) => (e.assetId === mergeId ? { ...e, assetId: keepId } : e));
  return { assets: newAssets, entries: newEntries };
}

// Detecta posibles duplicados existentes en una lista de assets (misma key).
export function findDuplicateAssets(assets) {
  const byKey = new Map();
  for (const a of assets) {
    if (!byKey.has(a.key)) byKey.set(a.key, []);
    byKey.get(a.key).push(a);
  }
  return [...byKey.values()].filter((group) => group.length > 1);
}
