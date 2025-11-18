import { useEffect, useState } from 'react';
import { storageManager } from './utils/storage';
import type { AgentBarConfig } from './types';
import './popup.css';

const Popup = () => {
  const [config, setConfig] = useState<AgentBarConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUrl, setCurrentUrl] = useState('');

  useEffect(() => {
    const init = async () => {
      try {
        // Get current tab URL
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab.url) {
          setCurrentUrl(tab.url);
        }

        // Load configuration
        const configData = await storageManager.getConfig();
        setConfig(configData);
      } catch (error) {
        console.error('Error loading popup data:', error);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  const openOptions = () => {
    chrome.runtime.openOptionsPage();
  };

  const getCurrentDomain = () => {
    if (!currentUrl) return 'Unknown';
    try {
      return new URL(currentUrl).hostname;
    } catch {
      return 'Unknown';
    }
  };

  if (loading) {
    return (
      <div className="popup">
        <div className="popup-loading">Loading...</div>
      </div>
    );
  }

  const enabledProviders = config?.llmProviders.filter(p => p.enabled) || [];
  const defaultProvider = enabledProviders.find(p => p.isDefault) || enabledProviders[0];

  return (
    <div className="popup">
      <div className="popup-header">
        <div className="logo">
          <h2>Agent Bar</h2>
        </div>
        <div className="status">
          {defaultProvider ? (
            <span className="status-connected">●</span>
          ) : (
            <span className="status-disconnected">●</span>
          )}
        </div>
      </div>

      <div className="popup-content">
        <div className="current-site">
          <div className="site-label">Current Site:</div>
          <div className="site-name">{getCurrentDomain()}</div>
        </div>

        <div className="provider-status">
          <div className="provider-label">LLM Provider:</div>
          <div className="provider-info">
            {defaultProvider ? (
              <>
                <span className="provider-name">{defaultProvider.name}</span>
                <span className="provider-type">({defaultProvider.type})</span>
              </>
            ) : (
              <span className="no-provider">No provider configured</span>
            )}
          </div>
        </div>

        <div className="quick-actions">
          <button
            onClick={openOptions}
            className="btn btn-primary btn-full"
          >
            Open Settings
          </button>
        </div>

        {enabledProviders.length === 0 && (
          <div className="setup-notice">
            <p>No LLM providers configured. Configure your first provider to start using Agent Bar.</p>
            <button onClick={openOptions} className="btn btn-secondary">
              Setup Provider
            </button>
          </div>
        )}

        {enabledProviders.length > 0 && (
          <div className="stats">
            <div className="stat-item">
              <span className="stat-label">Enabled Providers:</span>
              <span className="stat-value">{enabledProviders.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Toolbar Buttons:</span>
              <span className="stat-value">{config?.toolbarButtons.filter(b => b.enabled).length || 0}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">URL Rules:</span>
              <span className="stat-value">{config?.urlRules.filter(r => r.enabled).length || 0}</span>
            </div>
          </div>
        )}
      </div>

      <div className="popup-footer">
        <button onClick={openOptions} className="btn btn-text">
          Settings
        </button>
        <a
          href="https://github.com/agent-bar/agent-bar"
          target="_blank"
          className="btn btn-text"
        >
          GitHub
        </a>
      </div>
    </div>
  );
};

export default Popup;