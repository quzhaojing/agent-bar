import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import TagList from './TagList';
import type { DropdownConfig } from '../types';

interface ResultPanelProps {
  visible: boolean;
  content: string;
  loading: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  onCopy: () => void;
  onRetry: () => void;
  onConfigure?: () => void;
  showConfigure?: boolean;
  dropdowns?: DropdownConfig[];
  toolbarId?: string;
  buttonId?: string;
}

const ResultPanel: React.FC<ResultPanelProps> = ({
  visible,
  content,
  loading,
  onClose,
  onCopy,
  onRetry,
  onConfigure,
  showConfigure,
  dropdowns,
  toolbarId,
  buttonId,
}) => {
  if (!visible) return null;

  const handleCopy = async () => {
    const text = (content || '').toString();
    const hasText = text.trim().length > 0;
    if (!hasText) return;

    let success = false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        success = true;
      }
    } catch {}

    if (!success) {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        success = document.execCommand('copy');
        document.body.removeChild(textarea);
      } catch {}
    }

    if (success) onCopy();
  };

  // Prevent clicks inside the panel from bubbling up to document
  const handlePanelClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // Handle close button click
  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();
  };

  // Handle copy button click
  const handleCopyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleCopy();
  };

  // Handle retry button click
  const handleRetryClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRetry();
  };

  const panelStyle: React.CSSProperties = {
    borderTop: '1px solid #e1e5e9',
    marginTop: '0',
    boxShadow: 'none',
    borderLeft: 'none',
    borderRight: 'none',
    borderBottom: 'none',
    borderRadius: '0 0 8px 8px',
  };


  return (
    <div
      className="agent-bar-result-panel"
      onClick={handlePanelClick}
      onMouseDown={handlePanelClick}
      style={panelStyle}
    >
      {Array.isArray(dropdowns) && dropdowns.length > 0 && (
        <div
          style={{
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
            padding: '8px',
            borderBottom: '1px solid #e1e5e9',
            background: '#f9fafb',
          }}
        >
          <TagList dropdowns={dropdowns.filter(dd => dd && dd.enabled)} toolbarId={toolbarId || ''} buttonId={buttonId || ''} />
        </div>
      )}
      <div className="result-panel-content">
        {loading ? (
          <div className="loading-content">
            <div className="loading-spinner"></div>
            <span>Processing...</span>
          </div>
        ) : (
          <div className="text-content">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                a: ({ href, children }) => (
                  <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
                ),
                img: ({ src, alt }) => (
                  <img src={src || ''} alt={alt || ''} />
                )
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        )}
      </div>

      <div className="result-panel-actions">
        {showConfigure && (
          <button
            className="action-button configure-button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.stopPropagation();
              if (onConfigure) onConfigure();
            }}
            title="Configure provider"
          >
            ⚙️
          </button>
        )}
        <button
          className="action-button copy-button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleCopyClick}
          title="Copy to clipboard"
        >
          📋
        </button>
        <button
          className="action-button retry-button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleRetryClick}
          title="Retry"
        >
          🔄
        </button>
        <button
          className="action-button close-button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleClose}
          title="Close"
        >
          ✕
        </button>
      </div>
    </div>
  );
};

export default ResultPanel;
