import sharp from 'sharp';
import { generateImageBedrock } from './image-provider-bedrock';
import { generateImageVertex } from './image-provider-vertex';
import { IMAGE_SIZE, IMAGE_QUALITY } from '../constants';

export type ProviderResponse = {
  images?: string[];
  error?: string;
};

export type ImageGenerationResponse = {
  images?: Buffer[];
  error?: string;
};

// Set IMAGE_PROVIDER env var to 'vertex' or 'bedrock' (default).
const IMAGE_PROVIDER = process.env.IMAGE_PROVIDER ?? 'bedrock';

async function toWebpBuffer(base64: string): Promise<Buffer> {
  const buf = Buffer.from(base64, 'base64');
  return sharp(buf)
    .resize(IMAGE_SIZE, IMAGE_SIZE, { fit: 'cover' })
    .webp({ quality: IMAGE_QUALITY })
    .toBuffer();
}

export async function generateImage(prompt: string): Promise<ImageGenerationResponse> {
  let result: ProviderResponse;
  switch (IMAGE_PROVIDER) {
    case 'vertex':
      result = await generateImageVertex(prompt);
      break;
    case 'bedrock':
      result = await generateImageBedrock(prompt);
      break;
    default:
      return { error: `Unknown IMAGE_PROVIDER: ${IMAGE_PROVIDER}` };
  }

  if (result.error || !result.images?.length) {
    return { error: result.error };
  }

  const buffers = await Promise.all(result.images.map(toWebpBuffer));
  return { images: buffers };
}
