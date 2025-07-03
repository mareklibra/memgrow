import { useEffect, useState } from 'react';

export type UseWithSound = {
  playSound?: () => Promise<void>;
  pauseSound?: () => void;
};

export const useWithSound = (audioSource?: string): UseWithSound => {
  const [sound, setSound] = useState<UseWithSound>({});
  const [currentAudioSrc, setCurrentAudioSrc] = useState<string>();

  useEffect(() => {
    if (audioSource && currentAudioSrc !== audioSource) {
      console.log('Changing audio to: ', audioSource, ', from: ', currentAudioSrc);
      const audio = new Audio(audioSource);
      setSound({
        playSound: () => audio.play(),
        pauseSound: () => audio.pause(),
      });
      setCurrentAudioSrc(audioSource);
    }
  }, [audioSource, currentAudioSrc]);

  return sound;
};
