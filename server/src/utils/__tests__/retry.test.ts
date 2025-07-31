import { RetryManager, YOUTUBE_RETRY_CONFIG, TRANSCRIPTION_RETRY_CONFIG, TRANSLATION_RETRY_CONFIG } from '../retry';

describe('RetryManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('executeWithRetry', () => {
    it('should succeed on first attempt', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');
      
      const result = await RetryManager.executeWithRetry(mockOperation);
      
      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable errors', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error('ECONNRESET'))
        .mockRejectedValueOnce(new Error('ETIMEDOUT'))
        .mockResolvedValue('success');
      
      const result = await RetryManager.executeWithRetry(mockOperation);
      
      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });

    it('should not retry on non-retryable errors', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('Validation error'));
      
      await expect(RetryManager.executeWithRetry(mockOperation)).rejects.toThrow('Validation error');
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should respect maxAttempts', async () => {
      const error = new Error('ECONNRESET');
      (error as any).code = 'ECONNRESET';
      const mockOperation = jest.fn().mockRejectedValue(error);
      
      await expect(RetryManager.executeWithRetry(mockOperation, { maxAttempts: 2 }))
        .rejects.toThrow();
      expect(mockOperation).toHaveBeenCalledTimes(2);
    });

    it('should retry on 5xx status codes', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValueOnce({ response: { status: 500 } })
        .mockResolvedValue('success');
      
      const result = await RetryManager.executeWithRetry(mockOperation);
      
      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(2);
    });

    it('should retry on 429 status codes', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValueOnce({ response: { status: 429 } })
        .mockResolvedValue('success');
      
      const result = await RetryManager.executeWithRetry(mockOperation);
      
      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(2);
    });

    it('should not retry on 4xx status codes (except 429)', async () => {
      const error = new Error('Bad Request');
      (error as any).response = { status: 400 };
      const mockOperation = jest.fn().mockRejectedValue(error);
      
      await expect(RetryManager.executeWithRetry(mockOperation)).rejects.toThrow();
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should use custom retry condition', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('Custom error'));
      const customRetryCondition = jest.fn().mockReturnValue(true);
      
      await expect(RetryManager.executeWithRetry(mockOperation, {
        maxAttempts: 2,
        retryCondition: customRetryCondition
      })).rejects.toThrow();
      
      expect(mockOperation).toHaveBeenCalledTimes(2);
      expect(customRetryCondition).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('YOUTUBE_RETRY_CONFIG', () => {
    it('should not retry on private video errors', () => {
      const error = new Error('Video is private');
      const shouldRetry = YOUTUBE_RETRY_CONFIG.retryCondition!(error);
      expect(shouldRetry).toBe(false);
    });

    it('should not retry on video not found errors', () => {
      const error = new Error('Video not found');
      const shouldRetry = YOUTUBE_RETRY_CONFIG.retryCondition!(error);
      expect(shouldRetry).toBe(false);
    });

    it('should retry on network errors', () => {
      const error = { code: 'ECONNRESET' };
      const shouldRetry = YOUTUBE_RETRY_CONFIG.retryCondition!(error);
      expect(shouldRetry).toBe(true);
    });
  });

  describe('TRANSCRIPTION_RETRY_CONFIG', () => {
    it('should not retry on invalid audio errors', () => {
      const error = new Error('Invalid audio format');
      const shouldRetry = TRANSCRIPTION_RETRY_CONFIG.retryCondition!(error);
      expect(shouldRetry).toBe(false);
    });

    it('should not retry on no audio errors', () => {
      const error = new Error('No audio track found');
      const shouldRetry = TRANSCRIPTION_RETRY_CONFIG.retryCondition!(error);
      expect(shouldRetry).toBe(false);
    });

    it('should retry on other errors', () => {
      const error = new Error('Service temporarily unavailable');
      const shouldRetry = TRANSCRIPTION_RETRY_CONFIG.retryCondition!(error);
      expect(shouldRetry).toBe(true);
    });
  });

  describe('TRANSLATION_RETRY_CONFIG', () => {
    it('should not retry on auth errors', () => {
      const error = { response: { status: 401 } };
      const shouldRetry = TRANSLATION_RETRY_CONFIG.retryCondition!(error);
      expect(shouldRetry).toBe(false);
    });

    it('should not retry on validation errors', () => {
      const error = { response: { status: 422 } };
      const shouldRetry = TRANSLATION_RETRY_CONFIG.retryCondition!(error);
      expect(shouldRetry).toBe(false);
    });

    it('should retry on rate limit errors', () => {
      const error = { response: { status: 429 } };
      const shouldRetry = TRANSLATION_RETRY_CONFIG.retryCondition!(error);
      expect(shouldRetry).toBe(true);
    });

    it('should retry on server errors', () => {
      const error = { response: { status: 500 } };
      const shouldRetry = TRANSLATION_RETRY_CONFIG.retryCondition!(error);
      expect(shouldRetry).toBe(true);
    });
  });
});