import { auth } from '@/auth';
import { canChangeSharedDicts } from '@/app/lib/data';
import { getI18n } from '@/app/lib/i18n/get-i18n';

export default async function EditLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const allowed = session?.user?.id ? await canChangeSharedDicts(session.user.id) : false;
  if (!allowed) {
    const { t } = await getI18n();
    return <p className="p-6">{t('errors.cannotChangeSharedDicts')}</p>;
  }
  return children;
}
