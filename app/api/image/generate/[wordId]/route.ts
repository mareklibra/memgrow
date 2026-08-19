import { NextRequest, NextResponse } from 'next/server';
import { generateWordImage } from '@/app/lib/actions/images';
import { getI18n } from '@/app/lib/i18n/get-i18n';

export async function POST(
  _: NextRequest,
  { params }: { params: Promise<{ wordId: string }> },
) {
  const { wordId } = await params;

  if (!wordId) {
    console.error('POST /api/image/generate: missing wordId');
    const { t } = await getI18n();
    return NextResponse.json({ message: t('errors.wordIdRequired') }, { status: 400 });
  }

  console.log(`POST /api/image/generate/${wordId}: request received`);

  const result = await generateWordImage(wordId);
  if (result.message) {
    console.error(`POST /api/image/generate/${wordId}: returning 500: ${result.message}`);
    return NextResponse.json({ message: result.message }, { status: 500 });
  }

  console.log(
    `POST /api/image/generate/${wordId}: returning 200, imageId=${result.imageId}`,
  );
  return NextResponse.json({ imageId: result.imageId });
}
