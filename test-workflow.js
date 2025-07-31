const { TranslationService } = require('./server/dist/services/TranslationService');
const { YouTubeVideoProcessor } = require('./server/dist/services/VideoProcessingService');
const { WebSpeechTranscriptionService } = require('./server/dist/services/TranscriptionService');
const { YouTubeUrlValidator } = require('./server/dist/utils/youtube');

async function testFullWorkflow() {
  try {
    console.log('=== Testing Full Video Processing Workflow ===');
    
    const youtubeUrl = 'https://www.youtube.com/watch?v=jNQXAC9IVRw';
    const targetLanguage = 'hi-IN';
    
    // Initialize services
    const translationService = new TranslationService('demo-key');
    const videoProcessingService = new YouTubeVideoProcessor();
    const transcriptionService = new WebSpeechTranscriptionService();
    
    console.log('1. Validating YouTube URL...');
    const isValidUrl = YouTubeUrlValidator.validateYouTubeUrl(youtubeUrl);
    console.log('URL valid:', isValidUrl);
    
    console.log('2. Extracting video ID...');
    const videoId = YouTubeUrlValidator.extractVideoId(youtubeUrl);
    console.log('Video ID:', videoId);
    
    console.log('3. Getting video metadata...');
    const videoMetadata = await videoProcessingService.getVideoMetadata(videoId);
    console.log('Video metadata:', videoMetadata);
    
    console.log('4. Extracting audio...');
    const audioBuffer = await videoProcessingService.extractAudio(videoId);
    console.log('Audio buffer size:', audioBuffer.length);
    
    console.log('5. Transcribing audio...');
    const transcriptionResult = await transcriptionService.transcribeAudio(audioBuffer);
    console.log('Transcription result:', transcriptionResult);
    
    console.log('6. Translating text...');
    const translationResult = await translationService.translateText(
      transcriptionResult.text,
      targetLanguage,
      transcriptionResult.detectedLanguage
    );
    console.log('Translation result:', translationResult);
    
    console.log('=== WORKFLOW COMPLETED SUCCESSFULLY ===');
    console.log('Final Results:');
    console.log('- Original text:', transcriptionResult.text);
    console.log('- Translated text:', translationResult.translatedText);
    console.log('- Source language:', translationResult.sourceLanguageCode);
    console.log('- Target language:', translationResult.targetLanguageCode);
    
  } catch (error) {
    console.error('=== WORKFLOW FAILED ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testFullWorkflow();