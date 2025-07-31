import { TranscriptionService } from './TranscriptionService';
import { EnhancedTranslationService, TranslationOptions } from './EnhancedTranslationService';
import { VideoProcessingService } from './VideoProcessingService';
import { ProcessingJob, JobStatus, ProcessingStage, ProcessingResults, TranslationMethod } from '../types';
import { LLMProviderManager } from './llm/LLMProviderManager';

/**
 * Main service for VideoSpeak system
 */
export class VideoSpeakService {
  private videoProcessingService: VideoProcessingService;
  private transcriptionService: TranscriptionService;
  private translationService: EnhancedTranslationService;
  private jobs: Map<string, ProcessingJob>;
  
  constructor(
    videoProcessingService: VideoProcessingService,
    transcriptionService: TranscriptionService,
    sarvamApiKey: string
  ) {
    this.videoProcessingService = videoProcessingService;
    this.transcriptionService = transcriptionService;
    
    // Initialize LLM provider manager
    const llmProviderManager = new LLMProviderManager();
    
    // Initialize translation service with LLM support
    this.translationService = new EnhancedTranslationService(
      sarvamApiKey,
      llmProviderManager,
      TranslationMethod.LLM // Default to LLM translation
    );
    
    this.jobs = new Map();
  }
  
  /**
   * Process a YouTube video
   */
  async processVideo(
    youtubeUrl: string,
    targetLanguage: string,
    sourceLanguage?: string,
    translationMethod: TranslationMethod = TranslationMethod.LLM
  ): Promise<string> {
    // Create a job ID
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    // Create a job
    const job: ProcessingJob = {
      id: jobId,
      videoUrl: youtubeUrl,
      targetLanguage,
      status: JobStatus.PENDING,
      progress: 0,
      currentStage: ProcessingStage.VALIDATING_URL,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Store the job
    this.jobs.set(jobId, job);
    
    // Start processing in the background
    this.processVideoJob(jobId, youtubeUrl, targetLanguage, sourceLanguage, translationMethod)
      .catch(error => {
        console.error(`Error processing job ${jobId}:`, error);
        this.updateJobStatus(jobId, JobStatus.FAILED, 0, ProcessingStage.VALIDATING_URL, error.message);
      });
    
    return jobId;
  }
  
  /**
   * Get job status
   */
  getJobStatus(jobId: string): ProcessingJob | null {
    return this.jobs.get(jobId) || null;
  }
  
  /**
   * Process a video job
   */
  private async processVideoJob(
    jobId: string,
    youtubeUrl: string,
    targetLanguage: string,
    sourceLanguage?: string,
    translationMethod: TranslationMethod = TranslationMethod.LLM
  ): Promise<void> {
    try {
      // Step 1: Validate URL
      this.updateJobStatus(jobId, JobStatus.PROCESSING, 10, ProcessingStage.VALIDATING_URL);
      
      const isValid = await this.videoProcessingService.validateYouTubeUrl(youtubeUrl);
      if (!isValid) {
        throw new Error('Invalid YouTube URL');
      }
      
      const videoId = this.videoProcessingService.extractVideoId(youtubeUrl);
      if (!videoId) {
        throw new Error('Could not extract video ID from URL');
      }
      
      // Step 2: Extract audio
      this.updateJobStatus(jobId, JobStatus.PROCESSING, 20, ProcessingStage.EXTRACTING_AUDIO);
      
      const audioBuffer = await this.videoProcessingService.extractAudio(videoId);
      const videoMetadata = await this.videoProcessingService.getVideoMetadata(videoId);
      
      // Step 3: Transcribe audio
      this.updateJobStatus(jobId, JobStatus.PROCESSING, 40, ProcessingStage.TRANSCRIBING);
      
      const transcriptionResult = await this.transcriptionService.transcribeAudio(audioBuffer);
      const detectedLanguage = transcriptionResult.detectedLanguage || 'en';
      
      // Step 4: Translate text
      this.updateJobStatus(jobId, JobStatus.PROCESSING, 60, ProcessingStage.TRANSLATING);
      
      const translationOptions: TranslationOptions = {
        translationMethod
      };
      
      const translationResult = await this.translationService.translateText(
        transcriptionResult.text,
        targetLanguage,
        sourceLanguage || detectedLanguage,
        translationOptions
      );
      
      // Step 5: Complete job
      const results: ProcessingResults = {
        originalText: transcriptionResult.text,
        translatedText: translationResult.translatedText,
        sourceLanguage: translationResult.sourceLanguageCode,
        targetLanguage: translationResult.targetLanguageCode,
        videoMetadata,
        transcriptionResult,
        translationResult
      };
      
      this.updateJobStatus(jobId, JobStatus.COMPLETED, 100, ProcessingStage.COMPLETED, undefined, results);
      
    } catch (error) {
      console.error(`Error processing job ${jobId}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.updateJobStatus(jobId, JobStatus.FAILED, 0, ProcessingStage.VALIDATING_URL, errorMessage);
      throw error instanceof Error ? error : new Error('Unknown error in video processing');
    }
  }
  
  /**
   * Update job status
   */
  private updateJobStatus(
    jobId: string,
    status: JobStatus,
    progress: number,
    currentStage: ProcessingStage,
    error?: string,
    results?: ProcessingResults
  ): void {
    const job = this.jobs.get(jobId);
    if (!job) {
      return;
    }
    
    job.status = status;
    job.progress = progress;
    job.currentStage = currentStage;
    job.updatedAt = new Date();
    
    if (error) {
      job.error = error;
    }
    
    if (results) {
      job.results = results;
    }
    
    this.jobs.set(jobId, job);
  }
}