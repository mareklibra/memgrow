import clsx from 'clsx';
import { Button } from './button';

export type TranslationOptionState = 'normal' | 'mistake' | 'correct' | 'disabled';

export const TranslationOption = ({
  state,
  option,
  handleClick,
}: {
  state: TranslationOptionState;
  option: string;
  handleClick: (option: string) => void;
}) => {
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
        <div className="text-black">{option}</div>
      </Button>
    </div>
  );
};
