import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock sharp
const mockMetadata = vi.fn();
const mockResize = vi.fn();
const mockWebp = vi.fn();
const mockToBuffer = vi.fn();
const sharpInstance = {
  metadata: mockMetadata,
  resize: mockResize,
  webp: mockWebp,
  toBuffer: mockToBuffer,
};

// Chain returns
mockResize.mockReturnValue(sharpInstance);
mockWebp.mockReturnValue(sharpInstance);

vi.mock('sharp', () => ({
  default: vi.fn(() => sharpInstance),
}));

// Mock @aws-sdk/client-s3
const mockSend = vi.fn();
vi.mock('@aws-sdk/client-s3', () => {
  class S3ClientMock {
    send = mockSend;
  }
  class PutObjectCommandMock {
    Bucket!: string; Key!: string; Body!: unknown; ContentType!: string;
    constructor(args: { Bucket: string; Key: string; Body: unknown; ContentType: string }) {
      Object.assign(this, args);
    }
  }
  class GetObjectCommandMock {
    Bucket!: string; Key!: string;
    constructor(args: { Bucket: string; Key: string }) {
      Object.assign(this, args);
    }
  }
  class DeleteObjectsCommandMock {
    Bucket!: string; Delete!: unknown;
    constructor(args: { Bucket: string; Delete: unknown }) {
      Object.assign(this, args);
    }
  }
  class NoSuchKeyMock extends Error { override name = 'NoSuchKey'; }
  return {
    S3Client: S3ClientMock,
    PutObjectCommand: PutObjectCommandMock,
    GetObjectCommand: GetObjectCommandMock,
    DeleteObjectsCommand: DeleteObjectsCommandMock,
    NoSuchKey: NoSuchKeyMock,
  };
});

import { processImage, resolveImageKey, deleteImageFiles } from '@/lib/images';

describe('image utilities (R2-backed)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockToBuffer.mockResolvedValue(Buffer.from('webp-data'));
    mockMetadata.mockResolvedValue({
      width: 4000,
      height: 3000,
      exif: null,
    });
    mockSend.mockResolvedValue({
      // PutObject returns empty; GetObject returns a Body stream
      Body: null,
    });
  });

  describe('processImage', () => {
    it('PutObjects three keys to R2 with correct key paths', async () => {
      const buffer = Buffer.from('fake-image-data');
      mockToBuffer.mockResolvedValueOnce(Buffer.from('original-webp'))
        .mockResolvedValueOnce(Buffer.from('thumbnail-webp'))
        .mockResolvedValueOnce(Buffer.from('medium-webp'));

      await processImage(buffer, 'photo-123', 'album-1', 'photo.jpg');

      // Should send exactly 3 PutObject commands
      expect(mockSend).toHaveBeenCalledTimes(3);

      const keys = mockSend.mock.calls.map((call) => call[0].Key);
      expect(keys).toContain('originals/album-1/photo-123.webp');
      expect(keys).toContain('derived/photo-123-thumbnail.webp');
      expect(keys).toContain('derived/photo-123-medium.webp');
    });

    it('returns R2 object keys (not filesystem paths) as originalPath and thumbnailPath', async () => {
      const buffer = Buffer.from('fake-image-data');
      mockToBuffer.mockResolvedValue(Buffer.from('webp'));

      const result = await processImage(buffer, 'photo-123', 'album-1', 'photo.jpg');

      expect(result.originalPath).toBe('originals/album-1/photo-123.webp');
      expect(result.thumbnailPath).toBe('derived/photo-123-thumbnail.webp');
      expect(result.mediumPath).toBe('derived/photo-123-medium.webp');

      // Must NOT be filesystem paths
      expect(result.originalPath).not.toContain('/data/');
      expect(result.thumbnailPath).not.toContain('/data/');
    });

    it('resizes original at 2400px, thumbnail at 400px, medium at 1200px', async () => {
      const buffer = Buffer.from('fake-image-data');
      mockToBuffer.mockResolvedValue(Buffer.from('webp'));

      await processImage(buffer, 'photo-123', 'album-1', 'photo.jpg');

      expect(mockResize).toHaveBeenCalledWith(2400, null, { withoutEnlargement: true });
      expect(mockResize).toHaveBeenCalledWith(400, null, { withoutEnlargement: true });
      expect(mockResize).toHaveBeenCalledWith(1200, null, { withoutEnlargement: true });
    });

    it('returns dimensions from sharp metadata', async () => {
      const buffer = Buffer.from('fake-image-data');
      // Simulate sharp returning info with width/height via a second metadata call
      // The implementation calls metadata() once at the start for EXIF, then uses
      // metadata() again after resizing OR we get it from the buffer directly.
      // We stub mockToBuffer to return a buffer; the width/height come from a post-resize metadata call.
      mockToBuffer.mockResolvedValue(Buffer.from('webp'));
      // processImage calls sharp(originalBuffer).metadata() for EXIF
      // then later gets width/height from a resize result
      // We mock it to return dimensions
      mockMetadata
        .mockResolvedValueOnce({ exif: null }) // EXIF call
        .mockResolvedValueOnce({ width: 2400, height: 1800 }); // dimensions after resize

      const result = await processImage(buffer, 'photo-123', 'album-1', 'photo.jpg');

      expect(result.width).toBe(2400);
      expect(result.height).toBe(1800);
    });

    it('returns null takenAt when no EXIF data', async () => {
      const buffer = Buffer.from('fake-image-data');
      mockToBuffer.mockResolvedValue(Buffer.from('webp'));

      const result = await processImage(buffer, 'photo-123', 'album-1', 'photo.jpg');

      expect(result.takenAt).toBeNull();
    });

    it('PutObjects with ContentType image/webp', async () => {
      const buffer = Buffer.from('fake-image-data');
      mockToBuffer.mockResolvedValue(Buffer.from('webp'));

      await processImage(buffer, 'photo-123', 'album-1', 'photo.jpg');

      for (const call of mockSend.mock.calls) {
        expect(call[0].ContentType).toBe('image/webp');
      }
    });
  });

  describe('resolveImageKey', () => {
    it('returns R2 key for thumbnail', () => {
      const key = resolveImageKey('photo-123', 'thumbnail');
      expect(key).toBe('derived/photo-123-thumbnail.webp');
    });

    it('returns R2 key for medium (default)', () => {
      const key = resolveImageKey('photo-123', 'medium');
      expect(key).toBe('derived/photo-123-medium.webp');
    });

    it('returns originalKey for original when provided', () => {
      const key = resolveImageKey('photo-123', 'original', 'originals/album-1/photo-123.webp');
      expect(key).toBe('originals/album-1/photo-123.webp');
    });

    it('falls back to medium key for original when no originalKey provided', () => {
      const key = resolveImageKey('photo-123', 'original');
      expect(key).toBe('derived/photo-123-medium.webp');
    });

    it('returns medium key by default when size is unrecognized', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const key = resolveImageKey('photo-123', 'unknown' as any);
      expect(key).toBe('derived/photo-123-medium.webp');
    });
  });

  describe('deleteImageFiles', () => {
    it('DeleteObjects all three R2 keys', async () => {
      mockSend.mockResolvedValue({});

      await deleteImageFiles('photo-123', 'originals/album-1/photo-123.webp');

      expect(mockSend).toHaveBeenCalledTimes(1);
      const call = mockSend.mock.calls[0][0];
      const keys = call.Delete.Objects.map((o: { Key: string }) => o.Key);
      expect(keys).toContain('originals/album-1/photo-123.webp');
      expect(keys).toContain('derived/photo-123-thumbnail.webp');
      expect(keys).toContain('derived/photo-123-medium.webp');
    });

    it('swallows NoSuchKey errors on delete (missing key is not an error)', async () => {
      const err = new Error('NoSuchKey') as Error & { name: string };
      err.name = 'NoSuchKey';
      mockSend.mockRejectedValue(err);

      await expect(
        deleteImageFiles('photo-123', 'originals/album-1/photo-123.webp')
      ).resolves.not.toThrow();
    });
  });
});
