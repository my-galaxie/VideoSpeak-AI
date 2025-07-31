# How to Run the VideoSpeak Project

Follow these steps to run the VideoSpeak project with LLM translation:

## Prerequisites

1. Make sure you have Node.js and npm installed
2. Obtain API keys for:
   - Hugging Face (free tier is sufficient)
   - OpenAI (optional)
   - Sarvam AI (optional)

## Setup

1. Clone the repository or extract the project files
2. Install dependencies:
   ```
   npm install
   cd client && npm install
   cd ../server && npm install
   cd ..
   ```

## Configuration

1. Update the API keys in the following files:
   - `server/.env`
   - `run-enhanced-app.bat` (Windows) or create a shell script for Mac/Linux

2. For the Hugging Face API key:
   - Go to [Hugging Face](https://huggingface.co/)
   - Create an account or log in
   - Go to Settings > Access Tokens
   - Create a new token with "Read" access
   - Copy the token and use it as your HUGGINGFACE_API_KEY

## Running the Project

### Windows

1. Double-click the `run-enhanced-app.bat` file
   - This will start both the server and client

### Manual Start

1. Start the server:
   ```
   cd server
   npm run build
   npm run start:enhanced
   ```

2. In a new terminal, start the client:
   ```
   cd client
   npm run start:enhanced
   ```

3. Open your browser and navigate to `http://localhost:3000`

## Using the Application

1. Enter a YouTube URL in the input field
2. Select your target language from the dropdown
3. Choose your preferred translation method (LLM or Sarvam API)
4. Click "Process Video"
5. Wait for the processing to complete
6. View the transcription and translation results

## Troubleshooting

If you encounter any issues:

1. Check the console logs in both the server and client terminals
2. Make sure your API keys are correctly set
3. Ensure all dependencies are installed
4. Verify that ports 3000 and 3001 are available

For the Hugging Face API, you can use "hf_dummy_key" for testing, but some features may be limited.