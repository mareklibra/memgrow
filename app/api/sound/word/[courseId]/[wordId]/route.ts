import 'core-js/proposals/array-buffer-base64';
import { NextRequest } from 'next/server';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import { fetchCourse, fetchPronunciation } from '@/app/lib/data';
import { insertPronunciation } from '@/app/lib/actions';

const voiceId = 'Xb7hH8MSUJpSbSDYk0k2';
let elevenlabs: ElevenLabsClient | null = null;
try {
  elevenlabs = new ElevenLabsClient(/* use process.env.ELEVENLABS_API_KEY */);
} catch (e) {
  console.error('Error initializing ElevenLabsClient: ', e);
}

function mergeUint8Arrays(...arrays: Uint8Array[]) {
  const totalSize = arrays.reduce((acc, e) => acc + e.length, 0);
  const merged = new Uint8Array(totalSize);

  arrays.forEach((array, i, arrays) => {
    const offset = arrays.slice(0, i).reduce((acc, e) => acc + e.length, 0);
    merged.set(array, offset);
  });

  return merged;
}

async function streamToBase64(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const values: Uint8Array[] = [];

  while (true) {
    const { done, value } = await reader.read();

    if (value) {
      values.push(value);
    }

    if (done) {
      const mergedArray = mergeUint8Arrays(...values);
      // @ts-expect-error From polyfill
      const base64 = mergedArray.toBase64();
      // const binaryData = Uint8Array.fromBase64(base64);
      // console.log('=== done: ', {
      //   mergedArrayLength: mergedArray.length,
      //   byteLength: byteLength,
      //   base64Length: base64.length,
      //   binaryDataLength: binaryData.length,
      //   areEqual: mergedArray.every((value, index) => value === binaryData[index]),
      // });

      return base64;
    }
  }
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

  if (word.audioSourceB64) {
    console.log(
      'Reusing pronunciation from DB for word: ',
      word.word,
      word.id,
      '. Length: ',
      word.audioSourceB64.length,
    );

    // @ts-expect-error From polyfill
    const binaryData = Uint8Array.fromBase64(word.audioSourceB64);
    return new Response(binaryData, {
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
    // modelId: 'eleven_multilingual_v2',
    modelId: 'eleven_flash_v2_5',
    enableLogging: true,
    languageCode: course.courseCode,
  });
  const base64FromReadableStream = await streamToBase64(audio);
  await insertPronunciation(wordId, base64FromReadableStream);

  // @ts-expect-error From polyfill
  const binaryData = Uint8Array.fromBase64(base64FromReadableStream);
  return new Response(binaryData, {
    status: 200,
    headers: { 'Content-Type': 'audio/mpeg' },
  });
}
