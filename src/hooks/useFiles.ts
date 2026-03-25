import { useState, useEffect, useCallback, useMemo } from 'react';
import type { StoredFile } from '@/types';
import {
  getAllFiles,
  saveFile,
  deleteFileFromDb,
  deleteAnnotationsFromDb,
} from '@/lib/storage';
import { addTombstone } from '@/lib/sync';
import { getParentFolder } from '@/lib/fileTree';

export function useFiles() {
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [activeFilePath, setActiveFilePath] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // Track explicitly created empty folders (folders with no files)
  const [emptyFolders, setEmptyFolders] = useState<Set<string>>(new Set());

  useEffect(() => {
    getAllFiles().then((loaded) => {
      setFiles(loaded.sort((a, b) => b.lastModified.localeCompare(a.lastModified)));
      setLoading(false);
    });
  }, []);

  const activeFile = files.find((f) => f.path === activeFilePath) ?? null;

  // Derive all folder paths from files + explicitly created empty folders
  const folders = useMemo(() => {
    const set = new Set<string>(emptyFolders);
    for (const file of files) {
      const parts = file.path.split('/');
      for (let i = 1; i < parts.length; i++) {
        set.add(parts.slice(0, i).join('/'));
      }
    }
    return set;
  }, [files, emptyFolders]);

  const refreshFiles = useCallback(async () => {
    const loaded = await getAllFiles();
    setFiles(loaded.sort((a, b) => b.lastModified.localeCompare(a.lastModified)));
  }, []);

  const importFile = useCallback(async (file: File, folder?: string) => {
    const content = await file.text();
    const path = folder ? `${folder}/${file.name}` : file.name;
    const stored: StoredFile = {
      path,
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
    async (fileList: FileList | File[], folder?: string) => {
      const arr = Array.from(fileList).filter((f) => f.name.endsWith('.md'));
      for (const file of arr) {
        await importFile(file, folder);
      }
    },
    [importFile],
  );

  const createFile = useCallback(async (name: string, folder?: string) => {
    const fileName = name.endsWith('.md') ? name : `${name}.md`;
    const path = folder ? `${folder}/${fileName}` : fileName;
    const displayName = name.replace(/\.md$/, '');
    const stored: StoredFile = {
      path,
      content: `# ${displayName}\n`,
      remoteSha: null,
      locallyModified: true,
      lastModified: new Date().toISOString(),
    };
    await saveFile(stored);
    setFiles((prev) => [stored, ...prev.filter((f) => f.path !== path)]);
    setActiveFilePath(path);
    // Remove from empty folders if it was there
    if (folder) {
      setEmptyFolders((prev) => {
        const next = new Set(prev);
        next.delete(folder);
        return next;
      });
    }
  }, []);

  const createFolder = useCallback((name: string, parentFolder?: string) => {
    const path = parentFolder ? `${parentFolder}/${name}` : name;
    setEmptyFolders((prev) => new Set(prev).add(path));
  }, []);

  const deleteFile = useCallback(
    async (path: string) => {
      // Record tombstone if file was synced so sync can delete it remotely
      const existing = files.find((f) => f.path === path);
      if (existing?.remoteSha) {
        await addTombstone(path);
        const annPath = path.replace(/\.md$/, '.annotations.json');
        await addTombstone(annPath);
      }
      await deleteFileFromDb(path);
      const annPath = path.replace(/\.md$/, '.annotations.json');
      await deleteAnnotationsFromDb(annPath);
      setFiles((prev) => prev.filter((f) => f.path !== path));
      if (activeFilePath === path) {
        setActiveFilePath(null);
      }
    },
    [files, activeFilePath],
  );

  const deleteFolder = useCallback(
    async (folderPath: string) => {
      // Delete all files within this folder
      const toDelete = files.filter(
        (f) => f.path.startsWith(folderPath + '/'),
      );
      for (const file of toDelete) {
        // Record tombstones for synced files so sync can delete them remotely
        if (file.remoteSha) {
          await addTombstone(file.path);
          const annPath = file.path.replace(/\.md$/, '.annotations.json');
          await addTombstone(annPath);
        }
        await deleteFileFromDb(file.path);
        const annPath = file.path.replace(/\.md$/, '.annotations.json');
        await deleteAnnotationsFromDb(annPath);
      }
      setFiles((prev) => prev.filter((f) => !f.path.startsWith(folderPath + '/')));
      // Remove empty folder entries
      setEmptyFolders((prev) => {
        const next = new Set(prev);
        for (const fp of next) {
          if (fp === folderPath || fp.startsWith(folderPath + '/')) {
            next.delete(fp);
          }
        }
        return next;
      });
      if (activeFilePath && activeFilePath.startsWith(folderPath + '/')) {
        setActiveFilePath(null);
      }
    },
    [files, activeFilePath],
  );

  const renameFile = useCallback(
    async (oldPath: string, newBasename: string) => {
      const folder = getParentFolder(oldPath);
      const newFileName = newBasename.endsWith('.md') ? newBasename : `${newBasename}.md`;
      const newPath = folder ? `${folder}/${newFileName}` : newFileName;
      if (newPath === oldPath) return;
      const existing = files.find((f) => f.path === oldPath);
      if (!existing) return;
      // Tombstone old paths so sync deletes them remotely
      if (existing.remoteSha) {
        await addTombstone(oldPath);
        const oldAnnPath = oldPath.replace(/\.md$/, '.annotations.json');
        await addTombstone(oldAnnPath);
      }
      const renamed: StoredFile = {
        ...existing,
        path: newPath,
        remoteSha: null,
        locallyModified: true,
        lastModified: new Date().toISOString(),
      };
      await saveFile(renamed);
      await deleteFileFromDb(oldPath);
      // Rename annotations too
      const oldAnnPath = oldPath.replace(/\.md$/, '.annotations.json');
      const newAnnPath = newPath.replace(/\.md$/, '.annotations.json');
      const { getAnnotations, saveAnnotations } = await import('@/lib/storage');
      const anns = await getAnnotations(oldAnnPath);
      if (anns) {
        await saveAnnotations({ ...anns, path: newAnnPath, remoteSha: null, locallyModified: true });
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

  const renameFolder = useCallback(
    async (oldFolderPath: string, newName: string) => {
      const parent = getParentFolder(oldFolderPath);
      const newFolderPath = parent ? `${parent}/${newName}` : newName;
      if (newFolderPath === oldFolderPath) return;

      const affected = files.filter((f) => f.path.startsWith(oldFolderPath + '/'));
      const updates: { oldPath: string; newFile: StoredFile }[] = [];

      for (const file of affected) {
        // Tombstone old paths so sync deletes them remotely
        if (file.remoteSha) {
          await addTombstone(file.path);
          const oldAnnPath = file.path.replace(/\.md$/, '.annotations.json');
          await addTombstone(oldAnnPath);
        }
        const newFilePath = newFolderPath + file.path.slice(oldFolderPath.length);
        const updated: StoredFile = { ...file, path: newFilePath, remoteSha: null, locallyModified: true, lastModified: new Date().toISOString() };
        await saveFile(updated);
        await deleteFileFromDb(file.path);
        // Move annotations
        const oldAnnPath = file.path.replace(/\.md$/, '.annotations.json');
        const newAnnPath = newFilePath.replace(/\.md$/, '.annotations.json');
        const { getAnnotations, saveAnnotations } = await import('@/lib/storage');
        const anns = await getAnnotations(oldAnnPath);
        if (anns) {
          await saveAnnotations({ ...anns, path: newAnnPath, remoteSha: null, locallyModified: true });
          await deleteAnnotationsFromDb(oldAnnPath);
        }
        updates.push({ oldPath: file.path, newFile: updated });
      }

      setFiles((prev) =>
        prev.map((f) => {
          const upd = updates.find((u) => u.oldPath === f.path);
          return upd ? upd.newFile : f;
        }),
      );
      // Update empty folders
      setEmptyFolders((prev) => {
        const next = new Set<string>();
        for (const fp of prev) {
          if (fp === oldFolderPath) {
            next.add(newFolderPath);
          } else if (fp.startsWith(oldFolderPath + '/')) {
            next.add(newFolderPath + fp.slice(oldFolderPath.length));
          } else {
            next.add(fp);
          }
        }
        return next;
      });
      if (activeFilePath && activeFilePath.startsWith(oldFolderPath + '/')) {
        setActiveFilePath(newFolderPath + activeFilePath.slice(oldFolderPath.length));
      }
    },
    [files, activeFilePath],
  );

  const moveFile = useCallback(
    async (oldPath: string, newFolder: string) => {
      const basename = oldPath.split('/').pop()!;
      const newPath = newFolder ? `${newFolder}/${basename}` : basename;
      if (newPath === oldPath) return;
      const existing = files.find((f) => f.path === oldPath);
      if (!existing) return;
      // Tombstone old paths so sync deletes them remotely
      if (existing.remoteSha) {
        await addTombstone(oldPath);
        const oldAnnPath = oldPath.replace(/\.md$/, '.annotations.json');
        await addTombstone(oldAnnPath);
      }
      const moved: StoredFile = { ...existing, path: newPath, remoteSha: null, locallyModified: true, lastModified: new Date().toISOString() };
      await saveFile(moved);
      await deleteFileFromDb(oldPath);
      // Move annotations
      const oldAnnPath = oldPath.replace(/\.md$/, '.annotations.json');
      const newAnnPath = newPath.replace(/\.md$/, '.annotations.json');
      const { getAnnotations, saveAnnotations } = await import('@/lib/storage');
      const anns = await getAnnotations(oldAnnPath);
      if (anns) {
        await saveAnnotations({ ...anns, path: newAnnPath, remoteSha: null, locallyModified: true });
        await deleteAnnotationsFromDb(oldAnnPath);
      }
      setFiles((prev) => prev.map((f) => (f.path === oldPath ? moved : f)));
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
    folders,
    activeFile,
    activeFilePath,
    loading,
    importFile,
    importFiles,
    createFile,
    createFolder,
    deleteFile,
    deleteFolder,
    renameFile,
    renameFolder,
    moveFile,
    selectFile,
    updateFileContent,
    refreshFiles,
  };
}
