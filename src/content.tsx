import { createRoot } from 'react-dom/client';
import React, { useEffect, useState, useRef } from 'react';
import { storageManager } from './utils/storage';
import { urlMatcher } from './utils/urlMatcher';
import ToolbarPanel from './components/ToolbarPanel';
import type { ToolbarPosition, ToolbarButton, ToolbarConfig, ToolbarButtonConfig, DropdownConfig } from './types';
import './style.css';
import { ping, openOptions as openOptionsMsg, getStorage, apiRequest as apiRequestMsg } from './utils/messaging';

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
  const lastButtonRef = useRef<ToolbarButton | ToolbarButtonConfig | null>(null);
  const markerRef = useRef<HTMLDivElement | null>(null);
  const lastSelectionRef = useRef<{ text: string; rect: { left: number; top: number; right: number; bottom: number; width: number; height: number } } | null>(null);

  // Initialize
  useEffect(() => {
    const init = async () => {
      try {
        // Set current URL first
        const currentUrl = window.location.href;
        setCurrentUrl(currentUrl);

        // Try to load actual config (but don't fail if it errors)
        const config = await storageManager.getConfig();

        setToolbars(config.toolbarButtons);

        // Set up event listeners
        setupEventListeners();
        await ping();
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
    // Text selection event - use both mouseup and select events
    document.addEventListener('mouseup', (e) => {
      // Ignore if clicking inside toolbar or result panel
      const target = e.target as Node;
      const targetElement = target as Element;
      const isInsideToolbar = containerRef.current && containerRef.current.contains(target);
      const isInsideResultPanel = targetElement.closest && targetElement.closest('.agent-bar-result-panel');
      const isInsideMarker = markerRef.current && markerRef.current.contains(target as Node);

      if (isInsideToolbar || isInsideResultPanel || isInsideMarker) {
        return;
      }
      handleTextSelection();
    }, true);

    document.addEventListener('selectstart', (_e) => {
    }, true);

    document.addEventListener('selectionchange', (_e) => {
      handleTextSelection();
    });

    // Also try keyup for keyboard selection
    document.addEventListener('keyup', (e) => {
      // Ignore if typing inside toolbar or result panel
      const target = e.target as Node;
      const targetElement = target as Element;
      const isInsideToolbar = containerRef.current && containerRef.current.contains(target);
      const isInsideResultPanel = targetElement.closest && targetElement.closest('.agent-bar-result-panel');
      const isInsideMarker = markerRef.current && markerRef.current.contains(target as Node);

      if (isInsideToolbar || isInsideResultPanel || isInsideMarker) {
        return;
      }

      handleTextSelection();
    }, true);


    // Hide toolbar when clicking outside
    document.addEventListener('click', handleClickOutside);

    // Hide toolbar on scroll
    document.addEventListener('scroll', handleScroll);

    // Watch for URL changes (for SPA)
    watchUrlChanges();

  };

  // Handle text selection
  const handleTextSelection = async () => {
    const selection = window.getSelection();

    if (!selection || selection.isCollapsed) {
      // Don't hide if user is interacting with the toolbar/panel
      const isHoveringToolbar = containerRef.current?.matches(':hover');
      const isHoveringPanel = document.querySelector('.agent-bar-result-panel:hover');

      if (isHoveringToolbar || isHoveringPanel) {
        return;
      }

      if (!isPinned) {
        hideToolbar();
      }
      removeSelectionMarker();
      return;
    }

    const selectedText = selection.toString().trim();

    if (!selectedText || selectedText.length < 1) {
      hideToolbar();
      removeSelectionMarker();
      return;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const endRange = range.cloneRange();
    endRange.collapse(false);
    let endRect = endRange.getBoundingClientRect();
    const endRects = (endRange as any).getClientRects ? Array.from((endRange as any).getClientRects()) : [];
    if ((!endRect || (endRect.width === 0 && endRect.height === 0)) && endRects.length) {
      endRect = endRects[endRects.length - 1] as DOMRect;
    }
    if (!endRect || (endRect.width === 0 && endRect.height === 0)) {
      endRect = rect;
    }

    let hasMatchingItems = false;


    // Always get fresh toolbars data to avoid async state issues
    const freshToolbars = await storageManager.getToolbars();

    // Update state with fresh data
    setToolbars(freshToolbars);

    // Check if current URL has matching toolbars
    const matchingToolbars = urlMatcher.getToolbarsForUrl(window.location.href, freshToolbars);
    hasMatchingItems = matchingToolbars.length > 0;


    if (!hasMatchingItems) {
      hideToolbar();
      return;
    }

    // Place selection marker with debounce
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      placeSelectionMarker(selectedText, rect, endRect);
    }, 300);
  };

  const placeSelectionMarker = (text: string, rect: DOMRect, endRect?: DOMRect) => {
    lastSelectionRef.current = {
      text,
      rect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height }
    };
    const margin = 6;
    const size = 18;
    const vpRight = window.innerWidth;
    const vpBottom = window.innerHeight;
    const centerY = rect.top + rect.height / 2;
    const upper = centerY < vpBottom / 2;
    let left: number;
    let top: number;
    if (upper) {
      const r = endRect || rect;
      left = r.right + margin;
      top = r.bottom - size / 2;
    } else {
      left = rect.right + margin;
      top = rect.top - size / 2;
    }
    if (left + size + margin > vpRight) left = rect.left - size - margin;
    if (left < margin) left = margin;
    if (top + size + margin > vpBottom) top = vpBottom - size - margin;
    if (top < margin) top = margin;

    if (!markerRef.current) {
      const m = document.createElement('div');
      m.className = 'agent-bar-selection-marker';
      m.style.cssText = `position:fixed; width:${size}px; height:${size}px; border-radius:50%; background:#2563eb; box-shadow:0 2px 6px rgba(0,0,0,0.2); border:2px solid #fff; z-index:2147483646; cursor:pointer; pointer-events:auto;`;
      m.addEventListener('mouseenter', () => {
        const sel = lastSelectionRef.current;
        if (!sel) return;
        const mr = m.getBoundingClientRect();
        const fakeRect = {
          left: mr.left,
          top: mr.top,
          right: mr.right,
          bottom: mr.bottom,
          width: mr.width,
          height: mr.height
        } as DOMRect as any;
        showToolbar(sel.text, fakeRect);
      });
      markerRef.current = m;
      document.body.appendChild(m);
    }

    markerRef.current.style.left = `${left}px`;
    markerRef.current.style.top = `${top}px`;
  };

  const removeSelectionMarker = () => {
    const m = markerRef.current;
    if (m && m.parentNode) {
      try { m.parentNode.removeChild(m); } catch {}
    }
    markerRef.current = null;
    lastSelectionRef.current = null;
  };

  // Show toolbar
  const showToolbar = (text: string, rect: DOMRect) => {
    const margin = 10;
    const toolbarWidth = 300;
    let direction: 'up' | 'down' = 'up';
    let x = window.scrollX + rect.left + rect.width / 2 - toolbarWidth / 2;
    let y = window.scrollY + rect.top - toolbarHeightRef.current - margin;

    const minY = window.scrollY + margin;
    const maxY = window.scrollY + window.innerHeight - toolbarHeightRef.current - margin;
    if (y < minY) y = minY;
    if (y > maxY) y = maxY;

    const minX = window.scrollX + margin;
    const maxX = window.scrollX + window.innerWidth - toolbarWidth - margin;
    if (x < minX) x = minX; else if (x > maxX) x = maxX;

    setSelectedText(text);
    setPosition({ x, y, visible: true, direction });
    setIsVisible(true);
    setCurrentUrl(window.location.href);

    setResultPanelVisible(false);
    setResultPanelContent('');

    requestAnimationFrame(() => {
      const container = containerRef.current;
      if (!container) return;
      const containerRect = container.getBoundingClientRect();
      toolbarHeightRef.current = containerRect.height;
      const desiredY = window.scrollY + rect.top - containerRect.height - margin;
      const minY2 = window.scrollY + margin;
      const maxY2 = window.scrollY + window.innerHeight - containerRect.height - margin;
      const clampedY = Math.min(Math.max(desiredY, minY2), maxY2);
      setPosition(prev => ({ ...prev, y: clampedY, direction: 'up' }));
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
    const isInsideMarker = markerRef.current && markerRef.current.contains(target);

    // Only hide if click is outside both toolbar and result panel
    if (!isInsideToolbar && !isInsideResultPanel && !isInsideMarker) {
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
    try {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) return;
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const endRange = range.cloneRange();
      endRange.collapse(false);
      let endRect = endRange.getBoundingClientRect();
      const endRects = (endRange as any).getClientRects ? Array.from((endRange as any).getClientRects()) : [];
      if ((!endRect || (endRect.width === 0 && endRect.height === 0)) && endRects.length) {
        endRect = endRects[endRects.length - 1] as DOMRect;
      }
      if (!endRect || (endRect.width === 0 && endRect.height === 0)) {
        endRect = rect;
      }
      const txt = lastSelectionRef.current?.text || selection.toString().trim();
      if (txt) placeSelectionMarker(txt, rect, endRect);
    } catch {}
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
    lastButtonRef.current = button;
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

    let dropdownsPayload: DropdownConfig[] | null = null;
    let toolbarIdPayload: string | null = null;
    let buttonIdPayload: string | null = null;
    if ('id' in button) {
      const dropdowns: DropdownConfig[] | null = 'dropdowns' in button && Array.isArray((button as ToolbarButtonConfig).dropdowns)
        ? (button as ToolbarButtonConfig).dropdowns as DropdownConfig[]
        : null;
      setPanelDropdowns(dropdowns);
      const btnAny: any = button;
      const tId = typeof btnAny.toolbarId === 'string' ? btnAny.toolbarId : null;
      setPanelToolbarId(tId);
      setPanelButtonId(button.id);
      dropdownsPayload = dropdowns;
      toolbarIdPayload = tId;
      buttonIdPayload = button.id;
    } else {
      setPanelDropdowns(null);
      setPanelToolbarId(null);
      setPanelButtonId(null);
      dropdownsPayload = null;
      toolbarIdPayload = null;
      buttonIdPayload = null;
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
      if (dropdownsPayload && toolbarIdPayload && buttonIdPayload) {
        const host = (typeof window !== 'undefined' && window.location) ? window.location.host : 'unknown-host';
        const entries = await Promise.all(dropdownsPayload.map(async (dd) => {
          const key = `agent-bar-selection:${host}:${toolbarIdPayload}:${buttonIdPayload}:${dd.id}`;
          const value = await getStorage(key);
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
        console.log('dropdownVars:', dropdownVars);
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
      const response = await apiRequestMsg(apiRequest);

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
    const last = lastButtonRef.current;
    if (!last) return;
    await handleButtonClick(last);
  };

  const handleResultPanelConfigure = async () => {
    try {
      const ok = await openOptionsMsg('/provider');
      if (!ok) {
        setResultPanelContent('Extension context unavailable. Open options page from Extensions → Agent Bar.');
        setResultPanelShowConfigure(false);
      }
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

    if (!isVisible || !currentUrl) {
      return [];
    }

    let result: any[] = [];

    // Get matching toolbars and flatten their buttons
    const matchingToolbars = urlMatcher.getToolbarsForUrl(currentUrl, toolbars);
    const allButtons: (ToolbarButtonConfig & { toolbarId: string; toolbarName: string })[] = [];

    matchingToolbars.forEach(toolbar => {
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


    return result;
  }, [isVisible, currentUrl, toolbars]);


  if (!isPinned && (!isVisible || displayButtons.length === 0)) {
    return null;
  }


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
