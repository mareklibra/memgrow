'use client';

import {
  HomeIcon,
  AdjustmentsVerticalIcon,
  PencilSquareIcon,
  AcademicCapIcon,
  PhotoIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { s } from '@/app/ui/styles';
import { Fragment } from 'react';
import { useTranslation } from '@/app/lib/i18n/useTranslation';

export default function NavLinks({
  isLoggedIn,
  userName,
  canChangeSharedDicts,
}: {
  isLoggedIn: boolean;
  userName: string;
  canChangeSharedDicts: boolean;
}) {
  const pathname = usePathname();
  const { t } = useTranslation();

  const links = [
    { name: t('nav.home'), href: '/', icon: HomeIcon },
    { name: t('nav.learnNew'), href: '/learn', icon: AcademicCapIcon },
    { name: t('nav.test'), href: '/test', icon: AdjustmentsVerticalIcon },
    {
      name: t('nav.edit'),
      href: '/edit',
      icon: PencilSquareIcon,
    },
    {
      name: t('nav.media'),
      href: '/media',
      icon: PhotoIcon,
    },
    {
      name: userName ? t('nav.settingsWithName', { name: userName }) : t('nav.settings'),
      href: '/settings',
      icon: Cog6ToothIcon,
    },
  ];

  return (
    <>
      {links.map((link, index) => {
        const LinkIcon = link.icon;
        const sharedLocked =
          !canChangeSharedDicts && (link.href === '/edit' || link.href === '/media');
        const disabled =
          (!isLoggedIn && link.href !== '/') || (isLoggedIn && sharedLocked);
        let space;
        if (index === links.length - 1) {
          space = <div className={s.navSpacer}></div>;
        }

        const clz = clsx(
          s.navLink,
          {
            [s.navActive]: pathname.startsWith(`${link.href}`) && link.href.length > 1,
          },
          {
            [s.navHover]: !disabled,
          },
        );

        if (disabled) {
          return (
            <Fragment key={link.name}>
              {space}
              <div key={link.name} className={clz}>
                <LinkIcon className="w-5 md:w-6" />
                <p className="hidden md:block">{link.name}</p>
              </div>
            </Fragment>
          );
        }

        return (
          <Fragment key={link.name}>
            {space}
            <Link key={link.name} href={link.href} className={clz}>
              <LinkIcon className="w-5 md:w-6" />
              <p className="hidden md:block">{link.name}</p>
            </Link>
          </Fragment>
        );
      })}
    </>
  );
}
