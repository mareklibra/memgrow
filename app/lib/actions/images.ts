'use server';

import { sql } from '@vercel/postgres';
import { DeleteImageResult, GenerateImageResult } from '../types';
import { WordImage } from '../definitions';

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

/** Stub -- actual LLM image generation to be implemented later. */
async function generateWordImage(_wordId: string): Promise<GenerateImageResult> {
  // TODO: implement LLM image generation
  // On success: call insertWordImage(wordId, base64Content)
  // Then clear in_progress_since in image_requests
  return {};
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
