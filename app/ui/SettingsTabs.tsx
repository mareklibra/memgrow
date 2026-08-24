'use client';

import { useCallback, type KeyboardEvent, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import clsx from 'clsx';
import { useTranslation } from '@/app/lib/i18n/useTranslation';

type TabId = 'general' | 'me' | 'users';

const TAB_IDS: TabId[] = ['general', 'me', 'users'];

function parseTab(value: string | null, hasUsers: boolean): TabId {
  if (value === 'me') return 'me';
  if (value === 'users' && hasUsers) return 'users';
  return 'general';
}

function panelFor(
  id: TabId,
  general: ReactNode,
  me: ReactNode,
  users: ReactNode | undefined,
): ReactNode {
  if (id === 'general') return general;
  if (id === 'me') return me;
  return users;
}

export function SettingsTabs({
  general,
  me,
  users,
}: Readonly<{
  general: ReactNode;
  me: ReactNode;
  users?: ReactNode;
}>) {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hasUsers = !!users;
  const active = parseTab(searchParams.get('tab'), hasUsers);

  const items: { id: TabId; label: string }[] = [
    { id: 'general', label: t('settings.tabGeneral') },
    { id: 'me', label: t('settings.tabMe') },
    ...(hasUsers ? [{ id: 'users' as const, label: t('settings.tabUsers') }] : []),
  ];

  const setTab = useCallback(
    (id: TabId) => {
      const params = new URLSearchParams(searchParams.toString());
      if (id === 'general') {
        params.delete('tab');
      } else {
        params.set('tab', id);
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const onTabListKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (!keys.includes(event.key)) return;
    event.preventDefault();
    const ids = items.map((item) => item.id);
    const index = ids.indexOf(active);
    let next = active;
    if (event.key === 'ArrowRight') {
      next = ids[(index + 1) % ids.length];
    } else if (event.key === 'ArrowLeft') {
      next = ids[(index - 1 + ids.length) % ids.length];
    } else if (event.key === 'Home') {
      next = ids[0];
    } else if (event.key === 'End') {
      next = ids.at(-1) ?? ids[0];
    }
    setTab(next);
    document.getElementById(`settings-tab-${next}`)?.focus();
  };

  return (
    <div className="flex flex-col gap-4">
      <div
        role="tablist"
        aria-label={t('nav.settings')}
        className="flex border-b border-gray-200"
        onKeyDown={onTabListKeyDown}
      >
        {items.map((item) => {
          const isActive = item.id === active;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`settings-tab-${item.id}`}
              aria-selected={isActive}
              aria-controls={`settings-panel-${item.id}`}
              tabIndex={isActive ? 0 : -1}
              className={clsx(
                'px-4 py-2 text-sm font-medium border-b-2 -mb-px',
                isActive
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
              )}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {TAB_IDS.map((id) => {
        if (id === 'users' && !users) return null;
        const panel = panelFor(id, general, me, users);
        const isActive = id === active;
        return (
          <div
            key={id}
            role="tabpanel"
            id={`settings-panel-${id}`}
            aria-labelledby={`settings-tab-${id}`}
            hidden={!isActive}
          >
            {panel}
          </div>
        );
      })}
    </div>
  );
}
