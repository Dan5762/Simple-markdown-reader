import { useState, useEffect, useCallback } from 'react';
import type { StoredFile } from '@/types';
import {
  getAllFiles,
  saveFile,
  deleteFileFromDb,
  deleteAnnotationsFromDb,
} from '@/lib/storage';

export function useFiles() {
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [activeFilePath, setActiveFilePath] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllFiles().then((loaded) => {
      setFiles(loaded.sort((a, b) => b.lastModified.localeCompare(a.lastModified)));
      setLoading(false);
    });
  }, []);

  const activeFile = files.find((f) => f.path === activeFilePath) ?? null;

  const importFile = useCallback(async (file: File) => {
    const content = await file.text();
    const stored: StoredFile = {
      path: file.name,
      content,
      remoteSha: null,
      locallyModified: false,
      lastModified: new Date().toISOString(),
    };
    await saveFile(stored);
    setFiles((prev) => {
      const without = prev.filter((f) => f.path !== stored.path);
      return [stored, ...without];
    });
    setActiveFilePath(stored.path);
  }, []);

  const importFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const arr = Array.from(fileList).filter((f) => f.name.endsWith('.md'));
      for (const file of arr) {
        await importFile(file);
      }
    },
    [importFile],
  );

  const createFile = useCallback(async (name: string) => {
    const path = name.endsWith('.md') ? name : `${name}.md`;
    const stored: StoredFile = {
      path,
      content: `# ${name.replace(/\.md$/, '')}\n`,
      remoteSha: null,
      locallyModified: true,
      lastModified: new Date().toISOString(),
    };
    await saveFile(stored);
    setFiles((prev) => [stored, ...prev.filter((f) => f.path !== path)]);
    setActiveFilePath(path);
  }, []);

  const deleteFile = useCallback(
    async (path: string) => {
      await deleteFileFromDb(path);
      // Also delete associated annotations
      const annPath = path.replace(/\.md$/, '.annotations.json');
      await deleteAnnotationsFromDb(annPath);
      setFiles((prev) => prev.filter((f) => f.path !== path));
      if (activeFilePath === path) {
        setActiveFilePath(null);
      }
    },
    [activeFilePath],
  );

  const renameFile = useCallback(
    async (oldPath: string, newName: string) => {
      const newPath = newName.endsWith('.md') ? newName : `${newName}.md`;
      if (newPath === oldPath) return;
      const existing = files.find((f) => f.path === oldPath);
      if (!existing) return;
      // Save with new path
      const renamed: StoredFile = {
        ...existing,
        path: newPath,
        lastModified: new Date().toISOString(),
      };
      await saveFile(renamed);
      // Delete old entry
      await deleteFileFromDb(oldPath);
      // Rename annotations too
      const oldAnnPath = oldPath.replace(/\.md$/, '.annotations.json');
      const newAnnPath = newPath.replace(/\.md$/, '.annotations.json');
      const { getAnnotations, saveAnnotations } = await import('@/lib/storage');
      const anns = await getAnnotations(oldAnnPath);
      if (anns) {
        await saveAnnotations({ ...anns, path: newAnnPath });
        await deleteAnnotationsFromDb(oldAnnPath);
      }
      setFiles((prev) =>
        prev.map((f) => (f.path === oldPath ? renamed : f)),
      );
      if (activeFilePath === oldPath) {
        setActiveFilePath(newPath);
      }
    },
    [files, activeFilePath],
  );

  const selectFile = useCallback((path: string) => {
    setActiveFilePath(path);
  }, []);

  const updateFileContent = useCallback(
    async (path: string, content: string) => {
      const now = new Date().toISOString();
      setFiles((prev) =>
        prev.map((f) =>
          f.path === path
            ? { ...f, content, locallyModified: true, lastModified: now }
            : f,
        ),
      );
      const existing = files.find((f) => f.path === path);
      if (existing) {
        await saveFile({
          ...existing,
          content,
          locallyModified: true,
          lastModified: now,
        });
      }
    },
    [files],
  );

  return {
    files,
    activeFile,
    activeFilePath,
    loading,
    importFile,
    importFiles,
    createFile,
    deleteFile,
    renameFile,
    selectFile,
    updateFileContent,
  };
}
