import { useEffect, useRef } from 'react';
import type { HighlightColor } from '@/types';

const COLORS: { color: HighlightColor; label: string; bg: string }[] = [
  { color: 'yellow', label: 'Yellow', bg: 'bg-yellow-400/80' },
  { color: 'green', label: 'Green', bg: 'bg-green-400/80' },
  { color: 'blue', label: 'Blue', bg: 'bg-blue-400/80' },
  { color: 'pink', label: 'Pink', bg: 'bg-pink-400/80' },
];

interface HighlightPopoverProps {
  position: { top: number; left: number };
  onSelectColor: (color: HighlightColor) => void;
  onDismiss: () => void;
}

export default function HighlightPopover({
  position,
  onSelectColor,
  onDismiss,
}: HighlightPopoverProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Dismiss on click outside or Escape
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onDismiss();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    };
    // Delay attaching to avoid immediate dismiss from the mouseup that opened it
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClick);
      document.addEventListener('keydown', handleKey);
    }, 50);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onDismiss]);

  return (
    <div
      ref={ref}
      className="absolute z-50 flex items-center gap-1.5 rounded-lg border border-zinc-600 bg-zinc-800 px-2 py-1.5 shadow-xl shadow-black/30"
      style={{ top: position.top, left: position.left }}
    >
      <span className="mr-1 text-xs text-zinc-400">Highlight:</span>
      {COLORS.map(({ color, label, bg }) => (
        <button
          key={color}
          onClick={() => onSelectColor(color)}
          className={`h-6 w-6 rounded-full ${bg} border border-zinc-500 transition-transform hover:scale-110`}
          title={label}
          aria-label={`Highlight ${label}`}
        />
      ))}
    </div>
  );
}
