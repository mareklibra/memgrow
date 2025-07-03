import { useMemo } from 'react';

export const useWithSound = (
  audioSource?: string,
): { playSound?: () => Promise<void>; pauseSound?: () => void } =>
  useMemo(() => {
    if (audioSource) {
      const soundRef = new Audio(audioSource);
      return {
        playSound: () => soundRef.play(),
        pauseSound: () => soundRef.pause(),
      };
    }
    return {
      playSound: undefined,
      pauseSound: undefined,
    };
  }, [audioSource]);
