import { WebSpeechTranscriptionService } from '../TranscriptionService';
import { AudioQuality } from '../../types';

describe('WebSpeechTranscriptionService', () => {
  let service: WebSpeechTranscriptionService;

  beforeEach(() => {
    service = new WebSpeechTranscriptionService();
  });

  describe('transcribeAudio', () => {
    it('should transcribe audio with high quality', async () => {
      const mockAudioBuffer = Buffer.from('mock audio data');
      
      const result = await service.transcribeAudio(mockAudioBuffer, AudioQuality.HIGH);
      
      expect(result.text).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.detectedLanguage).toBe('en-IN');
      expect(result.segments).toHaveLength(1);
      expect(result.overallAccuracy).toBeGreaterThan(0.8);
      expect(result.qualityScore).toBeGreaterThan(0.8);
    });

    it('should handle medium quality audio', async () => {
      const mockAudioBuffer = Buffer.from('mock audio data');
      
      const result = await service.transcribeAudio(mockAudioBuffer, AudioQuality.MEDIUM);
      
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.confidence).toBeLessThan(0.9);
      expect(result.overallAccuracy).toBeGreaterThan(0.7);
    });

    it('should handle low quality audio', async () => {
      const mockAudioBuffer = Buffer.from('mock audio data');
      
      const result = await service.transcribeAudio(mockAudioBuffer, AudioQuality.LOW);
      
      expect(result.confidence).toBeGreaterThan(0.6);
      expect(result.confidence).toBeLessThan(0.8);
      expect(result.overallAccuracy).toBeGreaterThan(0.6);
    });

    it('should create proper segments', async () => {
      const mockAudioBuffer = Buffer.from('mock audio data');
      
      const result = await service.transcribeAudio(mockAudioBuffer);
      
      expect(result.segments).toHaveLength(1);
      expect(result.segments[0].text).toBeDefined();
      expect(result.segments[0].startTime).toBe(0);
      expect(result.segments[0].endTime).toBeGreaterThan(0);
      expect(result.segments[0].confidence).toBeGreaterThan(0.7);
    });

    it('should handle transcription errors', async () => {
      // Mock a scenario that would cause an error
      const invalidBuffer = null as any;
      
      await expect(service.transcribeAudio(invalidBuffer)).rejects.toThrow('Transcription failed');
    });
  });

  describe('detectLanguage', () => {
    it('should detect Hindi text', async () => {
      const hindiText = 'यह हिंदी का टेक्स्ट है';
      const language = await service.detectLanguage(hindiText);
      expect(language).toBe('hi-IN');
    });

    it('should detect Kannada text', async () => {
      const kannadaText = 'ಇದು ಕನ್ನಡ ಪಠ್ಯ';
      const language = await service.detectLanguage(kannadaText);
      expect(language).toBe('kn-IN');
    });

    it('should detect Telugu text', async () => {
      const teluguText = 'ఇది తెలుగు వచనం';
      const language = await service.detectLanguage(teluguText);
      expect(language).toBe('te-IN');
    });

    it('should detect Tamil text', async () => {
      const tamilText = 'இது தமிழ் உரை';
      const language = await service.detectLanguage(tamilText);
      expect(language).toBe('ta-IN');
    });

    it('should detect Bengali text', async () => {
      const bengaliText = 'এটি বাংলা পাঠ্য';
      const language = await service.detectLanguage(bengaliText);
      expect(language).toBe('bn-IN');
    });

    it('should default to English for unrecognized text', async () => {
      const englishText = 'This is English text';
      const language = await service.detectLanguage(englishText);
      expect(language).toBe('en-IN');
    });
  });

  describe('splitLongAudio', () => {
    it('should split large audio buffer into chunks', () => {
      const largeBuffer = Buffer.alloc(3 * 1024 * 1024); // 3MB
      const chunks = service.splitLongAudio(largeBuffer);
      
      expect(chunks.length).toBe(3);
      expect(chunks[0].length).toBe(1024 * 1024);
      expect(chunks[1].length).toBe(1024 * 1024);
      expect(chunks[2].length).toBe(1024 * 1024);
    });

    it('should handle small audio buffer', () => {
      const smallBuffer = Buffer.alloc(500 * 1024); // 500KB
      const chunks = service.splitLongAudio(smallBuffer);
      
      expect(chunks.length).toBe(1);
      expect(chunks[0].length).toBe(500 * 1024);
    });

    it('should handle empty buffer', () => {
      const emptyBuffer = Buffer.alloc(0);
      const chunks = service.splitLongAudio(emptyBuffer);
      
      expect(chunks.length).toBe(0);
    });
  });

  describe('accuracy calculations', () => {
    it('should calculate higher accuracy for high quality audio', async () => {
      const mockAudioBuffer = Buffer.from('test');
      
      const highQualityResult = await service.transcribeAudio(mockAudioBuffer, AudioQuality.HIGH);
      const lowQualityResult = await service.transcribeAudio(mockAudioBuffer, AudioQuality.LOW);
      
      expect(highQualityResult.overallAccuracy).toBeGreaterThan(lowQualityResult.overallAccuracy);
      expect(highQualityResult.qualityScore).toBeGreaterThan(lowQualityResult.qualityScore);
    });

    it('should provide accuracy values between 0 and 1', async () => {
      const mockAudioBuffer = Buffer.from('test');
      
      const result = await service.transcribeAudio(mockAudioBuffer);
      
      expect(result.overallAccuracy).toBeGreaterThanOrEqual(0);
      expect(result.overallAccuracy).toBeLessThanOrEqual(1);
      expect(result.qualityScore).toBeGreaterThanOrEqual(0);
      expect(result.qualityScore).toBeLessThanOrEqual(1);
    });
  });
});