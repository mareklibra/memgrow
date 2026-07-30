import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { IMAGE_COUNT, IMAGE_SIZE, LLM_IMAGE_MODEL } from '../constants';
import { ProviderResponse } from './image-provider';

const BEDROCK_MODEL = LLM_IMAGE_MODEL ?? 'amazon.titan-image-generator-v2:0';

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

export async function generateImageBedrock(prompt: string): Promise<ProviderResponse> {
  if (!client) {
    console.error('Bedrock: client not initialized (see earlier initialization error)');
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
    modelId: BEDROCK_MODEL,
    body: JSON.stringify(payload),
    contentType: 'application/json',
    accept: 'application/json',
  });

  console.log(`Bedrock: invoking model '${BEDROCK_MODEL}' region='${process.env.AWS_REGION}'`);

  const startedAt = Date.now();
  let response;
  try {
    response = await client.send(command);
  } catch (e) {
    console.error('Bedrock: request failed:', e);
    return { error: `Bedrock request failed: ${e instanceof Error ? e.message : String(e)}` };
  }
  console.log(`Bedrock: responded in ${Date.now() - startedAt}ms`);

  const responseBody = JSON.parse(new TextDecoder().decode(response.body));

  const images: string[] = responseBody.images ?? [];
  if (images.length === 0) {
    const errorMsg = responseBody.error || responseBody.message;
    console.error('Bedrock: response contained no images. Raw response:', responseBody);
    return { error: errorMsg || 'No image data returned from the model' };
  }

  console.log(`Bedrock: received ${images.length} image(s)`);
  return { images };
}
