import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock sharp
const mockMetadata = vi.fn();
const mockResize = vi.fn();
const mockWebp = vi.fn();
const mockToFile = vi.fn();
const sharpInstance = {
  metadata: mockMetadata,
  resize: mockResize,
  webp: mockWebp,
  toFile: mockToFile,
};

// Chain returns
mockResize.mockReturnValue(sharpInstance);
mockWebp.mockReturnValue(sharpInstance);

vi.mock('sharp', () => ({
  default: vi.fn(() => sharpInstance),
}));

// Mock fs/promises
const mockMkdir = vi.fn();
const mockWriteFile = vi.fn();
const mockUnlink = vi.fn();

vi.mock('fs/promises', () => ({
  default: {
    mkdir: (...args: unknown[]) => mockMkdir(...args),
    writeFile: (...args: unknown[]) => mockWriteFile(...args),
    unlink: (...args: unknown[]) => mockUnlink(...args),
  },
}));

import { processImage, resolveImagePath, deleteImageFiles } from '@/lib/images';

describe('image utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMkdir.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);
    mockToFile.mockResolvedValue({ width: 2400, height: 1800 });
    mockUnlink.mockResolvedValue(undefined);
    mockMetadata.mockResolvedValue({
      width: 4000,
      height: 3000,
      exif: null,
    });
  });

  describe('processImage', () => {
    it('creates compressed original, thumbnail, and medium files', async () => {
      const buffer = Buffer.from('fake-image-data');

      const result = await processImage(buffer, 'photo-123', 'album-1', 'photo.jpg');

      // Should create directories
      expect(mockMkdir).toHaveBeenCalledTimes(2);

      // Original saved as compressed WebP (no raw writeFile)
      expect(mockWriteFile).not.toHaveBeenCalled();
      expect(result.originalPath).toContain('album-1');
      expect(result.originalPath).toContain('photo-123.webp');

      // Should resize 3 times: original (2400px), thumbnail (400px), medium (1200px)
      expect(mockResize).toHaveBeenCalledTimes(3);
      expect(mockToFile).toHaveBeenCalledTimes(3);

      expect(mockResize).toHaveBeenCalledWith(2400, null, { withoutEnlargement: true });
      expect(mockResize).toHaveBeenCalledWith(400, null, { withoutEnlargement: true });
      expect(mockResize).toHaveBeenCalledWith(1200, null, { withoutEnlargement: true });

      expect(result.thumbnailPath).toContain('photo-123-thumbnail.webp');
      expect(result.mediumPath).toContain('photo-123-medium.webp');
    });

    it('returns dimensions from compressed output', async () => {
      const buffer = Buffer.from('fake-image-data');

      const result = await processImage(buffer, 'photo-123', 'album-1', 'photo.jpg');

      expect(result.width).toBe(2400);
      expect(result.height).toBe(1800);
    });

    it('returns null takenAt when no EXIF data', async () => {
      const buffer = Buffer.from('fake-image-data');

      const result = await processImage(buffer, 'photo-123', 'album-1', 'photo.jpg');

      expect(result.takenAt).toBeNull();
    });

    it('always saves original as WebP regardless of input format', async () => {
      const buffer = Buffer.from('fake-image-data');

      const result = await processImage(buffer, 'photo-123', 'album-1', 'photo.png');

      expect(result.originalPath).toContain('photo-123.webp');
    });
  });

  describe('resolveImagePath', () => {
    it('returns thumbnail path', () => {
      const result = resolveImagePath('photo-123', 'thumbnail');

      expect(result).toContain('photo-123-thumbnail.webp');
    });

    it('returns medium path', () => {
      const result = resolveImagePath('photo-123', 'medium');

      expect(result).toContain('photo-123-medium.webp');
    });

    it('returns original path when provided', () => {
      const result = resolveImagePath('photo-123', 'original', '/data/originals/album/photo.jpg');

      expect(result).toBe('/data/originals/album/photo.jpg');
    });

    it('returns empty string for original when no path provided', () => {
      const result = resolveImagePath('photo-123', 'original');

      expect(result).toBe('');
    });
  });

  describe('deleteImageFiles', () => {
    it('deletes original, thumbnail, and medium files', async () => {
      await deleteImageFiles('photo-123', '/data/originals/album/photo.jpg');

      expect(mockUnlink).toHaveBeenCalledTimes(3);
      expect(mockUnlink).toHaveBeenCalledWith('/data/originals/album/photo.jpg');
    });

    it('handles missing files gracefully (no throw)', async () => {
      mockUnlink.mockRejectedValue(new Error('ENOENT'));

      await expect(
        deleteImageFiles('photo-123', '/data/originals/album/photo.jpg')
      ).resolves.not.toThrow();
    });
  });
});
