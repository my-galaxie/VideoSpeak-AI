import React, { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { JobStatus } from '../types';
import VideoInputComponent from './VideoInputComponent';
import LanguageSelector from './LanguageSelector';
import ProgressIndicator from './ProgressIndicator';
import ResultsDisplay from './ResultsDisplay';
import ErrorDisplay from './ErrorDisplay';
import './VideoSpeakApp.css';

const VideoSpeakApp: React.FC = () => {
  const { state, actions } = useApp();

  useEffect(() => {
    actions.loadLanguages();
  }, [actions]);

  const handleUrlSubmit = async (url: string) => {
    await actions.processVideo(url, state.selectedLanguage);
  };

  const handleLanguageSelect = (langCode: string) => {
    actions.setSelectedLanguage(langCode);
  };

  const handleCancelJob = async () => {
    await actions.cancelCurrentJob();
  };

  const handleRetry = () => {
    actions.clearError();
    if (state.currentJob) {
      actions.processVideo(state.currentJob.videoUrl, state.currentJob.targetLanguage);
    }
  };

  const handleStartOver = () => {
    actions.resetState();
  };

  const renderCurrentView = () => {
    // Show error if there's an error and no active processing
    if (state.error && !state.isProcessing) {
      return (
        <ErrorDisplay
          error={state.error}
          onRetry={state.currentJob ? handleRetry : undefined}
          onStartOver={handleStartOver}
          onDismiss={actions.clearError}
        />
      );
    }

    // Show results if job is completed
    if (state.currentJob?.status === JobStatus.COMPLETED && state.currentJob.results) {
      return (
        <div className="results-section">
          <ResultsDisplay
            results={state.currentJob.results}
            onCopyText={(text, type) => {
              console.log(`Copied ${type} text:`, text.substring(0, 50) + '...');
            }}
            onDownload={(type) => {
              console.log(`Downloaded ${type} text`);
            }}
          />
          <div className="action-buttons">
            <button 
              className="secondary-button"
              onClick={handleStartOver}
            >
              Process Another Video
            </button>
          </div>
        </div>
      );
    }

    // Show progress if processing
    if (state.isProcessing && state.currentJob) {
      return (
        <div className="processing-section">
          <ProgressIndicator
            stage={state.currentJob.currentStage}
            progress={state.currentJob.progress}
            isVisible={true}
          />
          <div className="processing-actions">
            <button 
              className="cancel-button"
              onClick={handleCancelJob}
              disabled={!state.isPolling}
            >
              Cancel Processing
            </button>
          </div>
        </div>
      );
    }

    // Show input form (default view)
    return (
      <div className="input-section">
        <VideoInputComponent
          onUrlSubmit={handleUrlSubmit}
          isLoading={state.isProcessing}
        />
        
        <div className="language-section">
          <LanguageSelector
            onLanguageSelect={handleLanguageSelect}
            availableLanguages={state.availableLanguages}
            selectedLanguage={state.selectedLanguage}
            disabled={state.isProcessing}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="videospeak-app">
      <header className="app-header">
        <div className="header-content">
          <h1 className="app-title">
            <span className="title-icon">🎬</span>
            VideoSpeak
          </h1>
          <p className="app-subtitle">
            AI-powered YouTube video transcription and translation to Indian languages
          </p>
        </div>
        
        {state.availableLanguages.length > 0 && (
          <div className="header-stats">
            <span className="stat-item">
              📺 YouTube Videos
            </span>
            <span className="stat-item">
              🎯 {state.availableLanguages.length} Languages
            </span>
            <span className="stat-item">
              ⚡ Fast Processing
            </span>
          </div>
        )}
      </header>

      <main className="app-main">
        {renderCurrentView()}
      </main>

      {state.jobHistory.length > 0 && !state.isProcessing && (
        <aside className="job-history">
          <h3>Recent Jobs</h3>
          <div className="history-list">
            {state.jobHistory.slice(0, 3).map((job) => (
              <div key={job.id} className={`history-item ${job.status}`}>
                <div className="history-info">
                  <span className="history-url">
                    {job.videoUrl.length > 50 
                      ? job.videoUrl.substring(0, 50) + '...' 
                      : job.videoUrl}
                  </span>
                  <span className="history-language">
                    → {job.targetLanguage}
                  </span>
                </div>
                <span className={`history-status ${job.status}`}>
                  {job.status === JobStatus.COMPLETED ? '✅' : 
                   job.status === JobStatus.FAILED ? '❌' : '⏳'}
                </span>
              </div>
            ))}
          </div>
        </aside>
      )}

      <footer className="app-footer">
        <div className="footer-content">
          <p>
            Powered by <strong>Sarvam AI</strong> for translation • 
            Built with ❤️ for multilingual accessibility
          </p>
          <div className="footer-links">
            <a href="#privacy" className="footer-link">Privacy</a>
            <a href="#terms" className="footer-link">Terms</a>
            <a href="#support" className="footer-link">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default VideoSpeakApp;