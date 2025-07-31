import { JobManager } from '../JobManager';
import { JobStatus, ProcessingStage } from '../../types';

describe('JobManager', () => {
  let jobManager: JobManager;

  beforeEach(() => {
    jobManager = new JobManager();
  });

  afterEach(() => {
    jobManager.shutdown();
  });

  describe('createJob', () => {
    it('should create a new job with default values', async () => {
      const jobData = {
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        targetLanguage: 'hi-IN'
      };

      const job = await jobManager.createJob(jobData);

      expect(job).toMatchObject({
        videoUrl: jobData.videoUrl,
        targetLanguage: jobData.targetLanguage,
        status: JobStatus.PENDING,
        progress: 0,
        currentStage: ProcessingStage.VALIDATING_URL
      });
      expect(job.id).toBeDefined();
      expect(job.createdAt).toBeInstanceOf(Date);
      expect(job.updatedAt).toBeInstanceOf(Date);
    });

    it('should create a job with custom ID', async () => {
      const customId = 'custom-job-id';
      const jobData = {
        id: customId,
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        targetLanguage: 'hi-IN'
      };

      const job = await jobManager.createJob(jobData);

      expect(job.id).toBe(customId);
    });
  });

  describe('getJob', () => {
    it('should return existing job', async () => {
      const jobData = {
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        targetLanguage: 'hi-IN'
      };

      const createdJob = await jobManager.createJob(jobData);
      const retrievedJob = await jobManager.getJob(createdJob.id);

      expect(retrievedJob).toEqual(createdJob);
    });

    it('should return null for non-existent job', async () => {
      const job = await jobManager.getJob('non-existent-id');
      expect(job).toBeNull();
    });
  });

  describe('updateJob', () => {
    it('should update existing job', async () => {
      const jobData = {
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        targetLanguage: 'hi-IN'
      };

      const createdJob = await jobManager.createJob(jobData);
      const updates = {
        status: JobStatus.PROCESSING,
        progress: 50,
        currentStage: ProcessingStage.TRANSCRIBING
      };

      const updatedJob = await jobManager.updateJob(createdJob.id, updates);

      expect(updatedJob).toMatchObject(updates);
      expect(updatedJob!.updatedAt.getTime()).toBeGreaterThan(createdJob.updatedAt.getTime());
    });

    it('should return null for non-existent job', async () => {
      const result = await jobManager.updateJob('non-existent-id', { progress: 50 });
      expect(result).toBeNull();
    });
  });

  describe('cancelJob', () => {
    it('should cancel pending job', async () => {
      const jobData = {
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        targetLanguage: 'hi-IN'
      };

      const job = await jobManager.createJob(jobData);
      const cancelled = await jobManager.cancelJob(job.id);

      expect(cancelled).toBe(true);

      const updatedJob = await jobManager.getJob(job.id);
      expect(updatedJob!.status).toBe(JobStatus.FAILED);
      expect(updatedJob!.error).toBe('Job cancelled by user');
    });

    it('should cancel processing job', async () => {
      const jobData = {
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        targetLanguage: 'hi-IN'
      };

      const job = await jobManager.createJob(jobData);
      await jobManager.updateJob(job.id, { status: JobStatus.PROCESSING });

      const cancelled = await jobManager.cancelJob(job.id);

      expect(cancelled).toBe(true);

      const updatedJob = await jobManager.getJob(job.id);
      expect(updatedJob!.status).toBe(JobStatus.FAILED);
      expect(updatedJob!.error).toBe('Job cancelled by user');
    });

    it('should not cancel completed job', async () => {
      const jobData = {
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        targetLanguage: 'hi-IN'
      };

      const job = await jobManager.createJob(jobData);
      await jobManager.updateJob(job.id, { status: JobStatus.COMPLETED });

      const cancelled = await jobManager.cancelJob(job.id);

      expect(cancelled).toBe(false);
    });

    it('should return false for non-existent job', async () => {
      const cancelled = await jobManager.cancelJob('non-existent-id');
      expect(cancelled).toBe(false);
    });
  });

  describe('getAllJobs', () => {
    it('should return all jobs', async () => {
      const jobData1 = {
        videoUrl: 'https://www.youtube.com/watch?v=video1',
        targetLanguage: 'hi-IN'
      };
      const jobData2 = {
        videoUrl: 'https://www.youtube.com/watch?v=video2',
        targetLanguage: 'kn-IN'
      };

      const job1 = await jobManager.createJob(jobData1);
      const job2 = await jobManager.createJob(jobData2);

      const allJobs = await jobManager.getAllJobs();

      expect(allJobs).toHaveLength(2);
      expect(allJobs).toContainEqual(job1);
      expect(allJobs).toContainEqual(job2);
    });
  });

  describe('getJobStats', () => {
    it('should return correct job statistics', async () => {
      // Create jobs with different statuses
      const job1 = await jobManager.createJob({
        videoUrl: 'https://www.youtube.com/watch?v=video1',
        targetLanguage: 'hi-IN'
      });

      const job2 = await jobManager.createJob({
        videoUrl: 'https://www.youtube.com/watch?v=video2',
        targetLanguage: 'kn-IN'
      });

      const job3 = await jobManager.createJob({
        videoUrl: 'https://www.youtube.com/watch?v=video3',
        targetLanguage: 'te-IN'
      });

      // Update job statuses
      await jobManager.updateJob(job1.id, { status: JobStatus.PROCESSING });
      await jobManager.updateJob(job2.id, { status: JobStatus.COMPLETED });
      await jobManager.updateJob(job3.id, { status: JobStatus.FAILED });

      const stats = jobManager.getJobStats();

      expect(stats).toEqual({
        total: 3,
        pending: 0,
        processing: 1,
        completed: 1,
        failed: 1,
        queueLength: expect.any(Number)
      });
    });
  });

  describe('processNextJob', () => {
    it('should not process when no jobs in queue', async () => {
      // This should not throw an error
      await jobManager.processNextJob();
    });

    it('should update job status when processing', async () => {
      const jobData = {
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        targetLanguage: 'hi-IN'
      };

      const job = await jobManager.createJob(jobData);
      await jobManager.processNextJob();

      const updatedJob = await jobManager.getJob(job.id);
      expect(updatedJob!.status).toBe(JobStatus.PROCESSING);
      expect(updatedJob!.progress).toBeGreaterThan(0);
    });
  });

  describe('shutdown', () => {
    it('should mark active jobs as failed on shutdown', async () => {
      const job1 = await jobManager.createJob({
        videoUrl: 'https://www.youtube.com/watch?v=video1',
        targetLanguage: 'hi-IN'
      });

      const job2 = await jobManager.createJob({
        videoUrl: 'https://www.youtube.com/watch?v=video2',
        targetLanguage: 'kn-IN'
      });

      await jobManager.updateJob(job2.id, { status: JobStatus.PROCESSING });

      jobManager.shutdown();

      const updatedJob1 = await jobManager.getJob(job1.id);
      const updatedJob2 = await jobManager.getJob(job2.id);

      expect(updatedJob1!.status).toBe(JobStatus.FAILED);
      expect(updatedJob1!.error).toBe('Server shutdown');
      expect(updatedJob2!.status).toBe(JobStatus.FAILED);
      expect(updatedJob2!.error).toBe('Server shutdown');
    });
  });
});