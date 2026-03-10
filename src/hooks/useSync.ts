import { useState, useEffect, useCallback } from 'react';
import type { AuthData } from '@/lib/auth';
import { getSetting, setSetting, getAllFiles, getAllAnnotations } from '@/lib/storage';
import { buildSyncPlan, executeSyncPlan } from '@/lib/sync';
import type { SyncRepo, SyncPlan } from '@/lib/sync';

export type SyncStatus =
  | 'idle'
  | 'syncing'
  | 'needs_repo'
  | 'has_conflicts'
  | 'success'
  | 'error';

const REPO_STORAGE_KEY = 'sync-repo';

export function useSync(
  auth: AuthData | null,
  refreshFiles: () => Promise<void>,
) {
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [selectedRepo, setSelectedRepo] = useState<SyncRepo | null>(null);
  const [syncPlan, setSyncPlan] = useState<SyncPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState('');

  // Load saved repo on mount
  useEffect(() => {
    getSetting<SyncRepo>(REPO_STORAGE_KEY).then((repo) => {
      if (repo) setSelectedRepo(repo);
    });
  }, []);

  const selectRepo = useCallback(async (repo: SyncRepo) => {
    setSelectedRepo(repo);
    await setSetting(REPO_STORAGE_KEY, repo);
  }, []);

  const disconnectRepo = useCallback(async () => {
    setSelectedRepo(null);
    await setSetting(REPO_STORAGE_KEY, null);
    setStatus('idle');
  }, []);

  const cancelSync = useCallback(() => {
    setSyncPlan(null);
    setStatus('idle');
    setError(null);
    setProgress('');
  }, []);

  const sync = useCallback(async () => {
    if (!auth) return;
    if (!selectedRepo) {
      setStatus('needs_repo');
      return;
    }

    setStatus('syncing');
    setError(null);

    try {
      setProgress('Comparing files...');
      const localFiles = await getAllFiles();
      const localAnnotations = await getAllAnnotations();
      const plan = await buildSyncPlan(auth.token, selectedRepo, localFiles, localAnnotations);

      if (plan.conflicts.length > 0) {
        setSyncPlan(plan);
        setStatus('has_conflicts');
        return;
      }

      setProgress('Syncing files...');
      await executeSyncPlan(auth.token, selectedRepo, plan, new Map());
      await refreshFiles();
      setStatus('success');
      setProgress('');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed');
      setStatus('error');
      setProgress('');
    }
  }, [auth, selectedRepo, refreshFiles]);

  const resolveConflictsAndSync = useCallback(
    async (resolutions: Map<string, 'local' | 'remote'>) => {
      if (!auth || !selectedRepo || !syncPlan) return;

      setStatus('syncing');
      setProgress('Applying resolutions...');

      try {
        await executeSyncPlan(auth.token, selectedRepo, syncPlan, resolutions);
        await refreshFiles();
        setSyncPlan(null);
        setStatus('success');
        setProgress('');
        setTimeout(() => setStatus('idle'), 2000);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Sync failed');
        setStatus('error');
        setProgress('');
      }
    },
    [auth, selectedRepo, syncPlan, refreshFiles],
  );

  // After selecting a repo, trigger sync automatically
  const selectRepoAndSync = useCallback(
    async (repo: SyncRepo) => {
      await selectRepo(repo);
      // Need to trigger sync with the new repo directly since state won't update yet
      if (!auth) return;
      setStatus('syncing');
      setError(null);

      try {
        setProgress('Comparing files...');
        const localFiles = await getAllFiles();
        const localAnnotations = await getAllAnnotations();
        const plan = await buildSyncPlan(auth.token, repo, localFiles, localAnnotations);

        if (plan.conflicts.length > 0) {
          setSyncPlan(plan);
          setStatus('has_conflicts');
          return;
        }

        setProgress('Syncing files...');
        await executeSyncPlan(auth.token, repo, plan, new Map());
        await refreshFiles();
        setStatus('success');
        setProgress('');
        setTimeout(() => setStatus('idle'), 2000);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Sync failed');
        setStatus('error');
        setProgress('');
      }
    },
    [auth, selectRepo, refreshFiles],
  );

  return {
    status,
    selectedRepo,
    syncPlan,
    error,
    progress,
    sync,
    selectRepoAndSync,
    disconnectRepo,
    resolveConflictsAndSync,
    cancelSync,
  };
}
