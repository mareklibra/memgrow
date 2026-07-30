import { ProviderResponse } from './image-provider';

// Some providers (Cloudflare Workers AI, Gemini) only return a single image
// per call, unlike Vertex/Bedrock's sampleCount-style batch predict. Fan out
// `count` independent calls and aggregate the results.
export async function generateImageBatch(
  label: string,
  count: number,
  generateOne: () => Promise<string>,
): Promise<ProviderResponse> {
  const results = await Promise.allSettled(Array.from({ length: count }, generateOne));

  const images = results
    .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled')
    .map((r) => r.value);
  const failures = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');

  if (failures.length > 0) {
    console.error(
      `${label}: ${failures.length}/${results.length} requests failed:`,
      failures.map((f) => f.reason),
    );
  }

  if (images.length === 0) {
    const firstFailure = failures[0]?.reason;
    const message =
      firstFailure instanceof Error
        ? firstFailure.message
        : `No image data returned from ${label}`;
    return { error: message };
  }

  console.log(`${label}: received ${images.length}/${count} image(s)`);
  return { images };
}
