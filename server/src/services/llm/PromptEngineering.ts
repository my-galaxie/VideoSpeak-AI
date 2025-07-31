/**
 * Utilities for creating effective translation prompts
 */
export class PromptEngineering {
  /**
   * Creates a system prompt for translation
   */
  static createSystemPrompt(
    sourceLanguage: string,
    targetLanguage: string,
    domainContext?: string
  ): string {
    let prompt = `You are a professional translator with expertise in ${sourceLanguage} and ${targetLanguage}. 
Your task is to translate the following text from ${sourceLanguage} to ${targetLanguage}.
Maintain the original meaning, tone, and context. Preserve technical terminology, cultural references, 
and idiomatic expressions appropriately. The translation should sound natural to native ${targetLanguage} speakers.`;

    // Add domain-specific context if provided
    if (domainContext) {
      prompt += `\n\nThis text is from the ${domainContext} field and may contain specialized terminology. 
Ensure that technical terms are translated accurately using the standard terminology in ${targetLanguage} for this domain.`;
    }

    // Add specific instructions for Indian languages if applicable
    if (targetLanguage.includes('-IN') || isIndianLanguage(targetLanguage)) {
      prompt += `\n\nFor this Indian language translation, pay special attention to:
1. Cultural nuances specific to Indian contexts
2. Proper handling of honorifics and formal/informal speech distinctions
3. Appropriate transliteration of names and places
4. Regional variations in terminology`;
    }

    return prompt;
  }

  /**
   * Creates a user prompt for translation
   */
  static createUserPrompt(
    text: string,
    targetLanguage: string,
    preserveFormatting: boolean = true
  ): string {
    let prompt = `Translate the following text to ${targetLanguage}:`;
    
    // Add formatting instructions if needed
    if (preserveFormatting) {
      prompt += `\nPreserve the original formatting, including paragraphs, bullet points, and line breaks.`;
    }
    
    // Add the text to translate
    prompt += `\n\n${text}`;
    
    // Add instruction to only return the translation
    prompt += `\n\nProvide only the translated text without explanations or notes.`;
    
    return prompt;
  }

  /**
   * Creates a prompt for domain-specific translation
   */
  static createDomainSpecificPrompt(
    text: string,
    targetLanguage: string,
    domain: string,
    terminology?: Record<string, string>
  ): string {
    let prompt = `You are a professional translator specializing in ${domain} content.
Translate the following ${domain} text from the source language to ${targetLanguage}.
Maintain technical accuracy and use domain-appropriate terminology.`;
    
    // Add terminology guidance if provided
    if (terminology && Object.keys(terminology).length > 0) {
      prompt += `\n\nUse the following terminology in your translation:`;
      
      for (const [term, translation] of Object.entries(terminology)) {
        prompt += `\n- "${term}" should be translated as "${translation}"`;
      }
    }
    
    // Add the text to translate
    prompt += `\n\nText to translate:\n${text}`;
    
    return prompt;
  }

  /**
   * Creates a prompt for handling long content translation
   */
  static createChunkContextPrompt(
    chunk: string,
    targetLanguage: string,
    previousContext?: string,
    followingContext?: string
  ): string {
    let prompt = `Translate the following text to ${targetLanguage}:`;
    
    // Add previous context if available
    if (previousContext) {
      prompt += `\n\nPrevious context (already translated, for reference only):\n${previousContext}`;
    }
    
    // Add the chunk to translate
    prompt += `\n\nTranslate this text:\n${chunk}`;
    
    // Add following context if available
    if (followingContext) {
      prompt += `\n\nFollowing context (for reference only):\n${followingContext}`;
    }
    
    // Add instruction to maintain consistency
    prompt += `\n\nEnsure your translation is consistent with the previous context if provided.
Provide only the translation of the specified text without translating the context sections.`;
    
    return prompt;
  }
}

/**
 * Helper function to check if a language code represents an Indian language
 */
function isIndianLanguage(languageCode: string): boolean {
  const indianLanguageCodes = [
    'hi', 'bn', 'te', 'ta', 'mr', 'gu', 'kn', 'ml', 'pa', 'or',
    'as', 'mai', 'sat', 'ks', 'sd', 'ur', 'sa', 'ne', 'brx', 'doi',
    'kok', 'mni'
  ];
  
  // Check if the language code starts with any Indian language code
  return indianLanguageCodes.some(code => 
    languageCode.startsWith(code + '-') || languageCode === code
  );
}