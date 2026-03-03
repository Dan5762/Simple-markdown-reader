import { useState, useEffect, useCallback } from 'react';
import { FileProvider, useFileContext } from '@/contexts/FileContext';
import { AnnotationProvider } from '@/contexts/AnnotationContext';
import Sidebar from '@/components/Sidebar';
import RenderedView from '@/components/RenderedView';
import Editor from '@/components/Editor';
import AnnotationPanel from '@/components/AnnotationPanel';
import { useAutoSave } from '@/hooks/useAutoSave';

type ViewMode = 'rendered' | 'editor';

function AppContent() {
  const { activeFile, activeFilePath, updateFileContent } = useFileContext();
  const [viewMode, setViewMode] = useState<ViewMode>('rendered');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [annotationPanelOpen, setAnnotationPanelOpen] = useState(true);
  const [editableContent, setEditableContent] = useState('');
  const [focusedAnnotationId, setFocusedAnnotationId] = useState<string | null>(null);

  // Sync editable content with active file
  useEffect(() => {
    setEditableContent(activeFile?.content ?? '');
  }, [activeFile?.path]); // eslint-disable-line react-hooks/exhaustive-deps

  const stableSave = useCallback(
    (path: string, content: string) => updateFileContent(path, content),
    [updateFileContent],
  );

  useAutoSave(activeFilePath, editableContent, stableSave);

  // Keyboard shortcut: Cmd/Ctrl+E to toggle view
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
        e.preventDefault();
        setViewMode((m) => (m === 'rendered' ? 'editor' : 'rendered'));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const scrollToHighlight = useCallback((annotationId: string) => {
    const mark = document.querySelector(
      `mark[data-annotation-id="${annotationId}"]`,
    );
    if (mark) {
      mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
      mark.classList.add('pulse');
      setTimeout(() => mark.classList.remove('pulse'), 1500);
    }
  }, []);

  const handleHighlightClick = useCallback((annotationId: string) => {
    setFocusedAnnotationId(annotationId);
    setTimeout(() => setFocusedAnnotationId(null), 2000);
  }, []);

  return (
    <AnnotationProvider activeFilePath={activeFilePath}>
      <div className="flex h-screen overflow-hidden">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} onToggle={() => setSidebarOpen((o) => !o)} />

        {/* Main content area */}
        <div className="relative flex flex-1 flex-col overflow-hidden">
          {/* Content */}
          <div className="flex flex-1 overflow-hidden md:flex-row flex-col">
            {/* Floating view toggle */}
            {activeFile && (
              <div className="pointer-events-none absolute left-1/2 top-3 z-40 -translate-x-1/2">
                <div className="pointer-events-auto flex rounded-md bg-zinc-800/90 p-0.5 shadow-lg shadow-black/20 backdrop-blur-sm">
                  <button
                    onClick={() => setViewMode('rendered')}
                    className={`rounded px-2.5 py-0.5 text-xs font-medium transition-colors ${
                      viewMode === 'rendered'
                        ? 'bg-zinc-600 text-white'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Rendered
                  </button>
                  <button
                    onClick={() => setViewMode('editor')}
                    className={`rounded px-2.5 py-0.5 text-xs font-medium transition-colors ${
                      viewMode === 'editor'
                        ? 'bg-zinc-600 text-white'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Editor
                  </button>
                </div>
              </div>
            )}
            {activeFile ? (
              <>
                {viewMode === 'rendered' ? (
                  <RenderedView
                    content={editableContent}
                    onHighlightClick={handleHighlightClick}
                  />
                ) : (
                  <Editor
                    content={editableContent}
                    onChange={setEditableContent}
                  />
                )}
                {viewMode === 'rendered' && (
                  <div className="relative flex shrink-0">
                    {/* Toggle button — always visible, sits at the left edge */}
                    <button
                      onClick={() => setAnnotationPanelOpen((o) => !o)}
                      className="flex h-8 w-6 items-center justify-center self-start mt-2 rounded-l-md border border-r-0 border-zinc-700/50 bg-zinc-950 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                      aria-label="Toggle annotations panel"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {annotationPanelOpen ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7" />
                        )}
                      </svg>
                    </button>
                    <div className={`overflow-hidden transition-all duration-200 ${
                      annotationPanelOpen ? 'w-80' : 'w-0'
                    }`}>
                      <div className="w-80 h-full">
                        <AnnotationPanel
                          focusedAnnotationId={focusedAnnotationId}
                          onAnnotationClick={scrollToHighlight}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center text-zinc-500">
                <div className="text-center">
                  <p className="text-lg">No file selected</p>
                  <p className="mt-1 text-sm">
                    Import or create a markdown file from the sidebar
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AnnotationProvider>
  );
}

export default function App() {
  return (
    <FileProvider>
      <AppContent />
    </FileProvider>
  );
}
