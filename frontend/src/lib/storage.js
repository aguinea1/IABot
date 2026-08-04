// Persistencia real con localStorage (sustituye a window.storage, que solo
// existe dentro de artifacts de Claude.ai). Si en el futuro se añade backend,
// este módulo es el único punto que habría que cambiar por llamadas fetch.

const KEY = 'iabot_dashboard_v1';

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error leyendo localStorage, se ignora estado corrupto', e);
    return null;
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Error guardando en localStorage (¿cuota superada?)', e);
  }
}

export function exportStateAsJSON(state) {
  return JSON.stringify(state, null, 2);
}

export function clearState() {
  localStorage.removeItem(KEY);
}
