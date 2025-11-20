import { llmClient } from './utils/llmClient';
import { storageManager } from './utils/storage';
import type {
  Message,
  APIRequest,
  LLMResponse,
  MessageType
} from './types';

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener(async (message: Message, _sender, sendResponse) => {
  try {
    switch (message.type) {
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
        const apiResponse = await llmClient.makeRequest(apiRequest);

        // Save to history if successful
        if (apiResponse.success && apiResponse.data && apiRequest.provider) {
          const llmResponse: LLMResponse = {
            id: `response-${Date.now()}`,
            content: apiResponse.data,
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

export {};