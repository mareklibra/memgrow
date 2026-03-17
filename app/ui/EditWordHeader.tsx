import { Checkbox } from '@/app/lib/material-tailwind-compat';
import clsx from 'clsx';
import { s } from '@/app/ui/styles';

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
      <th scope="col" className={clsx(s.th, 'min-w-32')}>
        Word
      </th>
      <th scope="col" className={clsx(s.th, 'min-w-32')}>
        Definition
      </th>
      {!fastEntry && (
        <>
          <th scope="col" className={s.th}>
            Memory Level
          </th>
          <th scope="col" className={s.th}>
            Next Form
          </th>
          <th scope="col" className={s.th}>
            Repeat
          </th>
        </>
      )}
      <th scope="col" className={clsx(s.th, 'w-50')}>
        Action
      </th>
    </tr>
  </thead>
);
