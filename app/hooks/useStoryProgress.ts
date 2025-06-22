import { useEffect, useRef, useState } from 'react';

export default function useStoryProgress(length: number, onComplete: () => void) {
  const [index, setIndex] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const clear = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const schedule = (i: number) => {
    clear();
    if (length === 0) return;
    timerRef.current = setTimeout(() => {
      if (i < length - 1) {
        setIndex(i + 1);
      } else {
        onComplete();
      }
    }, 5000);
  };

  useEffect(() => {
    schedule(index);
    return clear;
  }, [index, length]);

  const next = () => {
    setIndex(i => {
      const nextIndex = Math.min(length - 1, i + 1);
      if (nextIndex === length - 1 && i === length - 1) onComplete();
      return nextIndex;
    });
  };

  const prev = () => {
    setIndex(i => Math.max(0, i - 1));
  };

  const reset = () => setIndex(0);

  return { index, next, prev, reset };
}
