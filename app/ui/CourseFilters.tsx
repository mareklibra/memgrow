import type { ReactNode } from 'react';
import { cn, s } from '@/app/ui/styles';

export function uniqueSorted(values: readonly (string | null | undefined)[]): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))].sort();
}

export function FilterBar({
  children,
  className,
}: Readonly<{ children: ReactNode; className?: string }>) {
  return (
    <div
      className={cn(
        'grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] items-end gap-3',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function FilterField({
  label,
  children,
}: Readonly<{ label: string; children: ReactNode }>) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-gray-900">
      {label}
      {children}
    </label>
  );
}

export function FilterSearch({
  label,
  value,
  onChange,
}: Readonly<{
  label: string;
  value: string;
  onChange: (value: string) => void;
}>) {
  return (
    <FilterField label={label}>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={s.input}
      />
    </FilterField>
  );
}

export function FilterSelect({
  label,
  value,
  onChange,
  emptyLabel,
  options,
}: Readonly<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  emptyLabel: string;
  options: readonly ({ value: string; label: string } | string)[];
}>) {
  return (
    <FilterField label={label}>
      <select
        className={s.input}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">{emptyLabel}</option>
        {options.map((option) => {
          const item =
            typeof option === 'string' ? { value: option, label: option } : option;
          return (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          );
        })}
      </select>
    </FilterField>
  );
}
