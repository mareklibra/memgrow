import { PASSWORD_MIN_LENGTH } from '@/app/constants';
import { getI18n } from '@/app/lib/i18n/get-i18n';

export async function rejectShortPassword(password: string): Promise<string | undefined> {
  if (password.length < PASSWORD_MIN_LENGTH) {
    const { t } = await getI18n();
    return t('errors.passwordTooShort', { min: PASSWORD_MIN_LENGTH });
  }
}
