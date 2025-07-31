import { Language, LLMTranslationMetadata } from '../../types';

export interface LLMTranslationOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  userPrompt?: string;
}

export interface LLMTranslationResponse {
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  tokenUsage?: {
    prompt?: number;
    completion?: number;
    total?: number;
  };
  modelUsed: string;
  confidenceScore?: number;
  metadata?: Record<string, any>;
}

export interface ILLMProvider {
  /**
   * Translates text using the LLM provider
   */
  translateText(
    text: string,
    targetLanguage: string,
    sourceLanguage: string,
    options?: LLMTranslationOptions
  ): Promise<LLMTranslationResponse>;
  
  /**
   * Gets a list of supported models for this provider
   */
  getSupportedModels(): string[];
  
  /**
   * Gets a list of languages supported by this provider
   */
  getSupportedLanguages(): Language[];
  
  /**
   * Validates the API key for this provider
   */
  validateApiKey(): Promise<boolean>;
  
  /**
   * Estimates token usage for a given text and model
   */
  getTokenUsage(text: string, model: string): number;
  
  /**
   * Estimates cost for a given token count and model
   */
  estimateCost(tokenCount: number, model: string): number;
}

/**
 * Base class for LLM providers with common functionality
 */
export abstract class BaseLLMProvider implements ILLMProvider {
  protected apiKey: string;
  
  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('API key is required for LLM provider');
    }
    this.apiKey = apiKey;
  }
  
  /**
   * Creates a translation prompt for the LLM
   */
  protected createTranslationPrompt(
    text: string,
    targetLanguage: string,
    sourceLanguage: string,
    options?: LLMTranslationOptions
  ): { systemPrompt: string; userPrompt: string } {
    const systemPrompt = options?.systemPrompt || 
      `You are a professional translator with expertise in ${sourceLanguage} and ${targetLanguage}. 
Your task is to translate the following text from ${sourceLanguage} to ${targetLanguage}.
Maintain the original meaning, tone, and context. Preserve technical terminology, cultural references, 
and idiomatic expressions appropriately. The translation should sound natural to native ${targetLanguage} speakers.`;
    
    const userPrompt = options?.userPrompt || 
      `Translate the following text to ${targetLanguage}:\n\n${text}`;
    
    return { systemPrompt, userPrompt };
  }
  
  /**
   * Estimates token count for a given text
   * This is a simple estimation - actual implementations should use more accurate methods
   */
  getTokenUsage(text: string, model: string): number {
    // Simple estimation: ~4 characters per token on average
    return Math.ceil(text.length / 4);
  }
  
  /**
   * Default cost estimation (should be overridden by specific providers)
   */
  estimateCost(tokenCount: number, model: string): number {
    // Default implementation returns 0
    return 0;
  }
  
  /**
   * Abstract methods that must be implemented by specific providers
   */
  abstract translateText(
    text: string,
    targetLanguage: string,
    sourceLanguage: string,
    options?: LLMTranslationOptions
  ): Promise<LLMTranslationResponse>;
  
  abstract getSupportedModels(): string[];
  
  abstract getSupportedLanguages(): Language[];
  
  abstract validateApiKey(): Promise<boolean>;
}