import { Input, Typography } from '@/app/lib/material-tailwind-compat';

export const SearchBar = ({
  setSearch,
  matches,
}: {
  setSearch: (search: string) => void;
  matches: number;
}) => {
  return (
    <div className="flex flex-col gap-1 m-4">
      <Input
        label="Type word or definition to search for"
        onChange={(e) => {
          setSearch(e.target.value);
        }}
      />
      <Typography variant="small" color="gray" className="ml-2">
        Found {matches} {matches === 1 ? 'word' : 'words'}
      </Typography>
    </div>
  );
};
