export interface RetryOptions {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  retryCondition?: (error: any) => boolean;
}

export class RetryManager {
  private static readonly DEFAULT_OPTIONS: RetryOptions = {
    maxAttempts: 3,
    baseDelay: 1000, // 1 second
    maxDelay: 30000, // 30 seconds
    backoffFactor: 2,
    retryCondition: (error: any) => {
      // Default: retry on network errors and 5xx status codes
      if (error.code === 'ECONNRESET' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
        return true;
      }
      if (error.message && (error.message.includes('ECONNRESET') || error.message.includes('ETIMEDOUT') || error.message.includes('ENOTFOUND'))) {
        return true;
      }
      if (error.response && error.response.status >= 500) {
        return true;
      }
      if (error.response && error.response.status === 429) {
        return true; // Rate limiting
      }
      return false;
    }
  };

  static async executeWithRetry<T>(
    operation: () => Promise<T>,
    options: Partial<RetryOptions> = {}
  ): Promise<T> {
    const config = { ...this.DEFAULT_OPTIONS, ...options };
    let lastError: any;

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        // Don't retry if this is the last attempt
        if (attempt === config.maxAttempts) {
          break;
        }

        // Check if we should retry this error
        if (!config.retryCondition!(error)) {
          break;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          config.baseDelay * Math.pow(config.backoffFactor, attempt - 1),
          config.maxDelay
        );

        console.log(`Attempt ${attempt} failed, retrying in ${delay}ms:`, error.message);
        
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Specific retry configurations for different services
export const YOUTUBE_RETRY_CONFIG: Partial<RetryOptions> = {
  maxAttempts: 2,
  baseDelay: 2000,
  retryCondition: (error) => {
    // Retry on network errors but not on video not found or private video errors
    if (error.message && (error.message.includes('private') || error.message.includes('not found'))) {
      return false;
    }
    return error.code === 'ECONNRESET' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT';
  }
};

export const TRANSCRIPTION_RETRY_CONFIG: Partial<RetryOptions> = {
  maxAttempts: 3,
  baseDelay: 1500,
  retryCondition: (error) => {
    // Retry on service errors but not on invalid audio format
    if (error.message && (error.message.includes('Invalid audio') || error.message.includes('No audio'))) {
      return false;
    }
    return true;
  }
};

export const TRANSLATION_RETRY_CONFIG: Partial<RetryOptions> = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  retryCondition: (error) => {
    // Retry on rate limits and server errors, but not on auth or validation errors
    if (error.response) {
      const status = error.response.status;
      if (status === 401 || status === 403) return false; // Auth errors
      if (status === 400 || status === 422) return false; // Validation errors
      if (status === 429 || status >= 500) return true; // Rate limits and server errors
    }
    return error.code === 'ECONNRESET' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT';
  }
};

export default RetryManager;