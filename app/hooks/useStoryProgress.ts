import { useEffect, useRef, useState } from 'react';
import { Animated } from 'react-native';

export default function useStoryProgress(length: number, onComplete: () => void) {
  const [index, setIndex] = useState(0);
  const progress = useRef(new Animated.Value(0)).current;

  const clear = () => {
    progress.stopAnimation();
  };

  const schedule = (i: number) => {
    clear();
    if (length === 0) return;
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: 5000,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        if (i < length - 1) setIndex(i + 1);
        else onComplete();
      }
    });
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

  return { index, next, prev, reset, progress };
}
