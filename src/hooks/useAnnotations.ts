import { useState, useEffect, useCallback } from 'react';
import type { Annotation, AnnotationFile, StoredAnnotations } from '@/types';
import { getAnnotations, saveAnnotations } from '@/lib/storage';
import { annotationsPathForFile } from '@/lib/annotations';

export function useAnnotations(activeFilePath: string | null) {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [loading, setLoading] = useState(false);

  const annPath = activeFilePath ? annotationsPathForFile(activeFilePath) : null;

  // Load annotations when active file changes
  useEffect(() => {
    if (!annPath) {
      setAnnotations([]);
      return;
    }
    setLoading(true);
    getAnnotations(annPath).then((stored) => {
      setAnnotations(stored?.data.annotations ?? []);
      setLoading(false);
    });
  }, [annPath]);

  const persist = useCallback(
    async (updated: Annotation[]) => {
      if (!annPath) return;
      const data: AnnotationFile = { version: 1, annotations: updated };
      const stored: StoredAnnotations = {
        path: annPath,
        data,
        remoteSha: null,
        locallyModified: true,
        lastModified: new Date().toISOString(),
      };
      await saveAnnotations(stored);
    },
    [annPath],
  );

  const addAnnotation = useCallback(
    async (ann: Annotation) => {
      const updated = [...annotations, ann];
      setAnnotations(updated);
      await persist(updated);
    },
    [annotations, persist],
  );

  const updateAnnotation = useCallback(
    async (id: string, updates: Partial<Annotation>) => {
      const updated = annotations.map((a) =>
        a.id === id ? { ...a, ...updates, updatedAt: new Date().toISOString() } : a,
      );
      setAnnotations(updated);
      await persist(updated);
    },
    [annotations, persist],
  );

  const deleteAnnotation = useCallback(
    async (id: string) => {
      const updated = annotations.filter((a) => a.id !== id);
      setAnnotations(updated);
      await persist(updated);
    },
    [annotations, persist],
  );

  return {
    annotations,
    loading,
    addAnnotation,
    updateAnnotation,
    deleteAnnotation,
  };
}
