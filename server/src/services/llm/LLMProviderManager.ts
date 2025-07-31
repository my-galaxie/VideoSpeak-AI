import { ILLMProvider } from './ILLMProvider';
import { OpenAIProvider } from './OpenAIProvider';
import { HuggingFaceProvider } from './HuggingFaceProvider';

/**
 * Manager class for LLM providers
 */
export class LLMProviderManager {
  private providers: Map<string, ILLMProvider>;
  private defaultProvider: string;
  
  constructor() {
    this.providers = new Map();
    this.defaultProvider = 'huggingface'; // Default to HuggingFace as it can be used with free API
    
    // Initialize with default providers if environment variables are available
    this.initializeDefaultProviders();
  }
  
  /**
   * Initialize default providers based on environment variables
   */
  private initializeDefaultProviders(): void {
    // Initialize OpenAI provider if API key is available
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (openaiApiKey) {
      this.registerProvider('openai', new OpenAIProvider(openaiApiKey));
    }
    
    // Initialize HuggingFace provider if API key is available
    const huggingfaceApiKey = process.env.HUGGINGFACE_API_KEY || 'hf_dummy_key'; // Use a dummy key for demo
    this.registerProvider('huggingface', new HuggingFaceProvider(huggingfaceApiKey));
    
    // Add more providers here as they are implemented
  }
  
  /**
   * Register a new LLM provider
   */
  registerProvider(name: string, provider: ILLMProvider): void {
    this.providers.set(name.toLowerCase(), provider);
  }
  
  /**
   * Get a provider by name
   */
  getProvider(name: string): ILLMProvider {
    const providerName = name?.toLowerCase() || this.defaultProvider;
    const provider = this.providers.get(providerName);
    
    if (!provider) {
      throw new Error(`LLM provider '${providerName}' not found`);
    }
    
    return provider;
  }
  
  /**
   * Get the default provider
   */
  getDefaultProvider(): ILLMProvider {
    return this.getProvider(this.defaultProvider);
  }
  
  /**
   * Set the default provider
   */
  setDefaultProvider(name: string): void {
    if (!this.providers.has(name.toLowerCase())) {
      throw new Error(`Cannot set default provider: '${name}' not found`);
    }
    
    this.defaultProvider = name.toLowerCase();
  }
  
  /**
   * List available providers
   */
  listAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }
  
  /**
   * Check if a provider is available
   */
  hasProvider(name: string): boolean {
    return this.providers.has(name.toLowerCase());
  }
  
  /**
   * Validate provider configuration
   */
  async validateProviderConfig(providerName: string): Promise<boolean> {
    try {
      const provider = this.getProvider(providerName);
      return await provider.validateApiKey();
    } catch (error) {
      console.error(`Provider validation error for ${providerName}:`, error);
      return false;
    }
  }
  
  /**
   * Get a free LLM provider if available
   * This method tries to find a provider that doesn't require payment
   */
  getFreeProvider(): ILLMProvider | null {
    // Return HuggingFace as the free provider
    if (this.hasProvider('huggingface')) {
      return this.getProvider('huggingface');
    }
    
    // Return OpenAI as a fallback if available (not free but commonly used)
    if (this.hasProvider('openai')) {
      return this.getProvider('openai');
    }
    
    return null;
  }
}