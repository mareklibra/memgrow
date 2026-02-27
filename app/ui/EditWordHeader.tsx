import { Checkbox } from '@/app/lib/material-tailwind-compat';
import clsx from 'clsx';
export const thClass =
  'px-3 py-3 text-start text-xs font-medium text-gray-500 uppercase dark:text-neutral-500';

export const EditWordHeader = ({
  fastEntry,
  isEnriched,
  switchEnrichment,
}: {
  fastEntry?: boolean;
  isEnriched: boolean;
  switchEnrichment: () => void;
}) => (
  <thead>
    <tr>
      <th scope="col">
        <Checkbox checked={isEnriched} onChange={switchEnrichment} />
      </th>
      <th scope="col" className={clsx(thClass, 'min-w-32')}>
        Word
      </th>
      <th scope="col" className={clsx(thClass, 'min-w-32')}>
        Definition
      </th>
      {!fastEntry && (
        <>
          <th scope="col" className={thClass}>
            Memory Level
          </th>
          <th scope="col" className={thClass}>
            Next Form
          </th>
          <th scope="col" className={thClass}>
            Repeat
          </th>
        </>
      )}
      <th scope="col" className={clsx(thClass, 'w-50')}>
        Action
      </th>
    </tr>
  </thead>
);
