import React, { useState, useEffect } from 'react';
import { TranslationMethod } from '../types';
import { enhancedApiClient, TranslationMethodInfo } from '../services/enhanced-api';
import './TranslationMethodSelector.css';

interface TranslationMethodSelectorProps {
  onMethodSelect: (method: TranslationMethod) => void;
  selectedMethod: TranslationMethod;
}

const TranslationMethodSelector: React.FC<TranslationMethodSelectorProps> = ({
  onMethodSelect,
  selectedMethod
}) => {
  const [methods, setMethods] = useState<TranslationMethodInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMethods = async () => {
      try {
        setLoading(true);
        const response = await enhancedApiClient.getTranslationMethods();
        setMethods(response.methods);
        
        // Set default method if none selected
        if (!selectedMethod && response.defaultMethod) {
          onMethodSelect(response.defaultMethod);
        }
        
        setError(null);
      } catch (err) {
        console.error('Failed to fetch translation methods:', err);
        setError('Failed to load translation methods');
        
        // Fallback methods if API fails
        setMethods([
          {
            id: TranslationMethod.LLM,
            name: 'LLM Translation',
            description: 'Uses Large Language Models for translation'
          },
          {
            id: TranslationMethod.SARVAM,
            name: 'Sarvam API',
            description: 'Uses Sarvam API for Indian language translation'
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchMethods();
  }, [selectedMethod, onMethodSelect]);

  const handleMethodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const method = e.target.value as TranslationMethod;
    onMethodSelect(method);
  };

  if (loading) {
    return <div className="translation-method-loading">Loading translation methods...</div>;
  }

  return (
    <div className="translation-method-selector">
      <label htmlFor="translation-method">Translation Method:</label>
      <select
        id="translation-method"
        value={selectedMethod}
        onChange={handleMethodChange}
        className="translation-method-select"
      >
        {methods.map((method) => (
          <option key={method.id} value={method.id}>
            {method.name}
          </option>
        ))}
      </select>
      
      {selectedMethod && (
        <div className="translation-method-info">
          {methods.find(m => m.id === selectedMethod)?.description}
          
          {selectedMethod === TranslationMethod.LLM && (
            <div className="translation-method-providers">
              <span className="provider-label">Using:</span>
              {methods.find(m => m.id === TranslationMethod.LLM)?.providers?.map(provider => (
                <span key={provider} className="provider-badge">{provider}</span>
              )) || <span className="provider-badge">Default LLM</span>}
            </div>
          )}
        </div>
      )}
      
      {error && <div className="translation-method-error">{error}</div>}
    </div>
  );
};

export default TranslationMethodSelector;