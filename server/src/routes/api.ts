import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { YouTubeUrlValidator } from '../utils/youtube';
import { TranslationService } from '../services/TranslationService';
import { YouTubeVideoProcessor } from '../services/VideoProcessingService';
import { WebSpeechTranscriptionService } from '../services/TranscriptionService';
import { JobManager } from '../services/JobManager';
import {
  ProcessVideoRequest,
  ProcessVideoResponse,
  JobStatusResponse,
  JobStatus,
  ProcessingStage,
  SUPPORTED_LANGUAGES
} from '../types';

// Service dependencies interface
export interface ApiDependencies {
  translationService: TranslationService;
  videoProcessingService: YouTubeVideoProcessor;
  transcriptionService: WebSpeechTranscriptionService;
  jobManager: JobManager;
}

// Factory function to create router with injected dependencies
export function createApiRouter(dependencies?: Partial<ApiDependencies>): express.Router {
  const router = express.Router();

  // Use provided dependencies or create default instances
  const {
    translationService = new TranslationService(process.env.SARVAM_API_KEY || 'demo-key'),
    videoProcessingService = new YouTubeVideoProcessor(),
    transcriptionService = new WebSpeechTranscriptionService(),
    jobManager = new JobManager()
  } = dependencies || {};

/**
 * POST /api/process-video
 * Creates a new video processing job
 */
router.post('/process-video', async (req: Request, res: Response) => {
  try {
    const { youtubeUrl, targetLanguage, sourceLanguage }: ProcessVideoRequest = req.body;

    // Validate request
    if (!youtubeUrl) {
      return res.status(400).json({
        error: {
          code: 'MISSING_URL',
          message: 'YouTube URL is required',
          retryable: false
        },
        timestamp: new Date().toISOString(),
        requestId: uuidv4()
      });
    }

    if (!targetLanguage) {
      return res.status(400).json({
        error: {
          code: 'MISSING_TARGET_LANGUAGE',
          message: 'Target language is required',
          retryable: false
        },
        timestamp: new Date().toISOString(),
        requestId: uuidv4()
      });
    }

    // Validate YouTube URL
    if (!YouTubeUrlValidator.validateYouTubeUrl(youtubeUrl)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_YOUTUBE_URL',
          message: 'Invalid YouTube URL format',
          retryable: false
        },
        timestamp: new Date().toISOString(),
        requestId: uuidv4()
      });
    }

    // Validate target language
    const supportedLanguage = SUPPORTED_LANGUAGES.find(lang =>
      lang.code === targetLanguage && lang.isSupported
    );

    if (!supportedLanguage) {
      return res.status(400).json({
        error: {
          code: 'UNSUPPORTED_LANGUAGE',
          message: `Unsupported target language: ${targetLanguage}`,
          details: {
            supportedLanguages: SUPPORTED_LANGUAGES.filter(lang => lang.isSupported)
          },
          retryable: false
        },
        timestamp: new Date().toISOString(),
        requestId: uuidv4()
      });
    }

    // Create processing job
    const jobId = uuidv4();
    const job = await jobManager.createJob({
      id: jobId,
      videoUrl: youtubeUrl,
      targetLanguage,
      status: JobStatus.PENDING,
      progress: 0,
      currentStage: ProcessingStage.VALIDATING_URL,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Start processing asynchronously
    processVideoAsync(jobId, youtubeUrl, targetLanguage, sourceLanguage);

    const response: ProcessVideoResponse = {
      jobId,
      status: JobStatus.PENDING,
      message: 'Video processing job created successfully'
    };

    res.status(202).json(response);
  } catch (error) {
    console.error('Error creating video processing job:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create video processing job',
        retryable: true
      },
      timestamp: new Date().toISOString(),
      requestId: uuidv4()
    });
  }
});

/**
 * GET /api/job-status/:jobId
 * Gets the status of a processing job
 */
router.get('/job-status/:jobId', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;

    if (!jobId) {
      return res.status(400).json({
        error: {
          code: 'MISSING_JOB_ID',
          message: 'Job ID is required',
          retryable: false
        },
        timestamp: new Date().toISOString(),
        requestId: uuidv4()
      });
    }

    const job = await jobManager.getJob(jobId);

    if (!job) {
      return res.status(404).json({
        error: {
          code: 'JOB_NOT_FOUND',
          message: `Job with ID ${jobId} not found`,
          retryable: false
        },
        timestamp: new Date().toISOString(),
        requestId: uuidv4()
      });
    }

    const response: JobStatusResponse = {
      jobId: job.id,
      status: job.status,
      progress: job.progress,
      currentStage: job.currentStage,
      results: job.results,
      error: job.error
    };

    res.json(response);
  } catch (error) {
    console.error('Error getting job status:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get job status',
        retryable: true
      },
      timestamp: new Date().toISOString(),
      requestId: uuidv4()
    });
  }
});

/**
 * GET /api/languages
 * Gets list of supported languages
 */
router.get('/languages', (req: Request, res: Response) => {
  try {
    const languages = translationService.getSupportedLanguages();
    res.json({
      languages,
      total: languages.length
    });
  } catch (error) {
    console.error('Error getting supported languages:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get supported languages',
        retryable: true
      },
      timestamp: new Date().toISOString(),
      requestId: uuidv4()
    });
  }
});

/**
 * GET /api/health
 * Health check endpoint
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        translation: await translationService.validateApiKey(),
        videoProcessing: true, // Basic check
        transcription: true // Basic check
      }
    };

    const allServicesHealthy = Object.values(health.services).every(status => status === true);

    if (!allServicesHealthy) {
      health.status = 'degraded';
    }

    res.status(allServicesHealthy ? 200 : 503).json(health);
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
});

  /**
   * Async function to process video
   */
  async function processVideoAsync(
    jobId: string,
    youtubeUrl: string,
    targetLanguage: string,
    sourceLanguage?: string
  ): Promise<void> {
    try {
      // Update job status to processing
      await jobManager.updateJob(jobId, {
        status: JobStatus.PROCESSING,
        currentStage: ProcessingStage.EXTRACTING_AUDIO,
        progress: 10,
        updatedAt: new Date()
      });

      // Extract video metadata and audio
      const videoId = YouTubeUrlValidator.extractVideoId(youtubeUrl);
      if (!videoId) {
        throw new Error('Failed to extract video ID');
      }

      const videoMetadata = await videoProcessingService.getVideoMetadata(videoId);
      const audioBuffer = await videoProcessingService.extractAudio(videoId);

      // Update progress
      await jobManager.updateJob(jobId, {
        currentStage: ProcessingStage.TRANSCRIBING,
        progress: 40,
        updatedAt: new Date()
      });

      // Transcribe audio
      const transcriptionResult = await transcriptionService.transcribeAudio(audioBuffer);

      if (!transcriptionResult || !transcriptionResult.text) {
        throw new Error('Transcription failed: No text content extracted from audio');
      }

      // Update progress
      await jobManager.updateJob(jobId, {
        currentStage: ProcessingStage.TRANSLATING,
        progress: 70,
        updatedAt: new Date()
      });

      // Translate text
      const translationResult = await translationService.translateText(
        transcriptionResult.text,
        targetLanguage,
        sourceLanguage || transcriptionResult.detectedLanguage
      );

      // Complete job
      await jobManager.updateJob(jobId, {
        status: JobStatus.COMPLETED,
        currentStage: ProcessingStage.COMPLETED,
        progress: 100,
        results: {
          originalText: transcriptionResult.text,
          translatedText: translationResult.translatedText,
          sourceLanguage: translationResult.sourceLanguageCode,
          targetLanguage: translationResult.targetLanguageCode,
          videoMetadata,
          transcriptionResult,
          translationResult
        },
        updatedAt: new Date()
      });

    } catch (error) {
      console.error(`Job ${jobId} failed:`, error);
      await jobManager.updateJob(jobId, {
        status: JobStatus.FAILED,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        updatedAt: new Date()
      });
    }
  }

  return router;
}

// Default export for backward compatibility
const router = createApiRouter();
export default router;