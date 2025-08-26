import { Input, Typography } from '@material-tailwind/react';

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
          console.log('-- onChange');
          setSearch(e.target.value);
        }}
        crossOrigin={undefined}
      />
      <Typography variant="small" color="gray" className="ml-2">
        Found {matches} {matches === 1 ? 'word' : 'words'}
      </Typography>
    </div>
  );
};
