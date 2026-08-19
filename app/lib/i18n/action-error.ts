import { getI18n } from './get-i18n';

export async function genericErrorMessage(
  error: unknown,
  context: string,
): Promise<string> {
  console.error(context, error);
  const { t } = await getI18n();
  return t('errors.generic');
}
