import sharp from 'sharp';
import { generateImageBedrock } from './image-provider-bedrock';
import { generateImageVertex } from './image-provider-vertex';
import { IMAGE_SIZE } from '../constants';

export type ImageGenerationResponse = {
  images?: string[];
  error?: string;
};

// Set IMAGE_PROVIDER env var to 'vertex' or 'bedrock' (default).
const IMAGE_PROVIDER = process.env.IMAGE_PROVIDER ?? 'bedrock';

async function resizeToTarget(base64: string): Promise<string> {
  const buf = Buffer.from(base64, 'base64');
  const meta = await sharp(buf).metadata();
  if (meta.width === IMAGE_SIZE && meta.height === IMAGE_SIZE) {
    return base64;
  }
  const resized = await sharp(buf)
    .resize(IMAGE_SIZE, IMAGE_SIZE, { fit: 'cover' })
    .png()
    .toBuffer();
  return resized.toString('base64');
}

export async function generateImage(prompt: string): Promise<ImageGenerationResponse> {
  let result: ImageGenerationResponse;
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
    return result;
  }

  const resized = await Promise.all(result.images.map(resizeToTarget));
  return { images: resized };
}
