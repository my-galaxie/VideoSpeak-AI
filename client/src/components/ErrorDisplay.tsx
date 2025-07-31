import React from 'react';
import './ErrorDisplay.css';

interface ErrorDisplayProps {
  error: string;
  onRetry?: () => void;
  onStartOver?: () => void;
  onDismiss?: () => void;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  onRetry,
  onStartOver,
  onDismiss
}) => {
  const getErrorIcon = (error: string): string => {
    if (error.toLowerCase().includes('network')) return '🌐';
    if (error.toLowerCase().includes('timeout')) return '⏱️';
    if (error.toLowerCase().includes('private')) return '🔒';
    if (error.toLowerCase().includes('not found')) return '🔍';
    if (error.toLowerCase().includes('rate limit')) return '⏳';
    if (error.toLowerCase().includes('audio')) return '🎵';
    return '⚠️';
  };

  const getErrorType = (error: string): 'network' | 'video' | 'service' | 'general' => {
    if (error.toLowerCase().includes('network') || error.toLowerCase().includes('timeout')) {
      return 'network';
    }
    if (error.toLowerCase().includes('private') || error.toLowerCase().includes('not found') || error.toLowerCase().includes('audio')) {
      return 'video';
    }
    if (error.toLowerCase().includes('rate limit') || error.toLowerCase().includes('service')) {
      return 'service';
    }
    return 'general';
  };

  const getSuggestions = (errorType: string): string[] => {
    switch (errorType) {
      case 'network':
        return [
          'Check your internet connection',
          'Try again in a few moments',
          'Disable VPN if you\'re using one'
        ];
      case 'video':
        return [
          'Make sure the video is public',
          'Verify the YouTube URL is correct',
          'Try a different video with clear audio'
        ];
      case 'service':
        return [
          'Wait a few minutes before trying again',
          'The service may be temporarily busy',
          'Try with a shorter video'
        ];
      default:
        return [
          'Try refreshing the page',
          'Check if the issue persists',
          'Contact support if the problem continues'
        ];
    }
  };

  const errorType = getErrorType(error);
  const suggestions = getSuggestions(errorType);

  return (
    <div className={`error-display ${errorType}`}>
      <div className="error-content">
        <div className="error-header">
          <span className="error-icon">{getErrorIcon(error)}</span>
          <h3 className="error-title">Something went wrong</h3>
        </div>
        
        <div className="error-message">
          <p>{error}</p>
        </div>

        <div className="error-suggestions">
          <h4>Here's what you can try:</h4>
          <ul>
            {suggestions.map((suggestion, index) => (
              <li key={index}>{suggestion}</li>
            ))}
          </ul>
        </div>

        <div className="error-actions">
          {onRetry && (
            <button 
              className="retry-button"
              onClick={onRetry}
            >
              🔄 Try Again
            </button>
          )}
          
          {onStartOver && (
            <button 
              className="start-over-button"
              onClick={onStartOver}
            >
              🏠 Start Over
            </button>
          )}
          
          {onDismiss && !onRetry && !onStartOver && (
            <button 
              className="dismiss-button"
              onClick={onDismiss}
            >
              ✕ Dismiss
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrorDisplay;