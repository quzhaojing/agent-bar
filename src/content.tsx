import { createRoot } from 'react-dom/client';
import React, { useEffect, useState, useRef } from 'react';
import { storageManager } from './utils/storage';
import { urlMatcher } from './utils/urlMatcher';
import ResultPanel from './components/ResultPanel';
import type { ToolbarPosition, ToolbarButton, ToolbarConfig, ToolbarButtonConfig } from './types';
import './style.css';

const AgentBarApp: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<ToolbarPosition>({ x: 0, y: 0, visible: false, direction: 'up' });
  const [selectedText, setSelectedText] = useState<string>('');
  const [currentUrl, setCurrentUrl] = useState<string>('');
  const [toolbars, setToolbars] = useState<ToolbarConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [isPinned, _setIsPinned] = useState(false);
  const [_isDragging, setIsDragging] = useState(false);
  
  // Result panel state
  const [resultPanelVisible, setResultPanelVisible] = useState(false);
  const [resultPanelContent, setResultPanelContent] = useState('');
  const [resultPanelPosition, setResultPanelPosition] = useState({ x: 0, y: 0 });
  const [resultPanelShowConfigure, setResultPanelShowConfigure] = useState(false);

  const debounceTimerRef = useRef<number | undefined>();
  const containerRef = useRef<HTMLDivElement>(null);
  const dragOffsetRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });

  // Initialize
  useEffect(() => {
    const init = async () => {
      try {
        console.log('🚀 Agent Bar initializing...');

        // Set current URL first
        const currentUrl = window.location.href;
        setCurrentUrl(currentUrl);
        console.log('🌍 Current URL set:', currentUrl);

        // Try to load actual config (but don't fail if it errors)
        console.log('📖 Attempting to load config...');
        const config = await storageManager.getConfig();
        console.log('📋 Config loaded:', config);

        console.log("config toolbarButtons", config.toolbarButtons);
        setToolbars(config.toolbarButtons);

        // Set up event listeners
        setupEventListeners();
        console.log('👂 Event listeners set up');

        console.log('✅ Agent Bar initialized successfully');
      } catch (error) {
        console.error('❌ Error initializing Agent Bar:', error);
      }
    };

    init();
  }, []);

  // Set up event listeners
  const setupEventListeners = () => {
    console.log('👂 Setting up event listeners...');

    // Test if the handler function exists
    console.log('🧪 Testing handleTextSelection function:', typeof handleTextSelection);

    // Text selection event - use both mouseup and select events
    document.addEventListener('mouseup', (e) => {
      // Ignore if clicking inside toolbar or result panel
      const target = e.target as Node;
      const targetElement = target as Element;
      const isInsideToolbar = containerRef.current && containerRef.current.contains(target);
      const isInsideResultPanel = targetElement.closest && targetElement.closest('.agent-bar-result-panel');

      if (isInsideToolbar || isInsideResultPanel) {
        console.log('🖱️ Click inside toolbar/panel, ignoring');
        return;
      }

      console.log('🖱️ Mouseup event fired', e);
      handleTextSelection();
    }, true);

    document.addEventListener('selectstart', (e) => {
      console.log('📝 Select start event fired', e);
    }, true);

    document.addEventListener('selectionchange', (_e) => {
      console.log('🔄 Selection change event fired');
      handleTextSelection();
    });

    // Also try keyup for keyboard selection
    document.addEventListener('keyup', (e) => {
      // Ignore if typing inside toolbar or result panel
      const target = e.target as Node;
      const targetElement = target as Element;
      const isInsideToolbar = containerRef.current && containerRef.current.contains(target);
      const isInsideResultPanel = targetElement.closest && targetElement.closest('.agent-bar-result-panel');

      if (isInsideToolbar || isInsideResultPanel) {
        return;
      }

      console.log('⌨️ Keyup event fired', e);
      handleTextSelection();
    }, true);

    console.log('🖱️ Text selection events added');

    // Hide toolbar when clicking outside
    document.addEventListener('click', handleClickOutside);
    console.log('🖱️ Click outside event added');

    // Hide toolbar on scroll
    document.addEventListener('scroll', handleScroll);
    console.log('📜 Scroll event added');

    // Watch for URL changes (for SPA)
    watchUrlChanges();
    console.log('🔄 URL change watcher added');

    // Test event listeners
    console.log('🧪 Testing event listeners - try clicking anywhere or selecting text');
  };

  // Handle text selection
  const handleTextSelection = async () => {
    const selection = window.getSelection();
    console.log('📝 Selection:', selection);

    if (!selection || selection.isCollapsed) {
      console.log('❌ No valid selection or collapsed selection');

      // Don't hide if user is interacting with the toolbar/panel
      const isHoveringToolbar = containerRef.current?.matches(':hover');
      const isHoveringPanel = document.querySelector('.agent-bar-result-panel:hover');

      if (isHoveringToolbar || isHoveringPanel) {
        console.log('🛑 Selection collapsed but hovering toolbar/panel, ignoring hide');
        return;
      }

      if (!isPinned) {
        hideToolbar();
      }
      return;
    }

    const selectedText = selection.toString().trim();
    console.log('📄 Selected text:', `"${selectedText}"`);

    if (!selectedText || selectedText.length < 1) {
      console.log('❌ Empty or too short selection');
      hideToolbar();
      return;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    console.log('📐 Selection rect:', rect);

    let hasMatchingItems = false;

    console.log('🔄 Using new structure - checking toolbars');

    // Always get fresh toolbars data to avoid async state issues
    const freshToolbars = await storageManager.getToolbars();
    console.log('🔄 Fresh toolbars from storage:', freshToolbars);

    // Update state with fresh data
    setToolbars(freshToolbars);

    // Check if current URL has matching toolbars
    const matchingToolbars = urlMatcher.getToolbarsForUrl(window.location.href, freshToolbars);
    console.log('🎪 Matching toolbars:', matchingToolbars);
    hasMatchingItems = matchingToolbars.length > 0;

    console.log('🎯 Has matching items:', hasMatchingItems);

    if (!hasMatchingItems) {
      console.log('❌ No matching items, hiding toolbar');
      hideToolbar();
      return;
    }

    // Show toolbar with debounce
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    console.log('⏰ Scheduling toolbar show with 300ms debounce');
    debounceTimerRef.current = setTimeout(() => {
      console.log('🎉 Showing toolbar');
      showToolbar(selectedText, rect);
    }, 300);
  };

  // Show toolbar
  const showToolbar = (text: string, rect: DOMRect) => {
    console.log('🎯 showToolbar called with:', { text, rect });

    const toolbarHeight = 40;
    const toolbarWidth = 200; // Will be adjusted based on content
    const margin = 10;

    let x = rect.left + rect.width / 2 - toolbarWidth / 2;
    let y = rect.top;
    let direction: 'up' | 'down' = 'up';

    console.log('📍 Initial position:', { x, y, direction });

    // Clamp within viewport vertically to avoid going off-screen
    const minY = window.scrollY + margin;
    const maxY = window.scrollY + window.innerHeight - toolbarHeight - margin;
    if (y < minY) y = minY;
    if (y > maxY) y = maxY;

    if (x < window.scrollX + margin) {
      x = window.scrollX + margin;
    } else if (x + toolbarWidth > window.scrollX + window.innerWidth - margin) {
      x = window.scrollX + window.innerWidth - toolbarWidth - margin;
    }

    console.log('📍 Final position:', { x, y, direction });

    setSelectedText(text);
    setPosition({ x, y, visible: true, direction });
    setIsVisible(true);
    setCurrentUrl(window.location.href);

    console.log('✅ Toolbar state updated - should be visible now');
  };

  // Hide toolbar
  const hideToolbar = () => {
    setIsVisible(false);
    setPosition(prev => ({ ...prev, visible: false }));
    setSelectedText('');
  };

  // Handle click outside
  const handleClickOutside = (event: MouseEvent) => {
    const target = event.target as Node;
    const targetElement = target as Element;

    // Check if click is inside toolbar or result panel
    const isInsideToolbar = containerRef.current && containerRef.current.contains(target);
    const isInsideResultPanel = targetElement.closest('.agent-bar-result-panel');

    // Only hide if click is outside both toolbar and result panel
    if (!isInsideToolbar && !isInsideResultPanel) {
      if (!isPinned) {
        hideToolbar();
      }
      // Also hide result panel if it's visible
      if (resultPanelVisible) {
        handleResultPanelClose();
      }
    }
  };

  // Handle scroll
  const handleScroll = () => {
    if (!isPinned) {
      hideToolbar();
    }
    // Also hide result panel on scroll
    if (resultPanelVisible) {
      handleResultPanelClose();
    }
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

    history.pushState = function (...args) {
      originalPushState.apply(history, args);
      setTimeout(checkUrlChange, 0);
    };

    history.replaceState = function (...args) {
      originalReplaceState.apply(history, args);
      setTimeout(checkUrlChange, 0);
    };

    window.addEventListener('popstate', checkUrlChange);
  };

  // Handle button click
  const handleButtonClick = async (button: ToolbarButton | ToolbarButtonConfig) => {
    if (!selectedText) return;

    // Don't hide toolbar - keep it visible
    // Show result panel right below toolbar
    const panelX = position.x;
    const toolbarHeight = 48; // Approximate toolbar height
    const panelY = position.y + toolbarHeight + 2; // Small gap (2px)
    setResultPanelPosition({ x: panelX, y: panelY });
    setResultPanelVisible(true);
    setResultPanelContent('');
    setLoading(true);

    try {
      // Get LLM provider
      const providers = await storageManager.getLLMProviders();
      let provider;

      if ('llmProviderId' in button && button.llmProviderId) {
        provider = providers.find(p => p.id === button.llmProviderId && p.enabled);
      } else {
        // Use default provider
        provider = providers.find(p => p.isDefault && p.enabled) ||
          providers.find(p => p.enabled);
      }

      if (!provider) {
        setResultPanelContent('No LLM provider configured or enabled');
        setResultPanelShowConfigure(true);
        setLoading(false);
        return;
      }
      setResultPanelShowConfigure(false);

      // Prepare API request
      const prompt = ('promptTemplate' in button ? button.promptTemplate : button.prompt)
        .replace('{{selectedText}}', selectedText);

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
      setResultPanelShowConfigure(false);
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

  const handleResultPanelConfigure = async () => {
    try {
      await chrome.runtime.sendMessage({
        type: 'OPEN_OPTIONS',
        payload: '/provider'
      });
    } catch {}
  };

  
  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    dragOffsetRef.current = {
      dx: e.pageX - position.x,
      dy: e.pageY - position.y,
    };

    const onMove = (ev: MouseEvent) => {
      const margin = 10;
      const toolbarWidth = 200;
      const toolbarHeight = 40;
      let newX = ev.pageX - dragOffsetRef.current.dx;
      let newY = ev.pageY - dragOffsetRef.current.dy;

      // Clamp within viewport
      const minX = window.scrollX + margin;
      const maxX = window.scrollX + window.innerWidth - toolbarWidth - margin;
      const minY = window.scrollY + margin;
      const maxY = window.scrollY + window.innerHeight - toolbarHeight - margin;
      newX = Math.max(minX, Math.min(maxX, newX));
      newY = Math.max(minY, Math.min(maxY, newY));

      setPosition(prev => ({ ...prev, x: newX, y: newY }));
    };

    const onUp = (ev: MouseEvent) => {
      ev.stopPropagation();
      setIsDragging(false);
      document.removeEventListener('mousemove', onMove, true);
      document.removeEventListener('mouseup', onUp, true);
    };

    document.addEventListener('mousemove', onMove, true);
    document.addEventListener('mouseup', onUp, true);
  };

  // Get buttons to display for current URL
  const displayButtons = React.useMemo(() => {
    console.log('🔄 Computing displayButtons...', { isVisible, currentUrl });

    if (!isVisible || !currentUrl) {
      console.log('❌ Not visible or no URL');
      return [];
    }

    let result: any[] = [];

    console.log('🎪 Using new structure', toolbars);
    // Get matching toolbars and flatten their buttons
    const matchingToolbars = urlMatcher.getToolbarsForUrl(currentUrl, toolbars);
    console.log('🎪 Matching toolbars:', matchingToolbars);
    const allButtons: (ToolbarButtonConfig & { toolbarId: string; toolbarName: string })[] = [];

    matchingToolbars.forEach(toolbar => {
      console.log(`🛠️ Processing toolbar: ${toolbar.name}`);
      toolbar.buttons.forEach(button => {
        if (button.enabled) {
          allButtons.push({
            ...button,
            toolbarId: toolbar.id,
            toolbarName: toolbar.name
          });
        }
      });
    });

    result = allButtons;


    console.log('📊 Final displayButtons result:', result);
    return result;
  }, [isVisible, currentUrl, toolbars]);

  console.log('🎨 Rendering check:', { isVisible, displayButtonsLength: displayButtons.length, isPinned });

  if (!isPinned && (!isVisible || displayButtons.length === 0)) {
    console.log('❌ Not rendering toolbar - conditions not met', { isVisible, displayButtonsLength: displayButtons.length });
    return null;
  }

  console.log('✅ Rendering toolbar with buttons:', displayButtons.length);

  return (
    <>
      <div
        ref={containerRef}
        className="agent-bar-toolbar"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        style={{
          position: 'absolute',
          left: `${position.x}px`,
          top: `${position.y}px`,
          zIndex: 10000,
          pointerEvents: isVisible || isPinned ? 'auto' : 'none',
        }}
      >
          <div className={`toolbar-container ${(position.visible || isPinned)
          ? position.direction === 'up' ? 'visible-up' : 'visible-down'
          : 'hidden'
          }`}>
            <div className="toolbar-buttons">
              <button
                className="toolbar-button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleDragStart(e);
                }}
                title="Drag"
              >⠿</button>
              {displayButtons.map((button, index) => {
                console.log(`🔘 Rendering button ${index}:`, button);
                return (
                  <button
                    key={`${'toolbarId' in button ? button.toolbarId : 'legacy'}-${button.id}`}
                    className="toolbar-button"
                    onClick={() => handleButtonClick(button)}
                    disabled={loading}
                    title={'toolbarName' in button ? `${button.toolbarName}: ${button.title}` : button.name}
                    style={{
                      animationDelay: `${index * 50}ms`,
                    }}
                  >
                    {'icon' in button && button.icon && (
                      <span className="button-icon">{button.icon}</span>
                    )}
                    <span className="button-text">{'title' in button ? button.title : button.name}</span>
                  </button>
                );
              })}
              
            </div>
            {position.direction === 'up' && (
              <div className="toolbar-arrow toolbar-arrow-up" />
            )}
            {position.direction === 'down' && (
              <div className="toolbar-arrow toolbar-arrow-down" />
            )}
          {resultPanelVisible && (
            <ResultPanel
              visible={resultPanelVisible}
              content={resultPanelContent}
              loading={loading}
              position={resultPanelPosition}
              onClose={handleResultPanelClose}
              onCopy={handleResultPanelCopy}
              onRetry={handleResultPanelRetry}
              onConfigure={handleResultPanelConfigure}
              showConfigure={resultPanelShowConfigure}
            />
          )}
          </div>
        </div>
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