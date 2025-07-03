import { NextRequest } from 'next/server';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import { fetchPronunciation } from '@/app/lib/data';

const voiceId = 'Xb7hH8MSUJpSbSDYk0k2';

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ wordId: string; courseId: string }> },
) {
  const wordId = (await params).wordId;
  const courseId = (await params).courseId;

  if (!wordId || !courseId) {
    return new Response('[ROOT]/courseId/wordId', {
      status: 401,
    });
  }

  const word = await fetchPronunciation({ id: wordId, courseId });
  if (!word) {
    return new Response(`word not found, id: ${wordId}, courseId: ${courseId}`, {
      status: 404,
    });
  }
  console.log('---- WORD GET: ', { wordId, courseId, word });
  const elevenlabs = new ElevenLabsClient(/* use process.env.ELEVENLABS_API_KEY */);

  const audio = await elevenlabs.textToSpeech.convert(voiceId, {
    text: word.word,
    modelId: 'eleven_multilingual_v2',
    enableLogging: true,

    // languageCode: ...
  });

  // TODO: cache via DB

  // console.log('---- WORD GET, id: ', {id, audio});

  return new Response(audio, {
    status: 200,
    headers: { 'Content-Type': 'audio/mpeg' },
  });
}
