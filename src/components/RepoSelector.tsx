import { useState, useEffect } from 'react';
import { listRepos, createRepo } from '@/lib/github';
import type { RepoInfo } from '@/lib/github';
import type { SyncRepo } from '@/lib/sync';

interface Props {
  token: string;
  onSelect: (repo: SyncRepo) => void;
  onCancel: () => void;
}

export default function RepoSelector({ token, onSelect, onCancel }: Props) {
  const [repos, setRepos] = useState<RepoInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [newRepoName, setNewRepoName] = useState('');
  const [isPrivate, setIsPrivate] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listRepos(token)
      .then(setRepos)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load repos'))
      .finally(() => setLoading(false));
  }, [token]);

  const filtered = repos.filter((r) =>
    r.name.toLowerCase().includes(filter.toLowerCase()),
  );

  const handleCreate = async () => {
    if (!newRepoName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const repo = await createRepo(token, newRepoName.trim(), isPrivate);
      onSelect({ owner: repo.owner, name: repo.name });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create repo');
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-4 flex w-full max-w-md flex-col rounded-lg border border-zinc-700 bg-zinc-900 p-6 shadow-xl">
        <h2 className="text-sm font-semibold text-zinc-300">
          Connect a Repository
        </h2>

        {error && (
          <p className="mt-2 text-xs text-red-400">{error}</p>
        )}

        {/* Search */}
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search your repos..."
          className="mt-3 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200 placeholder-zinc-500 focus:border-zinc-500 focus:outline-none"
        />

        {/* Repo list */}
        <div className="mt-2 max-h-48 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-6 text-xs text-zinc-500">
              <svg className="mr-2 h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Loading repos...
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-4 text-center text-xs text-zinc-500">
              {filter ? 'No matching repos' : 'No repos found'}
            </p>
          ) : (
            filtered.map((repo) => (
              <button
                key={repo.fullName}
                onClick={() => onSelect({ owner: repo.owner, name: repo.name })}
                className="flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-800"
              >
                <span className="flex items-center gap-2">
                  <span>{repo.name}</span>
                  {repo.isPrivate && (
                    <span className="rounded bg-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-400">
                      private
                    </span>
                  )}
                </span>
                <span className="text-xs text-zinc-500">Select</span>
              </button>
            ))
          )}
        </div>

        {/* Divider */}
        <div className="mt-3 flex items-center gap-2">
          <div className="h-px flex-1 bg-zinc-700" />
          <span className="text-[10px] text-zinc-500">or create new</span>
          <div className="h-px flex-1 bg-zinc-700" />
        </div>

        {/* Create new */}
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={newRepoName}
            onChange={(e) => setNewRepoName(e.target.value)}
            placeholder="repo-name"
            className="flex-1 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200 placeholder-zinc-500 focus:border-zinc-500 focus:outline-none"
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <label className="flex items-center gap-1.5 text-xs text-zinc-400">
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="rounded"
            />
            Private
          </label>
        </div>
        <button
          onClick={handleCreate}
          disabled={!newRepoName.trim() || creating}
          className="mt-2 rounded-md bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-900 hover:bg-white disabled:opacity-50"
        >
          {creating ? 'Creating...' : 'Create & Connect'}
        </button>

        {/* Cancel */}
        <button
          onClick={onCancel}
          className="mt-3 w-full rounded-md px-3 py-1.5 text-xs text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
