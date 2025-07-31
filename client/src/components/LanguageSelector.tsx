import React, { useState } from 'react';
import { Language, SUPPORTED_LANGUAGES } from '../types';
import './LanguageSelector.css';

interface LanguageSelectorProps {
  onLanguageSelect: (langCode: string) => void;
  availableLanguages?: Language[];
  selectedLanguage?: string;
  disabled?: boolean;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  onLanguageSelect,
  availableLanguages = SUPPORTED_LANGUAGES,
  selectedLanguage = 'hi-IN',
  disabled = false
}) => {
  const [selected, setSelected] = useState(selectedLanguage);
  const [isOpen, setIsOpen] = useState(false);

  const handleLanguageChange = (langCode: string) => {
    setSelected(langCode);
    setIsOpen(false);
    onLanguageSelect(langCode);
  };

  const selectedLang = availableLanguages.find(lang => lang.code === selected);

  return (
    <div className="language-selector-container">
      <label className="language-label">
        Select Target Language
      </label>
      
      <div className={`language-dropdown ${isOpen ? 'open' : ''} ${disabled ? 'disabled' : ''}`}>
        <button
          type="button"
          className="language-button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
        >
          <div className="selected-language">
            <span className="language-name">{selectedLang?.name || 'Select Language'}</span>
            <span className="language-native">{selectedLang?.nativeName}</span>
          </div>
          <svg className={`dropdown-arrow ${isOpen ? 'rotated' : ''}`} width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>

        {isOpen && (
          <div className="language-dropdown-menu">
            <div className="language-list">
              {availableLanguages.filter(lang => lang.isSupported).map((language) => (
                <button
                  key={language.code}
                  type="button"
                  className={`language-option ${selected === language.code ? 'selected' : ''}`}
                  onClick={() => handleLanguageChange(language.code)}
                >
                  <div className="language-info">
                    <span className="language-name">{language.name}</span>
                    <span className="language-native">{language.nativeName}</span>
                  </div>
                  <span className="language-code">{language.code}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Click outside to close */}
      {isOpen && (
        <div 
          className="dropdown-overlay" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default LanguageSelector;