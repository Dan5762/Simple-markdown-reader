import { createContext, useContext, type ReactNode } from 'react';
import { useAnnotations } from '@/hooks/useAnnotations';

type AnnotationContextValue = ReturnType<typeof useAnnotations>;

const AnnotationContext = createContext<AnnotationContextValue | null>(null);

export function AnnotationProvider({
  activeFilePath,
  children,
}: {
  activeFilePath: string | null;
  children: ReactNode;
}) {
  const value = useAnnotations(activeFilePath);
  return (
    <AnnotationContext.Provider value={value}>
      {children}
    </AnnotationContext.Provider>
  );
}

export function useAnnotationContext(): AnnotationContextValue {
  const ctx = useContext(AnnotationContext);
  if (!ctx) throw new Error('useAnnotationContext must be used within AnnotationProvider');
  return ctx;
}
