/**
 * Utilities for chunking text for LLM processing
 */
export class TextChunking {
  /**
   * Splits text into semantic chunks based on paragraphs and sentences
   * @param text The text to split
   * @param maxChunkSize Maximum size of each chunk in characters
   * @param overlapSize Number of characters to overlap between chunks
   */
  static splitIntoChunks(
    text: string,
    maxChunkSize: number = 1500,
    overlapSize: number = 200
  ): string[] {
    if (!text || text.length <= maxChunkSize) {
      return [text];
    }

    const chunks: string[] = [];
    let currentPosition = 0;

    while (currentPosition < text.length) {
      // Determine the end position for this chunk
      let endPosition = Math.min(currentPosition + maxChunkSize, text.length);
      
      // Try to find a paragraph break
      const paragraphBreak = this.findLastOccurrence(
        text, 
        ['\n\n', '\r\n\r\n'], 
        currentPosition, 
        endPosition
      );
      
      if (paragraphBreak > currentPosition + maxChunkSize / 2) {
        endPosition = paragraphBreak;
      } else {
        // If no suitable paragraph break, try to find a sentence break
        const sentenceBreak = this.findLastOccurrence(
          text, 
          ['. ', '! ', '? ', '.\n', '!\n', '?\n'], 
          currentPosition, 
          endPosition
        );
        
        if (sentenceBreak > currentPosition + maxChunkSize / 3) {
          endPosition = sentenceBreak;
        }
      }
      
      // Extract the chunk
      const chunk = text.substring(currentPosition, endPosition).trim();
      chunks.push(chunk);
      
      // Move to the next position, accounting for overlap
      currentPosition = Math.max(currentPosition, endPosition - overlapSize);
    }

    return chunks;
  }

  /**
   * Finds the last occurrence of any delimiter in a range of text
   */
  private static findLastOccurrence(
    text: string,
    delimiters: string[],
    startPosition: number,
    endPosition: number
  ): number {
    let lastPosition = startPosition;
    
    for (const delimiter of delimiters) {
      const position = text.lastIndexOf(delimiter, endPosition);
      if (position > lastPosition && position <= endPosition) {
        // Add the delimiter length to include it in the chunk
        lastPosition = position + delimiter.length;
      }
    }
    
    return lastPosition;
  }

  /**
   * Merges translated chunks back together, handling overlaps
   * @param chunks Array of translated text chunks
   * @param overlapThreshold Minimum similarity threshold for overlap resolution
   */
  static mergeChunks(
    chunks: string[],
    overlapThreshold: number = 0.5
  ): string {
    if (chunks.length <= 1) {
      return chunks[0] || '';
    }

    let result = chunks[0];
    
    for (let i = 1; i < chunks.length; i++) {
      const currentChunk = chunks[i];
      
      // Find potential overlap between the end of the result and the start of the current chunk
      const overlapSize = this.findOverlapSize(result, currentChunk, overlapThreshold);
      
      // Append the current chunk, removing the overlap
      result += currentChunk.substring(overlapSize);
    }
    
    return result;
  }

  /**
   * Finds the size of the overlap between two text chunks
   */
  private static findOverlapSize(
    first: string,
    second: string,
    similarityThreshold: number
  ): number {
    // Maximum possible overlap is 1/3 of the shorter string
    const maxOverlap = Math.min(first.length, second.length) / 3;
    
    // Try different overlap sizes, starting from the largest
    for (let overlapSize = Math.min(200, maxOverlap); overlapSize >= 10; overlapSize -= 10) {
      const endOfFirst = first.substring(first.length - overlapSize);
      const startOfSecond = second.substring(0, overlapSize);
      
      // Calculate similarity between the potential overlap regions
      const similarity = this.calculateSimilarity(endOfFirst, startOfSecond);
      
      if (similarity >= similarityThreshold) {
        return overlapSize;
      }
    }
    
    // Default to a small overlap if no good match is found
    return 0;
  }

  /**
   * Calculates a simple similarity score between two strings
   * This is a basic implementation - more sophisticated methods could be used
   */
  private static calculateSimilarity(a: string, b: string): number {
    if (!a || !b) return 0;
    
    // Convert to lowercase for comparison
    const strA = a.toLowerCase();
    const strB = b.toLowerCase();
    
    // Count matching characters
    let matches = 0;
    const minLength = Math.min(strA.length, strB.length);
    
    for (let i = 0; i < minLength; i++) {
      if (strA[i] === strB[i]) {
        matches++;
      }
    }
    
    // Calculate similarity as percentage of matches
    return matches / minLength;
  }
}