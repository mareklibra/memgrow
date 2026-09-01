import { IMAGE_COUNT, LLM_IMAGE_MODEL } from '../constants';
import { generateImageBatch } from './image-provider-batch';
import { ProviderResponse } from './image-provider';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = LLM_IMAGE_MODEL ?? 'gemini-2.5-flash-image';

async function generateOne(prompt: string, url: string): Promise<string> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'x-goog-api-key': GEMINI_API_KEY!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errorText}`);
  }

  const responseBody = await response.json();
  const parts: Array<{ inlineData?: { data?: string } }> =
    responseBody?.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((p) => p.inlineData?.data);
  if (!imagePart?.inlineData?.data) {
    throw new Error(`Gemini API: no image in response: ${JSON.stringify(responseBody)}`);
  }
  return imagePart.inlineData.data;
}

export async function generateImageGemini(prompt: string): Promise<ProviderResponse> {
  if (!GEMINI_API_KEY) {
    console.error('Gemini API: GEMINI_API_KEY not configured');
    return { error: 'GEMINI_API_KEY not configured' };
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

  console.log(
    `Gemini API: invoking model '${GEMINI_MODEL}', requesting ${IMAGE_COUNT} image(s)`,
  );

  const startedAt = Date.now();
  const result = await generateImageBatch('Gemini API', IMAGE_COUNT, () =>
    generateOne(prompt, url),
  );
  console.log(`Gemini API: finished in ${Date.now() - startedAt}ms`);

  return result;
}
