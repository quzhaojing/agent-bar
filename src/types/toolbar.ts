// Website Pattern interface for toolbar URL matching
export interface WebsitePattern {
  pattern: string;
  enabled: boolean;
}

// Toolbar button configuration
export interface ToolbarButton {
  enabled: boolean;
  id: string;
  prompt: string;
  title: string;
}

// Complete toolbar configuration
export interface Toolbar {
  buttons: ToolbarButton[];
  context: string;
  enabled: boolean;
  id: string;
  name: string;
  websitePatterns: WebsitePattern[];
}

// Export/Import data structure
export interface ToolbarExportData {
  version: string;
  exportDate: string;
  toolbars: Toolbar[];
}

// Agent Bar configuration structure
export interface AgentBarConfig {
  llmProviders: any[];
  toolbarButtons: Toolbar[];
  settings: {
    theme: string;
    autoHide: boolean;
    showOnSelect: boolean;
    debounceDelay: number;
    maxHistory: number;
  };
}

// Template structure (internal use for initialization)
export interface TemplateConfig {
  name: string;
  description: string;
  category: string;
  buttons: TemplateButton[];
  urlRules: string[];
  tags: string[];
}

// Template button structure
export interface TemplateButton {
  id: string;
  name: string;
  icon: string;
  promptTemplate: string;
  order: number;
  enabled: boolean;
}