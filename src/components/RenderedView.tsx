import { useRef, useEffect, useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { useAnnotationContext } from '@/contexts/AnnotationContext';
import { extractSelectionContext, createAnnotation } from '@/lib/annotations';
import { applyHighlights, stripHighlights } from '@/lib/highlighter';
import HighlightPopover from '@/components/HighlightPopover';
import type { HighlightColor } from '@/types';

interface RenderedViewProps {
  content: string;
  onHighlightClick?: (annotationId: string) => void;
}

interface PopoverState {
  position: { top: number; left: number };
  selectedText: string;
  prefix: string;
  suffix: string;
}

export default function RenderedView({ content, onHighlightClick }: RenderedViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const articleRef = useRef<HTMLElement>(null);
  const { annotations, addAnnotation } = useAnnotationContext();
  const [popover, setPopover] = useState<PopoverState | null>(null);
  const [, setOrphanedIds] = useState<Set<string>>(new Set());

  // Apply highlights after render
  useEffect(() => {
    const article = articleRef.current;
    if (!article) return;

    // Small delay to ensure react-markdown has finished rendering
    const timer = setTimeout(() => {
      stripHighlights(article);
      const orphans = applyHighlights(article, annotations);
      setOrphanedIds(orphans);
    }, 50);

    return () => clearTimeout(timer);
  }, [content, annotations]);

  // Handle text selection
  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !articleRef.current) {
      return;
    }

    const range = selection.getRangeAt(0);

    // Make sure the selection is within our article container
    if (!articleRef.current.contains(range.commonAncestorContainer)) {
      return;
    }

    const context = extractSelectionContext(articleRef.current, range);
    if (!context || context.selectedText.trim().length === 0) {
      return;
    }

    // Position the popover above the selection
    const rect = range.getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;

    const scrollTop = containerRef.current?.scrollTop ?? 0;

    setPopover({
      position: {
        top: rect.top - containerRect.top + scrollTop - 40,
        left: Math.max(
          0,
          rect.left - containerRect.left + rect.width / 2 - 100,
        ),
      },
      ...context,
    });
  }, []);

  const handleSelectColor = useCallback(
    (color: HighlightColor) => {
      if (!popover) return;
      const ann = createAnnotation(
        popover.selectedText,
        popover.prefix,
        popover.suffix,
        color,
      );
      addAnnotation(ann);
      setPopover(null);
      window.getSelection()?.removeAllRanges();
    },
    [popover, addAnnotation],
  );

  // Handle clicks on highlight marks
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      const mark = target.closest('mark[data-annotation-id]');
      if (mark && onHighlightClick) {
        const id = mark.getAttribute('data-annotation-id');
        if (id) onHighlightClick(id);
      }
    },
    [onHighlightClick],
  );

  return (
    <div ref={containerRef} className="relative flex-1 overflow-y-auto p-6 md:p-8">
      <article
        ref={articleRef}
        className="prose prose-dark mx-auto max-w-3xl prose-sm md:prose-lg"
        onMouseUp={handleMouseUp}
        onTouchEnd={handleMouseUp}
        onClick={handleClick}
      >
        <ReactMarkdown
          key={content}
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
        >
          {content}
        </ReactMarkdown>
      </article>

      {popover && (
        <HighlightPopover
          position={popover.position}
          onSelectColor={handleSelectColor}
          onDismiss={() => setPopover(null)}
        />
      )}
    </div>
  );
}
