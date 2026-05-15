import { NextRequest, NextResponse } from 'next/server';
import { generateWordImage } from '@/app/lib/actions/images';

export async function POST(
  _: NextRequest,
  { params }: { params: Promise<{ wordId: string }> },
) {
  const { wordId } = await params;

  if (!wordId) {
    return NextResponse.json({ message: 'wordId is required' }, { status: 400 });
  }

  const result = await generateWordImage(wordId);
  if (result.message) {
    return NextResponse.json({ message: result.message }, { status: 500 });
  }

  return NextResponse.json({ imageId: result.imageId });
}
