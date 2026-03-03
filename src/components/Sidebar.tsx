import { useState, useRef, useCallback, type DragEvent } from 'react';
import { useFileContext } from '@/contexts/FileContext';
import { buildFileTree, getBasename, type TreeNode } from '@/lib/fileTree';

export default function Sidebar({ open, onClose, onToggle }: { open: boolean; onClose: () => void; onToggle: () => void }) {
  const {
    files, folders, activeFilePath, selectFile, deleteFile, renameFile,
    createFile, createFolder, deleteFolder, renameFolder, importFiles,
  } = useFileContext();
  const [dragOver, setDragOver] = useState(false);
  const [showNewInput, setShowNewInput] = useState<{ type: 'file' | 'folder'; parent: string } | null>(null);
  const [newName, setNewName] = useState('');
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tree = buildFileTree(files, folders);

  const toggleFolder = useCallback((path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

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

  const handleCreate = () => {
    if (!showNewInput || !newName.trim()) return;
    if (showNewInput.type === 'file') {
      createFile(newName.trim(), showNewInput.parent || undefined);
    } else {
      createFolder(newName.trim(), showNewInput.parent || undefined);
      // Auto-expand parent so the new folder is visible
      if (showNewInput.parent) {
        setExpandedFolders((prev) => new Set(prev).add(showNewInput.parent));
      }
    }
    setNewName('');
    setShowNewInput(null);
  };

  const startNewFile = (parent = '') => {
    setShowNewInput({ type: 'file', parent });
    setNewName('');
    if (parent) {
      setExpandedFolders((prev) => new Set(prev).add(parent));
    }
  };

  const startNewFolder = (parent = '') => {
    setShowNewInput({ type: 'folder', parent });
    setNewName('');
    if (parent) {
      setExpandedFolders((prev) => new Set(prev).add(parent));
    }
  };

  const renderNewInput = (parent: string) => {
    if (!showNewInput || showNewInput.parent !== parent) return null;
    return (
      <div className="flex gap-1 px-2 py-1" style={{ paddingLeft: parent ? undefined : 8 }}>
        <input
          autoFocus
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleCreate();
            if (e.key === 'Escape') setShowNewInput(null);
          }}
          placeholder={showNewInput.type === 'file' ? 'filename.md' : 'folder name'}
          className="min-w-0 flex-1 rounded border border-zinc-600 bg-zinc-800 px-2 py-0.5 text-sm text-zinc-200 placeholder:text-zinc-500"
        />
        <button
          onClick={handleCreate}
          className="rounded bg-zinc-700 px-2 py-0.5 text-xs text-zinc-200 hover:bg-zinc-600"
        >
          {showNewInput.type === 'file' ? 'Add' : 'Create'}
        </button>
      </div>
    );
  };

  const renderNode = (node: TreeNode, depth: number) => {
    const indent = depth * 16;

    if (node.type === 'folder') {
      const isExpanded = expandedFolders.has(node.path);
      const isRenaming = renamingPath === `folder:${node.path}`;

      return (
        <li key={`folder:${node.path}`}>
          <div
            className="group flex cursor-pointer items-center gap-1 px-2 py-1.5 text-sm text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
            style={{ paddingLeft: 8 + indent }}
            onClick={() => toggleFolder(node.path)}
            onDoubleClick={(e) => {
              e.stopPropagation();
              setRenamingPath(`folder:${node.path}`);
              setRenameValue(node.name);
            }}
          >
            {/* Chevron */}
            <svg className={`h-3 w-3 shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            {/* Folder icon */}
            <svg className="h-3.5 w-3.5 shrink-0 text-zinc-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
            </svg>
            {isRenaming ? (
              <input
                autoFocus
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.currentTarget.blur();
                  if (e.key === 'Escape') setRenamingPath(null);
                }}
                onBlur={() => {
                  const trimmed = renameValue.trim();
                  if (trimmed && trimmed !== node.name) {
                    renameFolder(node.path, trimmed);
                  }
                  setRenamingPath(null);
                }}
                onClick={(e) => e.stopPropagation()}
                className="min-w-0 flex-1 rounded border border-zinc-600 bg-zinc-800 px-1 py-0 text-sm text-zinc-200"
              />
            ) : (
              <span className="min-w-0 flex-1 truncate">{node.name}</span>
            )}
            {/* Folder actions */}
            <div className="flex shrink-0 gap-0.5 opacity-0 group-hover:opacity-100">
              <button
                onClick={(e) => { e.stopPropagation(); startNewFile(node.path); }}
                className="rounded px-1 text-xs text-zinc-500 hover:bg-zinc-700 hover:text-zinc-300"
                title="New file in folder"
              >
                +
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); startNewFolder(node.path); }}
                className="rounded px-1 text-xs text-zinc-500 hover:bg-zinc-700 hover:text-zinc-300"
                title="New subfolder"
              >
                +/
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Delete folder "${node.name}" and all its contents?`)) {
                    deleteFolder(node.path);
                  }
                }}
                className="rounded px-1 text-xs text-zinc-500 hover:bg-red-500/20 hover:text-red-400"
                title="Delete folder"
              >
                ✕
              </button>
            </div>
          </div>
          {isExpanded && (
            <ul>
              {renderNewInput(node.path)}
              {node.children?.map((child) => renderNode(child, depth + 1))}
            </ul>
          )}
        </li>
      );
    }

    // File node
    const isActive = activeFilePath === node.path;
    const isRenaming = renamingPath === node.path;
    const basename = getBasename(node.path);

    return (
      <li
        key={node.path}
        className={`group flex cursor-pointer items-center gap-2 px-2 py-1.5 text-sm ${
          isActive
            ? 'bg-zinc-800 text-white'
            : 'text-zinc-300 hover:bg-zinc-800/50'
        }`}
        style={{ paddingLeft: 8 + indent }}
        onClick={() => {
          if (!isRenaming) selectFile(node.path);
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          setRenamingPath(node.path);
          setRenameValue(basename);
        }}
      >
        {/* File icon */}
        <svg className="h-3.5 w-3.5 shrink-0 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        {isRenaming ? (
          <input
            autoFocus
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onFocus={(e) => {
              const dotIdx = e.target.value.lastIndexOf('.');
              e.target.setSelectionRange(0, dotIdx > 0 ? dotIdx : e.target.value.length);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur();
              if (e.key === 'Escape') setRenamingPath(null);
            }}
            onBlur={() => {
              const trimmed = renameValue.trim();
              if (trimmed && trimmed !== basename) {
                renameFile(node.path, trimmed);
              }
              setRenamingPath(null);
            }}
            onClick={(e) => e.stopPropagation()}
            className="min-w-0 flex-1 rounded border border-zinc-600 bg-zinc-800 px-1 py-0 text-sm text-zinc-200"
          />
        ) : (
          <span className="min-w-0 flex-1 truncate">{basename}</span>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm(`Delete "${basename}"?`)) {
              deleteFile(node.path);
            }
          }}
          className="shrink-0 rounded px-1 text-xs text-zinc-500 opacity-0 hover:bg-red-500/20 hover:text-red-400 group-hover:opacity-100"
        >
          ✕
        </button>
      </li>
    );
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

      {/* Sidebar wrapper */}
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
                  onClick={() => startNewFile()}
                  className="rounded px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                  title="New file"
                >
                  + File
                </button>
                <button
                  onClick={() => startNewFolder()}
                  className="rounded px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                  title="New folder"
                >
                  + Folder
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

            {/* File tree */}
            <div className="flex-1 overflow-y-auto">
              {files.length === 0 && !showNewInput ? (
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
                <ul className="py-1">
                  {renderNewInput('')}
                  {tree.map((node) => renderNode(node, 0))}
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

        {/* Toggle button */}
        <button
          onClick={onToggle}
          className="flex h-8 w-6 items-center justify-center self-start mt-2 rounded-r-md border border-l-0 border-zinc-700/50 bg-zinc-950 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
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
