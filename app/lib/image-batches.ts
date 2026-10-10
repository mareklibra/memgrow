export type Kind = 'concrete' | 'abstract';

export type Pending = {
  wordId: string;
  word: string;
  definition: string;
  courseId: string;
  learningLang: string;
  knownLang: string;
  kind: Kind;
};

// Each recipe names the technique, because bare labels collapse into one flat look.
export const STYLES: Record<Kind, string[]> = {
  concrete: [
    'cartoon scene: bold dark outlines, cel shading with 2-3 tones per color, expressive and slightly exaggerated, the subject in a small telling context',
    'line art: uniform stroke width, no fills, a single dark ink color on a light background, hatching for shadow, clean contours',
    'realistic render: realistic proportions and materials, linear/radial gradients for volume, soft drop shadows, a light source with highlights, depth via overlapping layers and subtle blur (SVG filters like feGaussianBlur, feSpecularLighting, feTurbulence are allowed), looks like a painted or 3D-rendered image',
    'photo-like: one dominant subject filmed from a natural camera angle, shallow depth of field (sharp subject, blurred background via feGaussianBlur), natural color grading, directional light, fine grain via feTurbulence, no outlines',
  ],
  abstract: [
    'symbolic metaphor: a single object or scene that stands for the meaning, realistic render with gradients and soft lighting',
    'people situation: one or two simple characters whose posture, gesture and facial expression convey the meaning, cartoon with bold outlines',
    'cause and effect: ONE frame showing the decisive moment that makes the meaning obvious (what leads to it or follows from it), line art with a single accent color',
    'visual analogy: familiar everyday objects arranged to mirror the concept (balance, tension, growth, distance...), flat shapes with strong contrast and a limited palette',
  ],
};

/** User-authored text goes into a line-based prompt: no newlines or control characters. */
const oneLine = (text: string) => text.replace(/[\u0000-\u001f\u007f\s]+/g, ' ').trim();

export function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

/** Batches share a language pair and a kind; each has at most `batchSize` words. */
export function groupBatches(pending: Pending[], batchSize: number): Pending[][] {
  const groups = new Map<string, Pending[]>();
  for (const p of pending) {
    const key = `${p.learningLang}->${p.knownLang}|${p.kind}`;
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }
  return [...groups.values()].flatMap((g) => chunk(g, batchSize));
}

/** Marks words the classifier called abstract; unknown ids and other values are ignored. */
export function applyKinds(
  words: Pending[],
  items: ({ id: string; kind?: string } | null)[] | undefined,
): void {
  const byId = new Map(words.map((w) => [w.wordId, w]));
  for (const item of items ?? []) {
    if (item?.kind === 'abstract') {
      const w = byId.get(item.id);
      if (w) w.kind = 'abstract';
    }
  }
}

export function buildClassifyPrompt(pair: string, words: Pending[]): string {
  return [
    `Classify vocabulary words (${pair}) for picture mnemonics.`,
    `"concrete": a thing, creature, place or physical action/state that can be shown directly.`,
    `"abstract": a concept, emotion, relation, quality or process that has no direct visual form.`,
    ...words.map(
      (w) => `- id=${w.wordId}: '${oneLine(w.word)}' = '${oneLine(w.definition)}'`,
    ),
  ].join('\n');
}

export function buildPrompt(batch: Pending[], count: number): string {
  const { learningLang, knownLang, kind } = batch[0];
  const styles = STYLES[kind]
    .slice(0, count)
    .map((s, i) => `  ${i + 1}. ${s}`)
    .join('\n');
  const words = batch
    .map(
      (w) =>
        `- id=${w.wordId}: ${learningLang} '${oneLine(w.word)}' = ${knownLang} '${oneLine(w.definition)}'`,
    )
    .join('\n');
  const concrete = kind === 'concrete';
  return [
    `Create mnemonic pictures for vocabulary words (${learningLang} -> ${knownLang}).`,
    concrete
      ? `These words are concrete: show the thing or action itself.`
      : `These words are abstract: do not draw the word literally, convey the meaning through the scene.`,
    `For EACH word return ${count} images, one per style, in this order:`,
    styles,
    `Words in this batch:`,
    words,
    ``,
    `Rules:`,
    concrete
      ? `- Each image shows the word's meaning directly, as ONE coherent scene: no collage, no grid, no panels, no repeated subject.`
      : `- Each image is ONE coherent scene that makes the meaning clear: no collage, no grid, no panels, no repeated subject.`,
    `- The ${count} images of a word differ in subject, composition AND rendering technique: follow each style's technique literally, do not drift to a flat icon look.`,
    `- A student must not confuse the picture with the other words in this batch or with near-synonyms: include the details that distinguish the meaning (e.g. direction of an action, who does what).`,
    `- No text, letters or numbers inside the image.`,
    `- First write a one-line "concept" for each image, then the SVG.`,
    `- SVG: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">, no <image>, <script>, <style>, <foreignObject> or external references. Filters and gradients are allowed inside <defs>. Keep each SVG under 12 KB; the picture is shown at about 256 px, so skip details that vanish at that size.`,
  ].join('\n');
}
