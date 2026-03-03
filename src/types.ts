export interface StoredFile {
  path: string;
  content: string;
  remoteSha: string | null;
  locallyModified: boolean;
  lastModified: string; // ISO timestamp
}

export type HighlightColor = 'yellow' | 'green' | 'blue' | 'pink';

export interface Annotation {
  id: string;
  selectedText: string;
  prefix: string;
  suffix: string;
  comment: string;
  color: HighlightColor;
  createdAt: string;
  updatedAt: string;
}

export interface AnnotationFile {
  version: 1;
  annotations: Annotation[];
}

export interface StoredAnnotations {
  path: string; // e.g. "notes/doc.annotations.json"
  data: AnnotationFile;
  remoteSha: string | null;
  locallyModified: boolean;
  lastModified: string;
}
