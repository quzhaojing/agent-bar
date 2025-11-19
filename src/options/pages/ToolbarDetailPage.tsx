import { useState, useEffect } from 'react';
import { router } from '../router';

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

export default function ToolbarDetailPage({ toolbarId }: { toolbarId: string }) {
  const [toolbars, setToolbars] = useState<ToolbarButton[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [toolbarForm, setToolbarForm] = useState<ToolbarButton>({
    id: '',
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
  const [draggedButtonIndex, setDraggedButtonIndex] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [toolbarId]);

  const loadData = async () => {
    try {
      const result = await chrome.storage.local.get(['agent-bar-config']);
      const config = result['agent-bar-config'];

      if (config) {
        setProviders(config.llmProviders || []);
        const toolbarButtons = config.toolbarButtons || [];
        const convertedToolbars = toolbarButtons.map((toolbar: any) => {
          let websitePatterns = toolbar.websitePatterns;

          if (toolbar.urlRule && !websitePatterns) {
            websitePatterns = [{ pattern: toolbar.urlRule, enabled: true }];
          } else if (websitePatterns && Array.isArray(websitePatterns)) {
            if (websitePatterns.length > 0 && typeof websitePatterns[0] === 'string') {
              websitePatterns = websitePatterns.map((pattern: string) => ({ pattern, enabled: true }));
            }
          } else {
            websitePatterns = [{ pattern: '*', enabled: true }];
          }

          return {
            ...toolbar,
            websitePatterns
          };
        });

        setToolbars(convertedToolbars);

        const toolbar = convertedToolbars.find((t: ToolbarButton) => t.id === toolbarId);
        if (toolbar) {
          setToolbarForm(toolbar);
        } else {
          // Create new toolbar
          const newToolbar: ToolbarButton = {
            id: toolbarId,
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
          setToolbarForm(newToolbar);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveData = async (data: any, showMessage: boolean = true) => {
    try {
      await chrome.storage.local.set({ 'agent-bar-config': data });
      if (showMessage) {
        setMessage('Toolbar saved successfully');
        setTimeout(() => setMessage(null), 2000);
      }
    } catch (error) {
      console.error('Error saving data:', error);
      if (showMessage) {
        setMessage('Error saving toolbar');
        setTimeout(() => setMessage(null), 2000);
      }
    }
  };

  const autoSaveToolbar = () => {
    const existingIndex = toolbars.findIndex(t => t.id === toolbarId);
    let updatedToolbars: ToolbarButton[];

    if (existingIndex !== -1) {
      // Update existing toolbar
      updatedToolbars = [...toolbars];
      updatedToolbars[existingIndex] = { ...toolbarForm, id: toolbarId };
    } else {
      // Add new toolbar
      updatedToolbars = [...toolbars, { ...toolbarForm, id: toolbarId }];
    }

    setToolbars(updatedToolbars);
    saveData({ llmProviders: providers, toolbarButtons: updatedToolbars }, false);
    setMessage('Toolbar saved');
    setTimeout(() => setMessage(null), 1500);
  };

  const addButton = () => {
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

    newButtons.splice(draggedButtonIndex, 1);
    newButtons.splice(dropIndex, 0, draggedButton);

    setToolbarForm({ ...toolbarForm, buttons: newButtons });
    setDraggedButtonIndex(null);
    autoSaveToolbar();
  };

  const handleDragEnd = () => {
    setDraggedButtonIndex(null);
  };

  const addPattern = () => {
    setToolbarForm({
      ...toolbarForm,
      websitePatterns: [...toolbarForm.websitePatterns, { pattern: '', enabled: true }]
    });
    autoSaveToolbar();
  };

  const deletePattern = (index: number) => {
    const newPatterns = toolbarForm.websitePatterns.filter((_, i) => i !== index);
    setToolbarForm({ ...toolbarForm, websitePatterns: newPatterns });
    autoSaveToolbar();
  };

  const updatePattern = (index: number, updates: Partial<WebsitePattern>) => {
    const newPatterns = [...toolbarForm.websitePatterns];
    newPatterns[index] = { ...newPatterns[index], ...updates };
    setToolbarForm({ ...toolbarForm, websitePatterns: newPatterns });
    autoSaveToolbar();
  };

  if (isLoading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{ color: '#6b7280' }}>Loading toolbar...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', backgroundColor: '#fff', color: '#333' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <button
            onClick={() => router.navigate('/toolbars')}
            style={{
              padding: '8px 16px',
              backgroundColor: 'transparent',
              color: '#6b7280',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              marginRight: '12px'
            }}
          >
            ← Back to Toolbars
          </button>
        </div>
        {message && (
          <div style={{
            padding: '8px 16px',
            borderRadius: '6px',
            backgroundColor: '#dcfce7',
            color: '#166534',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            {message}
          </div>
        )}
      </div>

      {/* Form */}
      <div style={{ padding: '24px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
        {/* Toolbar Name */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151' }}>Toolbar Name</label>
          <input
            type="text"
            value={toolbarForm.name}
            onChange={(e) => setToolbarForm({ ...toolbarForm, name: e.target.value })}
            onBlur={autoSaveToolbar}
            placeholder="Enter toolbar name"
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px'
            }}
          />
        </div>

        {/* Website Patterns */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '12px', fontWeight: '600', color: '#374151' }}>Website Patterns</label>
          <div style={{ marginBottom: '12px' }}>
            {toolbarForm.websitePatterns.map((websitePattern, index) => (
              <div key={index} style={{ display: 'flex', gap: '12px', marginBottom: '12px', alignItems: 'center' }}>
                <input
                  type="text"
                  value={websitePattern.pattern}
                  onChange={(e) => updatePattern(index, { pattern: e.target.value })}
                  onBlur={autoSaveToolbar}
                  placeholder="* or *.github.com"
                  style={{
                    flex: 1,
                    minWidth: 0,
                    padding: '12px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  <label style={{ display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
                    <input
                      type="checkbox"
                      checked={websitePattern.enabled}
                      onChange={(e) => updatePattern(index, { enabled: e.target.checked })}
                      style={{ marginRight: '6px' }}
                    />
                    <span style={{ fontSize: '14px', color: '#374151' }}>Enabled</span>
                  </label>
                  <button
                    onClick={() => {
                      if (toolbarForm.websitePatterns.length > 1) {
                        deletePattern(index);
                      }
                    }}
                    style={{
                      padding: '8px 12px',
                      backgroundColor: 'transparent',
                      color: '#ef4444',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: toolbarForm.websitePatterns.length === 1 ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      opacity: toolbarForm.websitePatterns.length === 1 ? 0.5 : 1
                    }}
                    title={toolbarForm.websitePatterns.length === 1 ? "Cannot delete the last pattern" : "Delete pattern"}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={addPattern}
            style={{
              padding: '8px 16px',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            + Add Pattern
          </button>
        </div>

        {/* Context */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151' }}>Context (optional)</label>
          <textarea
            value={toolbarForm.context}
            onChange={(e) => setToolbarForm({ ...toolbarForm, context: e.target.value })}
            onBlur={autoSaveToolbar}
            placeholder="Additional context for prompts"
            rows={3}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              resize: 'vertical'
            }}
          />
        </div>

        {/* Buttons */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <label style={{ display: 'block', fontWeight: '600', color: '#374151', margin: 0 }}>Buttons</label>
            <button
              onClick={addButton}
              style={{
                padding: '8px 16px',
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
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
                marginBottom: '16px',
                padding: '16px',
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                cursor: 'move',
                opacity: draggedButtonIndex === index ? 0.5 : 1,
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    cursor: 'grab',
                    color: '#9ca3af',
                    flexShrink: 0
                  }}>
                    <div style={{ width: '16px', height: '2px', backgroundColor: 'currentColor', marginBottom: '3px' }}></div>
                    <div style={{ width: '16px', height: '2px', backgroundColor: 'currentColor' }}></div>
                  </div>
                  <input
                    type="text"
                    value={button.title}
                    onChange={(e) => {
                      const newButtons = [...toolbarForm.buttons];
                      newButtons[index].title = e.target.value;
                      setToolbarForm({ ...toolbarForm, buttons: newButtons });
                    }}
                    onBlur={autoSaveToolbar}
                    placeholder="Button Title"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      minWidth: 0
                    }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                  <label style={{ display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
                    <input
                      type="checkbox"
                      checked={button.enabled}
                      onChange={(e) => {
                        const newButtons = [...toolbarForm.buttons];
                        newButtons[index].enabled = e.target.checked;
                        setToolbarForm({ ...toolbarForm, buttons: newButtons });
                        autoSaveToolbar();
                      }}
                      style={{ marginRight: '6px' }}
                    />
                    <span style={{ fontSize: '14px', color: '#374151' }}>Enabled</span>
                  </label>
                  <button
                    onClick={() => deleteButton(button.id)}
                    style={{
                      padding: '8px 12px',
                      backgroundColor: 'transparent',
                      color: '#ef4444',
                      border: 'none',
                      borderRadius: '6px',
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
                onBlur={autoSaveToolbar}
                placeholder="Enter prompt here. Use {{selectedText}} for selected text and {{context}} for context."
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  resize: 'vertical'
                }}
              />
            </div>
          ))}
          {toolbarForm.buttons.length > 0 && (
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px' }}>
              💡 Drag buttons to reorder them
            </div>
          )}
        </div>
      </div>
    </div>
  );
}