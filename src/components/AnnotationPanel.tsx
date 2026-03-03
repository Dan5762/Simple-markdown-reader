import { useState, useRef, useEffect, useCallback, forwardRef } from 'react';
import { useAnnotationContext } from '@/contexts/AnnotationContext';
import type { Annotation } from '@/types';

const COLOR_CLASSES: Record<string, string> = {
  yellow: 'bg-yellow-400/80 border-yellow-500',
  green: 'bg-green-400/80 border-green-500',
  blue: 'bg-blue-400/80 border-blue-500',
  pink: 'bg-pink-400/80 border-pink-500',
};

interface AnnotationPanelProps {
  focusedAnnotationId: string | null;
  onAnnotationClick: (annotationId: string) => void;
}

export default function AnnotationPanel({
  focusedAnnotationId,
  onAnnotationClick,
}: AnnotationPanelProps) {
  const { annotations, updateAnnotation, deleteAnnotation } =
    useAnnotationContext();
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Scroll to focused annotation card
  useEffect(() => {
    if (!focusedAnnotationId) return;
    const card = cardRefs.current.get(focusedAnnotationId);
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      card.classList.add('ring-2', 'ring-zinc-400');
      const timer = setTimeout(() => {
        card.classList.remove('ring-2', 'ring-zinc-400');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [focusedAnnotationId]);

  if (annotations.length === 0) {
    return (
      <div className="flex w-full h-full flex-col items-center justify-center border-l border-zinc-700/50 bg-zinc-900/50 p-4 text-center text-sm text-zinc-500">
        <p>No annotations yet</p>
        <p className="mt-1 text-xs">Select text in the document to add a highlight</p>
      </div>
    );
  }

  return (
    <div className="flex w-full h-full flex-col border-l border-zinc-700/50 bg-zinc-900/50">
      <div className="border-b border-zinc-700/50 px-3 py-2">
        <span className="text-xs font-semibold text-zinc-400">
          Annotations ({annotations.length})
        </span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {annotations.map((ann) => (
          <AnnotationCard
            key={ann.id}
            annotation={ann}
            ref={(el) => {
              if (el) cardRefs.current.set(ann.id, el);
              else cardRefs.current.delete(ann.id);
            }}
            onClickSnippet={() => onAnnotationClick(ann.id)}
            onUpdateComment={(comment) =>
              updateAnnotation(ann.id, { comment })
            }
            onDelete={() => {
              if (confirm('Delete this annotation?')) {
                deleteAnnotation(ann.id);
              }
            }}
          />
        ))}
      </div>
    </div>
  );
}

interface AnnotationCardProps {
  annotation: Annotation;
  onClickSnippet: () => void;
  onUpdateComment: (comment: string) => void;
  onDelete: () => void;
}

const AnnotationCard = forwardRef<HTMLDivElement, AnnotationCardProps>(
  function AnnotationCard(
    { annotation, onClickSnippet, onUpdateComment, onDelete },
    ref,
  ) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(annotation.comment);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const colorClass = COLOR_CLASSES[annotation.color] ?? COLOR_CLASSES.yellow;

    const startEdit = useCallback(() => {
      setDraft(annotation.comment);
      setEditing(true);
    }, [annotation.comment]);

    const saveEdit = useCallback(() => {
      onUpdateComment(draft);
      setEditing(false);
    }, [draft, onUpdateComment]);

    useEffect(() => {
      if (editing && textareaRef.current) {
        textareaRef.current.focus();
      }
    }, [editing]);

    const timeAgo = formatTimeAgo(annotation.updatedAt);

    return (
      <div
        ref={ref}
        className="border-b border-zinc-800 p-3 transition-all duration-200"
      >
        {/* Color bar + snippet */}
        <div className="flex items-start gap-2">
          <div className={`mt-1 h-3 w-3 shrink-0 rounded-full border ${colorClass}`} />
          <button
            onClick={onClickSnippet}
            className="min-w-0 flex-1 text-left text-xs text-zinc-400 hover:text-zinc-200"
            title="Click to scroll to highlight"
          >
            <span className="line-clamp-2 italic">
              &ldquo;{annotation.selectedText.slice(0, 80)}
              {annotation.selectedText.length > 80 ? '...' : ''}&rdquo;
            </span>
          </button>
          <button
            onClick={onDelete}
            className="shrink-0 rounded px-1 text-xs text-zinc-600 hover:bg-red-500/20 hover:text-red-400"
            title="Delete annotation"
          >
            ✕
          </button>
        </div>

        {/* Comment */}
        <div className="ml-5 mt-2">
          {editing ? (
            <div>
              <textarea
                ref={textareaRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    saveEdit();
                  }
                  if (e.key === 'Escape') setEditing(false);
                }}
                onBlur={saveEdit}
                className="w-full rounded border border-zinc-600 bg-zinc-800 px-2 py-1 text-xs text-zinc-200 placeholder:text-zinc-500"
                rows={3}
                placeholder="Add a comment..."
              />
            </div>
          ) : (
            <div
              onClick={startEdit}
              className="cursor-pointer rounded px-1 py-0.5 text-xs text-zinc-300 hover:bg-zinc-800"
            >
              {annotation.comment || (
                <span className="italic text-zinc-500">Click to add comment...</span>
              )}
            </div>
          )}
        </div>

        {/* Timestamp */}
        <div className="ml-5 mt-1 text-[10px] text-zinc-600">{timeAgo}</div>
      </div>
    );
  },
);

function formatTimeAgo(isoDate: string): string {
  const now = Date.now();
  const then = new Date(isoDate).getTime();
  const diffSec = Math.floor((now - then) / 1000);

  if (diffSec < 60) return 'just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
  return new Date(isoDate).toLocaleDateString();
}
