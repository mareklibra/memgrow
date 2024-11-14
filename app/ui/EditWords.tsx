"use client";

import { Word } from "@/app/lib/definitions";

interface EditWordsProps {
  words: Word[];
}

export function EditWords({ words }: EditWordsProps) {
  return (
    <table className="border-separate border border-slate-500">
      <thead>
        <tr>
          <th className="border border-slate-600">Word</th>
          <th className="border border-slate-600">Definition</th>
          <th className="border border-slate-600">Memory Level</th>
          <th className="border border-slate-600">  Next Form</th>
        </tr>
      </thead>

      {words.map((w) => {
        return (
          <tr key={w.id} id={w.id}>
            <td>{w.word}</td>
            <td>{w.definition}</td>
            <td>{w.memLevel}</td>
            <td>{w.form}</td>
          </tr>
        );
      })}
    </table>
  );
}
