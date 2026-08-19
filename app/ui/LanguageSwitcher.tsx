'use client';

import { useRouter } from 'next/navigation';

import { setLocale } from '@/app/lib/actions/locale';
import { LOCALES, localeDisplayNames, type Locale } from '@/app/lib/i18n';
import { useTranslation } from '@/app/lib/i18n/useTranslation';
import { s } from '@/app/ui/styles';

export function LanguageSwitcher({ className }: Readonly<{ className?: string }>) {
  const { locale, t } = useTranslation();
  const router = useRouter();

  const handleChange = async (next: string) => {
    await setLocale(next);
    router.refresh();
  };

  return (
    <label className={className}>
      <span className="sr-only">{t('locale.label')}</span>
      <select
        className={s.input}
        value={locale}
        onChange={(e) => {
          void handleChange(e.target.value);
        }}
        aria-label={t('locale.label')}
      >
        {LOCALES.map((code: Locale) => (
          <option key={code} value={code}>
            {localeDisplayNames[code]}
          </option>
        ))}
      </select>
    </label>
  );
}
