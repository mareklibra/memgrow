import { fetchCourses, fetchWordMediaSummaries } from '@/app/lib/data';
import {
  requestImageGeneration,
  removeImageRequest,
  queryWordImages,
  deleteWordImage,
  deleteAllWordImages,
  deletePronunciation,
} from '@/app/lib/actions';
import { lusitana } from '@/app/ui/fonts';
import { s } from '@/app/ui/styles';
import { MediaManager } from '@/app/ui/MediaManager';
import { WordMediaSummary } from '@/app/lib/types';
import { getI18n } from '@/app/lib/i18n/get-i18n';

export default async function Page() {
  const courses = await fetchCourses();
  const { t } = await getI18n();

  const fetchSummaries = async (courseId: string): Promise<WordMediaSummary[]> => {
    'use server';
    return await fetchWordMediaSummaries(courseId);
  };

  const handleRequestImageGeneration = async (wordId: string) => {
    'use server';
    return await requestImageGeneration(wordId);
  };

  const handleRemoveImageRequest = async (wordId: string) => {
    'use server';
    await removeImageRequest(wordId);
  };

  const handleDeleteSound = async (wordId: string) => {
    'use server';
    try {
      await deletePronunciation(wordId);
    } catch (e) {
      console.error(e);
      const { t: translate } = await getI18n();
      return { message: translate('errors.generic') };
    }
  };

  return (
    <div className={s.pageContainer}>
      <h1 className={`${lusitana.className} ${s.pageTitle}`}>{t('media.title')}</h1>
      <MediaManager
        courses={courses}
        fetchSummaries={fetchSummaries}
        requestImageGeneration={handleRequestImageGeneration}
        removeImageRequest={handleRemoveImageRequest}
        queryImages={queryWordImages}
        deleteImage={deleteWordImage}
        deleteAllImages={deleteAllWordImages}
        deleteSound={handleDeleteSound}
      />
    </div>
  );
}
