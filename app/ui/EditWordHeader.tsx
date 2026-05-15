import { Checkbox } from '@/app/lib/material-tailwind-compat';
import clsx from 'clsx';
import { s } from '@/app/ui/styles';
import { SortColumn } from './types';
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

const SortIndicator = ({
  column,
  activeColumn,
  direction,
}: {
  column: SortColumn;
  activeColumn: SortColumn;
  direction: 'asc' | 'desc';
}) => {
  if (column !== activeColumn) return null;
  return direction === 'asc' ? (
    <ChevronUpIcon className="w-3 h-3 inline ml-1" />
  ) : (
    <ChevronDownIcon className="w-3 h-3 inline ml-1" />
  );
};

export const EditWordHeader = ({
  fastEntry,
  isEnriched,
  switchEnrichment,
  sortColumn,
  sortDirection,
  onSort,
}: {
  fastEntry?: boolean;
  isEnriched: boolean;
  switchEnrichment: () => void;
  sortColumn: SortColumn;
  sortDirection: 'asc' | 'desc';
  onSort: (column: SortColumn) => void;
}) => {
  const sortable = (column: SortColumn, extra?: string) =>
    clsx(s.th, 'cursor-pointer select-none hover:text-blue-600', extra);

  return (
    <thead>
      <tr>
        <th scope="col">
          <Checkbox checked={isEnriched} onChange={switchEnrichment} />
        </th>
        <th
          scope="col"
          className={sortable('word', 'min-w-32')}
          onClick={() => onSort('word')}
        >
          Word
          <SortIndicator
            column="word"
            activeColumn={sortColumn}
            direction={sortDirection}
          />
        </th>
        <th
          scope="col"
          className={sortable('definition', 'min-w-32')}
          onClick={() => onSort('definition')}
        >
          Definition
          <SortIndicator
            column="definition"
            activeColumn={sortColumn}
            direction={sortDirection}
          />
        </th>
        {!fastEntry && (
          <>
            <th
              scope="col"
              className={sortable('memLevel')}
              onClick={() => onSort('memLevel')}
            >
              Memory Level
              <SortIndicator
                column="memLevel"
                activeColumn={sortColumn}
                direction={sortDirection}
              />
            </th>
            <th scope="col" className={sortable('form')} onClick={() => onSort('form')}>
              Next Form
              <SortIndicator
                column="form"
                activeColumn={sortColumn}
                direction={sortDirection}
              />
            </th>
            <th
              scope="col"
              className={sortable('repeatAgain')}
              onClick={() => onSort('repeatAgain')}
            >
              Repeat
              <SortIndicator
                column="repeatAgain"
                activeColumn={sortColumn}
                direction={sortDirection}
              />
            </th>
          </>
        )}
        <th scope="col" className={clsx(s.th, 'w-50')}>
          Action
        </th>
      </tr>
    </thead>
  );
};
