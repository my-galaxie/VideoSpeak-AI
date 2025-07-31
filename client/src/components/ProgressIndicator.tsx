import React from 'react';
import { ProcessingStage } from '../types';
import './ProgressIndicator.css';

interface ProgressIndicatorProps {
  stage: ProcessingStage;
  progress: number;
  message?: string;
  isVisible?: boolean;
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  stage,
  progress,
  message,
  isVisible = true
}) => {
  if (!isVisible) return null;

  const stages = [
    { key: ProcessingStage.VALIDATING_URL, label: 'Validating URL', icon: '🔍' },
    { key: ProcessingStage.EXTRACTING_AUDIO, label: 'Extracting Audio', icon: '🎵' },
    { key: ProcessingStage.TRANSCRIBING, label: 'Transcribing', icon: '📝' },
    { key: ProcessingStage.TRANSLATING, label: 'Translating', icon: '🌐' },
    { key: ProcessingStage.COMPLETED, label: 'Completed', icon: '✅' }
  ];

  const currentStageIndex = stages.findIndex(s => s.key === stage);
  const currentStage = stages[currentStageIndex];

  const getStageStatus = (index: number) => {
    if (index < currentStageIndex) return 'completed';
    if (index === currentStageIndex) return 'active';
    return 'pending';
  };

  const getProgressMessage = () => {
    if (message) return message;
    
    switch (stage) {
      case ProcessingStage.VALIDATING_URL:
        return 'Checking video accessibility...';
      case ProcessingStage.EXTRACTING_AUDIO:
        return 'Downloading and extracting audio...';
      case ProcessingStage.TRANSCRIBING:
        return 'Converting speech to text...';
      case ProcessingStage.TRANSLATING:
        return 'Translating to your selected language...';
      case ProcessingStage.COMPLETED:
        return 'Processing complete!';
      default:
        return 'Processing...';
    }
  };

  return (
    <div className="progress-indicator">
      <div className="progress-header">
        <h3 className="progress-title">
          {currentStage?.icon} {currentStage?.label}
        </h3>
        <span className="progress-percentage">{Math.round(progress)}%</span>
      </div>

      <div className="progress-bar-container">
        <div 
          className="progress-bar"
          style={{ width: `${progress}%` }}
        />
      </div>

      <p className="progress-message">{getProgressMessage()}</p>

      <div className="stage-indicators">
        {stages.map((stageInfo, index) => {
          const status = getStageStatus(index);
          return (
            <div 
              key={stageInfo.key}
              className={`stage-indicator ${status}`}
            >
              <div className="stage-icon">
                {status === 'completed' ? '✓' : 
                 status === 'active' ? (
                   <div className="loading-dot"></div>
                 ) : stageInfo.icon}
              </div>
              <span className="stage-label">{stageInfo.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProgressIndicator;