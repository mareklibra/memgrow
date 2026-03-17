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
import { s } from '@/app/ui/styles';

export default function NavLinks({
  isLoggedIn,
  userName,
}: {
  isLoggedIn: boolean;
  userName: string;
}) {
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
      name: userName ? `Settings (${userName})` : 'Settings',
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
          space = <div className={s.navSpacer}></div>;
        }

        const clz = clsx(
          s.navLink,
          {
            [s.navActive]: pathname.startsWith(`${link.href}`) && link.href.length > 1,
          },
          {
            [s.navHover]: !link.disabled,
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
