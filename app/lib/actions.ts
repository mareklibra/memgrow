"use server";

import { sql } from "@vercel/postgres";

import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import { revalidatePath } from "next/cache";

import { Word } from "./definitions";

export type UpdateWordResult =
  | undefined
  | {
      message?: string;
      id?: Word["id"];
    };

export async function updateWordProgress(
  word: Word
): Promise<UpdateWordResult> {
  try {
    await sql`
      UPDATE words
      SET memlevel = ${word.memLevel}, form = ${word.form}
      WHERE id = ${word.id}
    `;
  } catch {
    return { message: "Database Error: Failed to update word progress." };
  }
}

export async function addWord(word: Word): Promise<UpdateWordResult> {
  try {
    const result = await sql.query(
      `
      INSERT INTO words (word, definition, memlevel, form)
      VALUES ($1, $2, $3, $4) RETURNING *
    `,
      [word.word, word.definition, word.memLevel, word.form]
    );
    revalidatePath("/edit");
    return { id: result.rows[0].id };
  } catch (e) {
    return {
      message: `Database Error: Failed to insert new word. ${JSON.stringify(
        e
      )}`,
    };
  }
}

export async function deleteWord(word: Word): Promise<UpdateWordResult> {
  try {
    await sql`
      DELETE FROM words WHERE id=${word.id}
    `;

    revalidatePath("/edit");
  } catch (e) {
    return {
      message: `Database Error: Failed to delete the word. ${JSON.stringify(
        e
      )}`,
    };
  }
}
export async function updateWord(changed: Word): Promise<UpdateWordResult> {
  try {
    await sql`
      UPDATE words
      SET 
        word = ${changed.word},
        definition = ${changed.definition},
        memlevel = ${changed.memLevel}, 
        form = ${changed.form}
      WHERE id = ${changed.id}
    `;
  } catch (e) {
    return {
      message: `Database Error: Failed to update word. ${JSON.stringify(e)}`,
    };
  }
}

export async function authenticate(
  prevState: string | undefined,
  formData: FormData
) {
  try {
    await signIn("credentials", formData);
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return "Invalid credentials.";
        default:
          return "Something went wrong.";
      }
    }
    throw error;
  }
}
