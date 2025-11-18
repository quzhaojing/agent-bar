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

export default function ToolbarListPage() {
  const [toolbars, setToolbars] = useState<ToolbarButton[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const result = await chrome.storage.local.get(['agent-bar-config']);
      const config = result['agent-bar-config'];

      if (config) {
        const toolbarButtons = config.toolbarButtons || [];
        const convertedToolbars = toolbarButtons.map((toolbar: any) => {
          let websitePatterns = toolbar.websitePatterns;

          // Migrate from old data structure
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
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const saveData = async (data: any) => {
    try {
      await chrome.storage.local.set({ 'agent-bar-config': data });
    } catch (error) {
      console.error('Error saving data:', error);
    }
  };

  const createNewToolbar = async () => {
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
    await saveData({ llmProviders: [], toolbarButtons: updatedToolbars });

    // Navigate to edit page
    router.navigate(`/toolbar/${newToolbar.id}`);
  };

  const editToolbar = (toolbarId: string) => {
    router.navigate(`/toolbar/${toolbarId}`);
  };

  const toggleToolbar = async (toolbarId: string) => {
    const updatedToolbars = toolbars.map(toolbar =>
      toolbar.id === toolbarId ? { ...toolbar, enabled: !toolbar.enabled } : toolbar
    );
    setToolbars(updatedToolbars);
    await saveData({ llmProviders: [], toolbarButtons: updatedToolbars });
  };

  const deleteToolbar = async (toolbarId: string) => {
    if (confirm('Are you sure you want to delete this toolbar?')) {
      const updatedToolbars = toolbars.filter(toolbar => toolbar.id !== toolbarId);
      setToolbars(updatedToolbars);
      await saveData({ llmProviders: [], toolbarButtons: updatedToolbars });
    }
  };

  return (
    <div style={{ padding: '20px', backgroundColor: '#fff', color: '#333' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1 style={{ margin: 0, color: '#111827' }}>Toolbars</h1>
        <button
          onClick={createNewToolbar}
          style={{
            padding: '10px 20px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          + Create New Toolbar
        </button>
      </div>

      {toolbars.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>📋</div>
          <h3 style={{ color: '#6b7280', marginBottom: '16px', fontSize: '20px' }}>No toolbars configured yet</h3>
          <p style={{ color: '#9ca3af', marginBottom: '24px', fontSize: '14px' }}>
            Create your first toolbar to start using Agent Bar on your favorite websites.
          </p>
          <button
            onClick={createNewToolbar}
            style={{
              padding: '12px 24px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '500'
            }}
          >
            Create Your First Toolbar
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {toolbars.map(toolbar => (
            <div
              key={toolbar.id}
              style={{
                padding: '20px',
                backgroundColor: toolbar.enabled ? '#f9fafb' : '#f3f4f6',
                border: `1px solid ${toolbar.enabled ? '#e5e7eb' : '#d1d5db'}`,
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                position: 'relative'
              }}
              onClick={() => editToolbar(toolbar.id)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', gap: '8px' }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    backgroundColor: '#fff',
                    padding: '6px 8px',
                    borderRadius: '6px',
                    border: '1px solid #e5e7eb',
                    cursor: 'pointer',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={toolbar.enabled}
                    onChange={() => toggleToolbar(toolbar.id)}
                    style={{ marginRight: '6px' }}
                  />
                  <span style={{ fontSize: '12px', color: '#374151', fontWeight: '500' }}>Enabled</span>
                </label>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteToolbar(toolbar.id);
                  }}
                  style={{
                    padding: '6px 8px',
                    backgroundColor: 'transparent',
                    color: '#ef4444',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    transition: 'background-color 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#fef2f2';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                  title="Delete toolbar"
                >
                  🗑️
                </button>
              </div>

              <div style={{ paddingRight: '100px' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '8px',
                    backgroundColor: '#3b82f6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: '12px',
                    fontSize: '20px'
                  }}>
                    📋
                  </div>
                  <h3 style={{
                    margin: 0,
                    color: toolbar.enabled ? '#111827' : '#9ca3af',
                    fontSize: '18px',
                    fontWeight: '600'
                  }}>
                    {toolbar.name}
                  </h3>
                </div>

                <div style={{
                  padding: '8px 12px',
                  backgroundColor: '#fff',
                  borderRadius: '6px',
                  border: '1px solid #e5e7eb',
                  marginBottom: '12px'
                }}>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Website Patterns:</div>
                  <div style={{ fontSize: '13px', color: '#374151', fontFamily: 'monospace' }}>
                    {toolbar.websitePatterns
                      ? toolbar.websitePatterns.map((wp: WebsitePattern) => wp.pattern).join(', ')
                      : (toolbar as any).urlRule || '*'
                    }
                  </div>
                </div>

                <div style={{
                  padding: '8px 12px',
                  backgroundColor: '#fff',
                  borderRadius: '6px',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Buttons:</div>
                  <div style={{ fontSize: '13px', color: '#374151' }}>
                    {toolbar.buttons.length} {toolbar.buttons.length === 1 ? 'button' : 'buttons'} configured
                  </div>
                  <div style={{ marginTop: '4px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {toolbar.buttons.slice(0, 3).map((button, index) => (
                      <span
                        key={button.id}
                        style={{
                          fontSize: '11px',
                          padding: '2px 6px',
                          backgroundColor: '#e5e7eb',
                          borderRadius: '3px',
                          color: '#6b7280'
                        }}
                      >
                        {button.title}
                      </span>
                    ))}
                    {toolbar.buttons.length > 3 && (
                      <span style={{
                        fontSize: '11px',
                        padding: '2px 6px',
                        backgroundColor: '#e5e7eb',
                        borderRadius: '3px',
                        color: '#6b7280'
                      }}>
                        +{toolbar.buttons.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}