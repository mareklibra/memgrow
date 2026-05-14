import 'core-js/proposals/array-buffer-base64';
import { NextRequest } from 'next/server';
import { fetchWordImageById } from '@/app/lib/data';

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ imageId: string }> },
) {
  const imageId = (await params).imageId;

  if (!imageId) {
    return new Response('imageId is required', { status: 400 });
  }

  const image = await fetchWordImageById(imageId);
  if (!image) {
    return new Response(`Image not found, id: ${imageId}`, { status: 404 });
  }

  // @ts-expect-error From polyfill
  const binaryData = Uint8Array.fromBase64(image.content);
  return new Response(binaryData, {
    status: 200,
    headers: { 'Content-Type': 'image/png' },
  });
}
