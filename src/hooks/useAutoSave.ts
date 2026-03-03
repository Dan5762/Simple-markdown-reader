import { useEffect, useRef, useState } from 'react';

export function useAutoSave(
  filePath: string | null,
  content: string,
  saveFn: (path: string, content: string) => Promise<void>,
  debounceMs = 500,
) {
  const [isSaving, setIsSaving] = useState(false);
  const lastSaved = useRef(content);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!filePath) return;
    if (content === lastSaved.current) return;

    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setIsSaving(true);
      await saveFn(filePath, content);
      lastSaved.current = content;
      setIsSaving(false);
    }, debounceMs);

    return () => clearTimeout(timerRef.current);
  }, [filePath, content, saveFn, debounceMs]);

  // Reset ref when switching files
  useEffect(() => {
    lastSaved.current = content;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filePath]);

  return { isSaving };
}
