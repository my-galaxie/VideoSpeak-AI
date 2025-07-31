import axios, { AxiosResponse } from 'axios';
import { 
  TranslationResult, 
  TranslationQualityMetrics, 
  Language, 
  SUPPORTED_LANGUAGES,
  TranslationMethod
} from '../types';

interface SarvamTranslateRequest {
  input: string;
  source_language_code: string;
  target_language_code: string;
  speaker_gender?: 'Male' | 'Female';
  mode?: 'formal' | 'modern-colloquial' | 'classic-colloquial' | 'code-mixed';
  model?: 'mayura:v1' | 'sarvam-translate:v1';
  enable_preprocessing?: boolean;
  output_script?: 'roman' | 'fully-native' | 'spoken-form-in-native';
  numerals_format?: 'international' | 'native';
}

interface SarvamTranslateResponse {
  request_id: string;
  translated_text: string;
  source_language_code: string;
}

export class TranslationService {
  private readonly sarvamApiKey: string;
  private readonly sarvamBaseUrl = 'https://api.sarvam.ai';
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000;

  constructor(sarvamApiKey: string) {
    if (!sarvamApiKey || sarvamApiKey.trim() === '') {
      throw new Error('Sarvam API key is required');
    }
    this.sarvamApiKey = sarvamApiKey;
  }

  /**
   * Validates the Sarvam API key by making a test request
   */
  async validateApiKey(): Promise<boolean> {
    // In demo mode, always return true to avoid API key validation issues
    if (this.sarvamApiKey === 'demo-key') {
      return true;
    }
    
    try {
      const response = await axios.post(
        `${this.sarvamBaseUrl}/translate`,
        {
          input: 'test',
          source_language_code: 'en-IN',
          target_language_code: 'hi-IN'
        },
        {
          headers: {
            'api-subscription-key': this.sarvamApiKey,
            'Content-Type': 'application/json'
          },
          timeout: 5000
        }
      );
      return response.status === 200;
    } catch (error: any) {
      console.error('Sarvam API key validation failed:', error);
      return false;
    }
  }

  /**
   * Translates text using Sarvam API
   */
  async translateText(
    text: string,
    targetLanguage: string,
    sourceLanguage: string = 'auto'
  ): Promise<TranslationResult> {
    if (!text || text.trim().length === 0) {
      throw new Error('Input text cannot be empty');
    }

    if (text.length > 2000) {
      throw new Error('Input text exceeds maximum length of 2000 characters for Sarvam API');
    }

    const targetLang = this.validateLanguageCode(targetLanguage);
    if (!targetLang) {
      throw new Error(`Unsupported target language: ${targetLanguage}`);
    }

    const request: SarvamTranslateRequest = {
      input: text.trim(),
      source_language_code: sourceLanguage,
      target_language_code: targetLanguage,
      model: 'sarvam-translate:v1',
      mode: 'formal',
      enable_preprocessing: true,
      numerals_format: 'international'
    };

    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await this.makeTranslationRequest(request);
        const qualityMetrics = await this.calculateQualityMetrics(
          text,
          response.translated_text,
          sourceLanguage,
          targetLanguage
        );

        return {
          translatedText: response.translated_text,
          sourceLanguageCode: response.source_language_code,
          targetLanguageCode: targetLanguage,
          requestId: response.request_id,
          translationAccuracy: qualityMetrics.overallAccuracy,
          confidenceScore: qualityMetrics.confidenceScore,
          qualityMetrics: qualityMetrics,
          translationMethod: TranslationMethod.SARVAM
        };
      } catch (error: any) {
        lastError = error as Error;
        console.error(`Sarvam translation attempt ${attempt} failed:`, error);
        
        if (attempt < this.maxRetries) {
          await this.delay(this.retryDelay * attempt);
        }
      }
    }

    throw new Error(`Translation failed after ${this.maxRetries} attempts`);
  }

  /**
   * Gets list of supported languages
   */
  getSupportedLanguages(): Language[] {
    return SUPPORTED_LANGUAGES.filter(lang => lang.isSupported);
  }

  /**
   * Detects if translation accuracy is below threshold
   */
  isLowAccuracy(translationResult: TranslationResult): boolean {
    return translationResult.translationAccuracy < 70;
  }

  /**
   * Gets warning message for low accuracy translations
   */
  getLowAccuracyWarning(translationResult: TranslationResult): string {
    const accuracy = Math.round(translationResult.translationAccuracy);
    const method = translationResult.translationMethod === TranslationMethod.LLM ? 'LLM' : 'Sarvam API';
    
    return `Translation accuracy is ${accuracy}% using ${method}. Consider checking the source audio quality or trying a different translation method.`;
  }

  private async makeTranslationRequest(request: SarvamTranslateRequest): Promise<SarvamTranslateResponse> {
    // In demo mode, return mock translation
    if (this.sarvamApiKey === 'demo-key') {
      return {
        request_id: `demo_${Date.now()}`,
        translated_text: this.getMockTranslation(request.input, request.target_language_code),
        source_language_code: request.source_language_code
      };
    }

    const response: AxiosResponse<SarvamTranslateResponse> = await axios.post(
      `${this.sarvamBaseUrl}/translate`,
      request,
      {
        headers: {
          'api-subscription-key': this.sarvamApiKey,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    if (response.status !== 200) {
      throw new Error(`Sarvam API returned status ${response.status}`);
    }

    return response.data;
  }

  private validateLanguageCode(languageCode: string): Language | null {
    return SUPPORTED_LANGUAGES.find(lang => 
      lang.code === languageCode && lang.isSupported
    ) || null;
  }

  private async calculateQualityMetrics(
    sourceText: string,
    translatedText: string,
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<TranslationQualityMetrics> {
    // Basic quality metrics calculation
    // In a production system, these would use more sophisticated NLP models
    
    const fluency = this.calculateFluency(translatedText);
    const adequacy = this.calculateAdequacy(sourceText, translatedText);
    const semanticSimilarity = this.calculateSemanticSimilarity(sourceText, translatedText);
    const grammarScore = this.calculateGrammarScore(translatedText);
    
    const overallAccuracy = (fluency + adequacy + semanticSimilarity + grammarScore) / 4;
    const confidenceScore = Math.min(overallAccuracy + 10, 100); // Slight boost for confidence
    
    return {
      overallAccuracy: Math.round(overallAccuracy * 100) / 100,
      confidenceScore: Math.round(confidenceScore * 100) / 100,
      fluency: Math.round(fluency * 100) / 100,
      adequacy: Math.round(adequacy * 100) / 100,
      semanticSimilarity: Math.round(semanticSimilarity * 100) / 100,
      grammarScore: Math.round(grammarScore * 100) / 100
    };
  }

  private calculateFluency(text: string): number {
    // Basic fluency calculation based on text characteristics
    if (!text || text.trim().length === 0) return 0;
    
    const words = text.trim().split(/\s+/);
    const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;
    
    // Basic heuristics for fluency
    let score = 80; // Base score
    
    // Penalize very short or very long average word lengths
    if (avgWordLength < 3 || avgWordLength > 12) score -= 10;
    
    // Penalize excessive punctuation
    const punctuationRatio = (text.match(/[.,!?;:]/g) || []).length / words.length;
    if (punctuationRatio > 0.3) score -= 15;
    
    // Bonus for reasonable sentence structure
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length > 0) {
      const avgSentenceLength = words.length / sentences.length;
      if (avgSentenceLength >= 5 && avgSentenceLength <= 20) score += 10;
    }
    
    return Math.max(0, Math.min(100, score));
  }

  private calculateAdequacy(sourceText: string, translatedText: string): number {
    // Basic adequacy calculation based on length and content preservation
    if (!sourceText || !translatedText) return 0;
    
    const sourceWords = sourceText.trim().split(/\s+/);
    const translatedWords = translatedText.trim().split(/\s+/);
    
    // Length ratio scoring
    const lengthRatio = translatedWords.length / sourceWords.length;
    let score = 75; // Base score
    
    // Ideal ratio is between 0.7 and 1.5
    if (lengthRatio >= 0.7 && lengthRatio <= 1.5) {
      score += 15;
    } else if (lengthRatio < 0.5 || lengthRatio > 2.0) {
      score -= 20;
    }
    
    // Check for complete translation (not empty or too short)
    if (translatedWords.length < sourceWords.length * 0.3) {
      score -= 30;
    }
    
    return Math.max(0, Math.min(100, score));
  }

  private calculateSemanticSimilarity(sourceText: string, translatedText: string): number {
    // Basic semantic similarity using simple heuristics
    // In production, this would use embeddings or more sophisticated NLP
    
    if (!sourceText || !translatedText) return 0;
    
    const sourceWords = sourceText.toLowerCase().split(/\s+/);
    const translatedWords = translatedText.toLowerCase().split(/\s+/);
    
    // Basic word overlap (for cognates and borrowed words)
    const commonWords = sourceWords.filter(word => 
      translatedWords.some(tWord => 
        word.length > 3 && (word.includes(tWord) || tWord.includes(word))
      )
    );
    
    const overlapRatio = commonWords.length / Math.max(sourceWords.length, translatedWords.length);
    
    // Base score with overlap bonus
    let score = 75 + (overlapRatio * 20);
    
    // Penalize if translation is identical (likely untranslated)
    if (sourceText.toLowerCase() === translatedText.toLowerCase()) {
      score = 30;
    }
    
    return Math.max(0, Math.min(100, score));
  }

  private calculateGrammarScore(text: string): number {
    // Basic grammar scoring using simple heuristics
    if (!text || text.trim().length === 0) return 0;
    
    let score = 80; // Base score
    
    // Check for basic sentence structure
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length === 0) {
      score -= 30;
    } else {
      // Check each sentence starts with capital letter
      const properCapitalization = sentences.filter(s => 
        /^[A-ZÀ-ÿ\u0900-\u097F\u0980-\u09FF\u0A00-\u0A7F\u0A80-\u0AFF\u0B00-\u0B7F\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0D80-\u0DFF]/.test(s.trim())
      ).length;
      
      if (properCapitalization / sentences.length > 0.7) {
        score += 10;
      }
    }
    
    // Penalize excessive repetition
    const words = text.split(/\s+/);
    const uniqueWords = new Set(words.map(w => w.toLowerCase()));
    const repetitionRatio = 1 - (uniqueWords.size / words.length);
    if (repetitionRatio > 0.5) {
      score -= 20;
    }
    
    return Math.max(0, Math.min(100, score));
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private getMockTranslation(text: string, targetLanguage: string): string {
    // Simple mock translations for demo purposes
    const mockTranslations: { [key: string]: { [key: string]: string } } = {
      'hi-IN': {
        'This is a sample transcription of the audio content': 'यह ऑडियो सामग्री का एक नमूना प्रतिलेखन है',
        'Hello world': 'नमस्ते दुनिया',
        'Welcome to VideoSpeak': 'VideoSpeak में आपका स्वागत है'
      },
      'kn-IN': {
        'This is a sample transcription of the audio content': 'ಇದು ಆಡಿಯೋ ವಿಷಯದ ಮಾದರಿ ಪ್ರತಿಲೇಖನವಾಗಿದೆ',
        'Hello world': 'ಹಲೋ ವರ್ಲ್ಡ್',
        'Welcome to VideoSpeak': 'VideoSpeak ಗೆ ಸ್ವಾಗತ'
      },
      'ta-IN': {
        'This is a sample transcription of the audio content': 'இது ஆடியோ உள்ளடக்கத்தின் மாதிரி படியெடுப்பு ஆகும்',
        'Hello world': 'வணக்கம் உலகம்',
        'Welcome to VideoSpeak': 'VideoSpeak க்கு வரவேற்கிறோம்'
      }
    };

    const languageTranslations = mockTranslations[targetLanguage];
    if (languageTranslations && languageTranslations[text]) {
      return languageTranslations[text];
    }

    // Fallback: return text with language indicator
    return `[${targetLanguage}] ${text}`;
  }
}