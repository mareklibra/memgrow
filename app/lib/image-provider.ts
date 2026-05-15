import { generateImageBedrock } from './image-provider-bedrock';
import { generateImageVertex } from './image-provider-vertex';

export type ImageGenerationResponse = {
  images?: string[];
  error?: string;
};

// Set IMAGE_PROVIDER env var to 'vertex' or 'bedrock' (default).
const IMAGE_PROVIDER = process.env.IMAGE_PROVIDER ?? 'bedrock';

export async function generateImage(prompt: string): Promise<ImageGenerationResponse> {
  switch (IMAGE_PROVIDER) {
    case 'vertex':
      return generateImageVertex(prompt);
    case 'bedrock':
      return generateImageBedrock(prompt);
    default:
      return { error: `Unknown IMAGE_PROVIDER: ${IMAGE_PROVIDER}` };
  }
}
