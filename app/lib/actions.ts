"use server";

import { sql } from "@vercel/postgres";

import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import { Word } from "./definitions";

export async function updateWordProgress(word: Word) {
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

export async function updateWord(changed: Word) {
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
