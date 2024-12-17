import { Usable, use } from "react";
import { lusitana } from "@/app/ui/fonts";
import { IterateWords } from "@/app/ui/IterateWords";
import { fetchSimilarWords, fetchWordsToTest } from "@/app/lib/data";
import { maxSimilarWords, testRepetitionLimit, testWordsCountLimit } from "@/app/constants";

export default async function Page({ params }: { params: Promise<{ courseId: string }> }) {
    const { courseId } = await params;

    const words = await fetchSimilarWords(
        courseId,
        await fetchWordsToTest(courseId, testWordsCountLimit),
        maxSimilarWords
    );

    return (
        <main>
            <h1 className={`${lusitana.className} mb-4 text-xl md:text-2xl`}>
                Strengthen memory ({words.length})
            </h1>
            <IterateWords words={words} repetitionLimit={testRepetitionLimit} />
        </main>
    );
}
