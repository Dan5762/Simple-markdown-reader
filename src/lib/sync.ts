import type { StoredFile, StoredAnnotations, AnnotationFile } from '@/types';
import {
  saveFile,
  saveAnnotations,
  deleteFileFromDb,
  deleteAnnotationsFromDb,
} from '@/lib/storage';
import {
  getRepoTree,
  getFileContent,
  createOrUpdateFile,
  deleteRemoteFile,
} from '@/lib/github';

export interface SyncRepo {
  owner: string;
  name: string;
}

export type SyncActionType =
  | 'pull_new'
  | 'pull_update'
  | 'push_new'
  | 'push_update'
  | 'conflict'
  | 'delete_local'
  | 'delete_remote'
  | 'up_to_date';

export interface SyncAction {
  path: string;
  type: SyncActionType;
  localContent?: string;
  remoteContent?: string;
  remoteSha?: string;
  storedRemoteSha?: string;
  isAnnotation: boolean;
}

export interface SyncPlan {
  actions: SyncAction[];
  conflicts: SyncAction[];
}

export interface SyncResult {
  pushed: number;
  pulled: number;
  deleted: number;
  errors: string[];
}

export async function buildSyncPlan(
  token: string,
  repo: SyncRepo,
  localFiles: StoredFile[],
  localAnnotations: StoredAnnotations[],
): Promise<SyncPlan> {
  // 1. Get remote tree
  const remoteEntries = await getRepoTree(token, repo.owner, repo.name);
  const remoteMap = new Map(remoteEntries.map((e) => [e.path, e.sha]));

  // 2. Build local maps
  const localFileMap = new Map(localFiles.map((f) => [f.path, f]));
  const localAnnMap = new Map(localAnnotations.map((a) => [a.path, a]));

  // 3. Collect all paths
  const allPaths = new Set<string>();
  for (const path of remoteMap.keys()) allPaths.add(path);
  for (const path of localFileMap.keys()) allPaths.add(path);
  for (const path of localAnnMap.keys()) allPaths.add(path);

  // 4. Determine action for each path
  const actions: SyncAction[] = [];
  const pathsNeedingRemoteContent: string[] = [];

  for (const path of allPaths) {
    const isAnnotation = path.endsWith('.annotations.json');
    const local = isAnnotation ? localAnnMap.get(path) : localFileMap.get(path);
    const remoteSha = remoteMap.get(path);

    if (local && !remoteSha) {
      // Local only
      if (local.remoteSha !== null) {
        // Was synced before but now deleted remotely
        actions.push({
          path,
          type: 'delete_local',
          localContent: isAnnotation
            ? JSON.stringify((local as StoredAnnotations).data)
            : (local as StoredFile).content,
          isAnnotation,
        });
      } else {
        // New local file, never synced
        actions.push({
          path,
          type: 'push_new',
          localContent: isAnnotation
            ? JSON.stringify((local as StoredAnnotations).data, null, 2)
            : (local as StoredFile).content,
          isAnnotation,
        });
      }
    } else if (!local && remoteSha) {
      // Remote only — pull it
      actions.push({
        path,
        type: 'pull_new',
        remoteSha,
        isAnnotation,
      });
      pathsNeedingRemoteContent.push(path);
    } else if (local && remoteSha) {
      // Both exist
      if (local.remoteSha === remoteSha) {
        // Remote unchanged since last sync
        if (local.locallyModified) {
          actions.push({
            path,
            type: 'push_update',
            localContent: isAnnotation
              ? JSON.stringify((local as StoredAnnotations).data, null, 2)
              : (local as StoredFile).content,
            remoteSha,
            storedRemoteSha: local.remoteSha,
            isAnnotation,
          });
        } else {
          actions.push({ path, type: 'up_to_date', isAnnotation });
        }
      } else {
        // Remote has changed
        if (local.locallyModified) {
          // Conflict!
          actions.push({
            path,
            type: 'conflict',
            localContent: isAnnotation
              ? JSON.stringify((local as StoredAnnotations).data, null, 2)
              : (local as StoredFile).content,
            remoteSha,
            storedRemoteSha: local.remoteSha ?? undefined,
            isAnnotation,
          });
          pathsNeedingRemoteContent.push(path);
        } else {
          // Pull remote update
          actions.push({
            path,
            type: 'pull_update',
            remoteSha,
            storedRemoteSha: local.remoteSha ?? undefined,
            isAnnotation,
          });
          pathsNeedingRemoteContent.push(path);
        }
      }
    }
  }

  // 5. Fetch remote content for files that need it (batched, max 5 concurrent)
  const BATCH_SIZE = 5;
  for (let i = 0; i < pathsNeedingRemoteContent.length; i += BATCH_SIZE) {
    const batch = pathsNeedingRemoteContent.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map((p) => getFileContent(token, repo.owner, repo.name, p)),
    );
    for (const remote of results) {
      const action = actions.find((a) => a.path === remote.path);
      if (action) {
        action.remoteContent = remote.content;
        action.remoteSha = remote.sha;
      }
    }
  }

  const conflicts = actions.filter((a) => a.type === 'conflict');
  return { actions, conflicts };
}

export async function executeSyncPlan(
  token: string,
  repo: SyncRepo,
  plan: SyncPlan,
  resolutions: Map<string, 'local' | 'remote'>,
): Promise<SyncResult> {
  const result: SyncResult = { pushed: 0, pulled: 0, deleted: 0, errors: [] };

  for (const action of plan.actions) {
    if (action.type === 'up_to_date') continue;

    try {
      if (action.type === 'push_new' || action.type === 'push_update') {
        const newSha = await createOrUpdateFile(
          token, repo.owner, repo.name,
          action.path, action.localContent!,
          action.type === 'push_update' ? action.remoteSha : undefined,
        );
        await updateLocalAfterPush(action.path, newSha, action.isAnnotation);
        result.pushed++;
      } else if (action.type === 'pull_new' || action.type === 'pull_update') {
        await saveRemoteContent(action.path, action.remoteContent!, action.remoteSha!, action.isAnnotation);
        result.pulled++;
      } else if (action.type === 'delete_local') {
        if (action.isAnnotation) {
          await deleteAnnotationsFromDb(action.path);
        } else {
          await deleteFileFromDb(action.path);
          // Also delete associated annotations
          const annPath = action.path.replace(/\.md$/, '.annotations.json');
          await deleteAnnotationsFromDb(annPath);
        }
        result.deleted++;
      } else if (action.type === 'delete_remote') {
        if (action.remoteSha) {
          await deleteRemoteFile(token, repo.owner, repo.name, action.path, action.remoteSha);
        }
        result.deleted++;
      } else if (action.type === 'conflict') {
        const resolution = resolutions.get(action.path);
        if (!resolution) continue; // Skip unresolved
        if (resolution === 'local') {
          const newSha = await createOrUpdateFile(
            token, repo.owner, repo.name,
            action.path, action.localContent!, action.remoteSha,
          );
          await updateLocalAfterPush(action.path, newSha, action.isAnnotation);
          result.pushed++;
        } else {
          await saveRemoteContent(action.path, action.remoteContent!, action.remoteSha!, action.isAnnotation);
          result.pulled++;
        }
      }
    } catch (err) {
      result.errors.push(`${action.path}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return result;
}

async function updateLocalAfterPush(
  path: string,
  newSha: string,
  isAnnotation: boolean,
): Promise<void> {
  if (isAnnotation) {
    const { getAnnotations } = await import('@/lib/storage');
    const existing = await getAnnotations(path);
    if (existing) {
      await saveAnnotations({
        ...existing,
        remoteSha: newSha,
        locallyModified: false,
      });
    }
  } else {
    const { getFile } = await import('@/lib/storage');
    const existing = await getFile(path);
    if (existing) {
      await saveFile({
        ...existing,
        remoteSha: newSha,
        locallyModified: false,
      });
    }
  }
}

async function saveRemoteContent(
  path: string,
  content: string,
  sha: string,
  isAnnotation: boolean,
): Promise<void> {
  const now = new Date().toISOString();
  if (isAnnotation) {
    let data: AnnotationFile;
    try {
      data = JSON.parse(content) as AnnotationFile;
    } catch {
      data = { version: 1, annotations: [] };
    }
    await saveAnnotations({
      path,
      data,
      remoteSha: sha,
      locallyModified: false,
      lastModified: now,
    });
  } else {
    await saveFile({
      path,
      content,
      remoteSha: sha,
      locallyModified: false,
      lastModified: now,
    });
  }
}
