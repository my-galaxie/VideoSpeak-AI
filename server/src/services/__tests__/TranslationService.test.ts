import axios from 'axios';
import { TranslationService } from '../TranslationService';
import { SUPPORTED_LANGUAGES } from '../../types';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('TranslationService', () => {
  let translationService: TranslationService;
  const mockApiKey = 'test-api-key';

  beforeEach(() => {
    translationService = new TranslationService(mockApiKey);
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should throw error if API key is not provided', () => {
      expect(() => new TranslationService('')).toThrow('Sarvam API key is required');
    });

    it('should create instance with valid API key', () => {
      expect(translationService).toBeInstanceOf(TranslationService);
    });
  });

  describe('validateApiKey', () => {
    it('should return true for valid API key', async () => {
      mockedAxios.post.mockResolvedValue({ status: 200, data: {} });

      const result = await translationService.validateApiKey();

      expect(result).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://api.sarvam.ai/translate',
        {
          input: 'test',
          source_language_code: 'en-IN',
          target_language_code: 'hi-IN'
        },
        expect.objectContaining({
          headers: {
            'api-subscription-key': mockApiKey,
            'Content-Type': 'application/json'
          }
        })
      );
    });

    it('should return false for invalid API key', async () => {
      mockedAxios.post.mockRejectedValue(new Error('Unauthorized'));

      const result = await translationService.validateApiKey();

      expect(result).toBe(false);
    });
  });

  describe('translateText', () => {
    const mockSarvamResponse = {
      request_id: 'test-request-id',
      translated_text: 'नमस्ते दुनिया',
      source_language_code: 'en-IN'
    };

    beforeEach(() => {
      mockedAxios.post.mockResolvedValue({
        status: 200,
        data: mockSarvamResponse
      });
    });

    it('should translate text successfully', async () => {
      const result = await translationService.translateText('Hello world', 'hi-IN', 'en-IN');

      expect(result).toMatchObject({
        translatedText: 'नमस्ते दुनिया',
        sourceLanguageCode: 'en-IN',
        targetLanguageCode: 'hi-IN',
        requestId: 'test-request-id'
      });
      expect(result.translationAccuracy).toBeGreaterThan(0);
      expect(result.confidenceScore).toBeGreaterThan(0);
      expect(result.qualityMetrics).toHaveProperty('fluency');
      expect(result.qualityMetrics).toHaveProperty('adequacy');
      expect(result.qualityMetrics).toHaveProperty('semanticSimilarity');
      expect(result.qualityMetrics).toHaveProperty('grammarScore');
    });

    it('should throw error for empty text', async () => {
      await expect(translationService.translateText('', 'hi-IN')).rejects.toThrow(
        'Input text cannot be empty'
      );
    });

    it('should throw error for text exceeding maximum length', async () => {
      const longText = 'a'.repeat(2001);
      await expect(translationService.translateText(longText, 'hi-IN')).rejects.toThrow(
        'Input text exceeds maximum length of 2000 characters'
      );
    });

    it('should throw error for unsupported target language', async () => {
      await expect(translationService.translateText('Hello', 'unsupported-lang')).rejects.toThrow(
        'Unsupported target language: unsupported-lang'
      );
    });

    it('should retry on API failure', async () => {
      mockedAxios.post
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          status: 200,
          data: mockSarvamResponse
        });

      const result = await translationService.translateText('Hello world', 'hi-IN', 'en-IN');

      expect(result.translatedText).toBe('नमस्ते दुनिया');
      expect(mockedAxios.post).toHaveBeenCalledTimes(3);
    });

    it('should fail after maximum retries', async () => {
      mockedAxios.post.mockRejectedValue(new Error('Persistent error'));

      await expect(translationService.translateText('Hello world', 'hi-IN')).rejects.toThrow(
        'Translation failed after 3 attempts'
      );
      expect(mockedAxios.post).toHaveBeenCalledTimes(3);
    });
  });

  describe('getSupportedLanguages', () => {
    it('should return list of supported languages', () => {
      const languages = translationService.getSupportedLanguages();

      expect(languages).toEqual(SUPPORTED_LANGUAGES.filter(lang => lang.isSupported));
      expect(languages.length).toBeGreaterThan(0);
      expect(languages.every(lang => lang.isSupported)).toBe(true);
    });
  });

  describe('isLowAccuracy', () => {
    it('should return true for accuracy below 70%', () => {
      const lowAccuracyResult = {
        translationAccuracy: 65,
        translatedText: 'test',
        sourceLanguageCode: 'en-IN',
        targetLanguageCode: 'hi-IN',
        requestId: 'test',
        confidenceScore: 65,
        qualityMetrics: {
          fluency: 65,
          adequacy: 65,
          semanticSimilarity: 65,
          grammarScore: 65,
          overallAccuracy: 65,
          confidenceScore: 65
        }
      };

      expect(translationService.isLowAccuracy(lowAccuracyResult)).toBe(true);
    });

    it('should return false for accuracy 70% or above', () => {
      const highAccuracyResult = {
        translationAccuracy: 85,
        translatedText: 'test',
        sourceLanguageCode: 'en-IN',
        targetLanguageCode: 'hi-IN',
        requestId: 'test',
        confidenceScore: 85,
        qualityMetrics: {
          fluency: 85,
          adequacy: 85,
          semanticSimilarity: 85,
          grammarScore: 85,
          overallAccuracy: 85,
          confidenceScore: 85
        }
      };

      expect(translationService.isLowAccuracy(highAccuracyResult)).toBe(false);
    });
  });

  describe('getLowAccuracyWarning', () => {
    it('should return appropriate warning message', () => {
      const lowAccuracyResult = {
        translationAccuracy: 65.7,
        translatedText: 'test',
        sourceLanguageCode: 'en-IN',
        targetLanguageCode: 'hi-IN',
        requestId: 'test',
        confidenceScore: 65,
        qualityMetrics: {
          fluency: 65,
          adequacy: 65,
          semanticSimilarity: 65,
          grammarScore: 65,
          overallAccuracy: 65,
          confidenceScore: 65
        }
      };

      const warning = translationService.getLowAccuracyWarning(lowAccuracyResult);

      expect(warning).toContain('66%'); // Rounded accuracy
      expect(warning).toContain('Consider checking the source audio quality');
    });
  });
});