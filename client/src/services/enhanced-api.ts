import axios, { AxiosInstance, AxiosError } from 'axios';
import { 
  ProcessVideoRequest, 
  ProcessVideoResponse, 
  JobStatusResponse, 
  Language,
  ErrorResponse,
  TranslationMethod
} from '../types';

export interface EnhancedProcessVideoRequest extends ProcessVideoRequest {
  translationMethod?: TranslationMethod;
}

export interface TranslationMethodInfo {
  id: TranslationMethod;
  name: string;
  description: string;
  providers?: string[];
}

export class EnhancedApiClient {
  private client: AxiosInstance;
  private baseURL: string;

  constructor(baseURL: string = process.env.REACT_APP_API_URL || 'http://localhost:3001') {
    this.baseURL = baseURL;
    console.log('API URL:', baseURL); // Debug log
    this.client = axios.create({
      baseURL: `${baseURL}/api`,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      },
      withCredentials: false // Disable credentials for CORS
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        config.headers['x-request-id'] = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        const errorResponse = this.handleApiError(error);
        return Promise.reject(errorResponse);
      }
    );
  }

  private handleApiError(error: AxiosError): Error {
    if (error.response?.data) {
      const errorData = error.response.data as ErrorResponse;
      const customError = new Error(errorData.error.message);
      (customError as any).code = errorData.error.code;
      (customError as any).retryable = errorData.error.retryable;
      (customError as any).statusCode = error.response.status;
      return customError;
    }

    if (error.code === 'ECONNABORTED') {
      return new Error('Request timed out. Please try again.');
    }

    if (error.message === 'Network Error') {
      return new Error('Network error. Please check your internet connection.');
    }

    return new Error(error.message || 'An unexpected error occurred');
  }

  async processVideo(request: EnhancedProcessVideoRequest): Promise<ProcessVideoResponse> {
    try {
      const response = await this.client.post<ProcessVideoResponse>('/process-video', request);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async getJobStatus(jobId: string): Promise<JobStatusResponse> {
    try {
      const response = await this.client.get<JobStatusResponse>(`/job-status/${jobId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async getSupportedLanguages(): Promise<{ languages: Language[]; total: number; defaultLanguage: string }> {
    try {
      const response = await this.client.get('/languages');
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async getTranslationMethods(): Promise<{ methods: TranslationMethodInfo[]; defaultMethod: TranslationMethod }> {
    try {
      const response = await this.client.get('/translation-methods');
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async cancelJob(jobId: string): Promise<{ message: string; jobId: string }> {
    try {
      const response = await this.client.delete(`/job/${jobId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async getHealthStatus(): Promise<any> {
    try {
      const response = await this.client.get('/health');
      return response.data;
    } catch (error) {
      throw error;
    }
  }
}

// Create singleton instance
export const enhancedApiClient = new EnhancedApiClient();

// Polling utility for job status
export class JobStatusPoller {
  private intervalId: NodeJS.Timeout | null = null;
  private isPolling = false;

  startPolling(
    jobId: string, 
    onUpdate: (status: JobStatusResponse) => void,
    onError: (error: Error) => void,
    interval: number = 2000
  ): void {
    if (this.isPolling) {
      this.stopPolling();
    }

    this.isPolling = true;
    
    const poll = async () => {
      try {
        const status = await enhancedApiClient.getJobStatus(jobId);
        onUpdate(status);
        
        // Stop polling if job is completed or failed
        if (status.status === 'completed' || status.status === 'failed') {
          this.stopPolling();
        }
      } catch (error) {
        onError(error as Error);
        this.stopPolling();
      }
    };

    // Initial poll
    poll();
    
    // Set up interval
    this.intervalId = setInterval(poll, interval);
  }

  stopPolling(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isPolling = false;
  }

  getIsPolling(): boolean {
    return this.isPolling;
  }
}

export default enhancedApiClient;