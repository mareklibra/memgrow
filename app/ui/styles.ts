/**
 * Shared style constants for consistent Tailwind CSS usage across the app.
 *
 * Usage:
 *   import { s, cn } from '@/app/ui/styles';
 *   <td className={s.td}>
 *   <td className={cn(s.td, 'w-2')}>
 *   <button className={cn(base, conditional && 'override')}>
 *
 * cn() = clsx + tailwind-merge: use it when class overrides matter
 * (e.g. components accepting className, or conditional bg/color overrides).
 * Plain clsx is fine for pure additive conditional classes.
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const s = {
  // ── Table ──────────────────────────────────────────────────────────
  th: 'px-3 py-3 text-start text-xs font-medium text-gray-500 uppercase dark:text-neutral-500',
  td: 'px-3 py-4 text-sm font-medium text-gray-800 dark:text-neutral-200',
  tableDivider: 'divide-y divide-gray-200 dark:divide-neutral-700',

  // ── Inputs ─────────────────────────────────────────────────────────
  // Full-featured input with dark mode (edit forms, word entry)
  input:
    'bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500',

  // Simple input (login, type-translation) — uses @theme --spacing-input-y
  inputSimple:
    'peer block w-full rounded-md border border-gray-200 py-input-y pl-10 text-sm placeholder:text-gray-500',

  // Form label
  label: 'mb-3 mt-5 block text-xs font-medium text-gray-900',

  // Icon overlay inside an input field (place inside a relative container)
  inputIcon:
    'pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900',

  // ── Text ───────────────────────────────────────────────────────────
  errorText: 'text-danger',
  pageTitle: 'mb-4 text-xl md:text-2xl',

  // ── Word display ───────────────────────────────────────────────────
  // Uses @theme --spacing-word-y
  wordStatic:
    'w-full rounded-md border border-blue-200 text-lg mb-8 py-word-y px-2 bg-light-blue-100 text-center',

  // ── Layout ─────────────────────────────────────────────────────────
  pageContainer: 'pt-4 pr-4',
  separator: 'h-px my-8 bg-gray-200 border-0 dark:bg-gray-700',
  sectionSeparator: 'w-full m-4 border-t-2 border-gray-400',
  centered: 'w-full flex justify-center mt-10',

  // ── Navigation ─────────────────────────────────────────────────────
  navLink:
    'flex h-[48px] grow items-center justify-center gap-2 rounded-md bg-gray-50 p-3 text-sm font-medium md:flex-none md:justify-start md:p-2 md:px-3',
  navActive: 'bg-sky-100 text-blue-600',
  navHover: 'hover:bg-sky-100 hover:text-blue-600',
  navSpacer: 'hidden h-auto w-full grow rounded-md bg-gray-50 md:block',

  // ── Course card ────────────────────────────────────────────────────
  courseCard:
    'my-6 bg-white shadow-xs border border-gray-300 rounded-lg m-2 w-96 min-w-64',

  // ── Dialog ─────────────────────────────────────────────────────────
  dialogOverlay: 'fixed inset-0 z-50 flex items-center justify-center p-4',
  dialogBackdrop: 'fixed inset-0 bg-black/50 transition-opacity',
  dialogPanel:
    'relative w-full max-w-md transform overflow-hidden rounded-lg bg-white px-6 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:p-6',
  dialogCloseBtn:
    'rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-hidden focus:ring-3 focus:ring-blue-500 focus:ring-offset-2',
  dialogTitle: 'text-lg font-medium leading-6 text-gray-900',
  dialogDescription: 'text-sm text-gray-500',
  dialogConfirmBtn:
    'inline-flex w-full justify-center rounded-md border border-transparent px-4 py-2 text-base font-medium text-white shadow-xs focus:outline-hidden focus:ring-3 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm',
  dialogCancelBtn:
    'mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-xs hover:bg-gray-50 focus:outline-hidden focus:ring-3 focus:ring-blue-500 focus:ring-offset-2 sm:mt-0 sm:w-auto sm:text-sm',
  disabledState: 'opacity-50 cursor-not-allowed',

  // ── Feedback ─────────────────────────────────────────────────────
  successText: 'text-green-600',
  inlineActions: 'flex items-center justify-end gap-4 my-4',

  // ── Simulation ─────────────────────────────────────────────────────
  simInput: 'border border-gray-300 rounded px-2 py-1 text-sm',
  simLabel: 'text-sm text-gray-600',
} as const;
