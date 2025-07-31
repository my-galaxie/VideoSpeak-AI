// YouTube URL validation and video ID extraction utilities

export class YouTubeUrlValidator {
  private static readonly YOUTUBE_URL_PATTERNS = [
    /^https?:\/\/(www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /^https?:\/\/(www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /^https?:\/\/(www\.)?youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
    /^https?:\/\/youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /^https?:\/\/(www\.)?youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/
  ];

  /**
   * Validates if a URL is a valid YouTube URL
   */
  static validateYouTubeUrl(url: string): boolean {
    if (!url || typeof url !== 'string') {
      return false;
    }

    // Remove whitespace
    const cleanUrl = url.trim();

    // Check against all patterns
    return this.YOUTUBE_URL_PATTERNS.some(pattern => pattern.test(cleanUrl));
  }

  /**
   * Extracts video ID from various YouTube URL formats
   */
  static extractVideoId(url: string): string | null {
    if (!url || typeof url !== 'string') {
      return null;
    }

    const cleanUrl = url.trim();

    // Try each pattern and return the video ID from the appropriate capture group
    for (const pattern of this.YOUTUBE_URL_PATTERNS) {
      const match = cleanUrl.match(pattern);
      if (match) {
        // For youtu.be URLs, video ID is in group 1, for others it's in group 2
        const videoId = match[2] || match[1];
        if (videoId && this.isValidVideoId(videoId)) {
          return videoId;
        }
      }
    }

    return null;
  }

  /**
   * Normalizes YouTube URL to standard format
   */
  static normalizeUrl(url: string): string | null {
    const videoId = this.extractVideoId(url);
    if (!videoId) {
      return null;
    }
    return `https://www.youtube.com/watch?v=${videoId}`;
  }

  /**
   * Validates video ID format
   */
  static isValidVideoId(videoId: string): boolean {
    return /^[a-zA-Z0-9_-]{11}$/.test(videoId);
  }

  /**
   * Gets thumbnail URL for a video ID
   */
  static getThumbnailUrl(videoId: string, quality: 'default' | 'medium' | 'high' | 'maxres' = 'medium'): string {
    if (!this.isValidVideoId(videoId)) {
      throw new Error('Invalid video ID');
    }
    return `https://img.youtube.com/vi/${videoId}/${quality}default.jpg`;
  }
}

export class YouTubeUrlError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'YouTubeUrlError';
  }
}

// Error codes for different validation failures
export const YOUTUBE_ERROR_CODES = {
  INVALID_URL: 'INVALID_URL',
  INVALID_FORMAT: 'INVALID_FORMAT',
  MISSING_VIDEO_ID: 'MISSING_VIDEO_ID',
  PRIVATE_VIDEO: 'PRIVATE_VIDEO',
  VIDEO_NOT_FOUND: 'VIDEO_NOT_FOUND',
  REGION_BLOCKED: 'REGION_BLOCKED'
} as const;

export type YouTubeErrorCode = typeof YOUTUBE_ERROR_CODES[keyof typeof YOUTUBE_ERROR_CODES];