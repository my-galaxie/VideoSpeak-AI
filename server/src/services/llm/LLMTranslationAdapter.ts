import { Language, LLMTranslationMetadata, TranslationQualityMetrics, TranslationResult } from '../../types';
import { ILLMProvider, LLMTranslationOptions } from './ILLMProvider';
import { LLMProviderManager } from './LLMProviderManager';
import { PromptEngineering } from './PromptEngineering';
import { TextChunking } from './TextChunking';

export interface LLMTranslationAdapterOptions {
  provider?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  contextPrompt?: string;
  domainHint?: string;
  maxChunkSize?: number;
  chunkOverlap?: number;
}

/**
 * Adapter for LLM-based translation
 */
export class LLMTranslationAdapter {
  private providerManager: LLMProviderManager;
  
  constructor(providerManager: LLMProviderManager) {
    this.providerManager = providerManager;
  }
  
  /**
   * Translates text using an LLM provider
   */
  async translateText(
    text: string,
    targetLanguage: string,
    sourceLanguage: string = 'English',
    options?: LLMTranslationAdapterOptions
  ): Promise<TranslationResult> {
    if (!text || text.trim().length === 0) {
      throw new Error('Input text cannot be empty');
    }
    
    // Get the provider
    let provider: ILLMProvider;
    try {
      if (options?.provider) {
        provider = this.providerManager.getProvider(options.provider);
      } else {
        // Try to get a free provider first, then fall back to default
        provider = this.providerManager.getFreeProvider() || 
                  this.providerManager.getDefaultProvider();
      }
    } catch (error: any) {
      throw new Error(`Failed to get LLM provider: ${error.message}`);
    }
    
    // Check if the text needs to be chunked
    const maxChunkSize = options?.maxChunkSize || 1500;
    const chunks = TextChunking.splitIntoChunks(
      text,
      maxChunkSize,
      options?.chunkOverlap || 200
    );
    
    // Start timing
    const startTime = Date.now();
    
    // Process each chunk
    let translatedChunks: string[] = [];
    let totalTokens = 0;
    let promptTokens = 0;
    let completionTokens = 0;
    
    try {
      if (chunks.length === 1) {
        // Single chunk translation
        const result = await this.translateChunk(
          provider,
          text,
          targetLanguage,
          sourceLanguage,
          options
        );
        
        translatedChunks = [result.translatedText];
        totalTokens = result.tokenUsage?.total || 0;
        promptTokens = result.tokenUsage?.prompt || 0;
        completionTokens = result.tokenUsage?.completion || 0;
      } else {
        // Multi-chunk translation
        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          
          // Get context from adjacent chunks if available
          const previousContext = i > 0 ? translatedChunks[i - 1] : undefined;
          const followingContext = i < chunks.length - 1 ? chunks[i + 1] : undefined;
          
          // Create a context-aware prompt
          const contextPrompt = PromptEngineering.createChunkContextPrompt(
            chunk,
            targetLanguage,
            previousContext,
            followingContext
          );
          
          // Translate the chunk
          const chunkOptions = {
            ...options,
            contextPrompt
          };
          
          const result = await this.translateChunk(
            provider,
            chunk,
            targetLanguage,
            sourceLanguage,
            chunkOptions
          );
          
          translatedChunks.push(result.translatedText);
          
          // Accumulate token usage
          totalTokens += result.tokenUsage?.total || 0;
          promptTokens += result.tokenUsage?.prompt || 0;
          completionTokens += result.tokenUsage?.completion || 0;
        }
      }
      
      // Merge chunks if necessary
      const translatedText = chunks.length > 1 
        ? TextChunking.mergeChunks(translatedChunks)
        : translatedChunks[0];
      
      // Calculate quality metrics
      const qualityMetrics = await this.calculateQualityMetrics(
        text,
        translatedText,
        sourceLanguage,
        targetLanguage
      );
      
      // Calculate processing time
      const processingTime = Date.now() - startTime;
      
      // Create metadata
      const llmMetadata: LLMTranslationMetadata = {
        provider: options?.provider || 'default',
        model: options?.model || 'default',
        tokenUsage: {
          prompt: promptTokens,
          completion: completionTokens,
          total: totalTokens
        },
        processingTime
      };
      
      // Create the final result
      return {
        translatedText,
        sourceLanguageCode: sourceLanguage,
        targetLanguageCode: targetLanguage,
        requestId: `llm-${Date.now()}`,
        translationAccuracy: qualityMetrics.overallAccuracy,
        confidenceScore: qualityMetrics.confidenceScore,
        qualityMetrics,
        llmMetadata
      };
    } catch (error: any) {
      console.error('LLM translation error:', error);
      throw new Error(`LLM translation failed: ${error.message}`);
    }
  }
  
  /**
   * Translates a single chunk of text
   */
  private async translateChunk(
    provider: ILLMProvider,
    text: string,
    targetLanguage: string,
    sourceLanguage: string,
    options?: LLMTranslationAdapterOptions
  ): Promise<{
    translatedText: string;
    tokenUsage?: {
      prompt?: number;
      completion?: number;
      total?: number;
    };
  }> {
    // Create provider options
    const providerOptions: LLMTranslationOptions = {
      model: options?.model,
      maxTokens: options?.maxTokens,
      temperature: options?.temperature,
      systemPrompt: options?.contextPrompt || PromptEngineering.createSystemPrompt(
        sourceLanguage,
        targetLanguage,
        options?.domainHint
      ),
      userPrompt: PromptEngineering.createUserPrompt(
        text,
        targetLanguage,
        true
      )
    };
    
    // Call the provider
    const response = await provider.translateText(
      text,
      targetLanguage,
      sourceLanguage,
      providerOptions
    );
    
    return {
      translatedText: response.translatedText,
      tokenUsage: response.tokenUsage
    };
  }
  
  /**
   * Gets a list of supported languages
   */
  getSupportedLanguages(): Language[] {
    try {
      const provider = this.providerManager.getDefaultProvider();
      return provider.getSupportedLanguages();
    } catch (error) {
      console.error('Failed to get supported languages:', error);
      return [];
    }
  }
  
  /**
   * Calculates quality metrics for a translation
   */
  async calculateQualityMetrics(
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
      fluency: Math.round(fluency * 100) / 100,
      adequacy: Math.round(adequacy * 100) / 100,
      semanticSimilarity: Math.round(semanticSimilarity * 100) / 100,
      grammarScore: Math.round(grammarScore * 100) / 100,
      overallAccuracy: Math.round(overallAccuracy * 100) / 100,
      confidenceScore: Math.round(confidenceScore * 100) / 100
    };
  }
  
  /**
   * Calculates fluency score for translated text
   */
  private calculateFluency(text: string): number {
    if (!text || text.trim().length === 0) return 0;
    
    const words = text.trim().split(/\s+/);
    const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;
    
    // Basic heuristics for fluency
    let score = 85; // Base score for LLM translations is higher than for API translations
    
    // Penalize very short or very long average word lengths
    if (avgWordLength < 3 || avgWordLength > 12) score -= 5;
    
    // Penalize excessive punctuation
    const punctuationRatio = (text.match(/[.,!?;:]/g) || []).length / words.length;
    if (punctuationRatio > 0.3) score -= 10;
    
    // Bonus for reasonable sentence structure
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length > 0) {
      const avgSentenceLength = words.length / sentences.length;
      if (avgSentenceLength >= 5 && avgSentenceLength <= 20) score += 5;
    }
    
    return Math.max(0, Math.min(100, score));
  }
  
  /**
   * Calculates adequacy score for translation
   */
  private calculateAdequacy(sourceText: string, translatedText: string): number {
    if (!sourceText || !translatedText) return 0;
    
    const sourceWords = sourceText.trim().split(/\s+/);
    const translatedWords = translatedText.trim().split(/\s+/);
    
    // Length ratio scoring
    const lengthRatio = translatedWords.length / sourceWords.length;
    let score = 85; // Base score for LLM translations
    
    // Ideal ratio is between 0.7 and 1.5
    if (lengthRatio >= 0.7 && lengthRatio <= 1.5) {
      score += 10;
    } else if (lengthRatio < 0.5 || lengthRatio > 2.0) {
      score -= 15;
    }
    
    // Check for complete translation (not empty or too short)
    if (translatedWords.length < sourceWords.length * 0.3) {
      score -= 25;
    }
    
    return Math.max(0, Math.min(100, score));
  }
  
  /**
   * Calculates semantic similarity score
   */
  private calculateSemanticSimilarity(sourceText: string, translatedText: string): number {
    // For LLM translations, we assume higher semantic similarity
    // In a production system, this would use embeddings or more sophisticated NLP
    
    if (!sourceText || !translatedText) return 0;
    
    // Base score for LLM translations
    let score = 88;
    
    // Penalize if translation is identical (likely untranslated)
    if (sourceText.toLowerCase() === translatedText.toLowerCase()) {
      score = 30;
    }
    
    return Math.max(0, Math.min(100, score));
  }
  
  /**
   * Calculates grammar score
   */
  private calculateGrammarScore(text: string): number {
    if (!text || text.trim().length === 0) return 0;
    
    // Base score for LLM translations
    let score = 90;
    
    // Check for basic sentence structure
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length === 0) {
      score -= 30;
    }
    
    // Penalize excessive repetition
    const words = text.split(/\s+/);
    const uniqueWords = new Set(words.map(w => w.toLowerCase()));
    const repetitionRatio = 1 - (uniqueWords.size / words.length);
    if (repetitionRatio > 0.5) {
      score -= 15;
    }
    
    return Math.max(0, Math.min(100, score));
  }
}