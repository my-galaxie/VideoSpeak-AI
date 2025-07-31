import { YouTubeUrlValidator, YouTubeUrlError, YOUTUBE_ERROR_CODES } from '../youtube';

describe('YouTubeUrlValidator', () => {
  describe('validateYouTubeUrl', () => {
    it('should validate standard YouTube URLs', () => {
      const validUrls = [
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'http://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://youtube.com/watch?v=dQw4w9WgXcQ',
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10s',
        'https://www.youtube.com/watch?feature=player_embedded&v=dQw4w9WgXcQ'
      ];

      validUrls.forEach(url => {
        expect(YouTubeUrlValidator.validateYouTubeUrl(url)).toBe(true);
      });
    });

    it('should validate YouTube short URLs', () => {
      const validUrls = [
        'https://youtu.be/dQw4w9WgXcQ',
        'http://youtu.be/dQw4w9WgXcQ',
        'https://youtu.be/dQw4w9WgXcQ?t=10'
      ];

      validUrls.forEach(url => {
        expect(YouTubeUrlValidator.validateYouTubeUrl(url)).toBe(true);
      });
    });

    it('should validate YouTube embed URLs', () => {
      const validUrls = [
        'https://www.youtube.com/embed/dQw4w9WgXcQ',
        'http://www.youtube.com/embed/dQw4w9WgXcQ',
        'https://youtube.com/embed/dQw4w9WgXcQ'
      ];

      validUrls.forEach(url => {
        expect(YouTubeUrlValidator.validateYouTubeUrl(url)).toBe(true);
      });
    });

    it('should reject invalid URLs', () => {
      const invalidUrls = [
        '',
        'not-a-url',
        'https://www.google.com',
        'https://www.youtube.com',
        'https://www.youtube.com/watch',
        'https://www.youtube.com/watch?v=',
        'https://www.youtube.com/watch?v=invalid',
        'https://vimeo.com/123456789',
        null,
        undefined
      ];

      invalidUrls.forEach(url => {
        expect(YouTubeUrlValidator.validateYouTubeUrl(url as any)).toBe(false);
      });
    });
  });

  describe('extractVideoId', () => {
    it('should extract video ID from standard URLs', () => {
      const testCases = [
        { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', expected: 'dQw4w9WgXcQ' },
        { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10s', expected: 'dQw4w9WgXcQ' },
        { url: 'https://youtu.be/dQw4w9WgXcQ', expected: 'dQw4w9WgXcQ' },
        { url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', expected: 'dQw4w9WgXcQ' }
      ];

      testCases.forEach(({ url, expected }) => {
        expect(YouTubeUrlValidator.extractVideoId(url)).toBe(expected);
      });
    });

    it('should return null for invalid URLs', () => {
      const invalidUrls = [
        'https://www.google.com',
        'invalid-url',
        '',
        'https://www.youtube.com/watch?v=invalid'
      ];

      invalidUrls.forEach(url => {
        expect(YouTubeUrlValidator.extractVideoId(url)).toBeNull();
      });
    });
  });

  describe('normalizeUrl', () => {
    it('should normalize various URL formats to standard format', () => {
      const testCases = [
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://youtu.be/dQw4w9WgXcQ',
        'https://www.youtube.com/embed/dQw4w9WgXcQ',
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10s'
      ];

      const expected = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

      testCases.forEach(url => {
        expect(YouTubeUrlValidator.normalizeUrl(url)).toBe(expected);
      });
    });

    it('should return null for invalid URLs', () => {
      expect(YouTubeUrlValidator.normalizeUrl('invalid-url')).toBeNull();
    });
  });

  describe('isValidVideoId', () => {
    it('should validate correct video ID format', () => {
      const validIds = [
        'dQw4w9WgXcQ',
        'abc123DEF45',
        '_-abcDEF123'
      ];

      validIds.forEach(id => {
        expect(YouTubeUrlValidator.isValidVideoId(id)).toBe(true);
      });
    });

    it('should reject invalid video ID formats', () => {
      const invalidIds = [
        '',
        'short',
        'toolongvideoid123',
        'invalid@chars',
        'spaces here',
        '1234567890' // 10 chars, too short
      ];

      invalidIds.forEach(id => {
        expect(YouTubeUrlValidator.isValidVideoId(id)).toBe(false);
      });
    });
  });

  describe('getThumbnailUrl', () => {
    it('should generate correct thumbnail URLs', () => {
      const videoId = 'dQw4w9WgXcQ';
      
      expect(YouTubeUrlValidator.getThumbnailUrl(videoId))
        .toBe('https://img.youtube.com/vi/dQw4w9WgXcQ/mediumdefault.jpg');
      
      expect(YouTubeUrlValidator.getThumbnailUrl(videoId, 'high'))
        .toBe('https://img.youtube.com/vi/dQw4w9WgXcQ/highdefault.jpg');
    });

    it('should throw error for invalid video ID', () => {
      expect(() => YouTubeUrlValidator.getThumbnailUrl('invalid'))
        .toThrow('Invalid video ID');
    });
  });
});