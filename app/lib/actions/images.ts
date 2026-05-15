'use server';

import { sql } from '@vercel/postgres';
import { DeleteImageResult, GenerateImageResult } from '../types';
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

async function clearInProgress(wordId: string) {
  await sql.query(
    `UPDATE image_requests SET in_progress_since = NULL WHERE word_id = $1`,
    [wordId],
  );
}

async function generateWordImage(wordId: string): Promise<GenerateImageResult> {
  try {
    const word = await fetchWord(wordId);
    if (!word) {
      return { message: `Word not found, id: ${wordId}` };
    }

    const course = await fetchCourse(word.courseId);
    if (!course) {
      return { message: `Course not found, id: ${word.courseId}` };
    }

    const prompt = `Create an image which helps me to memorize ${course.learningLang} word: '${word.word}'. It's meaning in ${course.knownLang} is: '${word.definition}'.`;

    console.log('Generating image for word:', { word: word.word, prompt });

    const result = await generateImage(prompt);
    if (result.error || !result.base64Data) {
      return { message: result.error || 'No image data returned from the model' };
    }

    const { id: imageId } = await insertWordImage(wordId, result.base64Data);
    await clearInProgress(wordId);

    return { imageId };
  } catch (e) {
    console.error('Image generation error:', e);
    await clearInProgress(wordId).catch(() => {});

    const message =
      e instanceof Error ? e.message : `Image generation failed: ${JSON.stringify(e)}`;
    return { message };
  }
}

export async function requestImageGeneration(wordId: string): Promise<GenerateImageResult> {
  try {
    await sql.query(
      `INSERT INTO image_requests (word_id, in_progress_since)
       VALUES ($1, NOW())
       ON CONFLICT (word_id)
       DO UPDATE SET in_progress_since = NOW()`,
      [wordId],
    );

    const result = await generateWordImage(wordId);
    return result;
  } catch (e) {
    return {
      message: `Failed to request image generation. ${JSON.stringify(e)}`,
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
