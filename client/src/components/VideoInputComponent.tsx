import React, { useState } from 'react';
import './VideoInputComponent.css';

interface VideoInputComponentProps {
  onUrlSubmit: (url: string) => void;
  isLoading?: boolean;
}

const VideoInputComponent: React.FC<VideoInputComponentProps> = ({ 
  onUrlSubmit, 
  isLoading = false 
}) => {
  const [url, setUrl] = useState('');
  const [isValid, setIsValid] = useState(true);
  const [error, setError] = useState('');

  const validateYouTubeUrl = (url: string): boolean => {
    const patterns = [
      /^https?:\/\/(www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
      /^https?:\/\/(www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
      /^https?:\/\/(www\.)?youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
      /^https?:\/\/youtu\.be\/([a-zA-Z0-9_-]{11})/,
      /^https?:\/\/(www\.)?youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/
    ];

    return patterns.some(pattern => pattern.test(url));
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    setUrl(newUrl);
    
    if (newUrl.trim() === '') {
      setIsValid(true);
      setError('');
    } else {
      const valid = validateYouTubeUrl(newUrl);
      setIsValid(valid);
      setError(valid ? '' : 'Please enter a valid YouTube URL');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) {
      setError('Please enter a YouTube URL');
      setIsValid(false);
      return;
    }

    if (!validateYouTubeUrl(url)) {
      setError('Please enter a valid YouTube URL');
      setIsValid(false);
      return;
    }

    onUrlSubmit(url.trim());
  };

  const exampleUrls = [
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtu.be/dQw4w9WgXcQ'
  ];

  return (
    <div className="video-input-container">
      <div className="video-input-header">
        <h2>Enter YouTube Video URL</h2>
        <p>Paste the URL of the YouTube video you want to transcribe and translate</p>
      </div>

      <form onSubmit={handleSubmit} className="video-input-form">
        <div className="input-group">
          <input
            type="url"
            value={url}
            onChange={handleUrlChange}
            placeholder="https://www.youtube.com/watch?v=..."
            className={`url-input ${!isValid ? 'error' : ''}`}
            disabled={isLoading}
            aria-label="YouTube video URL"
          />
          <button 
            type="submit" 
            className="submit-button"
            disabled={!isValid || !url.trim() || isLoading}
          >
            {isLoading ? 'Processing...' : 'Process Video'}
          </button>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
      </form>

      <div className="help-section">
        <h3>Supported URL formats:</h3>
        <ul className="url-examples">
          {exampleUrls.map((example, index) => (
            <li key={index}>
              <code>{example}</code>
              <button
                type="button"
                onClick={() => setUrl(example)}
                className="example-button"
                disabled={isLoading}
              >
                Use this
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="features-info">
        <h3>What we support:</h3>
        <ul>
          <li>✅ Public YouTube videos</li>
          <li>✅ Videos with clear audio</li>
          <li>✅ Short videos (under 5 minutes) get priority processing</li>
          <li>✅ Translation to 23+ Indian languages</li>
          <li>❌ Private or unlisted videos</li>
          <li>❌ Videos without audio</li>
        </ul>
      </div>
    </div>
  );
};

export default VideoInputComponent;