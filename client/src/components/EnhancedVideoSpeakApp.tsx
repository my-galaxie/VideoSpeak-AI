import React, { useEffect, useState } from 'react';
import { useApp } from '../context/EnhancedAppContext';
import { JobStatus, TranslationMethod, ProcessingStage } from '../types';
import VideoInputComponent from './VideoInputComponent';
import LanguageSelector from './LanguageSelector';
import TranslationMethodSelector from './TranslationMethodSelector';
import ProgressIndicator from './ProgressIndicator';
import ResultsDisplay from './ResultsDisplay';
import ErrorDisplay from './ErrorDisplay';
import { enhancedApiClient } from '../services/enhanced-api';
import './VideoSpeakApp.css';

const EnhancedVideoSpeakApp: React.FC = () => {
  const { state, actions } = useApp();
  const [translationMethod, setTranslationMethod] = useState<TranslationMethod>(TranslationMethod.LLM);

  useEffect(() => {
    actions.loadLanguages();
  }, [actions]);

  const handleUrlSubmit = async (url: string) => {
    try {
      // Use the enhanced API client with translation method
      const response = await enhancedApiClient.processVideo({
        youtubeUrl: url,
        targetLanguage: state.selectedLanguage,
        translationMethod
      });

      // Update the app state with the job ID
      if (response && response.jobId) {
        actions.setCurrentJob({
          id: response.jobId,
          videoUrl: url,
          targetLanguage: state.selectedLanguage,
          status: response.status,
          progress: 0,
          currentStage: ProcessingStage.VALIDATING_URL,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        actions.setIsProcessing(true);
        actions.startPolling(response.jobId);
      }
    } catch (error: any) {
      console.error('Error processing video:', error);
      // Use dispatch to set the error state
      actions.resetState();
      actions.setIsProcessing(false);
      // Use the error message if available, otherwise use a generic message
      const errorMessage = error && typeof error.message === 'string' 
        ? error.message 
        : 'Failed to process video';
      
      // Since there's no direct setError action, we need to use the context's processVideo
      // method which will handle errors internally
      console.error('Processing failed:', errorMessage);
    }
  };

  const handleLanguageSelect = (langCode: string) => {
    actions.setSelectedLanguage(langCode);
  };

  const handleTranslationMethodSelect = (method: TranslationMethod) => {
    setTranslationMethod(method);
  };

  const handleCancelJob = async () => {
    await actions.cancelCurrentJob();
  };

  const handleRetry = () => {
    actions.clearError();
    if (state.currentJob) {
      handleUrlSubmit(state.currentJob.videoUrl);
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
          
          <TranslationMethodSelector
            onMethodSelect={handleTranslationMethodSelect}
            selectedMethod={translationMethod}
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
            <span className="version-badge">LLM Enhanced</span>
          </h1>
          <p className="app-subtitle">
            AI-powered YouTube video transcription and translation with LLM support
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
              🧠 LLM Translation
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
            Powered by <strong>LLM Translation</strong> and <strong>Sarvam AI</strong> • 
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

export default EnhancedVideoSpeakApp;