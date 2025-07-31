const { TranslationService } = require('./server/dist/services/TranslationService');

async function testTranslation() {
  try {
    console.log('Testing translation service...');
    const translationService = new TranslationService('demo-key');
    
    console.log('Validating API key...');
    const isValid = await translationService.validateApiKey();
    console.log('API key valid:', isValid);
    
    console.log('Testing translation...');
    const result = await translationService.translateText(
      'Hello world',
      'hi-IN',
      'en-US'
    );
    
    console.log('Translation result:', result);
  } catch (error) {
    console.error('Translation test failed:', error);
  }
}

testTranslation();