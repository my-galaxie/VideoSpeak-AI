import React, { useState } from 'react';
import { ProcessingResults } from '../types';
import './ResultsDisplay.css';

interface ResultsDisplayProps {
  results: ProcessingResults;
  onCopyText?: (text: string, type: 'original' | 'translated') => void;
  onDownload?: (type: 'original' | 'translated' | 'both') => void;
}

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({
  results,
  onCopyText,
  onDownload
}) => {
  const [activeTab, setActiveTab] = useState<'original' | 'translated'>('translated');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const handleCopy = async (text: string, type: 'original' | 'translated') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(type);
      onCopyText?.(text, type);
      
      setTimeout(() => setCopiedText(null), 2000);
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  };

  const handleDownload = (type: 'original' | 'translated' | 'both') => {
    onDownload?.(type);
    
    let content = '';
    let filename = '';
    
    switch (type) {
      case 'original':
        content = results.originalText;
        filename = `transcription_${results.sourceLanguage}.txt`;
        break;
      case 'translated':
        content = results.translatedText;
        filename = `translation_${results.targetLanguage}.txt`;
        break;
      case 'both':
        content = `Original (${results.sourceLanguage}):\n${results.originalText}\n\n---\n\nTranslation (${results.targetLanguage}):\n${results.translatedText}`;
        filename = `videospeak_results.txt`;
        break;
    }
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 80) return 'high';
    if (accuracy >= 70) return 'medium';
    return 'low';
  };

  const formatAccuracy = (accuracy: number) => {
    return `${Math.round(accuracy)}%`;
  };

  return (
    <div className="results-display">
      <div className="results-header">
        <h2>Processing Results</h2>
        <div className="video-info">
          <h3>{results.videoMetadata.title}</h3>
          <div className="video-details">
            <span className="duration">
              ⏱️ {Math.floor(results.videoMetadata.duration / 60)}:{(results.videoMetadata.duration % 60).toString().padStart(2, '0')}
            </span>
            <span className="audio-quality">
              🎵 {results.videoMetadata.audioQuality} quality
            </span>
            {results.videoMetadata.isShortVideo && (
              <span className="short-video">⚡ Short video</span>
            )}
          </div>
        </div>
      </div>

      <div className="accuracy-metrics">
        <div className="metric-card">
          <div className="metric-label">Transcription Accuracy</div>
          <div className={`metric-value ${getAccuracyColor(results.transcriptionResult.overallAccuracy * 100)}`}>
            {formatAccuracy(results.transcriptionResult.overallAccuracy * 100)}
          </div>
          <div className="metric-details">
            Confidence: {formatAccuracy(results.transcriptionResult.confidence * 100)}
          </div>
        </div>
        
        <div className="metric-card">
          <div className="metric-label">Translation Accuracy</div>
          <div className={`metric-value ${getAccuracyColor(results.translationResult.translationAccuracy)}`}>
            {formatAccuracy(results.translationResult.translationAccuracy)}
          </div>
          <div className="metric-details">
            Confidence: {formatAccuracy(results.translationResult.confidenceScore)}
          </div>
        </div>
      </div>

      {(results.transcriptionResult.overallAccuracy < 0.7 || results.translationResult.translationAccuracy < 70) && (
        <div className="accuracy-warning">
          ⚠️ Low accuracy detected. Consider checking the source audio quality or trying again.
        </div>
      )}

      <div className="text-tabs">
        <button
          className={`tab-button ${activeTab === 'original' ? 'active' : ''}`}
          onClick={() => setActiveTab('original')}
        >
          Original ({results.sourceLanguage})
        </button>
        <button
          className={`tab-button ${activeTab === 'translated' ? 'active' : ''}`}
          onClick={() => setActiveTab('translated')}
        >
          Translation ({results.targetLanguage})
        </button>
      </div>

      <div className="text-content">
        {activeTab === 'original' ? (
          <div className="text-panel">
            <div className="text-header">
              <h4>Original Transcription</h4>
              <div className="text-actions">
                <button
                  className={`action-button ${copiedText === 'original' ? 'copied' : ''}`}
                  onClick={() => handleCopy(results.originalText, 'original')}
                >
                  {copiedText === 'original' ? '✓ Copied' : '📋 Copy'}
                </button>
                <button
                  className="action-button"
                  onClick={() => handleDownload('original')}
                >
                  💾 Download
                </button>
              </div>
            </div>
            <div className="text-area">
              <p>{results.originalText}</p>
            </div>
          </div>
        ) : (
          <div className="text-panel">
            <div className="text-header">
              <h4>Translated Text</h4>
              <div className="text-actions">
                <button
                  className={`action-button ${copiedText === 'translated' ? 'copied' : ''}`}
                  onClick={() => handleCopy(results.translatedText, 'translated')}
                >
                  {copiedText === 'translated' ? '✓ Copied' : '📋 Copy'}
                </button>
                <button
                  className="action-button"
                  onClick={() => handleDownload('translated')}
                >
                  💾 Download
                </button>
              </div>
            </div>
            <div className="text-area">
              <p>{results.translatedText}</p>
            </div>
          </div>
        )}
      </div>

      <div className="quality-details">
        <h4>Quality Metrics</h4>
        <div className="quality-grid">
          <div className="quality-item">
            <span className="quality-label">Fluency:</span>
            <span className="quality-value">{formatAccuracy(results.translationResult.qualityMetrics.fluency)}</span>
          </div>
          <div className="quality-item">
            <span className="quality-label">Adequacy:</span>
            <span className="quality-value">{formatAccuracy(results.translationResult.qualityMetrics.adequacy)}</span>
          </div>
          <div className="quality-item">
            <span className="quality-label">Semantic Similarity:</span>
            <span className="quality-value">{formatAccuracy(results.translationResult.qualityMetrics.semanticSimilarity)}</span>
          </div>
          <div className="quality-item">
            <span className="quality-label">Grammar:</span>
            <span className="quality-value">{formatAccuracy(results.translationResult.qualityMetrics.grammarScore)}</span>
          </div>
        </div>
      </div>

      <div className="download-all">
        <button
          className="download-all-button"
          onClick={() => handleDownload('both')}
        >
          📥 Download Both Texts
        </button>
      </div>
    </div>
  );
};

export default ResultsDisplay;