import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { IMAGE_COUNT, IMAGE_SIZE, LLM_IMAGE_MODEL } from '../constants';
import { ImageGenerationResponse } from './image-provider';

// Authenticates via AWS_BEARER_TOKEN_BEDROCK env var (picked up by the default credential chain).
// AWS_REGION must also be set.
let client: BedrockRuntimeClient | undefined;
try {
  client = new BedrockRuntimeClient({
    region: process.env.AWS_REGION,
  });
} catch (e) {
  console.error('Error initializing Bedrock client: ', e);
}

export async function generateImageBedrock(
  prompt: string,
): Promise<ImageGenerationResponse> {
  if (!client) {
    return { error: 'Bedrock client not initialized' };
  }

  const payload = {
    taskType: 'TEXT_IMAGE',
    textToImageParams: { text: prompt },
    imageGenerationConfig: {
      seed: Math.floor(Math.random() * 858993460),
      quality: 'standard',
      width: IMAGE_SIZE,
      height: IMAGE_SIZE,
      numberOfImages: IMAGE_COUNT,
    },
  };

  const command = new InvokeModelCommand({
    modelId: LLM_IMAGE_MODEL,
    body: JSON.stringify(payload),
    contentType: 'application/json',
    accept: 'application/json',
  });

  console.log('Invoking Bedrock model: ', LLM_IMAGE_MODEL);
  const response = await client.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));

  const images: string[] = responseBody.images ?? [];
  if (images.length === 0) {
    const errorMsg = responseBody.error || responseBody.message;
    return { error: errorMsg || 'No image data returned from the model' };
  }

  return { images };
}
