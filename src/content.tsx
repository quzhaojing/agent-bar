import { createRoot } from 'react-dom/client';
import React, { useEffect, useState, useRef } from 'react';
import { storageManager } from './utils/storage';
import { urlMatcher } from './utils/urlMatcher';
import ResultPanel from './components/ResultPanel';
import type { TextSelection, ToolbarPosition, ToolbarButton, UrlRule } from './types';
import './style.css';

const AgentBarApp: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<ToolbarPosition>({ x: 0, y: 0, visible: false, direction: 'up' });
  const [selectedText, setSelectedText] = useState<string>('');
  const [currentUrl, setCurrentUrl] = useState<string>('');
  const [rules, setRules] = useState<UrlRule[]>([]);
  const [buttons, setButtons] = useState<ToolbarButton[]>([]);
  const [loading, setLoading] = useState(false);

  // Result panel state
  const [resultPanelVisible, setResultPanelVisible] = useState(false);
  const [resultPanelContent, setResultPanelContent] = useState('');
  const [resultPanelPosition, setResultPanelPosition] = useState({ x: 0, y: 0 });

  const debounceTimerRef = useRef<NodeJS.Timeout>();
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize
  useEffect(() => {
    const init = async () => {
      try {
        // Load configuration
        const [urlRules, toolbarButtons] = await Promise.all([
          storageManager.getUrlRules(),
          storageManager.getToolbarButtons(),
        ]);

        setRules(urlRules);
        setButtons(toolbarButtons);
        setCurrentUrl(window.location.href);

        // Set up event listeners
        setupEventListeners();

        console.log('Agent Bar initialized successfully');
      } catch (error) {
        console.error('Error initializing Agent Bar:', error);
      }
    };

    init();
  }, []);

  // Set up event listeners
  const setupEventListeners = () => {
    // Text selection event
    document.addEventListener('mouseup', handleTextSelection);
    document.addEventListener('keyup', handleTextSelection);

    // Hide toolbar when clicking outside
    document.addEventListener('click', handleClickOutside);

    // Hide toolbar on scroll
    document.addEventListener('scroll', handleScroll);

    // Watch for URL changes (for SPA)
    watchUrlChanges();
  };

  // Handle text selection
  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      hideToolbar();
      return;
    }

    const selectedText = selection.toString().trim();
    if (!selectedText || selectedText.length < 1) {
      hideToolbar();
      return;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    // Check if current URL should show toolbar
    if (!urlMatcher.shouldEnable(window.location.href, rules)) {
      hideToolbar();
      return;
    }

    // Get matching buttons for current URL
    const matchingButtons = urlMatcher.getToolbarButtonsForUrl(
      window.location.href,
      rules,
      buttons
    );

    if (matchingButtons.length === 0) {
      hideToolbar();
      return;
    }

    // Show toolbar with debounce
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      showToolbar(selectedText, rect);
    }, 300);
  };

  // Show toolbar
  const showToolbar = (text: string, rect: DOMRect) => {
    const toolbarHeight = 40;
    const toolbarWidth = 200; // Will be adjusted based on content
    const margin = 10;

    let x = rect.left + rect.width / 2 - toolbarWidth / 2;
    let y = rect.top - toolbarHeight - margin;
    let direction: 'up' | 'down' = 'up';

    // Adjust position if toolbar would go off-screen
    if (y < 0) {
      y = rect.bottom + margin;
      direction = 'down';
    }

    if (x < margin) {
      x = margin;
    } else if (x + toolbarWidth > window.innerWidth - margin) {
      x = window.innerWidth - toolbarWidth - margin;
    }

    // Adjust for scroll position
    x += window.scrollX;
    y += window.scrollY;

    setSelectedText(text);
    setPosition({ x, y, visible: true, direction });
    setIsVisible(true);
    setCurrentUrl(window.location.href);
  };

  // Hide toolbar
  const hideToolbar = () => {
    setIsVisible(false);
    setPosition(prev => ({ ...prev, visible: false }));
    setSelectedText('');
  };

  // Handle click outside
  const handleClickOutside = (event: MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
      hideToolbar();
    }
  };

  // Handle scroll
  const handleScroll = () => {
    hideToolbar();
  };

  // Watch for URL changes (SPA navigation)
  const watchUrlChanges = () => {
    let lastUrl = window.location.href;

    const checkUrlChange = () => {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        setCurrentUrl(window.location.href);
        hideToolbar(); // Hide toolbar on URL change
      }
    };

    // Use MutationObserver for SPA navigation
    const observer = new MutationObserver(checkUrlChange);
    observer.observe(document.body, { childList: true, subtree: true });

    // Also check history changes
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function(...args) {
      originalPushState.apply(history, args);
      setTimeout(checkUrlChange, 0);
    };

    history.replaceState = function(...args) {
      originalReplaceState.apply(history, args);
      setTimeout(checkUrlChange, 0);
    };

    window.addEventListener('popstate', checkUrlChange);
  };

  // Handle button click
  const handleButtonClick = async (button: ToolbarButton) => {
    if (!selectedText) return;

    // Hide toolbar
    hideToolbar();

    // Show result panel
    const panelX = position.x;
    const panelY = position.y + 60; // Position below toolbar
    setResultPanelPosition({ x: panelX, y: panelY });
    setResultPanelVisible(true);
    setResultPanelContent('');
    setLoading(true);

    try {
      // Get LLM provider
      const providers = await storageManager.getLLMProviders();
      let provider;

      if (button.llmProviderId) {
        provider = providers.find(p => p.id === button.llmProviderId && p.enabled);
      } else {
        // Use default provider
        provider = providers.find(p => p.isDefault && p.enabled) ||
                 providers.find(p => p.enabled);
      }

      if (!provider) {
        throw new Error('No LLM provider configured or enabled');
      }

      // Prepare API request
      const prompt = button.promptTemplate.replace('{{selectedText}}', selectedText);
      const apiRequest = {
        provider,
        prompt,
        selectedText,
      };

      // Send request to background script
      const response = await chrome.runtime.sendMessage({
        type: 'API_REQUEST',
        payload: apiRequest,
      });

      if (response.success && response.data) {
        setResultPanelContent(response.data);
      } else {
        setResultPanelContent(`Error: ${response.error || 'Unknown error occurred'}`);
      }

    } catch (error) {
      console.error('Error handling button click:', error);
      setResultPanelContent(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle result panel close
  const handleResultPanelClose = () => {
    setResultPanelVisible(false);
    setResultPanelContent('');
  };

  // Handle result panel copy
  const handleResultPanelCopy = () => {
    // Show a temporary notification
    const notification = document.createElement('div');
    notification.className = 'agent-bar-notification';
    notification.textContent = 'Copied to clipboard!';
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #10b981;
      color: white;
      padding: 12px 16px;
      border-radius: 6px;
      font-size: 14px;
      z-index: 10002;
      animation: fadeIn 0.2s ease-in-out;
    `;

    document.body.appendChild(notification);
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 2000);
  };

  // Handle result panel retry
  const handleResultPanelRetry = async () => {
    // This would retry the last request
    // For now, just show a placeholder
    setResultPanelContent('Retrying...');
    // Implementation would depend on storing the last request
  };

  // Get buttons to display for current URL
  const displayButtons = React.useMemo(() => {
    if (!isVisible || !currentUrl) return [];

    return urlMatcher.getToolbarButtonsForUrl(currentUrl, rules, buttons)
      .sort((a, b) => a.order - b.order);
  }, [isVisible, currentUrl, rules, buttons]);

  if (!isVisible || displayButtons.length === 0) {
    return null;
  }

  return (
    <>
      <div
        ref={containerRef}
        className="agent-bar-toolbar"
        style={{
          position: 'absolute',
          left: `${position.x}px`,
          top: `${position.y}px`,
          zIndex: 10000,
        }}
      >
        <div className="toolbar-container">
          <div className="toolbar-buttons">
            {displayButtons.map((button) => (
              <button
                key={button.id}
                className="toolbar-button"
                onClick={() => handleButtonClick(button)}
                disabled={loading}
                title={button.name}
              >
                {button.icon && (
                  <span className="button-icon">{button.icon}</span>
                )}
                <span className="button-text">{button.name}</span>
              </button>
            ))}
          </div>
          {position.direction === 'up' && (
            <div className="toolbar-arrow toolbar-arrow-up" />
          )}
          {position.direction === 'down' && (
            <div className="toolbar-arrow toolbar-arrow-down" />
          )}
        </div>
      </div>

      {/* Result Panel */}
      {resultPanelVisible && (
        <ResultPanel
          visible={resultPanelVisible}
          content={resultPanelContent}
          loading={loading}
          position={resultPanelPosition}
          onClose={handleResultPanelClose}
          onCopy={handleResultPanelCopy}
          onRetry={handleResultPanelRetry}
        />
      )}
    </>
  );
};

// Create container and render the app
const createAppContainer = () => {
  // Check if container already exists
  if (document.getElementById('agent-bar-root')) {
    return;
  }

  const container = document.createElement('div');
  container.id = 'agent-bar-root';
  container.style.position = 'absolute';
  container.style.top = '0';
  container.style.left = '0';
  container.style.width = '100%';
  container.style.height = '100%';
  container.style.pointerEvents = 'none';
  container.style.zIndex = '9999';

  document.body.appendChild(container);

  const root = createRoot(container);
  root.render(<AgentBarApp />);
};

// Initialize the app
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', createAppContainer);
} else {
  createAppContainer();
}

export default createAppContainer;