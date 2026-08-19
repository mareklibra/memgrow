import Link from 'next/link';

import { fetchAllWords, fetchCourse } from '@/app/lib/data';
import { lusitana } from '@/app/ui/fonts';
import { s } from '@/app/ui/styles';
import { FastEntryForm } from '@/app/ui/FastEntryForm';
import { WordToAdd } from '@/app/lib/definitions';
import { addWord } from '@/app/lib/actions';
import { UpdateWordResult } from '@/app/lib/types';
import { getI18n } from '@/app/lib/i18n/get-i18n';

export default async function Page({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const { t } = await getI18n();
  if (!courseId) {
    return (
      <>
        <h1 className={`${lusitana.className} ${s.pageTitle}`}>
          {t('edit.missingCourse')}
        </h1>
        <p>
          {t('edit.goToEditBefore')}
          <Link href="/edit">{t('edit.editLink')}</Link>
          {t('edit.goToEditAfterAndEdit')}
        </p>
      </>
    );
  }

  const course = await fetchCourse(courseId);
  if (!course) {
    return (
      <>
        <h1 className={`${lusitana.className} ${s.pageTitle}`}>
          {t('edit.missingCourse')}
        </h1>
        <p>
          {t('edit.goToEditBefore')}
          <Link href="/edit">{t('edit.editLink')}</Link>
          {t('edit.goToEditAfterAndEdit')}
        </p>
      </>
    );
  }

  const allWords = await fetchAllWords(courseId);

  const handleAdd = async (word: WordToAdd): Promise<UpdateWordResult | undefined> => {
    'use server';
    return await addWord(word);
  };

  return (
    <>
      <h1 className={`${lusitana.className} ${s.pageTitle}`}>
        {t('edit.fastEntryTitle', { name: course.name })}
      </h1>
      <div className="flex flex-col gap-2">
        <FastEntryForm course={course} addWord={handleAdd} allWords={allWords} />
      </div>
      <p>
        {t('edit.fullFeaturesBefore')}{' '}
        <Link href={`/edit/${courseId}`}>
          <strong>{t('nav.edit')}</strong>
        </Link>
        &nbsp; {t('edit.fullFeaturesAfter')}
      </p>
    </>
  );
}
