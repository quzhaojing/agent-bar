// LLM Provider Types
export interface LLMProvider {
  id: string;
  name: string;
  type: 'openai' | 'claude' | 'gemini' | 'deepseek' | 'qwen' | 'glm';
  apiKey: string;
  baseUrl?: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  enabled: boolean;
  isDefault?: boolean;
}

// URL Matching Rule Types
export interface UrlRule {
  id: string;
  name: string;
  type: 'host' | 'path' | 'full' | 'regex';
  pattern: string;
  enabled: boolean;
  priority: number;
  isWhitelist: boolean; // true for whitelist, false for blacklist
  createdAt: number;
  updatedAt: number;
}

// Toolbar Button Types
export interface ToolbarButton {
  id: string;
  name: string;
  icon?: string;
  promptTemplate: string;
  llmProviderId: string;
  enabled: boolean;
  urlRuleIds: string[]; // Associated with URL rules
  order: number;
  createdAt: number;
  updatedAt: number;
}

// Configuration Types
export interface AgentBarConfig {
  llmProviders: LLMProvider[];
  urlRules: UrlRule[];
  toolbarButtons: ToolbarButton[];
  settings: {
    theme: 'light' | 'dark';
    autoHide: boolean;
    showOnSelect: boolean;
    debounceDelay: number;
    maxHistory: number;
  };
}

// Storage Keys
export const STORAGE_KEYS = {
  CONFIG: 'agent-bar-config',
  HISTORY: 'agent-bar-history',
  CACHE: 'agent-bar-cache',
} as const;

// LLM Response Types
export interface LLMResponse {
  id: string;
  content: string;
  provider: string;
  model: string;
  prompt: string;
  timestamp: number;
  tokens?: number;
  error?: string;
}

// Selection Types
export interface TextSelection {
  text: string;
  range: Range;
  rect: DOMRect;
  url: string;
}

// Toolbar Position Types
export interface ToolbarPosition {
  x: number;
  y: number;
  visible: boolean;
  direction: 'up' | 'down';
}

// UI State Types
export interface UIState {
  toolbar: {
    visible: boolean;
    position: ToolbarPosition;
    buttons: ToolbarButton[];
  };
  resultPanel: {
    visible: boolean;
    content: string;
    loading: boolean;
    position: ToolbarPosition;
  };
  settings: {
    visible: boolean;
    tab: 'providers' | 'rules' | 'buttons' | 'general';
  };
}

// API Request Types
export interface APIRequest {
  provider: LLMProvider;
  prompt: string;
  selectedText: string;
}

export interface APIResponse {
  success: boolean;
  data?: string;
  error?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// Message Types (for communication between content script and popup)
export type MessageType =
  | 'GET_CONFIG'
  | 'UPDATE_CONFIG'
  | 'TOOLBAR_SHOW'
  | 'TOOLBAR_HIDE'
  | 'RESULT_PANEL_SHOW'
  | 'RESULT_PANEL_HIDE'
  | 'API_REQUEST'
  | 'API_RESPONSE';

export interface Message {
  type: MessageType;
  payload?: any;
  id?: string;
  timestamp?: number;
}

// Event Types
export interface SelectionEvent {
  type: 'selectionchange';
  selection: TextSelection | null;
  url: string;
}

export interface ConfigChangeEvent {
  type: 'configchange';
  key: string;
  value: any;
}