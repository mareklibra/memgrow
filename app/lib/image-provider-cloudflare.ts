import { IMAGE_COUNT, LLM_IMAGE_MODEL } from '../constants';
import { generateImageBatch } from './image-provider-batch';
import { ProviderResponse } from './image-provider';

const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const CLOUDFLARE_MODEL = LLM_IMAGE_MODEL ?? '@cf/black-forest-labs/flux-1-schnell';

function requestJson(url: string, prompt: string): Promise<Response> {
  return fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt }),
  });
}

function requestMultipart(url: string, prompt: string): Promise<Response> {
  const form = new FormData();
  form.append('prompt', prompt);
  return fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}` },
    body: form,
  });
}

// Some newer Workers AI image models (e.g. flux-2-dev) reject a JSON body
// and require multipart/form-data instead - their schema's top-level
// required property is literally called "multipart". Try JSON first (the
// common case) and only pay for a second request when that's rejected.
function isMultipartSchemaError(status: number, body: string): boolean {
  return status === 400 && body.toLowerCase().includes('multipart');
}

async function generateOne(prompt: string, url: string): Promise<string> {
  let response = await requestJson(url, prompt);

  if (!response.ok) {
    const errorText = await response.text();
    if (!isMultipartSchemaError(response.status, errorText)) {
      throw new Error(`Cloudflare Workers AI error (${response.status}): ${errorText}`);
    }

    console.log('Cloudflare Workers AI: model requires multipart/form-data, retrying');
    response = await requestMultipart(url, prompt);
    if (!response.ok) {
      const retryErrorText = await response.text();
      throw new Error(
        `Cloudflare Workers AI error (${response.status}): ${retryErrorText}`,
      );
    }
  }

  const responseBody = await response.json();
  const image: string | undefined = responseBody?.result?.image;
  if (!image) {
    throw new Error(
      `Cloudflare Workers AI: no image in response: ${JSON.stringify(responseBody)}`,
    );
  }
  return image;
}

export async function generateImageCloudflare(prompt: string): Promise<ProviderResponse> {
  if (!CLOUDFLARE_ACCOUNT_ID) {
    console.error('Cloudflare Workers AI: CLOUDFLARE_ACCOUNT_ID not configured');
    return { error: 'CLOUDFLARE_ACCOUNT_ID not configured' };
  }
  if (!CLOUDFLARE_API_TOKEN) {
    console.error('Cloudflare Workers AI: CLOUDFLARE_API_TOKEN not configured');
    return { error: 'CLOUDFLARE_API_TOKEN not configured' };
  }

  const url = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/run/${CLOUDFLARE_MODEL}`;

  console.log(
    `Cloudflare Workers AI: invoking model '${CLOUDFLARE_MODEL}', requesting ${IMAGE_COUNT} image(s)`,
  );

  const startedAt = Date.now();
  const result = await generateImageBatch('Cloudflare Workers AI', IMAGE_COUNT, () =>
    generateOne(prompt, url),
  );
  console.log(`Cloudflare Workers AI: finished in ${Date.now() - startedAt}ms`);

  return result;
}
