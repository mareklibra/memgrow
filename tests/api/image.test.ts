import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the data and action layers to prevent any DB/network access
const mockGenerateWordImage = vi.fn();
const mockFetchWordImageById = vi.fn();

vi.mock('@/app/lib/actions/images', () => ({
  generateWordImage: (...args: unknown[]) => mockGenerateWordImage(...args),
}));

vi.mock('@/app/lib/data', () => ({
  fetchWordImageById: (...args: unknown[]) => mockFetchWordImageById(...args),
}));

import { POST } from '@/app/api/image/generate/[wordId]/route';
import { GET } from '@/app/api/image/word/[imageId]/route';

function makeRequest(method: string): Request {
  return new Request('http://localhost', { method });
}

describe('POST /api/image/generate/[wordId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 with imageId on success', async () => {
    mockGenerateWordImage.mockResolvedValue({ imageId: 'img-123' });
    const response = await POST(makeRequest('POST') as never, {
      params: Promise.resolve({ wordId: 'word-1' }),
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ imageId: 'img-123' });
    expect(mockGenerateWordImage).toHaveBeenCalledWith('word-1');
  });

  it('returns 500 when generateWordImage returns an error message', async () => {
    mockGenerateWordImage.mockResolvedValue({ message: 'Generation failed' });
    const response = await POST(makeRequest('POST') as never, {
      params: Promise.resolve({ wordId: 'word-1' }),
    });
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({ message: 'Generation failed' });
  });

  it('calls generateWordImage with the provided wordId', async () => {
    mockGenerateWordImage.mockResolvedValue({ imageId: 'img-456' });
    await POST(makeRequest('POST') as never, {
      params: Promise.resolve({ wordId: 'specific-word-id' }),
    });
    expect(mockGenerateWordImage).toHaveBeenCalledWith('specific-word-id');
  });
});

describe('GET /api/image/word/[imageId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 404 when image is not found', async () => {
    mockFetchWordImageById.mockResolvedValue(null);
    const response = await GET(makeRequest('GET') as never, {
      params: Promise.resolve({ imageId: 'nonexistent' }),
    });
    expect(response.status).toBe(404);
    const text = await response.text();
    expect(text).toContain('nonexistent');
  });

  it('returns 200 with PNG content type for valid image', async () => {
    // "AQID" is base64 for bytes [1, 2, 3]
    mockFetchWordImageById.mockResolvedValue({
      id: 'img-1',
      wordId: 'w1',
      content: 'AQID',
      createdAt: new Date(),
    });
    const response = await GET(makeRequest('GET') as never, {
      params: Promise.resolve({ imageId: 'img-1' }),
    });
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('image/png');
  });

  it('calls fetchWordImageById with the provided imageId', async () => {
    mockFetchWordImageById.mockResolvedValue(null);
    await GET(makeRequest('GET') as never, {
      params: Promise.resolve({ imageId: 'my-image-id' }),
    });
    expect(mockFetchWordImageById).toHaveBeenCalledWith('my-image-id');
  });

  it('returns binary data decoded from base64', async () => {
    // "AQID" = base64([1, 2, 3])
    mockFetchWordImageById.mockResolvedValue({
      id: 'img-1',
      wordId: 'w1',
      content: 'AQID',
      createdAt: new Date(),
    });
    const response = await GET(makeRequest('GET') as never, {
      params: Promise.resolve({ imageId: 'img-1' }),
    });
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    expect(bytes).toEqual(new Uint8Array([1, 2, 3]));
  });
});
