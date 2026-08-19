'use client';

import { Card, CardBody, Typography } from '@/app/lib/material-tailwind-compat';
import { LanguageSwitcher } from '@/app/ui/LanguageSwitcher';
import { useTranslation } from '@/app/lib/i18n/useTranslation';

export function LanguageCard() {
  const { t } = useTranslation();

  return (
    <Card className="w-96 h-fit" variant="gradient" shadow={true}>
      <CardBody className="flex flex-col gap-4">
        <Typography variant="small" className="font-normal uppercase">
          {t('settings.language')}
        </Typography>
        <LanguageSwitcher />
      </CardBody>
    </Card>
  );
}
