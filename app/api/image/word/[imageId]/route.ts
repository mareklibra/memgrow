import { NextRequest } from 'next/server';
import { fetchWordImageById } from '@/app/lib/data';

function detectContentType(buf: Buffer): string {
  if (
    buf.length >= 12 &&
    buf.toString('ascii', 0, 4) === 'RIFF' &&
    buf.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp';
  }
  return 'image/png';
}

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

  const body = new Uint8Array(image.content);
  return new Response(body, {
    status: 200,
    headers: { 'Content-Type': detectContentType(image.content) },
  });
}
