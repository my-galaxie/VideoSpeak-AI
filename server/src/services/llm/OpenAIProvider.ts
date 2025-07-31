import axios from 'axios';
import { Language, SUPPORTED_LANGUAGES } from '../../types';
import { BaseLLMProvider, LLMTranslationOptions, LLMTranslationResponse } from './ILLMProvider';

interface OpenAICompletionRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  max_tokens?: number;
  temperature?: number;
}

interface OpenAICompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class OpenAIProvider extends BaseLLMProvider {
  private readonly baseUrl: string;
  private readonly defaultModel: string;
  private readonly supportedModels: string[];
  
  constructor(
    apiKey: string,
    baseUrl: string = 'https://api.openai.com/v1',
    defaultModel: string = 'gpt-3.5-turbo'
  ) {
    super(apiKey);
    this.baseUrl = baseUrl;
    this.defaultModel = defaultModel;
    this.supportedModels = ['gpt-3.5-turbo', 'gpt-4'];
  }
  
  /**
   * Translates text using OpenAI's Chat Completions API
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
    const maxTokens = options?.maxTokens || 2000;
    const temperature = options?.temperature || 0.3;
    
    const { systemPrompt, userPrompt } = this.createTranslationPrompt(
      text,
      targetLanguage,
      sourceLanguage,
      options
    );
    
    const request: OpenAICompletionRequest = {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: maxTokens,
      temperature
    };
    
    const startTime = Date.now();
    
    try {
      const response = await axios.post<OpenAICompletionResponse>(
        `${this.baseUrl}/chat/completions`,
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
      
      if (!response.data.choices || response.data.choices.length === 0) {
        throw new Error('No translation result returned from OpenAI');
      }
      
      const translatedText = response.data.choices[0].message.content.trim();
      
      return {
        translatedText,
        sourceLanguage,
        targetLanguage,
        tokenUsage: {
          prompt: response.data.usage.prompt_tokens,
          completion: response.data.usage.completion_tokens,
          total: response.data.usage.total_tokens
        },
        modelUsed: response.data.model,
        confidenceScore: 0.85, // OpenAI doesn't provide confidence scores, so we use a default
        metadata: {
          processingTime,
          finishReason: response.data.choices[0].finish_reason
        }
      };
    } catch (error: any) {
      console.error('OpenAI translation error:', error);
      throw new Error(`OpenAI translation failed: ${error.message || 'Unknown error'}`);
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
   * OpenAI supports most languages, so we return all languages as supported
   */
  getSupportedLanguages(): Language[] {
    // For simplicity, we'll assume OpenAI supports all languages in our system
    return SUPPORTED_LANGUAGES;
  }
  
  /**
   * Validates the API key by making a test request
   */
  async validateApiKey(): Promise<boolean> {
    try {
      // Make a minimal request to validate the API key
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: this.defaultModel,
          messages: [
            { role: 'user', content: 'Hello' }
          ],
          max_tokens: 5
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
   * Estimates cost for a given token count and model
   * Based on OpenAI's pricing as of 2023
   */
  estimateCost(tokenCount: number, model: string): number {
    // Pricing in USD per 1000 tokens
    const pricing: Record<string, { input: number; output: number }> = {
      'gpt-3.5-turbo': { input: 0.0015, output: 0.002 },
      'gpt-4': { input: 0.03, output: 0.06 }
    };
    
    const modelPricing = pricing[model] || pricing['gpt-3.5-turbo'];
    
    // Assume 70% of tokens are input (prompt) and 30% are output (completion)
    const inputTokens = tokenCount * 0.7;
    const outputTokens = tokenCount * 0.3;
    
    const inputCost = (inputTokens / 1000) * modelPricing.input;
    const outputCost = (outputTokens / 1000) * modelPricing.output;
    
    return inputCost + outputCost;
  }
}