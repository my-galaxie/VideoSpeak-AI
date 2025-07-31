import React from 'react';
import { AppProvider } from './context/AppContext';
import VideoSpeakApp from './components/VideoSpeakApp';
import './App.css';

function App() {
  return (
    <AppProvider>
      <VideoSpeakApp />
    </AppProvider>
  );
}

export default App;