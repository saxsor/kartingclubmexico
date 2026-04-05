import { useEffect, useRef, useCallback } from 'react';
import { get, set, del, keys } from 'idb-keyval';
import { racesApi } from '../api/races.api';
import { ResultStatus } from '../api/races.api';

interface PendingResult {
  id: string;
  raceId: string;
  results: {
    inscriptionId: string;
    position: number | null;
    lapsCompleted: number;
    status: ResultStatus;
  }[];
  timestamp: number;
}

const STORE_PREFIX = 'offline-result-';

export function useOfflineSync() {
  const isOnline = useRef(navigator.onLine);

  const saveLocally = useCallback(async (raceId: string, results: PendingResult['results']) => {
    const key = `${STORE_PREFIX}${raceId}`;
    const pending: PendingResult = {
      id: key,
      raceId,
      results,
      timestamp: Date.now(),
    };
    await set(key, pending);
    return pending;
  }, []);

  const sync = useCallback(async () => {
    if (!navigator.onLine) return;

    const allKeys = await keys();
    const pendingKeys = allKeys.filter(
      (k) => typeof k === 'string' && k.startsWith(STORE_PREFIX),
    ) as string[];

    for (const key of pendingKeys) {
      const pending = await get<PendingResult>(key);
      if (!pending) continue;

      try {
        await racesApi.saveResults(pending.raceId, pending.results);
        await del(key);
        console.log(`Synced offline result: ${key}`);
      } catch (err) {
        console.error(`Failed to sync ${key}:`, err);
      }
    }
  }, []);

  const saveAndSync = useCallback(
    async (raceId: string, results: PendingResult['results']) => {
      await saveLocally(raceId, results);
      if (navigator.onLine) {
        await sync();
      }
    },
    [saveLocally, sync],
  );

  useEffect(() => {
    const handleOnline = () => {
      isOnline.current = true;
      sync();
    };
    const handleOffline = () => {
      isOnline.current = false;
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Try syncing on mount
    sync();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [sync]);

  return { saveAndSync, sync };
}
