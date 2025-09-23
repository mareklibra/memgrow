import { useEffect } from 'react';

export const useKeyHandler = (handler: () => void, keyPressed?: string) => {
  useEffect(() => {
    const onKeyDownhandler = (e: KeyboardEvent) => {
      if (keyPressed && e.key === keyPressed) {
        e.preventDefault();
        handler();
      }
    };
    document.addEventListener('keydown', onKeyDownhandler, false);

    return () => {
      document.removeEventListener('keydown', onKeyDownhandler, false);
    };
  }, [handler, keyPressed]);
};
