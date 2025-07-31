# VideoSpeak with LLM Translation - Quick Start Guide

## Prerequisites

- Node.js (v14 or later)
- npm

## Quick Start

### Windows

1. Double-click the `run-enhanced-app.bat` file
   - This will:
     - Check for environment variables and create them if needed
     - Install dependencies if needed
     - Build the server
     - Start the server (running on port 3001)
     - Start the client (running on port 3000)
     - Open your browser to http://localhost:3000

2. The application will open automatically in your default browser

### Mac/Linux

1. Open a terminal and run:
   ```bash
   # Make the script executable
   chmod +x run-enhanced-app.sh
   
   # Run the script
   ./run-enhanced-app.sh
   ```

## Using the Application

1. Enter a YouTube URL in the input field
2. Select your target language from the dropdown
3. Choose your preferred translation method:
   - **LLM Translation**: Uses AI language models for high-quality translation
   - **Sarvam API**: Specialized for Indian languages (requires API key)
4. Click "Process Video"
5. Wait for the processing to complete
6. View the transcription and translation results

## API Keys

The application comes with demo API keys for testing purposes:

- **OpenAI API Key**: Pre-configured for LLM translation
- **HuggingFace API Key**: Pre-configured for free LLM translation
- **Sarvam API Key**: You'll need to provide your own key if you want to use Sarvam API

To use your own API keys, edit the `.env` file in the `server` directory.

## Troubleshooting

If you encounter any issues:

1. **Port conflicts**: Make sure ports 3000 and 3001 are available
   - If port 3000 is in use, the client will automatically try to use another port
   - If port 3001 is in use, you'll need to change it in `server/.env`

2. **Dependency issues**: If you see errors about missing dependencies:
   ```bash
   cd client && npm install
   cd ../server && npm install
   ```

3. **Build errors**: If the server fails to build:
   ```bash
   cd server
   npm run build
   ```
   Look for TypeScript errors and fix them

4. **API key issues**: If translations fail:
   - Check that the API keys in `server/.env` are valid
   - Try using the HuggingFace provider which works with the demo key

5. **YouTube video issues**:
   - Make sure the video is public and not age-restricted
   - Try a shorter video for testing (under 5 minutes)
   - Check that the video has clear audio for better transcription