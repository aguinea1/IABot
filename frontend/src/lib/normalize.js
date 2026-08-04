// Normalización de nombres de activos.
// Bug corregido en Fase 0: "S&P 500" vs "s&p500 " vs "SP500" se trataban como
// activos distintos porque las agregaciones comparaban strings sueltos sin
// una identidad estable. La solución es una clave canónica de comparación
// (trim + lowercase + colapso de espacios/símbolos no alfanuméricos) que se
// usa SOLO para decidir si dos entradas pertenecen al mismo Asset; el nombre
// "bonito" que ve el usuario se conserva tal cual se introdujo la primera vez.

export function canonicalKey(name) {
  if (!name) return '';
  return name
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // quita acentos
    .replace(/[^a-z0-9]+/g, ''); // quita espacios, &, ., etc. para comparar
}

// Distancia de edición simple (Levenshtein) usada para el autocompletado
// "activos parecidos" al escribir un nombre nuevo.
export function levenshtein(a, b) {
  a = canonicalKey(a);
  b = canonicalKey(b);
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) dp[i][j] = dp[i - 1][j - 1];
      else dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

export function similarAssets(name, assets, maxDistance = 2) {
  const key = canonicalKey(name);
  if (!key) return [];
  return assets
    .map((a) => ({ asset: a, dist: levenshtein(key, canonicalKey(a.nombre)) }))
    .filter(({ dist }) => dist <= maxDistance && dist > 0)
    .sort((a, b) => a.dist - b.dist)
    .map(({ asset }) => asset);
}
