import React from 'react';

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
}) => {
  if (!visible) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      onCopy();
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
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
      <div className="result-panel-content">
        {loading ? (
          <div className="loading-content">
            <div className="loading-spinner"></div>
            <span>Processing...</span>
          </div>
        ) : (
          <div className="text-content">
            {content}
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