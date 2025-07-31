import axios from 'axios';
import { Language, SUPPORTED_LANGUAGES } from '../../types';
import { BaseLLMProvider, LLMTranslationOptions, LLMTranslationResponse } from './ILLMProvider';

interface HuggingFaceRequest {
  inputs: string;
  parameters?: {
    max_length?: number;
    temperature?: number;
  };
  options?: {
    wait_for_model?: boolean;
    use_cache?: boolean;
  };
}

/**
 * Provider for Hugging Face Inference API
 * This provider uses free translation models from Hugging Face
 */
export class HuggingFaceProvider extends BaseLLMProvider {
  private readonly baseUrl: string;
  private readonly defaultModel: string;
  private readonly supportedModels: string[];
  
  constructor(
    apiKey: string,
    baseUrl: string = 'https://api-inference.huggingface.co/models',
    defaultModel: string = 'facebook/mbart-large-50-many-to-many-mmt'
  ) {
    super(apiKey);
    this.baseUrl = baseUrl;
    this.defaultModel = defaultModel;
    this.supportedModels = [
      'facebook/mbart-large-50-many-to-many-mmt',
      'Helsinki-NLP/opus-mt-en-ROMANCE',
      'Helsinki-NLP/opus-mt-en-mul',
      't5-base'
    ];
  }
  
  /**
   * Translates text using Hugging Face Inference API
   */
  async translateText(
    text: string,
    targetLanguage: string,
    sourceLanguage: string = 'English',
    options?: LLMTranslationOptions
  ): Promise<LLMTranslationResponse> {
    if (!text || text.trim().length === 0) {
      throw new Error('Input text cannot be empty');
    }
    
    const model = options?.model || this.defaultModel;
    
    // Format the input based on the model
    let formattedInput = text;
    if (model.includes('mbart')) {
      // mBART requires special formatting
      const targetLangCode = this.getLanguageCode(targetLanguage);
      formattedInput = `>>${targetLangCode}<< ${text}`;
    } else if (model.includes('t5')) {
      // T5 requires a "translate" prefix
      formattedInput = `translate ${sourceLanguage} to ${targetLanguage}: ${text}`;
    }
    
    const request: HuggingFaceRequest = {
      inputs: formattedInput,
      parameters: {
        max_length: options?.maxTokens || 512,
        temperature: options?.temperature || 0.7
      },
      options: {
        wait_for_model: true,
        use_cache: true
      }
    };
    
    const startTime = Date.now();
    
    try {
      const response = await axios.post(
        `${this.baseUrl}/${model}`,
        request,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 60000
        }
      );
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      // Extract the translated text from the response
      let translatedText = '';
      if (Array.isArray(response.data) && response.data.length > 0) {
        if (typeof response.data[0] === 'object' && response.data[0].translation_text) {
          translatedText = response.data[0].translation_text;
        } else if (typeof response.data[0] === 'string') {
          translatedText = response.data[0];
        }
      } else if (typeof response.data === 'string') {
        translatedText = response.data;
      } else if (typeof response.data === 'object' && response.data.generated_text) {
        translatedText = response.data.generated_text;
      }
      
      if (!translatedText) {
        throw new Error('Could not extract translated text from response');
      }
      
      // Estimate token usage (Hugging Face doesn't provide this)
      const inputTokens = this.getTokenUsage(text, model);
      const outputTokens = this.getTokenUsage(translatedText, model);
      
      return {
        translatedText: translatedText.trim(),
        sourceLanguage,
        targetLanguage,
        tokenUsage: {
          prompt: inputTokens,
          completion: outputTokens,
          total: inputTokens + outputTokens
        },
        modelUsed: model,
        confidenceScore: 0.8, // Hugging Face doesn't provide confidence scores
        metadata: {
          processingTime
        }
      };
    } catch (error: any) {
      console.error('Hugging Face translation error:', error);
      throw new Error(`Hugging Face translation failed: ${error.message || 'Unknown error'}`);
    }
  }
  
  /**
   * Gets a list of supported models
   */
  getSupportedModels(): string[] {
    return this.supportedModels;
  }
  
  /**
   * Gets a list of supported languages
   */
  getSupportedLanguages(): Language[] {
    // For simplicity, we'll assume Hugging Face supports all languages in our system
    // In reality, different models support different language pairs
    return SUPPORTED_LANGUAGES;
  }
  
  /**
   * Validates the API key by making a test request
   */
  async validateApiKey(): Promise<boolean> {
    try {
      // Make a minimal request to validate the API key
      const response = await axios.post(
        `${this.baseUrl}/${this.defaultModel}`,
        {
          inputs: 'Hello',
          options: {
            use_cache: true
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 5000
        }
      );
      
      return response.status === 200;
    } catch (error: any) {
      console.error('API key validation failed:', error);
      return false;
    }
  }
  
  /**
   * Converts a language name to a language code for mBART
   */
  private getLanguageCode(language: string): string {
    // Map of language names to mBART language codes
    const languageCodeMap: Record<string, string> = {
      'English': 'en_XX',
      'Hindi': 'hi_IN',
      'Kannada': 'kn_IN',
      'Telugu': 'te_IN',
      'Bengali': 'bn_IN',
      'Tamil': 'ta_IN',
      'Marathi': 'mr_IN',
      'Gujarati': 'gu_IN',
      'Malayalam': 'ml_IN',
      'Punjabi': 'pa_IN',
      'Urdu': 'ur_PK',
      'Nepali': 'ne_NP'
    };
    
    // Try to match by language name
    if (languageCodeMap[language]) {
      return languageCodeMap[language];
    }
    
    // Try to match by language code
    const langCode = language.split('-')[0].toLowerCase();
    for (const [name, code] of Object.entries(languageCodeMap)) {
      if (code.startsWith(langCode)) {
        return code;
      }
    }
    
    // Default to English if no match is found
    return 'en_XX';
  }
}