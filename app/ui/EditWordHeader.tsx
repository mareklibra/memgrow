import clsx from 'clsx';
export const thClass =
  'px-3 py-3 text-start text-xs font-medium text-gray-500 uppercase dark:text-neutral-500';

export const EditWordHeader = ({ fastEntry }: { fastEntry?: boolean }) => (
  <thead>
    <tr>
      <th scope="col"></th>
      <th scope="col" className={thClass}>
        Word
      </th>
      <th scope="col" className={thClass}>
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
