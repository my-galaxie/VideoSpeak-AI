import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { YouTubeUrlValidator } from '../utils/youtube';
import { EnhancedTranslationService } from '../services/EnhancedTranslationService';
import { YouTubeVideoProcessor } from '../services/VideoProcessingService';
import { WebSpeechTranscriptionService } from '../services/TranscriptionService';
import { JobManager } from '../services/JobManager';
import { VideoSpeakService } from '../services/VideoSpeakService';
import { LLMProviderManager } from '../services/llm/LLMProviderManager';
import {
  ProcessVideoRequest,
  ProcessVideoResponse,
  JobStatusResponse,
  JobStatus,
  ProcessingStage,
  SUPPORTED_LANGUAGES,
  TranslationMethod
} from '../types';

const router = express.Router();

// Initialize LLM provider manager
const llmProviderManager = new LLMProviderManager();

// Initialize services
const sarvamApiKey = process.env.SARVAM_API_KEY || 'demo-key';
const translationService = new EnhancedTranslationService(
  sarvamApiKey,
  llmProviderManager,
  TranslationMethod.LLM // Default to LLM translation
);
const videoProcessingService = new YouTubeVideoProcessor();
const transcriptionService = new WebSpeechTranscriptionService();
const jobManager = new JobManager();

// Initialize VideoSpeak service
const videoSpeakService = new VideoSpeakService(
  videoProcessingService,
  transcriptionService,
  sarvamApiKey
);

/**
 * POST /api/process-video
 * Creates a new video processing job
 */
router.post('/process-video', async (req: Request, res: Response) => {
  try {
    const { youtubeUrl, targetLanguage, sourceLanguage, translationMethod }: ProcessVideoRequest & { translationMethod?: string } = req.body;

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

    // Determine translation method
    let method = TranslationMethod.LLM; // Default to LLM
    if (translationMethod === 'sarvam') {
      method = TranslationMethod.SARVAM;
    }

    // Process video using VideoSpeakService
    const jobId = await videoSpeakService.processVideo(
      youtubeUrl,
      targetLanguage,
      sourceLanguage,
      method
    );

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

    const job = videoSpeakService.getJobStatus(jobId);

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
 * GET /api/translation-methods
 * Gets available translation methods
 */
router.get('/translation-methods', (req: Request, res: Response) => {
  try {
    const methods = [
      {
        id: TranslationMethod.LLM,
        name: 'LLM Translation',
        description: 'Uses Large Language Models for translation',
        providers: llmProviderManager.listAvailableProviders()
      },
      {
        id: TranslationMethod.SARVAM,
        name: 'Sarvam API',
        description: 'Uses Sarvam API for Indian language translation'
      }
    ];
    
    res.json({
      methods,
      defaultMethod: TranslationMethod.LLM
    });
  } catch (error) {
    console.error('Error getting translation methods:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get translation methods',
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
        transcription: true, // Basic check
        llm: llmProviderManager.hasProvider('huggingface') // Check if HuggingFace provider is available
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

export default router;