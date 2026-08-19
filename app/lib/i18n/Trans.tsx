'use client';

import { useTranslation } from './useTranslation';
import type { InterpolationValues, MessageKey } from './index';

export function Trans({
  message,
  params,
}: Readonly<{
  message: MessageKey;
  params?: InterpolationValues;
}>) {
  const { t } = useTranslation();
  return t(message, params);
}
