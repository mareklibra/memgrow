'use client';

import { useState } from 'react';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';

export function MobileNavWrapper({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="w-full flex-none md:w-64">
      {!isOpen && (
        <div className="flex justify-end p-1 md:hidden">
          <button
            className="p-1 rounded-md bg-gray-50 hover:bg-sky-100"
            onClick={() => setIsOpen(true)}
            aria-label="Open navigation"
          >
            <Bars3Icon className="w-6 h-6" />
          </button>
        </div>
      )}

      <div className={`${isOpen ? 'flex items-center' : 'hidden'} md:block`}>
        <div className="grow">{children}</div>
        {isOpen && (
          <button
            className="shrink-0 p-1 mr-2 rounded-md bg-gray-50 hover:bg-sky-100 md:hidden"
            onClick={() => setIsOpen(false)}
            aria-label="Close navigation"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        )}
      </div>
    </div>
  );
}
