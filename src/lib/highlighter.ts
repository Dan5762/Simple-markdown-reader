import type { Annotation } from '@/types';

interface TextNodeEntry {
  node: Text;
  start: number;
  end: number;
}

interface AnchoredAnnotation {
  annotation: Annotation;
  startOffset: number;
  endOffset: number;
}

/**
 * Strip all existing <mark> highlight elements from a container,
 * unwrapping their text content back into the DOM.
 */
export function stripHighlights(container: HTMLElement): void {
  const marks = container.querySelectorAll('mark[data-annotation-id]');
  marks.forEach((mark) => {
    const parent = mark.parentNode;
    if (!parent) return;
    while (mark.firstChild) {
      parent.insertBefore(mark.firstChild, mark);
    }
    parent.removeChild(mark);
    parent.normalize(); // merge adjacent text nodes
  });
}

/**
 * Collect all text nodes within a container, building a map of
 * each node's offset range within the concatenated full text.
 */
function collectTextNodes(container: HTMLElement): {
  nodes: TextNodeEntry[];
  fullText: string;
} {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const nodes: TextNodeEntry[] = [];
  let offset = 0;

  let textNode: Text | null;
  while ((textNode = walker.nextNode() as Text | null)) {
    const len = textNode.textContent?.length ?? 0;
    nodes.push({ node: textNode, start: offset, end: offset + len });
    offset += len;
  }

  const fullText = nodes.map((n) => n.node.textContent ?? '').join('');
  return { nodes, fullText };
}

/**
 * Normalize whitespace in a string for fuzzy matching:
 * collapse all runs of whitespace to single spaces.
 */
function normalizeWhitespace(s: string): string {
  return s.replace(/\s+/g, ' ');
}

/**
 * Find the position of an annotation's selected text within the full text,
 * using prefix/suffix context for disambiguation.
 * Returns the start/end offsets of the selectedText (not the prefix/suffix).
 */
function anchorAnnotation(
  fullText: string,
  ann: Annotation,
): { startOffset: number; endOffset: number } | null {
  const { selectedText, prefix, suffix } = ann;

  // Try exact match with context
  const searchStr = prefix + selectedText + suffix;
  let idx = fullText.indexOf(searchStr);
  if (idx !== -1) {
    return {
      startOffset: idx + prefix.length,
      endOffset: idx + prefix.length + selectedText.length,
    };
  }

  // Try without suffix (suffix may have changed)
  const searchWithPrefix = prefix + selectedText;
  idx = fullText.indexOf(searchWithPrefix);
  if (idx !== -1) {
    return {
      startOffset: idx + prefix.length,
      endOffset: idx + prefix.length + selectedText.length,
    };
  }

  // Try without prefix
  const searchWithSuffix = selectedText + suffix;
  idx = fullText.indexOf(searchWithSuffix);
  if (idx !== -1) {
    return {
      startOffset: idx,
      endOffset: idx + selectedText.length,
    };
  }

  // Try just the selected text
  idx = fullText.indexOf(selectedText);
  if (idx !== -1) {
    return { startOffset: idx, endOffset: idx + selectedText.length };
  }

  // Fuzzy: normalize whitespace and try again
  const normFull = normalizeWhitespace(fullText);
  const normSelected = normalizeWhitespace(selectedText);
  idx = normFull.indexOf(normSelected);
  if (idx !== -1) {
    // Map back to original offsets by counting characters
    const origStart = mapNormalizedOffset(fullText, idx);
    const origEnd = mapNormalizedOffset(fullText, idx + normSelected.length);
    if (origStart !== null && origEnd !== null) {
      return { startOffset: origStart, endOffset: origEnd };
    }
  }

  return null; // orphaned
}

/**
 * Map an offset in whitespace-normalized text back to the original text.
 */
function mapNormalizedOffset(original: string, normOffset: number): number | null {
  let normIdx = 0;
  let origIdx = 0;
  let inWhitespace = false;

  while (origIdx <= original.length && normIdx < normOffset) {
    const ch = original[origIdx];
    if (ch !== undefined && /\s/.test(ch)) {
      if (!inWhitespace) {
        normIdx++;
        inWhitespace = true;
      }
      origIdx++;
    } else {
      inWhitespace = false;
      normIdx++;
      origIdx++;
    }
  }

  // Skip trailing whitespace
  while (origIdx < original.length && /\s/.test(original[origIdx]!)) {
    origIdx++;
  }

  return origIdx <= original.length ? origIdx : null;
}

/**
 * Apply highlight marks to the DOM for all anchored annotations.
 * This mutates the DOM — call stripHighlights() first to clean up.
 */
export function applyHighlights(
  container: HTMLElement,
  annotations: Annotation[],
): Set<string> {
  const orphanedIds = new Set<string>();
  if (annotations.length === 0) return orphanedIds;

  const { nodes, fullText } = collectTextNodes(container);

  // Anchor all annotations
  const anchored: AnchoredAnnotation[] = [];
  for (const ann of annotations) {
    const result = anchorAnnotation(fullText, ann);
    if (result) {
      anchored.push({ annotation: ann, ...result });
    } else {
      orphanedIds.add(ann.id);
    }
  }

  // Sort by start offset (process from end to start to avoid offset shifts)
  anchored.sort((a, b) => b.startOffset - a.startOffset);

  for (const { annotation, startOffset, endOffset } of anchored) {
    wrapRange(nodes, startOffset, endOffset, annotation);
  }

  return orphanedIds;
}

/**
 * Wrap a range of text (by offset in the full text) in a <mark> element.
 */
function wrapRange(
  nodes: TextNodeEntry[],
  startOffset: number,
  endOffset: number,
  annotation: Annotation,
): void {
  for (let i = nodes.length - 1; i >= 0; i--) {
    const entry = nodes[i]!;

    // Skip nodes entirely outside the range
    if (entry.end <= startOffset || entry.start >= endOffset) continue;

    const node = entry.node;
    const nodeText = node.textContent ?? '';

    // Calculate overlap within this text node
    const overlapStart = Math.max(startOffset - entry.start, 0);
    const overlapEnd = Math.min(endOffset - entry.start, nodeText.length);

    if (overlapStart >= overlapEnd) continue;

    // Split the text node to isolate the highlighted portion
    let targetNode = node;

    // Split off the part after the highlight
    if (overlapEnd < nodeText.length) {
      targetNode.splitText(overlapEnd);
    }

    // Split off the part before the highlight
    if (overlapStart > 0) {
      targetNode = targetNode.splitText(overlapStart);
    }

    // Wrap the target node in a <mark>
    const mark = document.createElement('mark');
    mark.setAttribute('data-color', annotation.color);
    mark.setAttribute('data-annotation-id', annotation.id);
    targetNode.parentNode?.insertBefore(mark, targetNode);
    mark.appendChild(targetNode);
  }
}
