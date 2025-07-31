import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import EnhancedApp from './EnhancedApp';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

// Check if we should use the enhanced app
const useEnhanced = process.env.REACT_APP_USE_ENHANCED === 'true';

root.render(
  <React.StrictMode>
    {useEnhanced ? <EnhancedApp /> : <App />}
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();