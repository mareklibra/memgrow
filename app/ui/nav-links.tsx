'use client';

import {
  HomeIcon,
  AdjustmentsVerticalIcon,
  PencilSquareIcon,
  AcademicCapIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { Fragment } from 'react';

export default function NavLinks({ isLoggedIn }: { isLoggedIn: boolean }) {
  const pathname = usePathname();

  // Map of links to display in the side navigation.
  // Depending on the size of the application, this would be stored in a database.
  const links = [
    { name: 'Home', href: '/', icon: HomeIcon },
    { name: 'Learn new', href: '/learn', icon: AcademicCapIcon },
    { name: 'Test', href: '/test', icon: AdjustmentsVerticalIcon },
    {
      name: 'Edit',
      href: '/edit',
      icon: PencilSquareIcon,
    },
    {
      name: 'Settings',
      href: '/settings',
      icon: Cog6ToothIcon,
      disabled: !isLoggedIn,
    },
  ];

  return (
    <>
      {links.map((link, index) => {
        const LinkIcon = link.icon;
        let space;
        if (index === links.length - 1) {
          space = (
            <div className="hidden h-auto w-full grow rounded-md bg-gray-50 md:block"></div>
          );
        }

        const clz = clsx(
          'flex h-[48px] grow items-center justify-center gap-2 rounded-md bg-gray-50 p-3 text-sm font-medium md:flex-none md:justify-start md:p-2 md:px-3',
          {
            'bg-sky-100 text-blue-600': pathname === link.href,
          },
          {
            'hover:bg-sky-100 hover:text-blue-600': !link.disabled,
          },
        );

        if (link.disabled) {
          return (
            <Fragment key={link.name}>
              {space}
              <div key={link.name} className={clz}>
                <LinkIcon className="w-6" />
                <p className="hidden md:block">{link.name}</p>
              </div>
            </Fragment>
          );
        }

        return (
          <Fragment key={link.name}>
            {space}
            <Link key={link.name} href={link.href} className={clz}>
              <LinkIcon className="w-6" />
              <p className="hidden md:block">{link.name}</p>
            </Link>
          </Fragment>
        );
      })}
    </>
  );
}
