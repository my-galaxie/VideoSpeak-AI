import { YouTubeVideoProcessor } from '../VideoProcessingService';
import { AudioQuality } from '../../types';

// Mock ytdl-core
jest.mock('ytdl-core');
jest.mock('fluent-ffmpeg');
jest.mock('fs');

const mockYtdl = require('ytdl-core');
const mockFfmpeg = require('fluent-ffmpeg');
const mockFs = require('fs');

describe('YouTubeVideoProcessor', () => {
  let processor: YouTubeVideoProcessor;

  beforeEach(() => {
    processor = new YouTubeVideoProcessor('./test-temp');
    jest.clearAllMocks();
  });

  describe('validateYouTubeUrl', () => {
    it('should validate accessible YouTube URLs', async () => {
      mockYtdl.getInfo.mockResolvedValue({
        videoDetails: {
          videoId: 'dQw4w9WgXcQ',
          title: 'Test Video',
          isPrivate: false
        }
      });

      const result = await processor.validateYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      expect(result).toBe(true);
    });

    it('should reject private videos', async () => {
      mockYtdl.getInfo.mockResolvedValue({
        videoDetails: {
          videoId: 'private123',
          title: 'Private Video',
          isPrivate: true
        }
      });

      const result = await processor.validateYouTubeUrl('https://www.youtube.com/watch?v=private123');
      expect(result).toBe(false);
    });

    it('should reject invalid URLs', async () => {
      const result = await processor.validateYouTubeUrl('https://www.google.com');
      expect(result).toBe(false);
    });

    it('should handle API errors gracefully', async () => {
      mockYtdl.getInfo.mockRejectedValue(new Error('Video not found'));

      const result = await processor.validateYouTubeUrl('https://www.youtube.com/watch?v=notfound');
      expect(result).toBe(false);
    });
  });

  describe('extractVideoId', () => {
    it('should extract video ID from valid URLs', () => {
      const videoId = processor.extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      expect(videoId).toBe('dQw4w9WgXcQ');
    });

    it('should throw error for invalid URLs', () => {
      expect(() => {
        processor.extractVideoId('https://www.google.com');
      }).toThrow('Invalid YouTube URL: Unable to extract video ID');
    });
  });

  describe('getVideoMetadata', () => {
    it('should return correct metadata for short videos', async () => {
      mockYtdl.getInfo.mockResolvedValue({
        videoDetails: {
          videoId: 'short123',
          title: 'Short Video',
          lengthSeconds: '180', // 3 minutes
          media: { song: { artist: 'Test Artist' } }
        },
        formats: [
          { hasAudio: true, audioBitrate: 128 },
          { hasAudio: true, audioBitrate: 64 }
        ]
      });

      const metadata = await processor.getVideoMetadata('short123');

      expect(metadata).toEqual({
        id: 'short123',
        title: 'Short Video',
        duration: 180,
        language: 'Test Artist',
        hasAudio: true,
        isShortVideo: true,
        audioQuality: AudioQuality.HIGH
      });
    });

    it('should return correct metadata for long videos', async () => {
      mockYtdl.getInfo.mockResolvedValue({
        videoDetails: {
          videoId: 'long123',
          title: 'Long Video',
          lengthSeconds: '600' // 10 minutes
        },
        formats: [
          { hasAudio: true, audioBitrate: 96 }
        ]
      });

      const metadata = await processor.getVideoMetadata('long123');

      expect(metadata.isShortVideo).toBe(false);
      expect(metadata.audioQuality).toBe(AudioQuality.MEDIUM);
    });

    it('should handle videos without audio', async () => {
      mockYtdl.getInfo.mockResolvedValue({
        videoDetails: {
          videoId: 'noaudio123',
          title: 'No Audio Video',
          lengthSeconds: '120'
        },
        formats: [
          { hasAudio: false }
        ]
      });

      const metadata = await processor.getVideoMetadata('noaudio123');
      expect(metadata.hasAudio).toBe(false);
      expect(metadata.audioQuality).toBe(AudioQuality.LOW);
    });

    it('should throw error for API failures', async () => {
      mockYtdl.getInfo.mockRejectedValue(new Error('API Error'));

      await expect(processor.getVideoMetadata('error123')).rejects.toThrow('Failed to get video metadata');
    });
  });

  describe('extractAudio', () => {
    beforeEach(() => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.mkdirSync.mockReturnValue(undefined);
      mockFs.readFileSync.mockReturnValue(Buffer.from('mock audio data'));
      mockFs.unlinkSync.mockReturnValue(undefined);
    });

    it('should extract audio successfully', async () => {
      mockYtdl.getInfo.mockResolvedValue({
        videoDetails: {
          isPrivate: false
        },
        formats: [
          { hasAudio: true, audioBitrate: 128 }
        ]
      });

      const mockStream = { pipe: jest.fn() };
      mockYtdl.mockReturnValue(mockStream);

      const mockFfmpegInstance = {
        audioCodec: jest.fn().mockReturnThis(),
        audioFrequency: jest.fn().mockReturnThis(),
        audioChannels: jest.fn().mockReturnThis(),
        format: jest.fn().mockReturnThis(),
        save: jest.fn().mockReturnThis(),
        on: jest.fn((event, callback) => {
          if (event === 'end') {
            setTimeout(callback, 0);
          }
          return mockFfmpegInstance;
        })
      };

      mockFfmpeg.mockReturnValue(mockFfmpegInstance);

      const audioBuffer = await processor.extractAudio('test123');
      expect(audioBuffer).toBeInstanceOf(Buffer);
      expect(mockFs.unlinkSync).toHaveBeenCalled(); // Cleanup
    });

    it('should throw error for private videos', async () => {
      mockYtdl.getInfo.mockResolvedValue({
        videoDetails: {
          isPrivate: true
        }
      });

      await expect(processor.extractAudio('private123')).rejects.toThrow('Video is private and cannot be processed');
    });

    it('should throw error for videos without audio', async () => {
      mockYtdl.getInfo.mockResolvedValue({
        videoDetails: {
          isPrivate: false
        },
        formats: [
          { hasAudio: false }
        ]
      });

      await expect(processor.extractAudio('noaudio123')).rejects.toThrow('Video has no audio track');
    });
  });

  describe('cleanup', () => {
    it('should clean up old temporary files', () => {
      const oldDate = new Date(Date.now() - 7200000); // 2 hours ago
      const recentDate = new Date(Date.now() - 1800000); // 30 minutes ago

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue(['old-file.wav', 'recent-file.wav']);
      mockFs.statSync
        .mockReturnValueOnce({ mtime: oldDate })
        .mockReturnValueOnce({ mtime: recentDate });

      processor.cleanup();

      expect(mockFs.unlinkSync).toHaveBeenCalledTimes(1);
      expect(mockFs.unlinkSync).toHaveBeenCalledWith(expect.stringContaining('old-file.wav'));
    });

    it('should handle cleanup errors gracefully', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      // Should not throw
      expect(() => processor.cleanup()).not.toThrow();
    });
  });
});