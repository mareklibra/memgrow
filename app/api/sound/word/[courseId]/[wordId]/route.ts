import { NextRequest } from 'next/server';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import { fetchCourse, fetchPronunciation } from '@/app/lib/data';
import { insertPronunciation } from '@/app/lib/actions';

const voiceId = 'Xb7hH8MSUJpSbSDYk0k2';
let elevenlabs: ElevenLabsClient | null = null;
try {
  elevenlabs = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY });
} catch (e) {
  console.error('Error initializing ElevenLabsClient: ', e);
}

async function streamToBuffer(stream: ReadableStream<Uint8Array>): Promise<Buffer> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (value) chunks.push(value);
    if (done) break;
  }

  return Buffer.concat(chunks);
}

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ wordId: string; courseId: string }> },
) {
  if (!elevenlabs) {
    return new Response('ElevenLabsClient not initialized', {
      status: 500,
    });
  }

  const wordId = (await params).wordId;
  const courseId = (await params).courseId;

  if (!wordId || !courseId) {
    return new Response('[ROOT]/courseId/wordId', {
      status: 401,
    });
  }

  const course = await fetchCourse(courseId);
  if (!course) {
    return new Response(`course not found, id: ${courseId}`, {
      status: 404,
    });
  }

  const word = await fetchPronunciation({ id: wordId, courseId });
  if (!word) {
    return new Response(`word not found, id: ${wordId}, courseId: ${courseId}`, {
      status: 404,
    });
  }

  if (word.audioContent) {
    console.log(
      'Reusing pronunciation from DB for word: ',
      word.word,
      word.id,
      '. Size: ',
      word.audioContent.length,
    );

    return new Response(new Uint8Array(word.audioContent), {
      status: 200,
      headers: { 'Content-Type': 'audio/mpeg' },
    });
  }

  console.log('Generating pronunciation for word: ', {
    word: word.word,
    id: word.id,
    languageCode: course.courseCode,
  });
  const audio = await elevenlabs.textToSpeech.convert(voiceId, {
    text: word.word,
    modelId: 'eleven_flash_v2_5',
    outputFormat: 'mp3_22050_32',
    enableLogging: true,
    languageCode: course.courseCode,
  });
  const buffer = await streamToBuffer(audio);
  await insertPronunciation(wordId, buffer);

  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: { 'Content-Type': 'audio/mpeg' },
  });
}
