import { useCallback, useEffect, useRef, useState } from 'react';

const COPIED_MS = 1800;

export function useCopyToClipboard(): [
  copied: boolean,
  copy: (text: string) => Promise<void>,
  reset: () => void,
] {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Needs https or localhost; every caller keeps the text on screen to select.
      return;
    }
    window.clearTimeout(timer.current);
    setCopied(true);
    timer.current = window.setTimeout(() => setCopied(false), COPIED_MS);
  }, []);

  const reset = useCallback(() => {
    window.clearTimeout(timer.current);
    setCopied(false);
  }, []);

  return [copied, copy, reset];
}
