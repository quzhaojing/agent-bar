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
    { value: 'deepseek-reasoner', label: 'DeepSeek Reasoner' },
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

export default function LLMProviderPage() {
  const [providers, setProviders] = useState<LLMProvider[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const result = await chrome.storage.local.get(['agent-bar-config']);
      const config = result['agent-bar-config'];

      if (config?.llmProviders) {
        setProviders(config.llmProviders);

        if (config.llmProviders.length > 0) {
          const provider = config.llmProviders[0];
          setProviderForm({
            name: provider.name,
            type: provider.type,
            apiKey: provider.apiKey,
            baseUrl: provider.baseUrl || providerDefaults[provider.type as keyof typeof providerDefaults].baseUrl,
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

  const saveData = async (data: any) => {
    try {
      await chrome.storage.local.set({ 'agent-bar-config': data });
      showMessage('Configuration saved successfully', 'success');
    } catch (error) {
      console.error('Error saving data:', error);
      showMessage('Error saving configuration', 'error');
    }
  };

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
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
    setProviderForm({
      name: updatedProvider.name,
      type: updatedProvider.type as 'openai',
      apiKey: updatedProvider.apiKey,
      baseUrl: updatedProvider.baseUrl,
      model: updatedProvider.model,
      temperature: updatedProvider.temperature,
      maxTokens: updatedProvider.maxTokens,
      enabled: updatedProvider.enabled,
      isDefault: updatedProvider.isDefault,
    });
    saveData({ llmProviders: updatedProviders });

    if (existingProvider) {
      showMessage('LLM Provider updated', 'success');
    } else {
      showMessage('LLM Provider configured', 'success');
    }
  };

  const handleProviderTypeChange = (type: 'openai' | 'claude' | 'gemini' | 'deepseek' | 'qwen' | 'glm') => {
    const defaults = providerDefaults[type];
    const updates = {
      type,
      baseUrl: defaults.baseUrl,
      model: defaults.model,
    };
    autoSaveProvider(updates as Partial<typeof providerForm>);
  };

  return (
    <div style={{ padding: '20px', backgroundColor: '#fff', color: '#333' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1 style={{ margin: 0, color: '#111827' }}>LLM Provider Settings</h1>
      </div>

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
    </div>
  );
}