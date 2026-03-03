import { nanoid } from 'nanoid';
import type { Annotation, HighlightColor } from '@/types';

/**
 * Derive the annotations sidecar path from a markdown file path.
 * "notes/doc.md" -> "notes/doc.annotations.json"
 */
export function annotationsPathForFile(filePath: string): string {
  return filePath.replace(/\.md$/, '.annotations.json');
}

/**
 * Create a new Annotation object.
 */
export function createAnnotation(
  selectedText: string,
  prefix: string,
  suffix: string,
  color: HighlightColor,
  comment: string = '',
): Annotation {
  const now = new Date().toISOString();
  return {
    id: nanoid(8),
    selectedText,
    prefix,
    suffix,
    comment,
    color,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Extract the selected text plus surrounding context from a DOM container.
 * Returns the selected text and ~contextChars of prefix/suffix from
 * the full text content of the container.
 */
export function extractSelectionContext(
  containerEl: HTMLElement,
  range: Range,
  contextChars = 30,
): { selectedText: string; prefix: string; suffix: string } | null {
  // Get full text content by walking text nodes
  const walker = document.createTreeWalker(containerEl, NodeFilter.SHOW_TEXT);
  const textParts: { node: Text; start: number }[] = [];
  let fullText = '';

  let node: Text | null;
  while ((node = walker.nextNode() as Text | null)) {
    textParts.push({ node, start: fullText.length });
    fullText += node.textContent ?? '';
  }

  // Find the range start and end offsets in the full text
  let rangeStart = -1;
  let rangeEnd = -1;

  for (const part of textParts) {
    const nodeEnd = part.start + (part.node.textContent?.length ?? 0);

    if (part.node === range.startContainer) {
      rangeStart = part.start + range.startOffset;
    } else if (
      range.startContainer.nodeType !== Node.TEXT_NODE &&
      part.node.parentNode === range.startContainer
    ) {
      rangeStart = part.start;
    }

    if (part.node === range.endContainer) {
      rangeEnd = part.start + range.endOffset;
    } else if (
      range.endContainer.nodeType !== Node.TEXT_NODE &&
      part.node.parentNode === range.endContainer &&
      rangeEnd === -1 &&
      rangeStart !== -1
    ) {
      rangeEnd = nodeEnd;
    }
  }

  if (rangeStart === -1 || rangeEnd === -1 || rangeStart >= rangeEnd) {
    return null;
  }

  const selectedText = fullText.slice(rangeStart, rangeEnd);
  const prefix = fullText.slice(Math.max(0, rangeStart - contextChars), rangeStart);
  const suffix = fullText.slice(rangeEnd, rangeEnd + contextChars);

  return { selectedText, prefix, suffix };
}
