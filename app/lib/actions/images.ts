'use server';

import { sql } from '@vercel/postgres';
import { DeleteImageResult, GenerateImageResult, RequestImageResult } from '../types';
import { WordImage } from '../definitions';
import { fetchWord, fetchCourse } from '../data';
import { generateImage } from '../image-provider';

export async function insertWordImage(
  wordId: string,
  contentBase64: string,
): Promise<{ id: string }> {
  const result = await sql.query(
    `INSERT INTO word_images (word_id, content)
     VALUES ($1, $2)
     RETURNING id`,
    [wordId, contentBase64],
  );
  return { id: result.rows[0].id };
}

export async function deleteWordImage(imageId: string): Promise<DeleteImageResult> {
  try {
    await sql.query(`DELETE FROM word_images WHERE id = $1`, [imageId]);
    return undefined;
  } catch (e) {
    return {
      message: `Database Error: Failed to delete image. ${JSON.stringify(e)}`,
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
  try {
    const word = await fetchWord(wordId);
    if (!word) {
      return { message: `Word not found, id: ${wordId}` };
    }

    const course = await fetchCourse(word.courseId);
    if (!course) {
      return { message: `Course not found, id: ${word.courseId}` };
    }

    const prompt = [
      `For every image requested, create a single mnemonic image for the ${course.learningLang} word '${word.word}'`,
      `(${course.knownLang}: '${word.definition}').`,
      `The image must be ONE coherent scene - not a collage, not a grid, not a collection of thumbnails.`,
      `Show exactly one unified composition that illustrates the word's meaning.`,
      `Do not tile, repeat, or multiply the subject. Do not split the canvas into panels or sections.`,
      `Each image should trigger a completely unrelated visual association with the word's meaning, vary artistic styles (e.g. photorealistic, watercolor, cartoon, or abstract).`,
      `Never include text in ${course.knownLang} but you can use VERY BRIEFLY ${course.learningLang}`,
    ].join(' ');

    const result = await generateImage(prompt);
    if (result.error || !result.images?.length) {
      return { message: result.error || 'No image data returned from the model' };
    }

    let lastImageId: string | undefined;
    for (const base64Data of result.images) {
      const { id } = await insertWordImage(wordId, base64Data);
      lastImageId = id;
    }
    await removeImageRequest(wordId);

    return { imageId: lastImageId };
  } catch (e) {
    console.error('Image generation error:', e);
    await clearInProgress(wordId).catch(() => {});

    const message =
      e instanceof Error ? e.message : `Image generation failed: ${JSON.stringify(e)}`;
    return { message };
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
      message: `Failed to queue image request. ${JSON.stringify(e)}`,
    };
  }
}

export async function queryWordImages(
  wordId: string,
): Promise<{ images?: Pick<WordImage, 'id' | 'createdAt'>[]; message?: string }> {
  try {
    const result = await sql.query(
      `SELECT id, created_at FROM word_images WHERE word_id = $1 ORDER BY created_at ASC`,
      [wordId],
    );
    return {
      images: result.rows.map((row: { id: string; created_at: string }) => ({
        id: row.id,
        createdAt: new Date(row.created_at),
      })),
    };
  } catch (e) {
    return {
      message: `Failed to fetch word images. ${JSON.stringify(e)}`,
    };
  }
}
