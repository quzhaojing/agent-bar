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
    dropdowns?: Dropdown[];
  }>;
  enabled: boolean;
}

interface DropdownOption {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
}

interface Dropdown {
  id: string;
  name: string;
  options: DropdownOption[];
  enabled: boolean;
  defaultOptionId?: string;
}

export default function ToolbarDetailPage({ toolbarId }: { toolbarId: string }) {
  const [toolbars, setToolbars] = useState<ToolbarButton[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [toolbarForm, setToolbarForm] = useState<ToolbarButton>({
    id: toolbarId,
    name: '',
    websitePatterns: [{ pattern: '*', enabled: true }],
    context: '',
    buttons: [],
    enabled: true
  });
  const [draggedButtonIndex, setDraggedButtonIndex] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [editingButtonIndex, setEditingButtonIndex] = useState<number | null>(null);
  const [editingDropdownIndex, setEditingDropdownIndex] = useState<number | null>(null);
  const [draggedDrawerOptionIndex, setDraggedDrawerOptionIndex] = useState<number | null>(null);
  const [draggedDropdown, setDraggedDropdown] = useState<{ buttonIndex: number; ddIndex: number } | null>(null);
  const [activeDropdownByButtonId, setActiveDropdownByButtonId] = useState<Record<string, string>>({});

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
    if (!toolbarForm) return;

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
    if (!toolbarForm) return;

    const newToolbar = {
      ...toolbarForm,
      buttons: [...toolbarForm.buttons, {
        id: `btn-${Date.now()}`,
        title: 'New Button',
        prompt: 'Process this: {{selectedText}}',
        enabled: true,
        dropdowns: []
      }]
    };
    setToolbarForm(newToolbar);
    autoSaveToolbar();
  };

  const deleteButton = (buttonId: string) => {
    if (!toolbarForm) return;

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
    if (draggedButtonIndex === null || draggedButtonIndex === dropIndex || !toolbarForm) return;

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

  const setActiveDropdown = (buttonId: string, dropdownId: string) => {
    setActiveDropdownByButtonId(prev => ({ ...prev, [buttonId]: dropdownId }));
  };

  const addDropdown = (buttonIndex: number) => {
    if (!toolbarForm) return;
    const newDropdown: Dropdown = {
      id: `dd-${Date.now()}`,
      name: 'New Dropdown',
      options: [],
      enabled: true,
      defaultOptionId: undefined
    };
    const newButtons = [...toolbarForm.buttons];
    const existingDropdowns = newButtons[buttonIndex].dropdowns || [];
    newButtons[buttonIndex].dropdowns = [...existingDropdowns, newDropdown];
    setToolbarForm({ ...toolbarForm, buttons: newButtons });
    setActiveDropdown(newButtons[buttonIndex].id, newDropdown.id);
    setEditingButtonIndex(buttonIndex);
    setEditingDropdownIndex((newButtons[buttonIndex].dropdowns || []).length - 1);
    setDrawerVisible(true);
    autoSaveToolbar();
  };

  const editDropdown = (buttonIndex: number, dropdownIndex: number) => {
    setEditingButtonIndex(buttonIndex);
    setEditingDropdownIndex(dropdownIndex);
    const button = toolbarForm.buttons[buttonIndex];
    const dropdown = (button.dropdowns || [])[dropdownIndex];
    if (dropdown) setActiveDropdown(button.id, dropdown.id);
    setDrawerVisible(true);
  };

  const deleteDropdown = (buttonIndex: number, dropdownId: string) => {
    if (!toolbarForm) return;
    const newButtons = [...toolbarForm.buttons];
    const dropdowns = newButtons[buttonIndex].dropdowns || [];
    newButtons[buttonIndex].dropdowns = dropdowns.filter(d => d.id !== dropdownId);
    setToolbarForm({ ...toolbarForm, buttons: newButtons });
    autoSaveToolbar();
  };

  const addOption = () => {
    if (editingButtonIndex === null || editingDropdownIndex === null || !toolbarForm) return;
    const newButtons = [...toolbarForm.buttons];
    const dropdowns = newButtons[editingButtonIndex].dropdowns || [];
    const dd = dropdowns[editingDropdownIndex];
    if (!dd) return;
    const newOpt: DropdownOption = { id: `opt-${Date.now()}`, label: 'Option', description: '', enabled: true };
    dd.options = [...dd.options, newOpt];
    newButtons[editingButtonIndex].dropdowns = dropdowns;
    setToolbarForm({ ...toolbarForm, buttons: newButtons });
    autoSaveToolbar();
  };

  const deleteOption = (index: number) => {
    if (editingButtonIndex === null || editingDropdownIndex === null || !toolbarForm) return;
    const newButtons = [...toolbarForm.buttons];
    const dropdowns = newButtons[editingButtonIndex].dropdowns || [];
    const dd = dropdowns[editingDropdownIndex];
    if (!dd) return;
    const removed = dd.options[index];
    dd.options = dd.options.filter((_, i) => i !== index);
    if (dd.defaultOptionId && removed && dd.defaultOptionId === removed.id) {
      dd.defaultOptionId = undefined;
    }
    newButtons[editingButtonIndex].dropdowns = dropdowns;
    setToolbarForm({ ...toolbarForm, buttons: newButtons });
    autoSaveToolbar();
  };

  const updateOptionLabel = (index: number, label: string) => {
    if (editingButtonIndex === null || editingDropdownIndex === null || !toolbarForm) return;
    const newButtons = [...toolbarForm.buttons];
    const dropdowns = newButtons[editingButtonIndex].dropdowns || [];
    const dd = dropdowns[editingDropdownIndex];
    if (!dd) return;
    const newOptions = [...dd.options];
    newOptions[index] = { ...newOptions[index], label };
    dd.options = newOptions;
    newButtons[editingButtonIndex].dropdowns = dropdowns;
    setToolbarForm({ ...toolbarForm, buttons: newButtons });
    autoSaveToolbar();
  };

  const updateOptionDescription = (index: number, description: string) => {
    if (editingButtonIndex === null || editingDropdownIndex === null || !toolbarForm) return;
    const newButtons = [...toolbarForm.buttons];
    const dropdowns = newButtons[editingButtonIndex].dropdowns || [];
    const dd = dropdowns[editingDropdownIndex];
    if (!dd) return;
    const newOptions = [...dd.options];
    newOptions[index] = { ...newOptions[index], description };
    dd.options = newOptions;
    newButtons[editingButtonIndex].dropdowns = dropdowns;
    setToolbarForm({ ...toolbarForm, buttons: newButtons });
    autoSaveToolbar();
  };

  const updateDropdownEnabled = (buttonIndex: number, dropdownIndex: number, enabled: boolean) => {
    if (!toolbarForm) return;
    const newButtons = [...toolbarForm.buttons];
    const dropdowns = newButtons[buttonIndex].dropdowns || [];
    if (!dropdowns[dropdownIndex]) return;
    dropdowns[dropdownIndex] = { ...dropdowns[dropdownIndex], enabled };
    newButtons[buttonIndex].dropdowns = dropdowns;
    setToolbarForm({ ...toolbarForm, buttons: newButtons });
    autoSaveToolbar();
  };

  const updateOptionEnabled = (index: number, enabled: boolean) => {
    if (editingButtonIndex === null || editingDropdownIndex === null || !toolbarForm) return;
    const newButtons = [...toolbarForm.buttons];
    const dropdowns = newButtons[editingButtonIndex].dropdowns || [];
    const dd = dropdowns[editingDropdownIndex];
    if (!dd) return;
    const newOptions = [...dd.options];
    newOptions[index] = { ...newOptions[index], enabled };
    dd.options = newOptions;
    newButtons[editingButtonIndex].dropdowns = dropdowns;
    setToolbarForm({ ...toolbarForm, buttons: newButtons });
    autoSaveToolbar();
  };

  const setDefaultOption = (optionId: string) => {
    if (editingButtonIndex === null || editingDropdownIndex === null || !toolbarForm) return;
    const newButtons = [...toolbarForm.buttons];
    const dropdowns = newButtons[editingButtonIndex].dropdowns || [];
    const dd = dropdowns[editingDropdownIndex];
    if (!dd) return;
    dd.defaultOptionId = optionId;
    newButtons[editingButtonIndex].dropdowns = dropdowns;
    setToolbarForm({ ...toolbarForm, buttons: newButtons });
    autoSaveToolbar();
  };

  const handleDrawerOptionDragStart = (index: number) => {
    setDraggedDrawerOptionIndex(index);
  };

  const handleDrawerOptionDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrawerOptionDrop = (dropIndex: number) => {
    if (editingButtonIndex === null || editingDropdownIndex === null || draggedDrawerOptionIndex === null || !toolbarForm) return;
    const newButtons = [...toolbarForm.buttons];
    const dropdowns = newButtons[editingButtonIndex].dropdowns || [];
    const dd = dropdowns[editingDropdownIndex];
    if (!dd) return;
    const newOptions = [...dd.options];
    const dragged = newOptions[draggedDrawerOptionIndex];
    newOptions.splice(draggedDrawerOptionIndex, 1);
    newOptions.splice(dropIndex, 0, dragged);
    dd.options = newOptions;
    newButtons[editingButtonIndex].dropdowns = dropdowns;
    setToolbarForm({ ...toolbarForm, buttons: newButtons });
    setDraggedDrawerOptionIndex(null);
    autoSaveToolbar();
  };

  const handleDrawerOptionDragEnd = () => {
    setDraggedDrawerOptionIndex(null);
  };

  

  const handleDropdownDragStart = (buttonIndex: number, ddIndex: number) => {
    setDraggedDropdown({ buttonIndex, ddIndex });
  };

  const handleDropdownDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropdownDrop = (buttonIndex: number, dropIndex: number) => {
    if (!toolbarForm) return;
    if (!draggedDropdown) return;
    if (draggedDropdown.buttonIndex !== buttonIndex) return;
    if (draggedDropdown.ddIndex === dropIndex) return;
    const newButtons = [...toolbarForm.buttons];
    const dropdowns = newButtons[buttonIndex].dropdowns || [];
    const dragged = dropdowns[draggedDropdown.ddIndex];
    dropdowns.splice(draggedDropdown.ddIndex, 1);
    dropdowns.splice(dropIndex, 0, dragged);
    newButtons[buttonIndex].dropdowns = dropdowns;
    setToolbarForm({ ...toolbarForm, buttons: newButtons });
    setDraggedDropdown(null);
    autoSaveToolbar();
  };

  const handleDropdownDragEnd = () => {
    setDraggedDropdown(null);
  };

  const addPattern = () => {
    if (!toolbarForm) return;

    setToolbarForm({
      ...toolbarForm,
      websitePatterns: [...toolbarForm.websitePatterns, { pattern: '', enabled: true }]
    });
    autoSaveToolbar();
  };

  const deletePattern = (index: number) => {
    if (!toolbarForm) return;

    const newPatterns = toolbarForm.websitePatterns.filter((_, i) => i !== index);
    setToolbarForm({ ...toolbarForm, websitePatterns: newPatterns });
    autoSaveToolbar();
  };

  const updatePattern = (index: number, updates: Partial<WebsitePattern>) => {
    if (!toolbarForm) return;

    const newPatterns = [...toolbarForm.websitePatterns];
    newPatterns[index] = { ...newPatterns[index], ...updates };
    setToolbarForm({ ...toolbarForm, websitePatterns: newPatterns });
    autoSaveToolbar();
  };

  const updateButtonTitle = (index: number, title: string) => {
    if (!toolbarForm) return;

    const newButtons = [...toolbarForm.buttons];
    newButtons[index].title = title;
    setToolbarForm({ ...toolbarForm, buttons: newButtons });
  };

  const updateButtonPrompt = (index: number, prompt: string) => {
    if (!toolbarForm) return;

    const newButtons = [...toolbarForm.buttons];
    newButtons[index].prompt = prompt;
    setToolbarForm({ ...toolbarForm, buttons: newButtons });
  };

  const updateButtonEnabled = (index: number, enabled: boolean) => {
    if (!toolbarForm) return;

    const newButtons = [...toolbarForm.buttons];
    newButtons[index].enabled = enabled;
    setToolbarForm({ ...toolbarForm, buttons: newButtons });
    autoSaveToolbar();
  };

  if (isLoading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{ color: '#6b7280' }}>Loading toolbar...</div>
      </div>
    );
  }

  if (!toolbarForm) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{ color: '#6b7280' }}>Toolbar not found</div>
        <button
          onClick={() => router.navigate('/toolbars')}
          style={{
            marginTop: '16px',
            padding: '8px 16px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          Back to Toolbars
        </button>
      </div>
    );
  }

  return (
    <div style={{
        padding: '20px',
        backgroundColor: '#fff',
        color: '#333',
        maxWidth: '100%',
        boxSizing: 'border-box',
        overflow: 'hidden'
      }}>
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
      <div style={{
        padding: '24px',
        backgroundColor: '#f9fafb',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
        maxWidth: '100%',
        boxSizing: 'border-box'
      }}>
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
              maxWidth: '100%',
              boxSizing: 'border-box',
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
              maxWidth: '100%',
              boxSizing: 'border-box',
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
                    onChange={(e) => updateButtonTitle(index, e.target.value)}
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
                      onChange={(e) => updateButtonEnabled(index, e.target.checked)}
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
                onChange={(e) => updateButtonPrompt(index, e.target.value)}
                onBlur={autoSaveToolbar}
                placeholder="Enter prompt here. Use {{selectedText}} for selected text and {{context}} for context."
                rows={3}
                style={{
                  width: '100%',
                  maxWidth: '100%',
                  boxSizing: 'border-box',
                  padding: '10px 14px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  resize: 'vertical'
                }}
              />
              <div style={{ marginTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ fontWeight: 600, color: '#374151' }}>Dropdowns</div>
                  <button
                    onClick={() => addDropdown(index)}
                    style={{ padding: '6px 12px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
                  >
                    + Add Dropdown
                  </button>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: '4px', marginBottom: '8px' }}>
                  {(button.dropdowns || []).map((dd, ddIndex) => (
                    <div
                      key={dd.id}
                      draggable
                      onDragStart={() => handleDropdownDragStart(index, ddIndex)}
                      onDragOver={handleDropdownDragOver}
                      onDrop={() => handleDropdownDrop(index, ddIndex)}
                      onDragEnd={handleDropdownDragEnd}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 10px', border: '1px solid #e5e7eb', borderRadius: '16px', backgroundColor: '#f9fafb', cursor: 'move', opacity: draggedDropdown && draggedDropdown.buttonIndex === index && draggedDropdown.ddIndex === ddIndex ? 0.6 : 1 }}
                    >
                      <button
                        onClick={() => setActiveDropdown(button.id, dd.id)}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: activeDropdownByButtonId[button.id] === dd.id ? '#1f2937' : '#6b7280', fontSize: '13px' }}
                        title={dd.name}
                      >
                        {dd.name}
                      </button>
                      <button
                        onClick={() => editDropdown(index, ddIndex)}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#3b82f6', fontSize: '13px' }}
                        title="Edit"
                      >
                        ✎
                      </button>
                      <button
                        onClick={() => deleteDropdown(index, dd.id)}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '13px' }}
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
                {(button.dropdowns || []).length > 0 && (
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>Drag dropdowns to reorder</div>
                )}
              </div>
            </div>
          ))}
          {toolbarForm.buttons.length > 0 && (
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px' }}>
              💡 Drag buttons to reorder them
            </div>
          )}
      </div>
      {drawerVisible && editingButtonIndex !== null && editingDropdownIndex !== null && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10001, display: 'flex', justifyContent: 'flex-end' }}>
          <div onClick={() => setDrawerVisible(false)} style={{ flex: 1, background: 'rgba(0,0,0,0.3)' }}></div>
          <div style={{ width: '420px', maxWidth: '80vw', height: '100%', background: '#fff', borderLeft: '1px solid #e5e7eb', boxShadow: 'rgba(0,0,0,0.1) 0 0 10px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 600, color: '#111827' }}>Edit Dropdown</div>
              <button onClick={() => setDrawerVisible(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '18px' }}>✕</button>
            </div>
            {(() => {
              const button = toolbarForm.buttons[editingButtonIndex!];
              const dd = (button.dropdowns || [])[editingDropdownIndex!];
              if (!dd) return null;
              return (
                <div style={{ padding: '16px', overflowY: 'auto' }}>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, color: '#374151' }}>Dropdown Name</label>
                    <input
                      type="text"
                      value={dd.name}
                      onChange={(e) => {
                        const newButtons = [...toolbarForm.buttons];
                        const dropdowns = newButtons[editingButtonIndex!].dropdowns || [];
                        const target = dropdowns[editingDropdownIndex!];
                        if (!target) return;
                        target.name = e.target.value;
                        newButtons[editingButtonIndex!].dropdowns = dropdowns;
                        setToolbarForm({ ...toolbarForm, buttons: newButtons });
                        autoSaveToolbar();
                      }}
                      placeholder="Enter dropdown name"
                      style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
                    />
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500, color: '#374151' }}>
                      <input type="checkbox" checked={dd.enabled} onChange={(e) => updateDropdownEnabled(editingButtonIndex!, editingDropdownIndex!, e.target.checked)} />
                      <span>Enabled</span>
                    </label>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ fontWeight: 600, color: '#374151' }}>Options</div>
                    <button onClick={addOption} style={{ padding: '6px 12px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>+ Add Option</button>
                  </div>
                  <div>
                    {dd.options.map((opt, i) => (
                      <div
                        key={opt.id}
                        draggable
                        onDragStart={() => handleDrawerOptionDragStart(i)}
                        onDragOver={handleDrawerOptionDragOver}
                        onDrop={() => handleDrawerOptionDrop(i)}
                        onDragEnd={handleDrawerOptionDragEnd}
                        style={{ position: 'relative', padding: '12px', paddingTop: '48px', border: '1px solid #e5e7eb', borderRadius: '6px', background: '#f9fafb', marginBottom: '10px', cursor: 'move', opacity: draggedDrawerOptionIndex === i ? 0.6 : 1 }}
                      >
                        <div style={{ position: 'absolute', top: '8px', right: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500, color: '#374151', fontSize: '12px' }}>
                            <input
                              type="radio"
                              name={`default-option-${dd.id}`}
                              checked={dd.defaultOptionId === opt.id}
                              onChange={() => setDefaultOption(opt.id)}
                            />
                            <span>Default</span>
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500, color: '#374151', fontSize: '12px' }}>
                            <input type="checkbox" checked={opt.enabled} onChange={(e) => updateOptionEnabled(i, e.target.checked)} />
                            <span>Enabled</span>
                          </label>
                          <button onClick={() => deleteOption(i)} title="Delete option" style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '16px', lineHeight: '1' }}>🗑️</button>
                        </div>
                        <div style={{ marginBottom: '8px' }}>
                          <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, color: '#374151' }}>Label</label>
                          <input type="text" value={opt.label} onChange={(e) => updateOptionLabel(i, e.target.value)} placeholder="Option label" style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }} />
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, color: '#374151' }}>Description</label>
                          <textarea value={opt.description} onChange={(e) => updateOptionDescription(i, e.target.value)} placeholder="Option description" rows={3} style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', resize: 'vertical' }} />
                        </div>
                      </div>
                    ))}
                    {dd.options.length === 0 && (
                      <div style={{ fontSize: '13px', color: '#6b7280' }}>No options</div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  </div>
);
}
