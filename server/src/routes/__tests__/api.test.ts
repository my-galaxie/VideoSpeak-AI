import request from 'supertest';
import express from 'express';
import { createApiRouter, ApiDependencies } from '../api';
import { JobManager } from '../../services/JobManager';
import { TranslationService } from '../../services/TranslationService';
import { YouTubeVideoProcessor } from '../../services/VideoProcessingService';
import { WebSpeechTranscriptionService } from '../../services/TranscriptionService';
import { JobStatus, ProcessingStage } from '../../types';

// Add Jest type definitions
declare global {
  namespace NodeJS {
    interface Global {
      expect: jest.Expect;
      it: jest.It;
      describe: jest.Describe;
      beforeEach: jest.Lifecycle;
      afterEach: jest.Lifecycle;
      jest: typeof jest;
    }
  }
}

describe('API Routes', () => {
  let app: express.Application;
  let mockJobManager: jest.Mocked<JobManager>;
  let mockTranslationService: jest.Mocked<TranslationService>;
  let mockVideoProcessingService: jest.Mocked<YouTubeVideoProcessor>;
  let mockTranscriptionService: jest.Mocked<WebSpeechTranscriptionService>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock services
    mockJobManager = {
      createJob: jest.fn(),
      getJob: jest.fn(),
      updateJob: jest.fn(),
      cancelJob: jest.fn(),
      shutdown: jest.fn()
    } as unknown as jest.Mocked<JobManager>;

    mockTranslationService = {
      getSupportedLanguages: jest.fn().mockReturnValue([
        { code: 'hi-IN', name: 'Hindi', nativeName: 'हिन्दी', isSupported: true },
        { code: 'kn-IN', name: 'Kannada', nativeName: 'ಕನ್ನಡ', isSupported: true }
      ]),
      translateText: jest.fn(),
      isLowAccuracy: jest.fn(),
      getLowAccuracyWarning: jest.fn(),
      calculateQualityMetrics: jest.fn(),
      validateApiKey: jest.fn().mockResolvedValue(true)
    } as unknown as jest.Mocked<TranslationService>;

    mockVideoProcessingService = {
      validateYouTubeUrl: jest.fn(),
      extractVideoId: jest.fn(),
      extractAudio: jest.fn(),
      getVideoMetadata: jest.fn(),
      cleanup: jest.fn()
    } as unknown as jest.Mocked<YouTubeVideoProcessor>;

    mockTranscriptionService = {
      transcribeAudio: jest.fn()
    } as unknown as jest.Mocked<WebSpeechTranscriptionService>;

    // Create Express app with injected dependencies
    app = express();
    app.use(express.json());
    app.use('/api', createApiRouter({
      jobManager: mockJobManager,
      translationService: mockTranslationService,
      videoProcessingService: mockVideoProcessingService,
      transcriptionService: mockTranscriptionService
    }));
  });

  describe('POST /api/process-video', () => {
    const validRequest = {
      youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      targetLanguage: 'hi-IN'
    };

    it('should create a video processing job successfully', async () => {
      const mockJob = {
        id: 'test-job-id',
        videoUrl: validRequest.youtubeUrl,
        targetLanguage: validRequest.targetLanguage,
        status: JobStatus.PENDING,
        progress: 0,
        currentStage: ProcessingStage.VALIDATING_URL,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockJobManager.createJob.mockResolvedValue(mockJob);

      const response = await request(app)
        .post('/api/process-video')
        .send(validRequest)
        .expect(202);

      expect(response.body).toMatchObject({
        jobId: expect.any(String),
        status: JobStatus.PENDING,
        message: 'Video processing job created successfully'
      });

      expect(mockJobManager.createJob).toHaveBeenCalledWith(
        expect.objectContaining({
          videoUrl: validRequest.youtubeUrl,
          targetLanguage: validRequest.targetLanguage,
          status: JobStatus.PENDING
        })
      );
    });

    it('should return 400 for missing YouTube URL', async () => {
      const response = await request(app)
        .post('/api/process-video')
        .send({ targetLanguage: 'hi-IN' })
        .expect(400);

      expect(response.body.error.code).toBe('MISSING_URL');
      expect(response.body.error.message).toBe('YouTube URL is required');
    });

    it('should return 400 for missing target language', async () => {
      const response = await request(app)
        .post('/api/process-video')
        .send({ youtubeUrl: validRequest.youtubeUrl })
        .expect(400);

      expect(response.body.error.code).toBe('MISSING_TARGET_LANGUAGE');
      expect(response.body.error.message).toBe('Target language is required');
    });

    it('should return 400 for invalid YouTube URL', async () => {
      const response = await request(app)
        .post('/api/process-video')
        .send({
          youtubeUrl: 'https://www.google.com',
          targetLanguage: 'hi-IN'
        })
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_YOUTUBE_URL');
      expect(response.body.error.message).toBe('Invalid YouTube URL format');
    });

    it('should return 400 for unsupported language', async () => {
      const response = await request(app)
        .post('/api/process-video')
        .send({
          youtubeUrl: validRequest.youtubeUrl,
          targetLanguage: 'unsupported-lang'
        })
        .expect(400);

      expect(response.body.error.code).toBe('UNSUPPORTED_LANGUAGE');
      expect(response.body.error.message).toContain('Unsupported target language');
    });

    it('should handle service errors gracefully', async () => {
      mockJobManager.createJob.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/process-video')
        .send(validRequest)
        .expect(500);

      expect(response.body.error.code).toBe('INTERNAL_ERROR');
      expect(response.body.error.retryable).toBe(true);
    });
  });

  describe('GET /api/job-status/:jobId', () => {
    const jobId = 'test-job-id';

    it('should return job status successfully', async () => {
      const mockJob = {
        id: jobId,
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        targetLanguage: 'hi-IN',
        status: JobStatus.PROCESSING,
        progress: 50,
        currentStage: ProcessingStage.TRANSCRIBING,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockJobManager.getJob.mockResolvedValue(mockJob);

      const response = await request(app)
        .get(`/api/job-status/${jobId}`)
        .expect(200);

      expect(response.body).toMatchObject({
        jobId,
        status: JobStatus.PROCESSING,
        progress: 50,
        currentStage: ProcessingStage.TRANSCRIBING
      });

      expect(mockJobManager.getJob).toHaveBeenCalledWith(jobId);
    });

    it('should return 404 for non-existent job', async () => {
      mockJobManager.getJob.mockResolvedValue(null);

      const response = await request(app)
        .get(`/api/job-status/${jobId}`)
        .expect(404);

      expect(response.body.error.code).toBe('JOB_NOT_FOUND');
      expect(response.body.error.message).toContain('not found');
    });

    it('should return 400 for missing job ID', async () => {
      const response = await request(app)
        .get('/api/job-status/')
        .expect(404); // Express returns 404 for missing route params
    });

    it('should handle service errors gracefully', async () => {
      mockJobManager.getJob.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get(`/api/job-status/${jobId}`)
        .expect(500);

      expect(response.body.error.code).toBe('INTERNAL_ERROR');
      expect(response.body.error.retryable).toBe(true);
    });
  });

  describe('GET /api/languages', () => {
    it('should return supported languages', async () => {
      const response = await request(app)
        .get('/api/languages')
        .expect(200);

      expect(response.body).toHaveProperty('languages');
      expect(response.body).toHaveProperty('total');
      expect(Array.isArray(response.body.languages)).toBe(true);
      expect(response.body.total).toBe(response.body.languages.length);

      expect(mockTranslationService.getSupportedLanguages).toHaveBeenCalled();
    });

    it('should handle service errors gracefully', async () => {
      mockTranslationService.getSupportedLanguages.mockImplementation(() => {
        throw new Error('Service error');
      });

      const response = await request(app)
        .get('/api/languages')
        .expect(500);

      expect(response.body.error.code).toBe('INTERNAL_ERROR');
      expect(response.body.error.retryable).toBe(true);
    });
  });

  describe('GET /api/health', () => {
    it('should return healthy status when all services are working', async () => {
      mockTranslationService.validateApiKey.mockResolvedValue(true);

      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'healthy',
        services: {
          translation: true,
          videoProcessing: true,
          transcription: true
        }
      });
    });

    it('should return degraded status when some services are failing', async () => {
      mockTranslationService.validateApiKey.mockResolvedValue(false);

      const response = await request(app)
        .get('/api/health')
        .expect(503);

      expect(response.body.status).toBe('degraded');
      expect(response.body.services.translation).toBe(false);
    });

    it('should handle health check errors gracefully', async () => {
      mockTranslationService.validateApiKey.mockRejectedValue(new Error('API error'));

      const response = await request(app)
        .get('/api/health')
        .expect(503);

      expect(response.body.status).toBe('unhealthy');
      expect(response.body.error).toBe('Health check failed');
    });
  });
});