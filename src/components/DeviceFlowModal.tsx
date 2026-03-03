import { useState } from 'react';
import type { Verification } from '@/lib/auth';

interface Props {
  verification: Verification;
  onCancel: () => void;
}

export default function DeviceFlowModal({ verification, onCancel }: Props) {
  const [copied, setCopied] = useState(false);

  const copyCode = async () => {
    await navigator.clipboard.writeText(verification.user_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-sm rounded-lg border border-zinc-700 bg-zinc-900 p-6 shadow-xl">
        <h2 className="text-center text-sm font-semibold text-zinc-300">
          Sign in with GitHub
        </h2>

        <p className="mt-3 text-center text-xs text-zinc-400">
          Enter this code at GitHub to authorize:
        </p>

        {/* User code */}
        <div className="mt-3 flex items-center justify-center gap-2">
          <code className="rounded bg-zinc-800 px-4 py-2 font-mono text-2xl font-bold tracking-widest text-white">
            {verification.user_code}
          </code>
          <button
            onClick={copyCode}
            className="rounded p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
            title="Copy code"
          >
            {copied ? (
              <svg className="h-4 w-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>
        </div>

        {/* Link to GitHub */}
        <a
          href={verification.verification_uri}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 block rounded-md bg-zinc-100 px-4 py-2 text-center text-sm font-medium text-zinc-900 hover:bg-white"
        >
          Open GitHub
        </a>

        {/* Waiting indicator */}
        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-zinc-500">
          <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Waiting for authorization...
        </div>

        {/* Cancel */}
        <button
          onClick={onCancel}
          className="mt-4 w-full rounded-md px-3 py-1.5 text-xs text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
