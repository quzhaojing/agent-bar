import type { AgentBarConfig, LLMResponse, ToolbarConfig } from '../types';

// Use Chrome storage API directly for content script compatibility
const storage = {
  get: async (key: string): Promise<any> => {
    console.log('🔧 Storage: Attempting to get key:', key);
    try {
      if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.id) {
        console.warn('🔧 Storage: chrome.runtime not available');
        return undefined;
      }
      if (chrome.storage && chrome.storage.local) {
        return await new Promise((resolve, reject) => {
          try {
            chrome.storage.local.get([key], (result) => {
              const err = chrome.runtime.lastError
              if (err) {
                reject(err)
                return
              }
              console.log('🔧 Storage: Direct access - Raw result for key', key, ':', result);
              resolve(result[key]);
            });
          } catch (e) {
            reject(e)
          }
        });
      }
    } catch (error) {
      console.error('❌ Storage: Direct access failed:', error);
    }
    return undefined;
  },
  set: async (key: string, value: any): Promise<void> => {
    console.log('🔧 Storage: Attempting to set key:', key);
    try {
      if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.id) {
        console.warn('🔧 Storage: chrome.runtime not available for set');
        return;
      }
      if (chrome.storage && chrome.storage.local) {
        await new Promise((resolve, reject) => {
          try {
            chrome.storage.local.set({ [key]: value }, () => {
              const err = chrome.runtime.lastError
              if (err) {
                reject(err)
                return
              }
              console.log('🔧 Storage: Direct access - Set key', key, 'successfully');
              resolve(undefined);
            });
          } catch (e) {
            reject(e)
          }
        })
        return
      }
    } catch (error) {
      console.error('❌ Storage: Direct set failed:', error);
    }
  },
  remove: async (key: string): Promise<void> => {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.remove([key], () => resolve());
      } else {
        resolve();
      }
    });
  },
  watch: (callbacks: { [key: string]: (changes: { [key: string]: chrome.storage.StorageChange }) => void }) => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
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

const DEFAULT_TOOLBARS: ToolbarConfig[] = [
  {
    buttons: [
      { enabled: true, id: 'btn-1', prompt: 'Explain this: {{selectedText}}', title: 'Explain' },
      { enabled: true, id: 'btn-2', prompt: 'Summary this: {{selectedText}}', title: 'Summary' },
      { enabled: true, id: 'btn-3', prompt: 'Translate this: {{selectedText}}', title: 'Translate' },
      { enabled: true, id: 'btn-4', prompt: 'Expand this: {{selectedText}}', title: 'Expand' }
    ],
    context: '',
    enabled: true,
    id: 'toolbar-1763451161658',
    name: 'Default Toolbar',
    websitePatterns: [
      { enabled: true, pattern: '*' }
    ]
  }
];

const DEFAULT_CONFIG: AgentBarConfig = {
  llmProviders: [],
  toolbarButtons: DEFAULT_TOOLBARS,
  settings: {
    theme: 'light',
    autoHide: false,
    showOnSelect: true,
    debounceDelay: 500,
    maxHistory: 50
  }
};

class StorageManager {
  private cache = new Map<string, any>();
  private cacheTimeout = new Map<string, ReturnType<typeof setTimeout>>();

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
      return { ...DEFAULT_CONFIG, ...config };
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
