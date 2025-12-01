import { executeBrowserAgent } from './lib/agent';
import { storageManager } from './utils/storage';
import type {
  Message,
  APIRequest,
  LLMResponse,
  MessageType,
  APIResponse
} from './types';

// Handle messages from content script and popup
chrome.runtime.onInstalled.addListener(async (details) => {
  try {
    if (details && details.reason === 'install') {
      const result = await chrome.storage.local.get(['agent-bar-config']);
      const config = result['agent-bar-config'];
      if (!config || !config.toolbarButtons || config.toolbarButtons.length === 0) {
        const defaultConfig = await storageManager.getConfig();
        await chrome.storage.local.set({ 'agent-bar-config': defaultConfig });
      }
    }
  } catch { }
});

chrome.runtime.onMessage.addListener(async (message: Message, _sender, sendResponse) => {
  try { console.log('📨 Background received message', { type: message.type }); } catch { }
  try {
    switch (message.type) {
      case 'OPEN_OPTIONS':
        try {
          const target = (message.payload as string) || '/provider';
          await chrome.storage.local.set({ 'agent-bar-options-target': target });
          try {
            await chrome.runtime.openOptionsPage();
          } catch {
            const url = chrome.runtime.getURL(`options.html#${target}`);
            await chrome.tabs.create({ url });
          }
          sendResponse({ success: true });
        } catch (error) {
          sendResponse({ success: false, error: error instanceof Error ? error.message : 'Failed to open options' });
        }
        break;
      case 'GET_CONFIG':
        const config = await storageManager.getConfig();
        sendResponse({ success: true, data: config });
        break;

      case 'UPDATE_CONFIG':
        await storageManager.setConfig(message.payload);
        sendResponse({ success: true });
        break;

      case 'GET_STORAGE' as MessageType:
        const { key } = message.payload;
        const value = await chrome.storage.local.get([key]);
        sendResponse({ success: true, data: value[key] });
        break;

      case 'SET_STORAGE' as MessageType:
        const { setKey, setValue } = message.payload;
        await chrome.storage.local.set({ [setKey]: setValue });
        sendResponse({ success: true });
        break;

      case 'API_REQUEST':
        const apiRequest = message.payload as APIRequest;
        if (!apiRequest || !apiRequest.provider) {
          sendResponse({ success: false, error: 'No LLM provider configured or enabled' });
          break;
        }
        let finalPrompt = apiRequest.prompt.replace('{{selectedText}}', apiRequest.selectedText);
        if (apiRequest.dropdownVars && typeof apiRequest.dropdownVars === 'object') {
          for (const [name, payload] of Object.entries(apiRequest.dropdownVars)) {
            const label = payload?.label || '';
            const desc = payload?.description || '';
            finalPrompt = finalPrompt.split(`{{${name}}}`).join(`${label}${desc ? `(${desc})` : ''}`);
          }
        }
        console.log('🧪 Agent request', { prompt: finalPrompt, provider: apiRequest.provider, dropdownVars: apiRequest.dropdownVars });
        const agentResult = await executeBrowserAgent(finalPrompt, apiRequest.provider, { debug: true });
        const text = typeof (agentResult as any).data === 'string'
          ? (agentResult as any).data
          : ((agentResult as any).data && typeof (agentResult as any).data === 'object' && 'text' in (agentResult as any).data
            ? (agentResult as any).data.text
            : String((agentResult as any).data ?? ''));
        const apiResponse: APIResponse = agentResult.status === 'ok'
          ? { success: true, data: text }
          : { success: false, error: 'Agent execution failed' };
        console.log('🧪 Agent result', { status: agentResult.status, steps: agentResult.steps?.length, model: agentResult.model, text });

        // Save to history if successful
        if (apiResponse.success && apiRequest.provider) {
          const llmResponse: LLMResponse = {
            id: `response-${Date.now()}`,
            content: text,
            provider: apiRequest.provider.name,
            model: apiRequest.provider.model,
            prompt: apiRequest.prompt.replace('{{selectedText}}', apiRequest.selectedText),
            timestamp: Date.now(),
            ...(apiResponse.usage && { usage: apiResponse.usage }),
          };
          await storageManager.addToHistory(llmResponse);
        }

        sendResponse(apiResponse);
        break;

      case 'PING':
        console.log('📡 PING received from content');
        sendResponse({ success: true, data: 'pong' });
        break;

      default:
        sendResponse({ success: false, error: 'Unknown message type' });
    }
  } catch (error) {
    console.error('Background script error:', error);
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  // Return true to indicate we'll send a response asynchronously
  return true;
});

// Handle storage changes and notify content scripts
chrome.storage.onChanged.addListener(async (changes, namespace) => {
  if (namespace === 'local' && changes['agent-bar-config']) {
    // Notify all tabs about configuration changes
    try {
      const tabs = await chrome.tabs.query({});
      for (const tab of tabs) {
        if (tab.id) {
          try {
            await chrome.tabs.sendMessage(tab.id, {
              type: 'CONFIG_CHANGED',
              payload: changes['agent-bar-config'].newValue,
            });
          } catch (error) {
            // Ignore errors for tabs that don't have content script
          }
        }
      }
    } catch (error) {
      console.error('Error notifying tabs of config changes:', error);
    }
  }
});

// Handle tab updates to clear cache
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // Clear URL matching cache when tab is updated
    try {
      // This will be used by the content script to invalidate cache
      await chrome.tabs.sendMessage(tabId, {
        type: 'URL_CHANGED',
        payload: { url: tab.url },
      });
    } catch (error) {
      // Ignore errors for tabs that don't have content script
    }
  }
});

chrome.runtime.onConnect.addListener((port) => {
  try {
    if (port.name === 'agent-bar-keeper') {
      console.log('📡 Port connected');
      port.onMessage.addListener((msg) => {
        if (msg && msg.type === 'KEEP_ALIVE') {
          try { port.postMessage({ type: 'KEEP_ALIVE_ACK', ts: Date.now() }); } catch { }
        }
      });
      port.onDisconnect.addListener(() => {
        console.log('📡 Port disconnected');
      });
    }
  } catch { }
});

export { };
