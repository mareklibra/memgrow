import { sql } from "@vercel/postgres";
import { Word } from "@/app/lib/definitions";

type DbWord = Word & { memlevel: number };

export async function fetchWordsToLearn(limit: number): Promise<Word[]> {
  try {
    console.log("Fetching words to learn...");

    // TODO: tak following query
    const result =
      await sql<DbWord>`SELECT id, word, definition, memlevel, form FROM words WHERE memlevel = 0 LIMIT ${limit}`;

    const data: Word[] = result.rows.map(
      (r): Word => ({
        id: r.id,
        word: r.word,
        definition: r.definition,
        form: r.form,
        memLevel: Number(r.memlevel ?? "0"),
      })
    );
    console.log({ data, result });
    return data;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch words to learn.");
  }
}

export async function fetchWordsToTest(limit: number): Promise<Word[]> {
  // TODO: tak following query

  try {
    console.log("Fetching words to learn...");

    const result =
      await sql<DbWord>`SELECT id, word, definition, memlevel, form FROM words LIMIT ${limit}`;

    const data: Word[] = result.rows.map(
      (r): Word => ({
        id: r.id,
        word: r.word,
        definition: r.definition,
        form: r.form,
        memLevel: Number(r.memlevel ?? "0"),
      })
    );
    console.log({ data, result });
    return data;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch words to learn.");
  }
}
