import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/app/ui/styles';
import { Button } from './button';
import { useCallback } from 'react';
import { useKeyHandler } from './useKeyHandler';

export type TranslationOptionState = 'normal' | 'mistake' | 'correct' | 'disabled';

export const translationOptionVariants = cva('justify-center w-full h-16', {
  variants: {
    state: {
      normal: '',
      correct: 'bg-success',
      mistake: 'bg-danger',
      disabled: 'bg-gray-200',
    },
  },
  defaultVariants: {
    state: 'normal',
  },
});

interface TranslationOptionProps extends VariantProps<typeof translationOptionVariants> {
  state: TranslationOptionState;
  option: string;
  optionTwin: string;
  shortcut?: string;
  handleClick: (option: string) => void;
}

export const TranslationOption = ({
  state,
  option,
  optionTwin,
  shortcut,
  handleClick,
}: TranslationOptionProps) => {
  const handleKeyClick = useCallback(() => handleClick(option), [handleClick, option]);
  useKeyHandler(handleKeyClick, shortcut);

  return (
    <div>
      <Button
        className={cn(translationOptionVariants({ state }))}
        onClick={(e) => {
          e.preventDefault();
          handleClick(option);
        }}
      >
        {state === 'mistake' && (
          <div className="grid grid-flow-col grid-rows-2 gap-2 w-full">
            <div className="col-span-11 text-black">{option}</div>
            <div className="col-span-11 text-black">({optionTwin})</div>
            {shortcut && (
              <div className="row-span-2 self-center text-gray-500">{shortcut}</div>
            )}
          </div>
        )}
        {state !== 'mistake' && (
          <div className="grid grid-flow-col grid-rows-1 gap-2 w-full">
            <div className="col-span-11 text-black">{option}</div>
            {shortcut && <div className="self-center text-gray-500">{shortcut}</div>}
          </div>
        )}
      </Button>
    </div>
  );
};
