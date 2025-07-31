# VideoSpeak with LLM Translation

VideoSpeak is an AI-based video processing system that enables users to transcribe YouTube videos and translate the content into Indian languages. This enhanced version includes LLM-based translation capabilities in addition to the Sarvam API.

## Features

- YouTube video URL input and processing
- Audio extraction and transcription
- Translation to Indian languages using LLM or Sarvam API
- Support for multiple translation methods
- Real-time progress tracking
- Quality metrics for translations
- Responsive UI for all screen sizes

## Prerequisites

- Node.js (v14 or later)
- npm or yarn
- API keys for:
  - Hugging Face (for free LLM translation)
  - OpenAI (optional, for higher quality LLM translation)
  - Sarvam AI (for Indian language translation)

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/videospeak.git
   cd videospeak
   ```

2. Install dependencies for both client and server:
   ```
   npm install
   cd client && npm install
   cd ../server && npm install
   ```

3. Create a `.env` file in the server directory with your API keys:
   ```
   HUGGINGFACE_API_KEY=your_huggingface_api_key
   OPENAI_API_KEY=your_openai_api_key
   SARVAM_API_KEY=your_sarvam_api_key
   ```

## Running the Application

### Using the Batch File (Windows)

1. Edit the `run-enhanced-app.bat` file to include your API keys
2. Double-click the `run-enhanced-app.bat` file to start both client and server

### Manual Start

1. Start the server:
   ```
   cd server
   npm run build
   node dist/enhanced-index.js
   ```

2. In a new terminal, start the client:
   ```
   cd client
   set REACT_APP_USE_ENHANCED=true
   npm start
   ```

3. Open your browser and navigate to `http://localhost:3000`

## Usage

1. Enter a YouTube URL in the input field
2. Select your target language from the dropdown
3. Choose your preferred translation method (LLM or Sarvam API)
4. Click "Process Video"
5. Wait for the processing to complete
6. View the transcription and translation results

## Translation Methods

### LLM Translation
- Uses Large Language Models for translation
- Provides high-quality, contextually accurate translations
- Supports chunking for long content
- Includes quality metrics and confidence scores

### Sarvam API Translation
- Specialized for Indian languages
- Optimized for technical terminology
- Provides fluency and adequacy metrics

## Supported Languages

The system supports all major Indian languages, including:
- Hindi
- Kannada
- Telugu
- Tamil
- Bengali
- Gujarati
- Malayalam
- Marathi
- Odia
- Punjabi
- And many more

## License

This project is licensed under the MIT License - see the LICENSE file for details.