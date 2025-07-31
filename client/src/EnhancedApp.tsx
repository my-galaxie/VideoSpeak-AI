import React from 'react';
import { AppProvider } from './context/EnhancedAppContext';
import EnhancedVideoSpeakApp from './components/EnhancedVideoSpeakApp';
import './App.css';

function EnhancedApp() {
  return (
    <AppProvider>
      <EnhancedVideoSpeakApp />
    </AppProvider>
  );
}

export default EnhancedApp;