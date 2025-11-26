import { createRoot } from 'react-dom/client';
import React, { useEffect, useState, useRef } from 'react';
import { storageManager } from './utils/storage';
import { urlMatcher } from './utils/urlMatcher';
import ToolbarPanel from './components/ToolbarPanel';
import type { ToolbarPosition, ToolbarButton, ToolbarConfig, ToolbarButtonConfig, DropdownConfig } from './types';
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
  const [panelDropdowns, setPanelDropdowns] = useState<DropdownConfig[] | null>(null);
  const [panelToolbarId, setPanelToolbarId] = useState<string | null>(null);
  const [panelButtonId, setPanelButtonId] = useState<string | null>(null);

  const debounceTimerRef = useRef<number | undefined>();
  const containerRef = useRef<HTMLDivElement>(null);
  const dragOffsetRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const toolbarHeightRef = useRef<number>(48);
  const keepAliveRef = useRef<{ port?: any; timer?: number }>({});

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

        try {
          console.log('📡 Sending PING to background...')
          const pong = await chrome.runtime.sendMessage({ type: 'PING', payload: { ts: Date.now() } })
          console.log('📡 PING response:', pong)
        } catch (e) {
          console.warn('❌ PING failed:', e)
        }

        try {
          if (!keepAliveRef.current.port) {
            const port = chrome.runtime.connect({ name: 'agent-bar-keeper' });
            keepAliveRef.current.port = port;
            keepAliveRef.current.timer = window.setInterval(() => {
              try { port.postMessage({ type: 'KEEP_ALIVE', ts: Date.now() }); } catch {}
            }, 20000);
          }
        } catch {}
      } catch (error) {
        console.error('❌ Error initializing Agent Bar:', error);
      }
    };

    init();
    return () => {
      try {
        if (keepAliveRef.current.timer) {
          clearInterval(keepAliveRef.current.timer);
          keepAliveRef.current.timer = undefined;
        }
        keepAliveRef.current.port?.disconnect?.();
        keepAliveRef.current.port = undefined;
      } catch {}
    };
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

    const margin = 10;
    const toolbarWidth = 300;
    let direction: 'up' | 'down' = 'up';
    let x = rect.left + rect.width / 2 - toolbarWidth / 2;
    let y = rect.top - toolbarHeightRef.current;

    console.log('📍 Initial position:', { x, y, direction });

    // Clamp within viewport vertically to avoid going off-screen
    const minY = window.scrollY + margin;
    const maxY = window.scrollY + window.innerHeight - toolbarHeightRef.current - margin;
    if (y < minY) {
      y = rect.top + margin;
      direction = 'down';
    }
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

    // Hide ResultPanel when toolbar is re-shown
    setResultPanelVisible(false);
    setResultPanelContent('');

    requestAnimationFrame(() => {
      const container = containerRef.current;
      if (!container) return;
      const containerRect = container.getBoundingClientRect();
      toolbarHeightRef.current = containerRect.height;
      const delta = rect.top - containerRect.bottom;
      if (Math.abs(delta) > 0.5 && direction === 'up') {
        setPosition(prev => {
          let newY = prev.y + delta;
          const minY2 = window.scrollY + margin;
          const maxY2 = window.scrollY + window.innerHeight - containerRect.height - margin;
          if (newY < minY2) {
            newY = rect.top + margin;
            direction = 'down';
          }
          if (newY > maxY2) newY = maxY2;
          return { ...prev, y: newY, direction };
        });
      }
    });
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
    const toolbarHeight = 48; // Actual toolbar height
    const panelY = position.y + toolbarHeight; // Directly below toolbar with no gap
    setResultPanelPosition({ x: panelX, y: panelY });
    setResultPanelVisible(true);
    setResultPanelContent('');
    setLoading(true);

    if ('id' in button) {
      const dropdowns: DropdownConfig[] | null = 'dropdowns' in button && Array.isArray((button as ToolbarButtonConfig).dropdowns)
        ? (button as ToolbarButtonConfig).dropdowns as DropdownConfig[]
        : null;
      setPanelDropdowns(dropdowns);
      // Pass toolbar id if available via augmented buttons list
      // When calling, button may be of type ToolbarButtonConfig & { toolbarId: string }
      const btnAny: any = button;
      setPanelToolbarId(typeof btnAny.toolbarId === 'string' ? btnAny.toolbarId : null);
      setPanelButtonId(button.id);
    } else {
      setPanelDropdowns(null);
      setPanelToolbarId(null);
      setPanelButtonId(null);
    }

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

      const promptTemplate = ('promptTemplate' in button ? button.promptTemplate : button.prompt);
      let prompt = promptTemplate.replace('{{selectedText}}', selectedText);

      let dropdownVars: Record<string, { label: string; description?: string }> | undefined = undefined;
      if (panelDropdowns && panelToolbarId && panelButtonId) {
        const host = (typeof window !== 'undefined' && window.location) ? window.location.host : 'unknown-host';
        const entries = await Promise.all(panelDropdowns.map(async (dd) => {
          const key = `agent-bar-selection:${host}:${panelToolbarId}:${panelButtonId}:${dd.id}`;
          const value = await new Promise<any>((resolve) => {
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
              chrome.storage.local.get([key], (result) => resolve(result[key]));
            } else {
              resolve(undefined);
            }
          });
          let label: string | undefined = value && typeof value === 'object' ? value.label : undefined;
          if (!label && dd.defaultOptionId && Array.isArray(dd.options)) {
            const def = dd.options.find((o: any) => o && o.id === dd.defaultOptionId);
            label = def && typeof def.label === 'string' ? def.label : label;
          }
          let description: string | undefined = undefined;
          if (label && Array.isArray(dd.options)) {
            const opt: any = dd.options.find((o: any) => o && o.label === label);
            description = opt && typeof opt.description === 'string' ? opt.description : undefined;
          }
          return [dd.name, label ? { label, description } : undefined] as const;
        }));
        const map: Record<string, { label: string; description?: string }> = {};
        for (const [name, payload] of entries) {
          if (name && payload) map[name] = payload;
        }
        dropdownVars = Object.keys(map).length ? map : undefined;
        if (dropdownVars) {
          for (const [name, payload] of Object.entries(dropdownVars)) {
            if (name && payload?.label) {
              const re = new RegExp(`\\{\\{${name}\\}\\}`, 'g');
              prompt = prompt.replace(re, payload.label);
            }
          }
        }
      }

      const apiRequest = {
        provider,
        prompt,
        selectedText,
        dropdownVars,
      };

      // Send request to background script
      console.log('🧪 Sending API_REQUEST', apiRequest);
      const response = await chrome.runtime.sendMessage({
        type: 'API_REQUEST',
        payload: apiRequest,
      });
      console.log('🧪 Received API_RESPONSE', response);

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
      const toolbarWidth = 300;
      const toolbarHeight = 48;
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

  const panelPosition: ToolbarPosition = { ...position, visible: position.visible || isPinned };

  return (
    <ToolbarPanel
      containerRef={containerRef}
      position={panelPosition}
      buttons={displayButtons}
      loading={loading}
      onButtonClick={handleButtonClick}
      resultPanelVisible={resultPanelVisible}
      resultPanelContent={resultPanelContent}
      resultPanelPosition={resultPanelPosition}
      onResultPanelClose={handleResultPanelClose}
      onResultPanelCopy={handleResultPanelCopy}
      onResultPanelRetry={handleResultPanelRetry}
      onDragStart={handleDragStart}
      onResultPanelConfigure={handleResultPanelConfigure}
      resultPanelShowConfigure={resultPanelShowConfigure}
      panelDropdowns={panelDropdowns}
      panelToolbarId={panelToolbarId}
      panelButtonId={panelButtonId}
    />
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
  container.style.zIndex = '2147483647';

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
