interface Props {
  hasUnsyncedChanges: boolean;
  isAuthenticated: boolean;
  username: string | null;
  isLoggingIn: boolean;
  onSync: () => void;
  onLogout: () => void;
}

export default function SyncButton({
  hasUnsyncedChanges,
  isAuthenticated,
  username,
  isLoggingIn,
  onSync,
  onLogout,
}: Props) {
  if (!hasUnsyncedChanges && !isAuthenticated) return null;

  return (
    <div className="flex items-center gap-1.5">
      {isAuthenticated && username && (
        <button
          onClick={onLogout}
          className="rounded px-1.5 py-0.5 text-xs text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
          title="Sign out"
        >
          {username}
        </button>
      )}
      <button
        onClick={onSync}
        disabled={isLoggingIn}
        className="relative flex items-center gap-1.5 rounded-md bg-zinc-800/90 px-2.5 py-1 text-xs font-medium text-zinc-300 shadow-lg shadow-black/20 backdrop-blur-sm hover:bg-zinc-700 disabled:opacity-50"
        title={isAuthenticated ? 'Sync changes' : 'Sign in with GitHub to sync'}
      >
        {/* Cloud upload icon */}
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        {isLoggingIn ? 'Signing in...' : isAuthenticated ? 'Sync' : 'Sign in'}
        {/* Pending changes dot */}
        {hasUnsyncedChanges && (
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-amber-500" />
        )}
      </button>
    </div>
  );
}
