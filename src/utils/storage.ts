import { Storage } from '@plasmohq/storage';
import type { AgentBarConfig, LLMResponse, STORAGE_KEYS } from '../types';

const storage = new Storage();

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
};

class StorageManager {
  private cache = new Map<string, any>();
  private cacheTimeout = new Map<string, NodeJS.Timeout>();

  // Get configuration
  async getConfig(): Promise<AgentBarConfig> {
    try {
      const config = await storage.get('agent-bar-config');
      if (!config) {
        await this.setConfig(DEFAULT_CONFIG);
        return DEFAULT_CONFIG;
      }
      return config;
    } catch (error) {
      console.error('Error getting config:', error);
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

  // Get toolbar buttons
  async getToolbarButtons(): Promise<AgentBarConfig['toolbarButtons']> {
    const config = await this.getConfig();
    return config.toolbarButtons;
  }

  // Update toolbar buttons
  async setToolbarButtons(buttons: AgentBarConfig['toolbarButtons']): Promise<void> {
    await this.setConfig({ toolbarButtons: buttons });
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