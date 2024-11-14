import { sql } from "@vercel/postgres";
import { Word } from "@/app/lib/definitions";

type DbWord = Word & { memlevel: number };

const fromDbWord = (dbWord: DbWord): Word => ({
  id: dbWord.id,
  word: dbWord.word,
  definition: dbWord.definition,
  form: dbWord.form,
  memLevel: Number(dbWord.memlevel ?? "0"),
});

export async function fetchWordsToLearn(limit: number): Promise<Word[]> {
  try {
    console.log("Fetching words to learn...");

    // TODO: tweak following query
    const result =
      await sql<DbWord>`SELECT id, word, definition, memlevel, form FROM words WHERE memlevel = 0 LIMIT ${limit}`;

    const data: Word[] = result.rows.map(fromDbWord);
    return data;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch words to learn.");
  }
}

export async function fetchWordsToTest(limit: number): Promise<Word[]> {
  try {
    console.log("Fetching words to test...");

    // TODO: tweak
    const result =
      await sql<DbWord>`SELECT id, word, definition, memlevel, form FROM words LIMIT ${limit}`;

    const data: Word[] = result.rows.map(fromDbWord);
    return data;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch words to test.");
  }
}

export async function fetchAllWords(): Promise<Word[]> {
  try {
    console.log("Fetching all words...");

    const result =
      await sql<DbWord>`SELECT id, word, definition, memlevel, form FROM words`;

    const data: Word[] = result.rows.map(fromDbWord);
    return data;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch words to test.");
  }
}
