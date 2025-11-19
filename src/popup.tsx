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

  const openOptionsRoute = (path: string) => {
    const url = chrome.runtime.getURL(`options.html#${path}`);
    chrome.tabs.create({ url });
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
              <span className="stat-value">{config?.urlRules?.filter(r => r.enabled).length || 0}</span>
            </div>
          </div>
        )}

        {/* Configured Toolbars list */}
        {config?.toolbarButtons && config.toolbarButtons.length > 0 && (
          <div style={{ marginTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '16px' }}>Configured Toolbars</h3>
              <button onClick={() => openOptionsRoute('/toolbars')} className="btn btn-secondary">Manage All</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px', marginTop: '8px' }}>
              {config.toolbarButtons.map((tb) => {
                // Migrate websitePatterns like in options page
                const websitePatterns: { pattern: string; enabled: boolean }[] = (tb.websitePatterns && Array.isArray(tb.websitePatterns))
                  ? (typeof tb.websitePatterns[0] === 'string'
                    ? (tb.websitePatterns as any).map((p: string) => ({ pattern: p, enabled: true }))
                    : (tb.websitePatterns as any))
                  : (((tb as any).urlRule) ? [{ pattern: (tb as any).urlRule, enabled: true }] : [{ pattern: '*', enabled: true }]);

                const patternsText = websitePatterns
                  .filter((wp: { pattern: string; enabled: boolean }) => wp.enabled)
                  .map((wp: { pattern: string; enabled: boolean }) => wp.pattern)
                  .join(', ');

                return (
                  <div key={tb.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    background: tb.enabled ? '#f9fafb' : '#f3f4f6'
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: tb.enabled ? '#111827' : '#9ca3af' }}>{tb.name}</div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>Patterns: <span style={{ fontFamily: 'monospace', color: '#374151' }}>{patternsText || '*'}</span></div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => openOptionsRoute(`/toolbar/${tb.id}`)}
                        className="btn btn-text"
                        title="Edit toolbar"
                      >Edit</button>
                    </div>
                  </div>
                );
              })}
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