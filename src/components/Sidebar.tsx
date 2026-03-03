import { useState, useRef, type DragEvent } from 'react';
import { useFileContext } from '@/contexts/FileContext';

export default function Sidebar({ open, onClose, onToggle }: { open: boolean; onClose: () => void; onToggle: () => void }) {
  const { files, activeFilePath, selectFile, deleteFile, renameFile, createFile, importFiles } =
    useFileContext();
  const [dragOver, setDragOver] = useState(false);
  const [showNewFile, setShowNewFile] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      importFiles(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleCreateFile = () => {
    if (newFileName.trim()) {
      createFile(newFileName.trim());
      setNewFileName('');
      setShowNewFile(false);
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/50 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar wrapper — always in flow, shrinks to just the toggle button when closed */}
      <div className="relative z-30 flex shrink-0">
        <aside
          className={`flex h-screen flex-col border-r border-zinc-700/50 bg-zinc-950 transition-all duration-200 overflow-hidden ${
            open ? 'w-64' : 'w-0 border-r-0'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={() => setDragOver(false)}
        >
          <div className="flex w-64 flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-700/50 p-3">
              <span className="text-sm font-semibold text-zinc-400">Files</span>
              <div className="flex gap-1">
                <button
                  onClick={() => setShowNewFile(true)}
                  className="rounded px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                  title="New file"
                >
                  + New
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                  title="Import files"
                >
                  Import
                </button>
              </div>
            </div>

            {/* New file input */}
            {showNewFile && (
              <div className="flex gap-1 border-b border-zinc-700/50 p-2">
                <input
                  autoFocus
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateFile();
                    if (e.key === 'Escape') setShowNewFile(false);
                  }}
                  placeholder="filename.md"
                  className="min-w-0 flex-1 rounded border border-zinc-600 bg-zinc-800 px-2 py-1 text-sm text-zinc-200 placeholder:text-zinc-500"
                />
                <button
                  onClick={handleCreateFile}
                  className="rounded bg-zinc-700 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-600"
                >
                  Add
                </button>
              </div>
            )}

            {/* File list */}
            <div className="flex-1 overflow-y-auto">
              {files.length === 0 ? (
                <div
                  className={`m-3 rounded-lg border-2 border-dashed p-6 text-center text-sm ${
                    dragOver
                      ? 'border-zinc-500 bg-zinc-800 text-zinc-300'
                      : 'border-zinc-700 text-zinc-500'
                  }`}
                >
                  Drop .md files here or click Import
                </div>
              ) : (
                <ul>
                  {files.map((file) => (
                    <li
                      key={file.path}
                      className={`group flex cursor-pointer items-center gap-2 border-b border-zinc-800/50 px-3 py-2 text-sm ${
                        activeFilePath === file.path
                          ? 'bg-zinc-800 text-white'
                          : 'text-zinc-300 hover:bg-zinc-800/50'
                      }`}
                      onClick={() => {
                        if (renamingPath !== file.path) {
                          selectFile(file.path);
                        }
                      }}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setRenamingPath(file.path);
                        setRenameValue(file.path);
                      }}
                    >
                      {renamingPath === file.path ? (
                        <input
                          autoFocus
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onFocus={(e) => {
                            // Select filename without extension
                            const dotIdx = e.target.value.lastIndexOf('.');
                            e.target.setSelectionRange(0, dotIdx > 0 ? dotIdx : e.target.value.length);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.currentTarget.blur();
                            }
                            if (e.key === 'Escape') {
                              setRenamingPath(null);
                            }
                          }}
                          onBlur={() => {
                            const trimmed = renameValue.trim();
                            if (trimmed && trimmed !== file.path) {
                              renameFile(file.path, trimmed);
                            }
                            setRenamingPath(null);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="min-w-0 flex-1 rounded border border-zinc-600 bg-zinc-800 px-1 py-0 text-sm text-zinc-200"
                        />
                      ) : (
                        <span className="min-w-0 flex-1 truncate">{file.path}</span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Delete "${file.path}"?`)) {
                            deleteFile(file.path);
                          }
                        }}
                        className="shrink-0 rounded px-1 text-xs text-zinc-500 opacity-0 hover:bg-red-500/20 hover:text-red-400 group-hover:opacity-100"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Drag-over indicator */}
            {dragOver && files.length > 0 && (
              <div className="absolute inset-0 flex items-center justify-center rounded bg-zinc-800/80 text-sm font-medium text-zinc-300">
                Drop to import
              </div>
            )}

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".md"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) importFiles(e.target.files);
                e.target.value = '';
              }}
            />
          </div>
        </aside>

        {/* Toggle button — always visible, sits at the right edge */}
        <button
          onClick={onToggle}
          className="flex h-8 w-6 items-center justify-center self-start mt-12 rounded-r-md border border-l-0 border-zinc-700/50 bg-zinc-950 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
          aria-label="Toggle sidebar"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {open ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7" />
            )}
          </svg>
        </button>
      </div>
    </>
  );
}
