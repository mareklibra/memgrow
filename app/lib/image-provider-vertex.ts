import { IMAGE_COUNT, LLM_IMAGE_MODEL } from '../constants';
import { ProviderResponse } from './image-provider';

const VERTEXAI_PROJECT = process.env.VERTEXAI_PROJECT;
const VERTEXAI_LOCATION = process.env.VERTEXAI_LOCATION ?? 'us-central1';
const VERTEXAI_MODEL = LLM_IMAGE_MODEL ?? 'imagen-4.0-generate-001';

async function getAccessToken(): Promise<string | undefined> {
  // gcloud auth print-access-token output stored in env
  return process.env.VERTEXAI_ACCESS_TOKEN;
}

export async function generateImageVertex(prompt: string): Promise<ProviderResponse> {
  if (!VERTEXAI_PROJECT) {
    console.error('Vertex AI: VERTEXAI_PROJECT not configured');
    return { error: 'VERTEXAI_PROJECT not configured' };
  }

  const accessToken = await getAccessToken();
  if (!accessToken) {
    console.error('Vertex AI: VERTEXAI_ACCESS_TOKEN not configured');
    return { error: 'VERTEXAI_ACCESS_TOKEN not configured' };
  }

  const url = `https://${VERTEXAI_LOCATION}-aiplatform.googleapis.com/v1/projects/${VERTEXAI_PROJECT}/locations/${VERTEXAI_LOCATION}/publishers/google/models/${VERTEXAI_MODEL}:predict`;

  const body = {
    instances: [{ prompt }],
    parameters: {
      sampleCount: IMAGE_COUNT,
      aspectRatio: '1:1',
    },
  };

  console.log(
    `Vertex AI: invoking model '${VERTEXAI_MODEL}' project='${VERTEXAI_PROJECT}' location='${VERTEXAI_LOCATION}' url=${url}`,
  );

  const startedAt = Date.now();
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    console.error('Vertex AI: request failed before receiving a response:', e);
    return {
      error: `Vertex AI request failed: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  const elapsedMs = Date.now() - startedAt;
  console.log(`Vertex AI: responded with status ${response.status} in ${elapsedMs}ms`);

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Vertex AI error (${response.status}) for url=${url}:`, errorText);
    return { error: `Vertex AI error (${response.status}): ${errorText}` };
  }

  const responseBody = await response.json();
  const images: string[] = (responseBody.predictions ?? [])
    .map((p: { bytesBase64Encoded?: string }) => p.bytesBase64Encoded)
    .filter(Boolean);

  if (images.length === 0) {
    console.error('Vertex AI: response contained no images. Raw response:', responseBody);
    return { error: 'No image data returned from Vertex AI' };
  }

  console.log(`Vertex AI: received ${images.length} image(s)`);
  return { images };
}
