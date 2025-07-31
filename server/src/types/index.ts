// Core data models and interfaces for VideoSpeak system

export enum AudioQuality {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high'
}

// Translation method enum
export enum TranslationMethod {
  SARVAM = 'sarvam',
  LLM = 'llm'
}

export interface VideoMetadata {
  id: string;
  title: string;
  duration: number;
  language?: string;
  hasAudio: boolean;
  isShortVideo: boolean; // Videos under 5 minutes
  audioQuality: AudioQuality;
}

export interface TranscriptionSegment {
  text: string;
  startTime: number;
  endTime: number;
  confidence: number;
}

export interface TranscriptionResult {
  text: string;
  confidence: number;
  detectedLanguage: string;
  segments: TranscriptionSegment[];
  overallAccuracy: number;
  qualityScore: number;
}

export interface TranslationQualityMetrics {
  fluency: number;
  adequacy: number;
  semanticSimilarity: number;
  grammarScore: number;
  overallAccuracy: number;
  confidenceScore: number;
}

export interface LLMTranslationMetadata {
  provider: string;
  model: string;
  tokenUsage?: {
    prompt?: number;
    completion?: number;
    total?: number;
  };
  processingTime?: number;
}

export interface TranslationResult {
  translatedText: string;
  sourceLanguageCode: string;
  targetLanguageCode: string;
  requestId: string;
  translationAccuracy: number;
  confidenceScore: number;
  qualityMetrics: TranslationQualityMetrics;
  translationMethod?: TranslationMethod;
  llmMetadata?: LLMTranslationMetadata;
}

export interface Language {
  code: string;
  name: string;
  nativeName: string;
  isSupported: boolean;
}

export enum JobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export enum ProcessingStage {
  VALIDATING_URL = 'validating_url',
  EXTRACTING_AUDIO = 'extracting_audio',
  TRANSCRIBING = 'transcribing',
  TRANSLATING = 'translating',
  COMPLETED = 'completed'
}

export interface ProcessingResults {
  originalText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  videoMetadata: VideoMetadata;
  transcriptionResult: TranscriptionResult;
  translationResult: TranslationResult;
}

export interface ProcessingJob {
  id: string;
  videoUrl: string;
  targetLanguage: string;
  status: JobStatus;
  progress: number;
  currentStage: ProcessingStage;
  results?: ProcessingResults;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

// API Request/Response Models
export interface ProcessVideoRequest {
  youtubeUrl: string;
  targetLanguage: string;
  sourceLanguage?: string;
}

export interface ProcessVideoResponse {
  jobId: string;
  status: JobStatus;
  message: string;
}

export interface JobStatusResponse {
  jobId: string;
  status: JobStatus;
  progress: number;
  currentStage: ProcessingStage;
  results?: ProcessingResults;
  error?: string;
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
    retryable: boolean;
  };
  timestamp: string;
  requestId: string;
}

// Supported Indian Languages Configuration
export const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'hi-IN', name: 'Hindi', nativeName: 'हिन्दी', isSupported: true },
  { code: 'kn-IN', name: 'Kannada', nativeName: 'ಕನ್ನಡ', isSupported: true },
  { code: 'te-IN', name: 'Telugu', nativeName: 'తెలుగు', isSupported: true },
  { code: 'bn-IN', name: 'Bengali', nativeName: 'বাংলা', isSupported: true },
  { code: 'gu-IN', name: 'Gujarati', nativeName: 'ગુજરાતી', isSupported: true },
  { code: 'ml-IN', name: 'Malayalam', nativeName: 'മലയാളം', isSupported: true },
  { code: 'mr-IN', name: 'Marathi', nativeName: 'मराठी', isSupported: true },
  { code: 'od-IN', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', isSupported: true },
  { code: 'pa-IN', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', isSupported: true },
  { code: 'ta-IN', name: 'Tamil', nativeName: 'தமிழ்', isSupported: true },
  { code: 'as-IN', name: 'Assamese', nativeName: 'অসমীয়া', isSupported: true },
  { code: 'brx-IN', name: 'Bodo', nativeName: 'बर\'', isSupported: true },
  { code: 'doi-IN', name: 'Dogri', nativeName: 'डोगरी', isSupported: true },
  { code: 'kok-IN', name: 'Konkani', nativeName: 'कोंकणी', isSupported: true },
  { code: 'ks-IN', name: 'Kashmiri', nativeName: 'کٲشُر', isSupported: true },
  { code: 'mai-IN', name: 'Maithili', nativeName: 'मैथिली', isSupported: true },
  { code: 'mni-IN', name: 'Manipuri', nativeName: 'ꯃꯤꯇꯩ ꯂꯣꯟ', isSupported: true },
  { code: 'ne-IN', name: 'Nepali', nativeName: 'नेपाली', isSupported: true },
  { code: 'sa-IN', name: 'Sanskrit', nativeName: 'संस्कृतम्', isSupported: true },
  { code: 'sat-IN', name: 'Santali', nativeName: 'ᱥᱟᱱᱛᱟᱲᱤ', isSupported: true },
  { code: 'sd-IN', name: 'Sindhi', nativeName: 'سنڌي', isSupported: true },
  { code: 'ur-IN', name: 'Urdu', nativeName: 'اردو', isSupported: true },
  { code: 'en-IN', name: 'English', nativeName: 'English', isSupported: true }
];