import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { 
  ProcessingJob, 
  JobStatus, 
  ProcessingStage, 
  Language, 
  DEFAULT_LANGUAGE 
} from '../types';
import { apiClient, JobStatusPoller } from '../services/api';

// State interface
interface AppState {
  currentJob: ProcessingJob | null;
  jobHistory: ProcessingJob[];
  isProcessing: boolean;
  error: string | null;
  selectedLanguage: string;
  availableLanguages: Language[];
  isPolling: boolean;
}

// Action types
type AppAction = 
  | { type: 'SET_PROCESSING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_CURRENT_JOB'; payload: ProcessingJob | null }
  | { type: 'UPDATE_JOB_STATUS'; payload: Partial<ProcessingJob> }
  | { type: 'ADD_TO_HISTORY'; payload: ProcessingJob }
  | { type: 'SET_SELECTED_LANGUAGE'; payload: string }
  | { type: 'SET_AVAILABLE_LANGUAGES'; payload: Language[] }
  | { type: 'SET_POLLING'; payload: boolean }
  | { type: 'RESET_STATE' };

// Initial state
const initialState: AppState = {
  currentJob: null,
  jobHistory: [],
  isProcessing: false,
  error: null,
  selectedLanguage: DEFAULT_LANGUAGE,
  availableLanguages: [],
  isPolling: false
};

// Reducer
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_PROCESSING':
      return { ...state, isProcessing: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    
    case 'SET_CURRENT_JOB':
      return { ...state, currentJob: action.payload };
    
    case 'UPDATE_JOB_STATUS':
      if (!state.currentJob) return state;
      return {
        ...state,
        currentJob: { ...state.currentJob, ...action.payload, updatedAt: new Date() }
      };
    
    case 'ADD_TO_HISTORY':
      return {
        ...state,
        jobHistory: [action.payload, ...state.jobHistory.slice(0, 9)]
      };
    
    case 'SET_SELECTED_LANGUAGE':
      return { ...state, selectedLanguage: action.payload };
    
    case 'SET_AVAILABLE_LANGUAGES':
      return { ...state, availableLanguages: action.payload };
    
    case 'SET_POLLING':
      return { ...state, isPolling: action.payload };
    
    case 'RESET_STATE':
      return { ...initialState, availableLanguages: state.availableLanguages };
    
    default:
      return state;
  }
}

// Context
interface AppContextType {
  state: AppState;
  actions: {
    processVideo: (youtubeUrl: string, targetLanguage?: string) => Promise<void>;
    cancelCurrentJob: () => Promise<void>;
    setSelectedLanguage: (language: string) => void;
    clearError: () => void;
    resetState: () => void;
    loadLanguages: () => Promise<void>;
  };
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Provider component
interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const pollerRef = React.useRef<JobStatusPoller>(new JobStatusPoller());

  // Load available languages on mount
  useEffect(() => {
    loadLanguages();
  }, []);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      pollerRef.current.stopPolling();
    };
  }, []);

  const loadLanguages = async (): Promise<void> => {
    try {
      const response = await apiClient.getSupportedLanguages();
      dispatch({ type: 'SET_AVAILABLE_LANGUAGES', payload: response.languages });
    } catch (error) {
      console.error('Failed to load languages:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load supported languages' });
    }
  };

  const processVideo = async (youtubeUrl: string, targetLanguage?: string): Promise<void> => {
    try {
      dispatch({ type: 'SET_PROCESSING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      const request = {
        youtubeUrl,
        targetLanguage: targetLanguage || state.selectedLanguage
      };

      const response = await apiClient.processVideo(request);
      
      const newJob: ProcessingJob = {
        id: response.jobId,
        videoUrl: youtubeUrl,
        targetLanguage: request.targetLanguage,
        status: response.status,
        progress: 0,
        currentStage: ProcessingStage.VALIDATING_URL,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      dispatch({ type: 'SET_CURRENT_JOB', payload: newJob });
      
      // Start polling for job status
      startJobPolling(response.jobId);

    } catch (error) {
      dispatch({ type: 'SET_PROCESSING', payload: false });
      dispatch({ type: 'SET_ERROR', payload: (error as Error).message });
    }
  };

  const startJobPolling = (jobId: string): void => {
    dispatch({ type: 'SET_POLLING', payload: true });
    
    pollerRef.current.startPolling(
      jobId,
      (jobStatus) => {
        dispatch({ 
          type: 'UPDATE_JOB_STATUS', 
          payload: {
            status: jobStatus.status,
            progress: jobStatus.progress,
            currentStage: jobStatus.currentStage,
            results: jobStatus.results,
            error: jobStatus.error
          }
        });

        // Handle job completion
        if (jobStatus.status === JobStatus.COMPLETED || jobStatus.status === JobStatus.FAILED) {
          dispatch({ type: 'SET_PROCESSING', payload: false });
          dispatch({ type: 'SET_POLLING', payload: false });
          
          if (state.currentJob) {
            dispatch({ type: 'ADD_TO_HISTORY', payload: state.currentJob });
          }

          if (jobStatus.status === JobStatus.FAILED) {
            dispatch({ type: 'SET_ERROR', payload: jobStatus.error || 'Job failed' });
          }
        }
      },
      (error) => {
        dispatch({ type: 'SET_PROCESSING', payload: false });
        dispatch({ type: 'SET_POLLING', payload: false });
        dispatch({ type: 'SET_ERROR', payload: error.message });
      }
    );
  };

  const cancelCurrentJob = async (): Promise<void> => {
    if (!state.currentJob) return;

    try {
      await apiClient.cancelJob(state.currentJob.id);
      pollerRef.current.stopPolling();
      
      dispatch({ type: 'SET_PROCESSING', payload: false });
      dispatch({ type: 'SET_POLLING', payload: false });
      dispatch({ 
        type: 'UPDATE_JOB_STATUS', 
        payload: { 
          status: JobStatus.FAILED, 
          error: 'Cancelled by user' 
        }
      });
      
      if (state.currentJob) {
        dispatch({ type: 'ADD_TO_HISTORY', payload: state.currentJob });
      }
      
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: (error as Error).message });
    }
  };

  const setSelectedLanguage = (language: string): void => {
    dispatch({ type: 'SET_SELECTED_LANGUAGE', payload: language });
  };

  const clearError = (): void => {
    dispatch({ type: 'SET_ERROR', payload: null });
  };

  const resetState = (): void => {
    pollerRef.current.stopPolling();
    dispatch({ type: 'RESET_STATE' });
  };

  const contextValue: AppContextType = {
    state,
    actions: {
      processVideo,
      cancelCurrentJob,
      setSelectedLanguage,
      clearError,
      resetState,
      loadLanguages
    }
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

// Hook to use the context
export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

export default AppContext;