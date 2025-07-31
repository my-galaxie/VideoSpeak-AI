import { v4 as uuidv4 } from 'uuid';
import { ProcessingJob, JobStatus, ProcessingStage, ProcessingResults } from '../types';

export class JobManager {
  private jobs: Map<string, ProcessingJob> = new Map();
  private processingQueue: string[] = [];
  private maxConcurrentJobs: number = 5;
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Start cleanup interval - remove completed jobs older than 1 hour
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldJobs();
    }, 3600000); // 1 hour
  }

  /**
   * Creates a new processing job
   */
  async createJob(jobData: Partial<ProcessingJob>): Promise<ProcessingJob> {
    const job: ProcessingJob = {
      id: jobData.id || uuidv4(),
      videoUrl: jobData.videoUrl!,
      targetLanguage: jobData.targetLanguage!,
      status: JobStatus.PENDING,
      progress: 0,
      currentStage: ProcessingStage.VALIDATING_URL,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...jobData
    };

    this.jobs.set(job.id, job);
    this.processingQueue.push(job.id);
    
    console.log(`Created job ${job.id} for video: ${job.videoUrl}`);
    return job;
  }

  /**
   * Gets a job by ID
   */
  async getJob(jobId: string): Promise<ProcessingJob | null> {
    return this.jobs.get(jobId) || null;
  }

  /**
   * Updates a job with new data
   */
  async updateJob(jobId: string, updates: Partial<ProcessingJob>): Promise<ProcessingJob | null> {
    const job = this.jobs.get(jobId);
    if (!job) {
      return null;
    }

    const updatedJob = {
      ...job,
      ...updates,
      updatedAt: new Date()
    };

    this.jobs.set(jobId, updatedJob);
    console.log(`Updated job ${jobId}: ${updatedJob.currentStage} (${updatedJob.progress}%)`);
    
    return updatedJob;
  }

  /**
   * Cancels a job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    const job = this.jobs.get(jobId);
    if (!job) {
      return false;
    }

    if (job.status === JobStatus.PENDING || job.status === JobStatus.PROCESSING) {
      await this.updateJob(jobId, {
        status: JobStatus.FAILED,
        error: 'Job cancelled by user'
      });

      // Remove from processing queue
      const queueIndex = this.processingQueue.indexOf(jobId);
      if (queueIndex > -1) {
        this.processingQueue.splice(queueIndex, 1);
      }

      console.log(`Cancelled job ${jobId}`);
      return true;
    }

    return false;
  }

  /**
   * Gets all jobs (for admin/debugging purposes)
   */
  async getAllJobs(): Promise<ProcessingJob[]> {
    return Array.from(this.jobs.values());
  }

  /**
   * Gets job statistics
   */
  getJobStats(): {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    queueLength: number;
  } {
    const jobs = Array.from(this.jobs.values());
    
    return {
      total: jobs.length,
      pending: jobs.filter(j => j.status === JobStatus.PENDING).length,
      processing: jobs.filter(j => j.status === JobStatus.PROCESSING).length,
      completed: jobs.filter(j => j.status === JobStatus.COMPLETED).length,
      failed: jobs.filter(j => j.status === JobStatus.FAILED).length,
      queueLength: this.processingQueue.length
    };
  }

  /**
   * Processes the next job in queue
   */
  async processNextJob(): Promise<void> {
    const activeJobs = Array.from(this.jobs.values())
      .filter(job => job.status === JobStatus.PROCESSING).length;

    if (activeJobs >= this.maxConcurrentJobs || this.processingQueue.length === 0) {
      return;
    }

    const jobId = this.processingQueue.shift();
    if (!jobId) {
      return;
    }

    const job = this.jobs.get(jobId);
    if (!job || job.status !== JobStatus.PENDING) {
      return;
    }

    console.log(`Starting to process job ${jobId}`);
    
    // Update job status to processing
    await this.updateJob(jobId, {
      status: JobStatus.PROCESSING,
      currentStage: ProcessingStage.VALIDATING_URL,
      progress: 5
    });

    // Note: Actual processing logic would be handled by the API route
    // This is just the job queue management
  }

  /**
   * Cleans up old completed jobs
   */
  private cleanupOldJobs(): void {
    const cutoffTime = new Date(Date.now() - 3600000); // 1 hour ago
    let cleanedCount = 0;

    for (const [jobId, job] of this.jobs.entries()) {
      if (
        (job.status === JobStatus.COMPLETED || job.status === JobStatus.FAILED) &&
        job.updatedAt < cutoffTime
      ) {
        this.jobs.delete(jobId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} old jobs`);
    }
  }

  /**
   * Starts the job processing loop
   */
  startProcessing(): void {
    setInterval(() => {
      this.processNextJob().catch(error => {
        console.error('Error in job processing loop:', error);
      });
    }, 5000); // Check every 5 seconds
  }

  /**
   * Shuts down the job manager
   */
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Mark all pending/processing jobs as failed
    for (const job of this.jobs.values()) {
      if (job.status === JobStatus.PENDING || job.status === JobStatus.PROCESSING) {
        job.status = JobStatus.FAILED;
        job.error = 'Server shutdown';
        job.updatedAt = new Date();
      }
    }

    console.log('JobManager shutdown complete');
  }
}

export default JobManager;