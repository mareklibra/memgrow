import sharp from 'sharp';
import { generateImageBedrock } from './image-provider-bedrock';
import { generateImageVertex } from './image-provider-vertex';
import { generateImageCloudflare } from './image-provider-cloudflare';
import { generateImageGemini } from './image-provider-gemini';
import { IMAGE_SIZE, IMAGE_QUALITY } from '../constants';

export type ProviderResponse = {
  images?: string[];
  error?: string;
};

export type ImageGenerationResponse = {
  images?: Buffer[];
  error?: string;
};

// Set IMAGE_PROVIDER env var to 'vertex', 'bedrock' (default), 'cloudflare', or 'gemini'.
const IMAGE_PROVIDER = process.env.IMAGE_PROVIDER ?? 'bedrock';

async function toWebpBuffer(base64: string): Promise<Buffer> {
  const buf = Buffer.from(base64, 'base64');
  return sharp(buf)
    .resize(IMAGE_SIZE, IMAGE_SIZE, { fit: 'cover' })
    .webp({ quality: IMAGE_QUALITY })
    .toBuffer();
}

export async function generateImage(prompt: string): Promise<ImageGenerationResponse> {
  console.log(`Image provider: using '${IMAGE_PROVIDER}'`);

  let result: ProviderResponse;
  switch (IMAGE_PROVIDER) {
    case 'vertex':
      result = await generateImageVertex(prompt);
      break;
    case 'bedrock':
      result = await generateImageBedrock(prompt);
      break;
    case 'cloudflare':
      result = await generateImageCloudflare(prompt);
      break;
    case 'gemini':
      result = await generateImageGemini(prompt);
      break;
    default:
      console.error(`Image provider: unknown IMAGE_PROVIDER '${IMAGE_PROVIDER}'`);
      return { error: `Unknown IMAGE_PROVIDER: ${IMAGE_PROVIDER}` };
  }

  if (result.error || !result.images?.length) {
    console.error(`Image provider '${IMAGE_PROVIDER}' failed: ${result.error}`);
    return { error: result.error };
  }

  const buffers = await Promise.all(result.images.map(toWebpBuffer));
  console.log(`Image provider '${IMAGE_PROVIDER}': converted ${buffers.length} image(s) to webp`);
  return { images: buffers };
}
