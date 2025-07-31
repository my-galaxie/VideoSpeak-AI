import { Request, Response } from 'express';
import { 
  errorHandler, 
  VideoSpeakError, 
  ValidationError, 
  YouTubeError, 
  TranscriptionError, 
  TranslationError, 
  RateLimitError, 
  ApiKeyError 
} from '../errorHandler';

describe('Error Handler Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockRequest = {
      url: '/api/test',
      method: 'POST',
      headers: {}
    };
    
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis()
    };
    
    mockNext = jest.fn();
    
    // Mock console.error to avoid noise in tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('VideoSpeakError', () => {
    it('should create error with default values', () => {
      const error = new VideoSpeakError('Test error');
      
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('INTERNAL_ERROR');
      expect(error.retryable).toBe(false);
    });

    it('should create error with custom values', () => {
      const error = new VideoSpeakError('Custom error', 400, 'CUSTOM_ERROR', true, { detail: 'test' });
      
      expect(error.message).toBe('Custom error');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('CUSTOM_ERROR');
      expect(error.retryable).toBe(true);
      expect(error.details).toEqual({ detail: 'test' });
    });
  });

  describe('Specific Error Classes', () => {
    it('should create ValidationError correctly', () => {
      const error = new ValidationError('Invalid input', { field: 'url' });
      
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.retryable).toBe(false);
      expect(error.details).toEqual({ field: 'url' });
    });

    it('should create YouTubeError correctly', () => {
      const error = new YouTubeError('Video not found', true);
      
      expect(error.statusCode).toBe(422);
      expect(error.code).toBe('YOUTUBE_ERROR');
      expect(error.retryable).toBe(true);
    });

    it('should create TranscriptionError correctly', () => {
      const error = new TranscriptionError('Transcription failed');
      
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('TRANSCRIPTION_ERROR');
      expect(error.retryable).toBe(true);
    });

    it('should create TranslationError correctly', () => {
      const error = new TranslationError('Translation failed');
      
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('TRANSLATION_ERROR');
      expect(error.retryable).toBe(true);
    });

    it('should create RateLimitError correctly', () => {
      const error = new RateLimitError('Rate limit exceeded', 60);
      
      expect(error.statusCode).toBe(429);
      expect(error.code).toBe('RATE_LIMIT_ERROR');
      expect(error.retryable).toBe(true);
      expect(error.details).toEqual({ retryAfter: 60 });
    });

    it('should create ApiKeyError correctly', () => {
      const error = new ApiKeyError();
      
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('API_KEY_ERROR');
      expect(error.retryable).toBe(false);
    });
  });

  describe('errorHandler middleware', () => {
    it('should handle ValidationError', () => {
      const error = new ValidationError('Invalid URL format');
      
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid URL format',
          details: undefined,
          retryable: false
        },
        timestamp: expect.any(String),
        requestId: expect.any(String)
      });
    });

    it('should handle YouTubeError with user-friendly message', () => {
      const error = new YouTubeError('Video is private and cannot be accessed');
      
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockResponse.status).toHaveBeenCalledWith(422);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'YOUTUBE_ERROR',
          message: 'This video is private and cannot be processed. Please use a public video.',
          details: undefined,
          retryable: false
        },
        timestamp: expect.any(String),
        requestId: expect.any(String)
      });
    });

    it('should handle TranscriptionError', () => {
      const error = new TranscriptionError('Failed to transcribe audio');
      
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'TRANSCRIPTION_ERROR',
          message: 'Failed to transcribe the video audio. This might be due to poor audio quality or unsupported audio format.',
          details: undefined,
          retryable: true
        },
        timestamp: expect.any(String),
        requestId: expect.any(String)
      });
    });

    it('should handle TranslationError with rate limit message', () => {
      const error = new TranslationError('Rate limit exceeded for translation service');
      
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'TRANSLATION_ERROR',
          message: 'Failed to translate the text. Please try again or check your internet connection.',
          details: undefined,
          retryable: true
        },
        timestamp: expect.any(String),
        requestId: expect.any(String)
      });
    });

    it('should handle RateLimitError with retry-after header', () => {
      const error = new RateLimitError('Too many requests', 120);
      
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockResponse.set).toHaveBeenCalledWith('Retry-After', '120');
      expect(mockResponse.status).toHaveBeenCalledWith(429);
    });

    it('should handle ApiKeyError', () => {
      const error = new ApiKeyError('Invalid API key provided');
      
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'API_KEY_ERROR',
          message: 'Service configuration error. Please contact support.',
          details: undefined,
          retryable: false
        },
        timestamp: expect.any(String),
        requestId: expect.any(String)
      });
    });

    it('should handle generic errors', () => {
      const error = new Error('Unexpected error') as any;
      error.statusCode = 500;
      error.code = 'UNKNOWN_ERROR';
      
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'UNKNOWN_ERROR',
          message: 'An unexpected error occurred. Please try again later.',
          details: undefined,
          retryable: false
        },
        timestamp: expect.any(String),
        requestId: expect.any(String)
      });
    });

    it('should use request ID from headers if available', () => {
      mockRequest.headers = { 'x-request-id': 'custom-request-id' };
      const error = new ValidationError('Test error');
      
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Test error',
          details: undefined,
          retryable: false
        },
        timestamp: expect.any(String),
        requestId: 'custom-request-id'
      });
    });

    it('should log error details', () => {
      const error = new ValidationError('Test error');
      
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Error:'),
        expect.objectContaining({
          message: 'Test error',
          code: 'VALIDATION_ERROR',
          statusCode: 400,
          url: '/api/test',
          method: 'POST'
        })
      );
    });
  });
});