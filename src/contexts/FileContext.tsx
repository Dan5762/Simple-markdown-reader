import { createContext, useContext, type ReactNode } from 'react';
import { useFiles } from '@/hooks/useFiles';

type FileContextValue = ReturnType<typeof useFiles>;

const FileContext = createContext<FileContextValue | null>(null);

export function FileProvider({ children }: { children: ReactNode }) {
  const value = useFiles();
  return <FileContext.Provider value={value}>{children}</FileContext.Provider>;
}

export function useFileContext(): FileContextValue {
  const ctx = useContext(FileContext);
  if (!ctx) throw new Error('useFileContext must be used within FileProvider');
  return ctx;
}
