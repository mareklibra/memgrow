import { Word } from "@/app/lib/definitions";

interface TeachWordProps {
  word: Word;
  nextWord: () => void;
  storeProgress: () => void;
}

export function TeachWord({ word, nextWord }: TeachWordProps) {
  return (
    <div>
      <p>Teaching {word.word}</p>
      <p>
        <button onClick={nextWord}>Next</button>
      </p>
    </div>
  );
}
