'use server';

import { sql } from '@/app/lib/db';
import { DeleteImageResult, GenerateImageResult, RequestImageResult } from '../types';
import { WordImage } from '../definitions';
import { fetchWord, fetchCourse } from '../data';
import { generateImage } from '../image-provider';
import { genericErrorMessage } from '@/app/lib/i18n/action-error';
import { getI18n } from '@/app/lib/i18n/get-i18n';

export async function insertWordImage(
  wordId: string,
  content: Buffer,
): Promise<{ id: string }> {
  const result = await sql.query(
    `INSERT INTO word_images (word_id, content)
     VALUES ($1, $2)
     RETURNING id`,
    [wordId, content],
  );
  return { id: result.rows[0].id };
}

export async function deleteWordImage(imageId: string): Promise<DeleteImageResult> {
  try {
    await sql.query(`DELETE FROM word_images WHERE id = $1`, [imageId]);
    return undefined;
  } catch (e) {
    return {
      message: await genericErrorMessage(e, 'Failed to delete image'),
    };
  }
}

export async function deleteAllWordImages(wordId: string): Promise<DeleteImageResult> {
  try {
    await sql.query(`DELETE FROM word_images WHERE word_id = $1`, [wordId]);
    return undefined;
  } catch (e) {
    return {
      message: await genericErrorMessage(e, 'Failed to delete images'),
    };
  }
}

export async function removeImageRequest(wordId: string) {
  await sql.query(`DELETE FROM image_requests WHERE word_id = $1`, [wordId]);
}

async function clearInProgress(wordId: string) {
  await sql.query(
    `UPDATE image_requests SET in_progress_since = NULL WHERE word_id = $1`,
    [wordId],
  );
}

export async function generateWordImage(wordId: string): Promise<GenerateImageResult> {
  console.log(`generateWordImage: starting for wordId=${wordId}`);
  const { t } = await getI18n();
  try {
    const word = await fetchWord(wordId);
    if (!word) {
      console.error(`generateWordImage: word not found, id=${wordId}`);
      return { message: t('errors.wordNotFound', { id: wordId }) };
    }

    const course = await fetchCourse(word.courseId);
    if (!course) {
      console.error(`generateWordImage: course not found, id=${word.courseId}`);
      return { message: t('errors.courseNotFound', { id: word.courseId }) };
    }

    const prompt = [
      `For every image requested, create a single mnemonic image for the ${course.learningLang} word '${word.word}'`,
      `when translated to (${course.knownLang}: '${word.definition}').`,
      `The image must be ONE coherent scene - not a collage, not a grid, not a collection of thumbnails.`,
      `Show exactly one unified composition that illustrates the word's meaning.`,
      `Do not tile, repeat, or multiply the subject. Do not split the canvas into panels or sections.`,
      `Do not inscribe any text, be descriptive by the image itself.`,
      `Each image should trigger a completely unrelated visual association with the word's meaning, vary artistic styles (e.g. photorealistic, watercolor, cartoon, or abstract).`,
      // `Never include text in ${course.knownLang} but you can use VERY BRIEFLY ${course.learningLang}`,
    ].join(' ');

    const result = await generateImage(prompt);
    if (result.error || !result.images?.length) {
      const message = result.error || t('errors.noImageData');
      console.error(`generateWordImage: failed for wordId=${wordId}: ${message}`);
      return { message: result.error ? t('errors.generic') : t('errors.noImageData') };
    }

    let lastImageId: string | undefined;
    for (const buffer of result.images) {
      const { id } = await insertWordImage(wordId, buffer);
      lastImageId = id;
    }
    await removeImageRequest(wordId);

    console.log(
      `generateWordImage: succeeded for wordId=${wordId}, stored ${result.images.length} image(s), lastImageId=${lastImageId}`,
    );
    return { imageId: lastImageId };
  } catch (e) {
    console.error(`generateWordImage: unhandled error for wordId=${wordId}:`, e);
    await clearInProgress(wordId).catch(() => {});

    return { message: await genericErrorMessage(e, `generateWordImage ${wordId}`) };
  }
}

export async function requestImageGeneration(
  wordId: string,
): Promise<RequestImageResult> {
  try {
    await sql.query(
      `INSERT INTO image_requests (word_id)
       VALUES ($1)
       ON CONFLICT (word_id) DO NOTHING`,
      [wordId],
    );

    return {};
  } catch (e) {
    return {
      message: await genericErrorMessage(e, 'Failed to queue image request'),
    };
  }
}

export type WordImageInfo = Pick<WordImage, 'id' | 'createdAt'> & { sizeKb: number };

export async function queryWordImages(
  wordId: string,
): Promise<{ images?: WordImageInfo[]; message?: string }> {
  try {
    const result = await sql.query(
      `SELECT id, created_at, LENGTH(content) AS size_bytes FROM word_images WHERE word_id = $1 ORDER BY created_at ASC`,
      [wordId],
    );
    return {
      images: result.rows.map(
        (row: { id: string; created_at: string; size_bytes: number }) => ({
          id: row.id,
          createdAt: new Date(row.created_at),
          sizeKb: Math.round(row.size_bytes / 1024),
        }),
      ),
    };
  } catch (e) {
    return {
      message: await genericErrorMessage(e, 'Failed to fetch word images'),
    };
  }
}
