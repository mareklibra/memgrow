import clsx from 'clsx';
import { Button } from './button';
import { useCallback } from 'react';
import { useKeyHandler } from './useKeyHandler';

export type TranslationOptionState = 'normal' | 'mistake' | 'correct' | 'disabled';

export const TranslationOption = ({
  state,
  option,
  shortcut,
  handleClick,
}: {
  state: TranslationOptionState;
  option: string;
  shortcut?: string;
  handleClick: (option: string) => void;
}) => {
  const handleKeyClick = useCallback(() => handleClick(option), [handleClick, option]);
  useKeyHandler(handleKeyClick, shortcut);

  return (
    <div>
      <Button
        className={clsx('justify-center w-full h-16', {
          'bg-green-600': state === 'correct',
          'bg-red-500': state === 'mistake',
          'bg-gray-200': state === 'disabled',
        })}
        onClick={(e) => {
          e.preventDefault();
          handleClick(option);
        }}
      >
        <>
          <div className="text-black w-full">{option}</div>
          {shortcut && <div className="text-gray-500">{shortcut}</div>}
        </>
      </Button>
    </div>
  );
};
