import { IMAGE_COUNT, LLM_IMAGE_MODEL } from '../constants';
import { ImageGenerationResponse } from './image-provider';

const VERTEXAI_PROJECT = process.env.VERTEXAI_PROJECT;
const VERTEXAI_LOCATION = process.env.VERTEXAI_LOCATION ?? 'us-central1';
const VERTEXAI_MODEL = LLM_IMAGE_MODEL || 'imagen-3.0-generate-002';

async function getAccessToken(): Promise<string | undefined> {
  // gcloud auth print-access-token output stored in env
  return process.env.VERTEXAI_ACCESS_TOKEN;
}

export async function generateImageVertex(prompt: string): Promise<ImageGenerationResponse> {
  if (!VERTEXAI_PROJECT) {
    return { error: 'VERTEXAI_PROJECT not configured' };
  }

  const accessToken = await getAccessToken();
  if (!accessToken) {
    return { error: 'VERTEXAI_ACCESS_TOKEN not configured' };
  }

  const url = `https://${VERTEXAI_LOCATION}-aiplatform.googleapis.com/v1/projects/${VERTEXAI_PROJECT}/locations/${VERTEXAI_LOCATION}/publishers/google/models/${VERTEXAI_MODEL}:predict`;

  const body = {
    instances: [{ prompt }],
    parameters: {
      sampleCount: IMAGE_COUNT,
    },
  };

  console.log('Invoking Vertex AI model: ', VERTEXAI_MODEL);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  console.log('Vertex AI finished');
  if (!response.ok) {
    const errorText = await response.text();
    return { error: `Vertex AI error (${response.status}): ${errorText}` };
  }

  const responseBody = await response.json();
  const images: string[] = (responseBody.predictions ?? [])
    .map((p: { bytesBase64Encoded?: string }) => p.bytesBase64Encoded)
    .filter(Boolean);

  if (images.length === 0) {
    return { error: 'No image data returned from Vertex AI' };
  }

  return { images };
}
