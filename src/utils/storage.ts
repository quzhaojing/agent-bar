import type { AgentBarConfig, LLMResponse, ToolbarConfig } from '../types';

// Use Chrome storage API directly for content script compatibility
const storage = {
  get: async (key: string): Promise<any> => {
    console.log('🔧 Storage: Attempting to get key:', key);

    // Check if we're in a content script and need to use message passing
    if (typeof window !== 'undefined' && window.location && chrome && chrome.runtime) {
      try {
        // Try direct API access first
        if (chrome.storage && chrome.storage.local) {
          return new Promise((resolve) => {
            chrome.storage.local.get([key], (result) => {
              console.log('🔧 Storage: Direct access - Raw result for key', key, ':', result);
              console.log('🔧 Storage: Direct access - Value for key', key, ':', result[key]);
              resolve(result[key]);
            });
          });
        }

        // Fallback to message passing
        const response = await chrome.runtime.sendMessage({
          type: 'GET_STORAGE',
          payload: { key }
        });

        console.log('🔧 Storage: Message passing - Value for key', key, ':', response.data);
        return response.data;
      } catch (error) {
        console.error('❌ Storage: All access methods failed:', error);
        return undefined;
      }
    }

    // Fallback for other contexts
    console.error('❌ Storage: Chrome storage API not available');
    return undefined;
  },
  set: async (key: string, value: any): Promise<void> => {
    console.log('🔧 Storage: Attempting to set key:', key);

    // Check if we're in a content script and need to use message passing
    if (typeof window !== 'undefined' && window.location && chrome && chrome.runtime) {
      try {
        // Try direct API access first
        if (chrome.storage && chrome.storage.local) {
          return new Promise((resolve) => {
            chrome.storage.local.set({ [key]: value }, () => {
              console.log('🔧 Storage: Direct access - Set key', key, 'successfully');
              resolve();
            });
          });
        }

        // Fallback to message passing
        await chrome.runtime.sendMessage({
          type: 'SET_STORAGE',
          payload: { setKey: key, setValue: value }
        });

        console.log('🔧 Storage: Message passing - Set key', key, 'successfully');
        return;
      } catch (error) {
        console.error('❌ Storage: All set methods failed:', error);
        return;
      }
    }

    // Fallback for other contexts
    console.error('❌ Storage: Chrome storage API not available for setting');
  },
  remove: async (key: string): Promise<void> => {
    return new Promise((resolve) => {
      chrome.storage.local.remove([key], () => resolve());
    });
  },
  watch: (callbacks: { [key: string]: (changes: { [key: string]: chrome.storage.StorageChange }) => void }) => {
    if (chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'local') {
          Object.keys(callbacks).forEach(key => {
            if (changes[key]) {
              callbacks[key](changes);
            }
          });
        }
      });
    }
  }
};

// Default configuration
export const DEFAULT_CONFIG: AgentBarConfig = {
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
      id: 'toolbar-default',
      name: '通用工具',
      context: '适用于所有网站的通用工具',
      enabled: true,
      websitePatterns: [{ pattern: '*', enabled: true }],
      buttons: [
        {
          id: 'default-explain',
          title: 'Explain',
          prompt: 'Explain the following text in simple terms: {{selectedText}}',
          enabled: true
        },
        {
          id: 'default-translate',
          title: 'Translate',
          prompt: 'Translate the following text to English: {{selectedText}}',
          enabled: true
        },
        {
          id: 'default-summarize',
          title: 'Summarize',
          prompt: 'Summarize the following text: {{selectedText}}',
          enabled: true
        }
      ]
    }
  ],
  settings: {
    theme: 'light',
    autoHide: true,
    showOnSelect: true,
    debounceDelay: 300,
    maxHistory: 50,
  }
};

class StorageManager {
  private cache = new Map<string, any>();
  private cacheTimeout = new Map<string, NodeJS.Timeout>();

  // Get configuration
  async getConfig(): Promise<AgentBarConfig> {
    try {
      console.log('🔍 Storage: Getting config...');
      const config = await storage.get('agent-bar-config');
      console.log('🔍 Storage: Raw config:', config);

      if (!config) {
        console.log('🔍 Storage: No config found, using defaults');
        return DEFAULT_CONFIG;
      }

      console.log('🔍 Storage: Using loaded config');
      return config;
    } catch (error) {
      console.error('❌ Storage: Error getting config:', error);
      console.log('🔍 Storage: Falling back to defaults');
      return DEFAULT_CONFIG;
    }
  }

  // Update configuration
  async setConfig(config: Partial<AgentBarConfig>): Promise<void> {
    try {
      const currentConfig = await this.getConfig();
      const updatedConfig = { ...currentConfig, ...config };
      await storage.set('agent-bar-config', updatedConfig);
      this.invalidateCache('agent-bar-config');
    } catch (error) {
      console.error('Error setting config:', error);
      throw error;
    }
  }

  // Get LLM providers
  async getLLMProviders(): Promise<AgentBarConfig['llmProviders']> {
    const config = await this.getConfig();
    return config.llmProviders;
  }

  // Update LLM providers
  async setLLMProviders(providers: AgentBarConfig['llmProviders']): Promise<void> {
    await this.setConfig({ llmProviders: providers });
  }

  // Get URL rules
  async getUrlRules(): Promise<AgentBarConfig['urlRules']> {
    const config = await this.getConfig();
    return config.urlRules;
  }

  // Update URL rules
  async setUrlRules(rules: AgentBarConfig['urlRules']): Promise<void> {
    await this.setConfig({ urlRules: rules });
  }

  // Get toolbar buttons (legacy support)
  async getToolbarButtons(): Promise<any[]> {
    const config = await this.getConfig();
    return 'toolbarButtons' in config ? config.toolbarButtons : [];
  }

  // Get toolbars (new structure)
  async getToolbars(): Promise<ToolbarConfig[]> {
    const config = await this.getConfig();
    if ('toolbarButtons' in config && Array.isArray(config.toolbarButtons)) {
      const firstItem = config.toolbarButtons[0];
      if (firstItem && 'buttons' in firstItem && 'websitePatterns' in firstItem) {
        return config.toolbarButtons as ToolbarConfig[];
      }
    }
    // Return empty array for legacy configurations
    return [];
  }

  // Update toolbar buttons (legacy support)
  async setToolbarButtons(buttons: any[]): Promise<void> {
    const config = await this.getConfig();
    if ('urlRules' in config) {
      // Legacy configuration
      await this.setConfig({ ...config, toolbarButtons: buttons } as any);
    } else {
      // New configuration - this shouldn't be called, but handle gracefully
      console.warn('setToolbarButtons called on new configuration structure');
    }
  }

  // Update toolbars (new structure)
  async setToolbars(toolbars: ToolbarConfig[]): Promise<void> {
    await this.setConfig({ toolbarButtons: toolbars });
  }

  // Get settings
  async getSettings(): Promise<AgentBarConfig['settings']> {
    const config = await this.getConfig();
    return config.settings;
  }

  // Update settings
  async setSettings(settings: Partial<AgentBarConfig['settings']>): Promise<void> {
    const config = await this.getConfig();
    await this.setConfig({
      settings: { ...config.settings, ...settings }
    });
  }

  // Get history
  async getHistory(): Promise<LLMResponse[]> {
    try {
      const history = await storage.get('agent-bar-history');
      return history || [];
    } catch (error) {
      console.error('Error getting history:', error);
      return [];
    }
  }

  // Add to history
  async addToHistory(response: LLMResponse): Promise<void> {
    try {
      const history = await this.getHistory();
      const updatedHistory = [response, ...history];
      const settings = await this.getSettings();
      const maxHistory = settings.maxHistory || 50;

      // Keep only the latest items
      const trimmedHistory = updatedHistory.slice(0, maxHistory);
      await storage.set('agent-bar-history', trimmedHistory);
    } catch (error) {
      console.error('Error adding to history:', error);
    }
  }

  // Clear history
  async clearHistory(): Promise<void> {
    try {
      await storage.remove('agent-bar-history');
    } catch (error) {
      console.error('Error clearing history:', error);
    }
  }

  // Get cached data
  async getCachedData<T>(key: string, timeout: number = 300000): Promise<T | null> {
    try {
      if (this.cache.has(key)) {
        return this.cache.get(key);
      }

      const data = await storage.get(key);
      if (data) {
        this.setCachedData(key, data, timeout);
      }
      return data || null;
    } catch (error) {
      console.error('Error getting cached data:', error);
      return null;
    }
  }

  // Set cached data
  setCachedData<T>(key: string, data: T, timeout: number = 300000): void {
    this.cache.set(key, data);

    // Clear existing timeout
    if (this.cacheTimeout.has(key)) {
      clearTimeout(this.cacheTimeout.get(key)!);
    }

    // Set new timeout
    const timeoutId = setTimeout(() => {
      this.cache.delete(key);
      this.cacheTimeout.delete(key);
    }, timeout);

    this.cacheTimeout.set(key, timeoutId);
  }

  // Clear cache for a specific key
  invalidateCache(key: string): void {
    this.cache.delete(key);
    if (this.cacheTimeout.has(key)) {
      clearTimeout(this.cacheTimeout.get(key)!);
      this.cacheTimeout.delete(key);
    }
  }

  // Clear all cache
  clearCache(): void {
    this.cache.clear();
    this.cacheTimeout.forEach(timeout => clearTimeout(timeout));
    this.cacheTimeout.clear();
  }

  // Export configuration
  async exportConfig(): Promise<string> {
    try {
      const config = await this.getConfig();
      const history = await this.getHistory();

      const exportData = {
        version: '1.0.0',
        timestamp: Date.now(),
        config,
        history,
      };

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('Error exporting config:', error);
      throw error;
    }
  }

  // Import configuration
  async importConfig(jsonData: string): Promise<void> {
    try {
      const importData = JSON.parse(jsonData);

      if (!importData.config) {
        throw new Error('Invalid import data format');
      }

      await this.setConfig(importData.config);

      if (importData.history) {
        await storage.set('agent-bar-history', importData.history);
      }
    } catch (error) {
      console.error('Error importing config:', error);
      throw error;
    }
  }

  // Watch for storage changes
  watch(key: string, callback: (changes: any) => void): void {
    storage.watch({
      [key]: (changes) => {
        this.invalidateCache(key);
        callback(changes.newValue);
      }
    });
  }
}

export const storageManager = new StorageManager();