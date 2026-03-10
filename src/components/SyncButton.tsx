import type { SyncStatus } from '@/hooks/useSync';

interface Props {
  hasUnsyncedChanges: boolean;
  isAuthenticated: boolean;
  username: string | null;
  isLoggingIn: boolean;
  syncStatus: SyncStatus;
  repoName: string | null;
  syncProgress: string;
  onSync: () => void;
  onLogin: () => void;
  onLogout: () => void;
  onDisconnectRepo: () => void;
}

export default function SyncButton({
  hasUnsyncedChanges,
  isAuthenticated,
  username,
  isLoggingIn,
  syncStatus,
  repoName,
  syncProgress,
  onSync,
  onLogin,
  onLogout,
  onDisconnectRepo,
}: Props) {
  const isSyncing = syncStatus === 'syncing';
  const isSuccess = syncStatus === 'success';
  const isError = syncStatus === 'error';

  const handleClick = () => {
    if (!isAuthenticated) {
      onLogin();
    } else {
      onSync();
    }
  };

  const getLabel = () => {
    if (isLoggingIn) return 'Signing in...';
    if (!isAuthenticated) return 'Sign in';
    if (isSyncing) return syncProgress || 'Syncing...';
    if (isSuccess) return 'Synced!';
    if (isError) return 'Retry sync';
    return 'Sync';
  };

  return (
    <div className="flex items-center gap-1.5">
      {isAuthenticated && username && (
        <div className="flex items-center gap-1">
          {repoName && (
            <button
              onClick={onDisconnectRepo}
              className="rounded px-1.5 py-0.5 text-[10px] text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
              title="Disconnect repo"
            >
              {repoName}
            </button>
          )}
          <button
            onClick={onLogout}
            className="rounded px-1.5 py-0.5 text-xs text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
            title="Sign out"
          >
            {username}
          </button>
        </div>
      )}
      <button
        onClick={handleClick}
        disabled={isLoggingIn || isSyncing}
        className={`relative flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium shadow-lg shadow-black/20 backdrop-blur-sm disabled:opacity-50 ${
          isSuccess
            ? 'bg-green-800/90 text-green-200'
            : isError
              ? 'bg-red-900/90 text-red-200 hover:bg-red-800'
              : 'bg-zinc-800/90 text-zinc-300 hover:bg-zinc-700'
        }`}
        title={isAuthenticated ? 'Sync changes' : 'Sign in with GitHub to sync'}
      >
        {isSyncing ? (
          <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : isSuccess ? (
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        )}
        {getLabel()}
        {hasUnsyncedChanges && !isSuccess && (
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-amber-500" />
        )}
      </button>
    </div>
  );
}
