import { useState } from 'react';
import type { SyncAction } from '@/lib/sync';

interface Props {
  conflicts: SyncAction[];
  onResolve: (resolutions: Map<string, 'local' | 'remote'>) => void;
  onCancel: () => void;
}

export default function ConflictDialog({ conflicts, onResolve, onCancel }: Props) {
  const [resolutions, setResolutions] = useState<Map<string, 'local' | 'remote'>>(new Map());

  const setResolution = (path: string, choice: 'local' | 'remote') => {
    setResolutions((prev) => {
      const next = new Map(prev);
      next.set(path, choice);
      return next;
    });
  };

  const allResolved = conflicts.every((c) => resolutions.has(c.path));

  const getAnnotationSummary = (content: string | undefined): string => {
    if (!content) return '0 annotations';
    try {
      const data = JSON.parse(content);
      const count = data.annotations?.length ?? 0;
      return `${count} annotation${count !== 1 ? 's' : ''}`;
    } catch {
      return 'unknown';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-4 flex w-full max-w-lg flex-col rounded-lg border border-zinc-700 bg-zinc-900 p-6 shadow-xl">
        <h2 className="text-sm font-semibold text-zinc-300">
          Resolve Sync Conflicts
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          {conflicts.length} file{conflicts.length !== 1 ? 's' : ''} changed both locally and remotely.
        </p>

        <div className="mt-4 max-h-80 space-y-3 overflow-y-auto">
          {conflicts.map((conflict) => {
            const choice = resolutions.get(conflict.path);
            return (
              <div
                key={conflict.path}
                className="rounded-md border border-zinc-700 bg-zinc-800 p-3"
              >
                <p className="text-sm font-medium text-zinc-200">
                  {conflict.path}
                </p>
                {conflict.isAnnotation ? (
                  <p className="mt-1 text-xs text-zinc-500">
                    Local: {getAnnotationSummary(conflict.localContent)} | Remote: {getAnnotationSummary(conflict.remoteContent)}
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-zinc-500">
                    Both versions have been modified since last sync
                  </p>
                )}
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => setResolution(conflict.path, 'local')}
                    className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                      choice === 'local'
                        ? 'bg-blue-600 text-white'
                        : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                    }`}
                  >
                    Keep Local
                  </button>
                  <button
                    onClick={() => setResolution(conflict.path, 'remote')}
                    className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                      choice === 'remote'
                        ? 'bg-blue-600 text-white'
                        : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                    }`}
                  >
                    Keep Remote
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 rounded-md px-3 py-1.5 text-xs text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
          >
            Cancel
          </button>
          <button
            onClick={() => onResolve(resolutions)}
            disabled={!allResolved}
            className="flex-1 rounded-md bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-900 hover:bg-white disabled:opacity-50"
          >
            Apply ({resolutions.size}/{conflicts.length})
          </button>
        </div>
      </div>
    </div>
  );
}
