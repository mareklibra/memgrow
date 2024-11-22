import { MouseEvent, useEffect, useState } from "react";
import { TrashIcon } from "@heroicons/react/24/outline";

import { Word } from "@/app/lib/definitions";

import { Button } from "./button";
import { CONFIRM_DELAY_MS } from "../constants";

interface DeleteButtonProps {
  word: Word;
  handleDelete: (e: MouseEvent) => void;
}

export function DeleteButton({ handleDelete }: DeleteButtonProps) {
  const [level, setLevel] = useState(0);

  useEffect(() => {
    if (level === 1) {
      const timeout = setTimeout(() => {
        setLevel(2);
      }, CONFIRM_DELAY_MS);

      return () => clearTimeout(timeout);
    }
  }, [level]);

  if (level === 0) {
    return (
      <Button variant="danger" onClick={() => setLevel(1)}>
        <TrashIcon className="w-5" />
      </Button>
    );
  }

  return (
    <>
      <Button onClick={() => setLevel(0)}>Dismiss</Button>
      <Button disabled={level !== 2} variant="danger" onClick={handleDelete}>
        Yes
      </Button>
    </>
  );
}
