import type { StoredFile } from '@/types';

export interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: TreeNode[];
  file?: StoredFile;
}

export function buildFileTree(files: StoredFile[], emptyFolders?: Set<string>): TreeNode[] {
  const root: TreeNode[] = [];

  const ensureFolder = (folderPath: string) => {
    const parts = folderPath.split('/');
    let current = root;
    for (let i = 0; i < parts.length; i++) {
      const name = parts[i];
      const path = parts.slice(0, i + 1).join('/');
      let existing = current.find((n) => n.name === name && n.type === 'folder');
      if (!existing) {
        existing = { name, path, type: 'folder', children: [] };
        current.push(existing);
      }
      current = existing.children!;
    }
  };

  // Add empty folders first
  if (emptyFolders) {
    for (const fp of emptyFolders) {
      ensureFolder(fp);
    }
  }

  for (const file of files) {
    const parts = file.path.split('/');
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const name = parts[i];
      const path = parts.slice(0, i + 1).join('/');
      const isFile = i === parts.length - 1;

      let existing = current.find((n) => n.name === name && n.type === (isFile ? 'file' : 'folder'));

      if (!existing) {
        if (isFile) {
          existing = { name, path, type: 'file', file };
        } else {
          existing = { name, path, type: 'folder', children: [] };
        }
        current.push(existing);
      }

      if (!isFile) {
        current = existing.children!;
      }
    }
  }

  sortTree(root);
  return root;
}

function sortTree(nodes: TreeNode[]) {
  nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  for (const node of nodes) {
    if (node.children) sortTree(node.children);
  }
}

export function getBasename(path: string): string {
  const idx = path.lastIndexOf('/');
  return idx >= 0 ? path.slice(idx + 1) : path;
}

export function getParentFolder(path: string): string {
  const idx = path.lastIndexOf('/');
  return idx >= 0 ? path.slice(0, idx) : '';
}
