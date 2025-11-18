import { llmClient } from './utils/llmClient';
import { storageManager } from './utils/storage';
import type { Message, APIRequest, LLMResponse } from './types';

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener(async (message: Message, sender, sendResponse) => {
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

      case 'API_REQUEST':
        const apiRequest = message.payload as APIRequest;
        const apiResponse = await llmClient.makeRequest(apiRequest);

        // Save to history if successful
        if (apiResponse.success && apiResponse.data) {
          const llmResponse: LLMResponse = {
            id: `response-${Date.now()}`,
            content: apiResponse.data,
            provider: apiRequest.provider.name,
            model: apiRequest.provider.model,
            prompt: apiRequest.prompt.replace('{{selectedText}}', apiRequest.selectedText),
            timestamp: Date.now(),
            usage: apiResponse.usage,
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

// Handle extension installation
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    console.log('Agent Bar installed');

    // Initialize default configuration
    try {
      await storageManager.setConfig({
        llmProviders: [],
        urlRules: [
          {
            id: 'default-all',
            name: 'All Websites',
            type: 'host',
            pattern: '*',
            enabled: true,
            priority: 999,
            isWhitelist: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }
        ],
        toolbarButtons: [
          {
            id: 'default-explain',
            name: 'Explain',
            promptTemplate: 'Explain the following text in simple terms: {{selectedText}}',
            llmProviderId: '',
            enabled: true,
            urlRuleIds: ['default-all'],
            order: 1,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
          {
            id: 'default-translate',
            name: 'Translate',
            promptTemplate: 'Translate the following text to English: {{selectedText}}',
            llmProviderId: '',
            enabled: true,
            urlRuleIds: ['default-all'],
            order: 2,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
          {
            id: 'default-summarize',
            name: 'Summarize',
            promptTemplate: 'Summarize the following text: {{selectedText}}',
            llmProviderId: '',
            enabled: true,
            urlRuleIds: ['default-all'],
            order: 3,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }
        ],
        settings: {
          theme: 'light',
          autoHide: true,
          showOnSelect: true,
          debounceDelay: 300,
          maxHistory: 50,
        }
      });
    } catch (error) {
      console.error('Error initializing configuration:', error);
    }
  } else if (details.reason === 'update') {
    console.log('Agent Bar updated');
  }
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