import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';

/**
 * Loads data on mount and every time the screen regains focus.
 * `refresh` is for pull-to-refresh; `reload` refetches silently.
 */
export function useApi<T>(fetcher: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const fetchRef = useRef(fetcher);
  fetchRef.current = fetcher;

  const reload = useCallback(async () => {
    try {
      setData(await fetchRef.current());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    }
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }, [reload]);

  // focus covers the first load; this only refetches when inputs (e.g. search query) change afterwards
  const mounted = useRef(false);
  useEffect(() => {
    if (mounted.current) reload();
    mounted.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  return { data, error, refreshing, refresh, reload, setData };
}

/** Calls fn every `ms` while the screen is focused (used for chat threads). */
export function usePolling(fn: () => void, ms: number) {
  useFocusEffect(
    useCallback(() => {
      const t = setInterval(fn, ms);
      return () => clearInterval(t);
    }, [fn, ms]),
  );
}
