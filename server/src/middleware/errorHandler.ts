import { Request, Response, NextFunction } from 'express';
import { ErrorResponse } from '../types';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  retryable?: boolean;
  details?: any;
}

export class VideoSpeakError extends Error implements AppError {
  statusCode: number;
  code: string;
  retryable: boolean;
  details?: any;

  constructor(message: string, statusCode: number = 500, code: string = 'INTERNAL_ERROR', retryable: boolean = false, details?: any) {
    super(message);
    this.name = 'VideoSpeakError';
    this.statusCode = statusCode;
    this.code = code;
    this.retryable = retryable;
    this.details = details;
  }
}

// Specific error classes
export class ValidationError extends VideoSpeakError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', false, details);
  }
}

export class YouTubeError extends VideoSpeakError {
  constructor(message: string, retryable: boolean = false, details?: any) {
    super(message, 422, 'YOUTUBE_ERROR', retryable, details);
  }
}

export class TranscriptionError extends VideoSpeakError {
  constructor(message: string, retryable: boolean = true, details?: any) {
    super(message, 500, 'TRANSCRIPTION_ERROR', retryable, details);
  }
}

export class TranslationError extends VideoSpeakError {
  constructor(message: string, retryable: boolean = true, details?: any) {
    super(message, 500, 'TRANSLATION_ERROR', retryable, details);
  }
}

export class RateLimitError extends VideoSpeakError {
  constructor(message: string = 'Rate limit exceeded', retryAfter?: number) {
    super(message, 429, 'RATE_LIMIT_ERROR', true, { retryAfter });
  }
}

export class ApiKeyError extends VideoSpeakError {
  constructor(message: string = 'Invalid or missing API key') {
    super(message, 401, 'API_KEY_ERROR', false);
  }
}

// Error handler middleware
export function errorHandler(error: AppError, req: Request, res: Response, next: NextFunction): void {
  const requestId = req.headers['x-request-id'] as string || generateRequestId();
  
  // Log error for debugging
  console.error(`[${requestId}] Error:`, {
    message: error.message,
    code: error.code,
    statusCode: error.statusCode,
    stack: error.stack,
    url: req.url,
    method: req.method
  });

  const errorResponse: ErrorResponse = {
    error: {
      code: error.code || 'INTERNAL_ERROR',
      message: getUserFriendlyMessage(error),
      details: error.details,
      retryable: error.retryable || false
    },
    timestamp: new Date().toISOString(),
    requestId
  };

  // Set retry-after header for rate limit errors
  if (error instanceof RateLimitError && error.details?.retryAfter) {
    res.set('Retry-After', error.details.retryAfter.toString());
  }

  res.status(error.statusCode || 500).json(errorResponse);
}

// Convert technical errors to user-friendly messages
function getUserFriendlyMessage(error: AppError): string {
  switch (error.code) {
    case 'VALIDATION_ERROR':
      return error.message;
    case 'YOUTUBE_ERROR':
      if (error.message.includes('private')) {
        return 'This video is private and cannot be processed. Please use a public video.';
      }
      if (error.message.includes('not found')) {
        return 'Video not found. Please check the YouTube URL and try again.';
      }
      return 'Unable to process this YouTube video. Please try a different video.';
    case 'TRANSCRIPTION_ERROR':
      return 'Failed to transcribe the video audio. This might be due to poor audio quality or unsupported audio format.';
    case 'TRANSLATION_ERROR':
      if (error.message.includes('rate limit')) {
        return 'Translation service is temporarily busy. Please try again in a few minutes.';
      }
      return 'Failed to translate the text. Please try again or check your internet connection.';
    case 'RATE_LIMIT_ERROR':
      return 'Too many requests. Please wait a moment before trying again.';
    case 'API_KEY_ERROR':
      return 'Service configuration error. Please contact support.';
    default:
      return 'An unexpected error occurred. Please try again later.';
  }
}

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Async error wrapper
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export default errorHandler;