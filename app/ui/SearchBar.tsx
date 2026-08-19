import { Input, Typography } from '@/app/lib/material-tailwind-compat';
import { useTranslation } from '@/app/lib/i18n/useTranslation';

export const SearchBar = ({
  setSearch,
  matches,
}: {
  setSearch: (search: string) => void;
  matches: number;
}) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-1 m-4">
      <Input
        label={t('edit.searchLabel')}
        onChange={(e) => {
          setSearch(e.target.value);
        }}
      />
      <Typography variant="small" color="gray" className="ml-2">
        {t('edit.found', { count: matches })}
      </Typography>
    </div>
  );
};
