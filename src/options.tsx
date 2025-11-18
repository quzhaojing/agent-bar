import { useState, useEffect } from 'react';

interface LLMProvider {
  id: string;
  name: string;
  type: 'openai' | 'claude' | 'gemini' | 'deepseek' | 'qwen' | 'glm';
  apiKey: string;
  baseUrl?: string;
  model: string;
  temperature: number;
  maxTokens: number;
  enabled: boolean;
  isDefault: boolean;
}

interface WebsitePattern {
  pattern: string;
  enabled: boolean;
}

interface ToolbarButton {
  id: string;
  name: string;
  websitePatterns: WebsitePattern[];
  context: string;
  buttons: Array<{
    id: string;
    title: string;
    prompt: string;
    enabled: boolean;
  }>;
  enabled: boolean;
}

function OptionsPage() {
  const [activeTab, setActiveTab] = useState<'toolbar' | 'providers'>('toolbar');
  const [providers, setProviders] = useState<LLMProvider[]>([]);
  const [toolbars, setToolbars] = useState<ToolbarButton[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showToolbarForm, setShowToolbarForm] = useState(false);

  // Model options for each provider type
  const providerModels = {
    openai: [
      { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
      { value: 'gpt-4', label: 'GPT-4' },
      { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
      { value: 'gpt-4o', label: 'GPT-4o' },
      { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
    ],
    claude: [
      { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' },
      { value: 'claude-3-sonnet-20240229', label: 'Claude 3 Sonnet' },
      { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
      { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
    ],
    gemini: [
      { value: 'gemini-pro', label: 'Gemini Pro' },
      { value: 'gemini-pro-vision', label: 'Gemini Pro Vision' },
      { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
      { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
    ],
    deepseek: [
      { value: 'deepseek-chat', label: 'DeepSeek Chat' },
      { value: 'deepseek-coder', label: 'DeepSeek Coder' },
    ],
    qwen: [
      { value: 'qwen-turbo', label: 'Qwen Turbo' },
      { value: 'qwen-plus', label: 'Qwen Plus' },
      { value: 'qwen-max', label: 'Qwen Max' },
    ],
    glm: [
      { value: 'glm-4-flash', label: 'GLM-4 Flash' },
      { value: 'glm-4', label: 'GLM-4' },
      { value: 'glm-4-0520', label: 'GLM-4 0520' },
      { value: 'glm-4-air', label: 'GLM-4 Air' },
      { value: 'glm-4-airx', label: 'GLM-4 AirX' },
    ],
  };

  // Default configurations for each provider type
  const providerDefaults = {
    openai: {
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-3.5-turbo',
    },
    claude: {
      baseUrl: 'https://api.anthropic.com',
      model: 'claude-3-haiku-20240307',
    },
    gemini: {
      baseUrl: 'https://generativelanguage.googleapis.com/v1',
      model: 'gemini-pro',
    },
    deepseek: {
      baseUrl: 'https://api.deepseek.com/v1',
      model: 'deepseek-chat',
    },
    qwen: {
      baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      model: 'qwen-turbo',
    },
    glm: {
      baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
      model: 'glm-4-flash',
    },
  };

  // Form states
  const [providerForm, setProviderForm] = useState({
    name: '',
    type: 'openai' as const,
    apiKey: '',
    baseUrl: providerDefaults.openai.baseUrl,
    model: providerDefaults.openai.model,
    temperature: 0.7,
    maxTokens: 1000,
    enabled: true,
    isDefault: false,
  });

  const [toolbarForm, setToolbarForm] = useState({
    name: 'Default Toolbar',
    websitePatterns: [{ pattern: '*', enabled: true }],
    context: '',
    buttons: [
      {
        id: 'btn-1',
        title: 'Explain',
        prompt: 'Explain this: {{selectedText}}',
        enabled: true,
      }
    ],
    enabled: true,
  });

  const [editingToolbar, setEditingToolbar] = useState<string | null>(null);
  const [draggedButtonIndex, setDraggedButtonIndex] = useState<number | null>(null);
  const [toolbarSaveMessage, setToolbarSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load from Chrome storage
      const result = await chrome.storage.local.get(['agent-bar-config']);
      const config = result['agent-bar-config'];

      console.log('Loaded config from storage:', config);

      if (config) {
        setProviders(config.llmProviders || []);
        // Convert old urlRule to websitePatterns for backward compatibility
        const toolbarButtons = config.toolbarButtons || [];
        const convertedToolbars = toolbarButtons.map((toolbar: any) => {
          let websitePatterns = toolbar.websitePatterns;

          // Migrate from old data structure
          if (toolbar.urlRule && !websitePatterns) {
            // Old single URL rule
            websitePatterns = [{ pattern: toolbar.urlRule, enabled: true }];
          } else if (websitePatterns && Array.isArray(websitePatterns)) {
            // Check if it's the old string array format
            if (websitePatterns.length > 0 && typeof websitePatterns[0] === 'string') {
              websitePatterns = websitePatterns.map((pattern: string) => ({ pattern, enabled: true }));
            }
          } else {
            // Default
            websitePatterns = [{ pattern: '*', enabled: true }];
          }

          return {
            ...toolbar,
            websitePatterns
          };
        });
        setToolbars(convertedToolbars);
        console.log('Converted toolbars:', convertedToolbars);

        // Sync provider form with loaded data
        if (config.llmProviders && config.llmProviders.length > 0) {
          const provider = config.llmProviders[0];
          setProviderForm({
            id: provider.id,
            name: provider.name,
            type: provider.type,
            apiKey: provider.apiKey,
            baseUrl: provider.baseUrl || providerDefaults[provider.type].baseUrl,
            model: provider.model,
            temperature: provider.temperature,
            maxTokens: provider.maxTokens,
            enabled: provider.enabled,
            isDefault: provider.isDefault,
          });
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const saveData = async (data: any, shouldShowMessage: boolean = true) => {
    try {
      console.log('Saving config to storage:', data);
      await chrome.storage.local.set({ 'agent-bar-config': data });
      console.log('Config saved successfully');
      if (shouldShowMessage) {
        showMessage('Configuration saved successfully', 'success');
      }
    } catch (error) {
      console.error('Error saving data:', error);
      if (shouldShowMessage) {
        showMessage('Error saving configuration', 'error');
      }
    }
  };

  const autoSaveProvider = (updates: Partial<typeof providerForm>) => {
    const existingProvider = providers.length > 0 ? providers[0] : null;

    const updatedProvider = {
      id: existingProvider?.id || `provider-${Date.now()}`,
      name: updates.type ? `${updates.type.charAt(0).toUpperCase() + updates.type.slice(1)} Provider` : (existingProvider?.name || 'OpenAI Provider'),
      type: updates.type || existingProvider?.type || 'openai',
      apiKey: updates.apiKey ?? existingProvider?.apiKey ?? '',
      baseUrl: updates.baseUrl || existingProvider?.baseUrl || providerDefaults[updates.type || existingProvider?.type || 'openai'].baseUrl,
      model: updates.model || existingProvider?.model || providerDefaults[updates.type || existingProvider?.type || 'openai'].model,
      temperature: updates.temperature ?? existingProvider?.temperature ?? 0.7,
      maxTokens: updates.maxTokens ?? existingProvider?.maxTokens ?? 1000,
      enabled: true,
      isDefault: true,
      ...updates,
    };

    const updatedProviders = [updatedProvider];
    setProviders(updatedProviders);
    setProviderForm(updatedProvider);
    saveData({ llmProviders: updatedProviders, toolbarButtons: toolbars }, false);

    // Show save message
    if (existingProvider) {
      setMessage({ text: 'LLM Provider updated', type: 'success' });
    } else {
      setMessage({ text: 'LLM Provider configured', type: 'success' });
    }
    setTimeout(() => setMessage(null), 2000);
  };

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleProviderTypeChange = (type: 'openai' | 'claude' | 'gemini' | 'deepseek' | 'qwen' | 'glm') => {
    const defaults = providerDefaults[type];
    const updates = {
      type,
      baseUrl: defaults.baseUrl,
      model: defaults.model,
    };
    autoSaveProvider(updates);
  };

  
  
  const autoSaveToolbar = () => {
    if (editingToolbar) {
      // Update existing toolbar
      const updatedToolbars = toolbars.map(toolbar =>
        toolbar.id === editingToolbar ? { ...toolbarForm, id: editingToolbar } : toolbar
      );
      setToolbars(updatedToolbars);
      saveData({ llmProviders: providers, toolbarButtons: updatedToolbars }, false);
      setToolbarSaveMessage('Toolbar saved successfully');
      setTimeout(() => setToolbarSaveMessage(null), 2000);
    } else {
      // Auto-save new toolbar after first change
      const existingToolbarIndex = toolbars.findIndex(t => t.name === toolbarForm.name);
      if (existingToolbarIndex === -1) {
        // Add new toolbar
        const newToolbar: ToolbarButton = {
          id: `toolbar-${Date.now()}`,
          ...toolbarForm,
        };
        const updatedToolbars = [...toolbars, newToolbar];
        setToolbars(updatedToolbars);
        setEditingToolbar(newToolbar.id);
        saveData({ llmProviders: providers, toolbarButtons: updatedToolbars }, false);
        setToolbarSaveMessage('New toolbar created');
        setTimeout(() => setToolbarSaveMessage(null), 2000);
      } else {
        // Update existing toolbar
        const updatedToolbars = [...toolbars];
        updatedToolbars[existingToolbarIndex] = { ...toolbarForm, id: updatedToolbars[existingToolbarIndex].id };
        setToolbars(updatedToolbars);
        saveData({ llmProviders: providers, toolbarButtons: updatedToolbars }, false);
        setToolbarSaveMessage('Toolbar updated');
        setTimeout(() => setToolbarSaveMessage(null), 2000);
      }
    }
  };

  const saveToolbar = () => {
    if (editingToolbar) {
      // Update existing toolbar
      const updatedToolbars = toolbars.map(toolbar =>
        toolbar.id === editingToolbar ? { ...toolbarForm, id: editingToolbar } : toolbar
      );
      setToolbars(updatedToolbars);
      saveData({ llmProviders: providers, toolbarButtons: updatedToolbars });
      setEditingToolbar(null);
    } else {
      // Add new toolbar
      const newToolbar: ToolbarButton = {
        id: `toolbar-${Date.now()}`,
        ...toolbarForm,
      };
      const updatedToolbars = [...toolbars, newToolbar];
      setToolbars(updatedToolbars);
      saveData({ llmProviders: providers, toolbarButtons: updatedToolbars });
    }

    // Reset form and hide form
    setToolbarForm({
      name: 'Default Toolbar',
      websitePatterns: [{ pattern: '*', enabled: true }],
      context: '',
      buttons: [
        {
          id: 'btn-1',
          title: 'Explain',
          prompt: 'Explain this: {{selectedText}}',
          enabled: true,
        }
      ],
      enabled: true,
    });
    setShowToolbarForm(false);
  };

  const editToolbar = (toolbar: ToolbarButton) => {
    setToolbarForm({
      name: toolbar.name,
      websitePatterns: toolbar.websitePatterns,
      context: toolbar.context,
      buttons: toolbar.buttons,
      enabled: toolbar.enabled,
    });
    setEditingToolbar(toolbar.id);
    setShowToolbarForm(true);
    setToolbarSaveMessage(null);
  };

  const deleteToolbar = (toolbarId: string) => {
    if (confirm('Are you sure you want to delete this toolbar?')) {
      const updatedToolbars = toolbars.filter(toolbar => toolbar.id !== toolbarId);
      setToolbars(updatedToolbars);
      saveData({ llmProviders: providers, toolbarButtons: updatedToolbars });

      if (editingToolbar === toolbarId) {
        setEditingToolbar(null);
        setShowToolbarForm(false);
        setToolbarForm({
          name: 'Default Toolbar',
          websitePatterns: [{ pattern: '*', enabled: true }],
          context: '',
          buttons: [
            {
              id: 'btn-1',
              title: 'Explain',
              prompt: 'Explain this: {{selectedText}}',
              enabled: true,
            }
          ],
          enabled: true,
        });
      }
    }
  };

  const toggleToolbar = (toolbarId: string) => {
    const updatedToolbars = toolbars.map(toolbar =>
      toolbar.id === toolbarId ? { ...toolbar, enabled: !toolbar.enabled } : toolbar
    );
    setToolbars(updatedToolbars);
    saveData({ llmProviders: providers, toolbarButtons: updatedToolbars });
  };

  const deleteButton = (buttonId: string) => {
    const newButtons = toolbarForm.buttons.filter(button => button.id !== buttonId);
    setToolbarForm({ ...toolbarForm, buttons: newButtons });
    autoSaveToolbar();
  };

  const handleDragStart = (index: number) => {
    setDraggedButtonIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedButtonIndex === null || draggedButtonIndex === dropIndex) return;

    const newButtons = [...toolbarForm.buttons];
    const draggedButton = newButtons[draggedButtonIndex];

    // Remove dragged button from its original position
    newButtons.splice(draggedButtonIndex, 1);

    // Insert dragged button at the new position
    newButtons.splice(dropIndex, 0, draggedButton);

    setToolbarForm({ ...toolbarForm, buttons: newButtons });
    setDraggedButtonIndex(null);

    // Auto-save after reordering
    if (editingToolbar) {
      const updatedToolbars = toolbars.map(toolbar =>
        toolbar.id === editingToolbar ? { ...toolbarForm, buttons: newButtons, id: editingToolbar } : toolbar
      );
      setToolbars(updatedToolbars);
      saveData({ llmProviders: providers, toolbarButtons: updatedToolbars }, false);
      setToolbarSaveMessage('Button order updated');
      setTimeout(() => setToolbarSaveMessage(null), 2000);
    }
  };

  const handleDragEnd = () => {
    setDraggedButtonIndex(null);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', backgroundColor: '#fff', color: '#333' }}>
      <h1 style={{ marginBottom: '30px', color: '#111827' }}>Agent Bar Settings</h1>

      {message && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '6px',
          marginBottom: '20px',
          backgroundColor: message.type === 'success' ? '#f0fdf4' : '#fef2f2',
          color: message.type === 'success' ? '#166534' : '#dc2626',
          border: `1px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`
        }}>
          {message.text}
        </div>
      )}

      {/* Main Content with Sidebar */}
      <div style={{ display: 'flex', gap: '20px' }}>
        {/* Left Sidebar */}
        <div style={{ width: '200px', flexShrink: 0 }}>
          <div style={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
            <button
              style={{
                width: '100%',
                padding: '12px 16px',
                border: 'none',
                background: activeTab === 'toolbar' ? '#dbeafe' : 'transparent',
                color: activeTab === 'toolbar' ? '#1d4ed8' : '#6b7280',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '14px',
                fontWeight: '500',
                borderBottom: '1px solid #e5e7eb'
              }}
              onClick={() => setActiveTab('toolbar')}
            >
              Toolbar
            </button>
            <button
              style={{
                width: '100%',
                padding: '12px 16px',
                border: 'none',
                background: activeTab === 'providers' ? '#dbeafe' : 'transparent',
                color: activeTab === 'providers' ? '#1d4ed8' : '#6b7280',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '14px',
                fontWeight: '500'
              }}
              onClick={() => setActiveTab('providers')}
            >
              LLM Provider
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div style={{ flex: 1 }}>
          {activeTab === 'providers' && (
            <div style={{ padding: '20px', backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
              <div style={{ marginBottom: '30px', padding: '20px', backgroundColor: '#f9fafb', borderRadius: '6px' }}>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>Type</label>
                    <select
                      value={providerForm.type}
                      onChange={(e) => handleProviderTypeChange(e.target.value as any)}
                      style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                    >
                      <option value="openai">OpenAI</option>
                      <option value="claude">Claude (Anthropic)</option>
                      <option value="gemini">Gemini (Google)</option>
                      <option value="deepseek">DeepSeek</option>
                      <option value="qwen">Qwen (Alibaba)</option>
                      <option value="glm">GLM (Zhipu AI)</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>Model</label>
                    <select
                      value={providerForm.model}
                      onChange={(e) => {
                        autoSaveProvider({ model: e.target.value });
                      }}
                      style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                    >
                      {providerModels[providerForm.type].map(model => (
                        <option key={model.value} value={model.value}>
                          {model.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>API Key</label>
                  <input
                    type="password"
                    value={providerForm.apiKey}
                    onChange={(e) => {
                      autoSaveProvider({ apiKey: e.target.value });
                    }}
                    placeholder="sk-..."
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>Base URL (optional)</label>
                  <input
                    type="text"
                    value={providerForm.baseUrl}
                    onChange={(e) => {
                      autoSaveProvider({ baseUrl: e.target.value });
                    }}
                    placeholder="https://api.openai.com/v1"
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>Temperature</label>
                  <input
                    type="number"
                    value={providerForm.temperature}
                    onChange={(e) => {
                      autoSaveProvider({ temperature: parseFloat(e.target.value) });
                    }}
                    min="0"
                    max="2"
                    step="0.1"
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'toolbar' && (
            <div style={{ padding: '20px', backgroundColor: '#fff' }}>
              {!showToolbarForm ? (
                // Toolbar List View
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ margin: 0, fontSize: '18px', color: '#111827' }}>Toolbars</h3>
                    <button
                      onClick={() => {
                        setEditingToolbar(null);
                        setShowToolbarForm(true);
                        setToolbarSaveMessage(null);
                        // Auto-create the new toolbar immediately
                        const newToolbar: ToolbarButton = {
                          id: `toolbar-${Date.now()}`,
                          name: 'Default Toolbar',
                          websitePatterns: [{ pattern: '*', enabled: true }],
                          context: '',
                          buttons: [
                            {
                              id: 'btn-1',
                              title: 'Explain',
                              prompt: 'Explain this: {{selectedText}}',
                              enabled: true,
                            }
                          ],
                          enabled: true,
                        };
                        const updatedToolbars = [...toolbars, newToolbar];
                        setToolbars(updatedToolbars);
                        setEditingToolbar(newToolbar.id);
                        saveData({ llmProviders: providers, toolbarButtons: updatedToolbars }, false);
                        setToolbarSaveMessage('New toolbar created');
                        setTimeout(() => setToolbarSaveMessage(null), 2000);
                      }}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      Add New Toolbar
                    </button>
                  </div>

                  {toolbars.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                      <p style={{ color: '#6b7280', fontSize: '16px', marginBottom: '16px' }}>No toolbars configured yet</p>
                      <button
                        onClick={() => {
                          setEditingToolbar(null);
                          setShowToolbarForm(true);
                          setToolbarSaveMessage(null);
                          // Auto-create the new toolbar immediately
                          const newToolbar: ToolbarButton = {
                            id: `toolbar-${Date.now()}`,
                            name: 'Default Toolbar',
                            websitePatterns: [{ pattern: '*', enabled: true }],
                            context: '',
                            buttons: [
                              {
                                id: 'btn-1',
                                title: 'Explain',
                                prompt: 'Explain this: {{selectedText}}',
                                enabled: true,
                              }
                            ],
                            enabled: true,
                          };
                          const updatedToolbars = [...toolbars, newToolbar];
                          setToolbars(updatedToolbars);
                          setEditingToolbar(newToolbar.id);
                          saveData({ llmProviders: providers, toolbarButtons: updatedToolbars }, false);
                          setToolbarSaveMessage('New toolbar created');
                          setTimeout(() => setToolbarSaveMessage(null), 2000);
                        }}
                        style={{
                          padding: '10px 20px',
                          backgroundColor: '#3b82f6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                      >
                        Create Your First Toolbar
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                      {toolbars.map(toolbar => (
                        <div
                          key={toolbar.id}
                          style={{
                            padding: '16px',
                            backgroundColor: toolbar.enabled ? '#f9fafb' : '#f3f4f6',
                            border: `1px solid ${toolbar.enabled ? '#e5e7eb' : '#d1d5db'}`,
                            borderRadius: '8px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            position: 'relative'
                          }}
                          onClick={() => editToolbar(toolbar)}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#f3f4f6';
                            e.currentTarget.style.borderColor = '#d1d5db';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = toolbar.enabled ? '#f9fafb' : '#f3f4f6';
                            e.currentTarget.style.borderColor = toolbar.enabled ? '#e5e7eb' : '#d1d5db';
                          }}
                        >
                          <div style={{ position: 'absolute', top: '8px', right: '8px', display: 'flex', gap: '4px' }}>
                            <label
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                backgroundColor: '#fff',
                                padding: '4px 6px',
                                borderRadius: '4px',
                                border: '1px solid #e5e7eb',
                                cursor: 'pointer'
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <input
                                type="checkbox"
                                checked={toolbar.enabled}
                                onChange={() => toggleToolbar(toolbar.id)}
                                style={{ marginRight: '4px' }}
                              />
                              <span style={{ fontSize: '12px', color: '#374151' }}>Enabled</span>
                            </label>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteToolbar(toolbar.id);
                              }}
                              style={{
                                padding: '4px 6px',
                                backgroundColor: 'transparent',
                                color: '#ef4444',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '14px'
                              }}
                              title="Delete toolbar"
                            >
                              🗑️
                            </button>
                          </div>
                          <div style={{ paddingRight: '80px' }}>
                            <h4 style={{
                              margin: '0 0 8px 0',
                              color: toolbar.enabled ? '#111827' : '#9ca3af',
                              fontSize: '16px',
                              fontWeight: '600'
                            }}>
                              {toolbar.name}
                            </h4>
                            <p style={{
                              margin: 0,
                              fontSize: '12px',
                              color: '#6b7280',
                              lineHeight: '1.4'
                            }}>
                              {toolbar.websitePatterns
                                ? toolbar.websitePatterns.map((wp: WebsitePattern) => wp.pattern).join(', ')
                                : (toolbar as any).urlRule || '*'
                              }
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                // Toolbar Form View
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ margin: 0 }}>
                      {editingToolbar ? 'Edit Toolbar' : 'Create New Toolbar'}
                    </h3>
                    {toolbarSaveMessage && (
                      <div style={{
                        padding: '6px 12px',
                        borderRadius: '4px',
                        backgroundColor: '#dcfce7',
                        color: '#166534',
                        fontSize: '14px',
                        fontWeight: '500'
                      }}>
                        {toolbarSaveMessage}
                      </div>
                    )}
                    <button
                      onClick={() => {
                        setShowToolbarForm(false);
                        setEditingToolbar(null);
                        setToolbarSaveMessage(null);
                        setToolbarForm({
                          name: 'Default Toolbar',
                          websitePatterns: [{ pattern: '*', enabled: true }],
                          context: '',
                          buttons: [
                            {
                              id: 'btn-1',
                              title: 'Explain',
                              prompt: 'Explain this: {{selectedText}}',
                              enabled: true,
                            }
                          ],
                          enabled: true,
                        });
                      }}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#6b7280',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      Back to List
                    </button>
                  </div>

                  <div style={{ padding: '20px', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>Toolbar Name</label>
                      <input
                        type="text"
                        value={toolbarForm.name}
                        onChange={(e) => {
                          setToolbarForm({ ...toolbarForm, name: e.target.value });
                        }}
                        onBlur={() => {
                          autoSaveToolbar();
                        }}
                        placeholder="Enter toolbar name"
                        style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                      />
                    </div>

                  <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>Website Patterns</label>
                      <div style={{ marginBottom: '8px' }}>
                        {toolbarForm.websitePatterns.map((websitePattern, index) => (
                          <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                            <input
                              type="text"
                              value={websitePattern.pattern}
                              onChange={(e) => {
                                const newPatterns = [...toolbarForm.websitePatterns];
                                newPatterns[index] = { ...newPatterns[index], pattern: e.target.value };
                                setToolbarForm({ ...toolbarForm, websitePatterns: newPatterns });
                              }}
                              onBlur={() => {
                                autoSaveToolbar();
                              }}
                              placeholder="* or *.github.com"
                              style={{ flex: 1, padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                            />
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <label style={{ display: 'flex', alignItems: 'center' }}>
                                <input
                                  type="checkbox"
                                  checked={websitePattern.enabled}
                                  onChange={(e) => {
                                    const newPatterns = [...toolbarForm.websitePatterns];
                                    newPatterns[index] = { ...newPatterns[index], enabled: e.target.checked };
                                    setToolbarForm({ ...toolbarForm, websitePatterns: newPatterns });
                                    autoSaveToolbar();
                                  }}
                                  style={{ marginRight: '4px' }}
                                />
                                <span style={{ fontSize: '12px', color: '#374151' }}>Enabled</span>
                              </label>
                              {toolbarForm.websitePatterns.length > 1 && (
                                <button
                                  onClick={() => {
                                    const newPatterns = toolbarForm.websitePatterns.filter((_, i) => i !== index);
                                    setToolbarForm({ ...toolbarForm, websitePatterns: newPatterns });
                                    autoSaveToolbar();
                                  }}
                                  style={{
                                    padding: '8px 10px',
                                    backgroundColor: 'transparent',
                                    color: '#ef4444',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '14px'
                                  }}
                                  title="Delete pattern"
                                >
                                  🗑️
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => {
                          setToolbarForm({
                            ...toolbarForm,
                            websitePatterns: [...toolbarForm.websitePatterns, { pattern: '', enabled: true }]
                          });
                          autoSaveToolbar();
                        }}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#10b981',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        + Add Pattern
                      </button>
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>Context (optional)</label>
                      <textarea
                        value={toolbarForm.context}
                        onChange={(e) => {
                          setToolbarForm({ ...toolbarForm, context: e.target.value });
                        }}
                        onBlur={() => {
                          autoSaveToolbar();
                        }}
                        placeholder="Additional context for prompts"
                        rows={3}
                        style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                      />
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <h5 style={{ margin: 0 }}>Buttons</h5>
                        <button
                          onClick={() => {
                            const newToolbar = {
                              ...toolbarForm,
                              buttons: [...toolbarForm.buttons, {
                                id: `btn-${Date.now()}`,
                                title: 'New Button',
                                prompt: 'Process this: {{selectedText}}',
                                enabled: true,
                              }]
                            };
                            setToolbarForm(newToolbar);
                            autoSaveToolbar();
                          }}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#10b981',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          + Add Button
                        </button>
                      </div>

                      {toolbarForm.buttons.map((button, index) => (
                        <div
                          key={button.id}
                          draggable
                          onDragStart={() => handleDragStart(index)}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, index)}
                          onDragEnd={handleDragEnd}
                          style={{
                            marginBottom: '12px',
                            padding: '12px',
                            backgroundColor: '#fff',
                            border: '1px solid #e5e7eb',
                            borderRadius: '4px',
                            cursor: 'move',
                            opacity: draggedButtonIndex === index ? 0.5 : 1,
                            transition: 'opacity 0.2s ease',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                              <div style={{
                                width: '20px',
                                height: '20px',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                alignItems: 'center',
                                cursor: 'grab',
                                color: '#9ca3af'
                              }}>
                                <div style={{ width: '12px', height: '2px', backgroundColor: 'currentColor', marginBottom: '2px' }}></div>
                                <div style={{ width: '12px', height: '2px', backgroundColor: 'currentColor' }}></div>
                              </div>
                              <input
                                type="text"
                                value={button.title}
                                onChange={(e) => {
                                  const newButtons = [...toolbarForm.buttons];
                                  newButtons[index].title = e.target.value;
                                  setToolbarForm({ ...toolbarForm, buttons: newButtons });
                                }}
                                onBlur={() => {
                                  autoSaveToolbar();
                                }}
                                placeholder="Button Title"
                                style={{ width: '300px', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                              />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <label style={{ display: 'flex', alignItems: 'center' }}>
                                <input
                                  type="checkbox"
                                  checked={button.enabled}
                                  onChange={(e) => {
                                    const newButtons = [...toolbarForm.buttons];
                                    newButtons[index].enabled = e.target.checked;
                                    setToolbarForm({ ...toolbarForm, buttons: newButtons });
                                    autoSaveToolbar();
                                  }}
                                  style={{ marginRight: '4px' }}
                                />
                                Enabled
                              </label>
                              <button
                                onClick={() => deleteButton(button.id)}
                                style={{
                                  padding: '4px 6px',
                                  backgroundColor: 'transparent',
                                  color: '#ef4444',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontSize: '14px'
                                }}
                                title="Delete button"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                          <textarea
                            value={button.prompt}
                            onChange={(e) => {
                              const newButtons = [...toolbarForm.buttons];
                              newButtons[index].prompt = e.target.value;
                              setToolbarForm({ ...toolbarForm, buttons: newButtons });
                            }}
                            onBlur={() => {
                              autoSaveToolbar();
                            }}
                            placeholder="Enter prompt here. Use {{selectedText}} for selected text and {{context}} for context."
                            rows={2}
                            style={{ width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                          />
                        </div>
                      ))}
                      <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px' }}>
                        💡 Drag buttons to reorder them
                      </div>
                    </div>

                    </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default OptionsPage;