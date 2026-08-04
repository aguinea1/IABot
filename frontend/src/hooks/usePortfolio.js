import { useState, useEffect, useCallback, useMemo } from 'react';
import { loadState, saveState } from '../lib/storage';
import { findOrCreateAsset, createEntry, mergeAssets, findDuplicateAssets } from '../lib/models';
import { buildTestData } from '../data/testData';

function emptyState() {
  return { assets: [], entries: [] };
}

export function usePortfolio() {
  const [state, setState] = useState(() => loadState() || emptyState());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // simula una carga breve para mostrar el skeleton loader (Fase 4)
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const addEntry = useCallback((nombre, categoria, mes, opts) => {
    setState((prev) => {
      const r = findOrCreateAsset(prev.assets, { nombre, categoria });
      const entry = createEntry({ assetId: r.asset.id, mes, ...opts });
      return { assets: r.assets, entries: [...prev.entries, entry] };
    });
  }, []);

  const removeEntry = useCallback((entryId) => {
    setState((prev) => ({ ...prev, entries: prev.entries.filter((e) => e.id !== entryId) }));
  }, []);

  const merge = useCallback((keepId, mergeId) => {
    setState((prev) => {
      const r = mergeAssets(prev.assets, prev.entries, keepId, mergeId);
      return r;
    });
  }, []);

  const loadDemoData = useCallback(() => {
    setState(buildTestData());
  }, []);

  const resetAll = useCallback(() => {
    setState(emptyState());
  }, []);

  const importState = useCallback((data) => {
    setState({ assets: data.assets || [], entries: data.entries || [] });
  }, []);

  const duplicates = useMemo(() => findDuplicateAssets(state.assets), [state.assets]);

  return { state, loading, addEntry, removeEntry, merge, loadDemoData, resetAll, importState, duplicates };
}
