import React from 'react';

interface ResultPanelProps {
  visible: boolean;
  content: string;
  loading: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  onCopy: () => void;
  onRetry: () => void;
}

const ResultPanel: React.FC<ResultPanelProps> = ({
  visible,
  content,
  loading,
  position,
  onClose,
  onCopy,
  onRetry,
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

  return (
    <div
      className="agent-bar-result-panel"
      onClick={handlePanelClick}
      onMouseDown={handlePanelClick}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 9999,
        minWidth: '300px',
        maxWidth: '500px',
      }}
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
        <button
          className="action-button copy-button"
          onClick={handleCopyClick}
          title="Copy to clipboard"
        >
          📋
        </button>
        <button
          className="action-button retry-button"
          onClick={handleRetryClick}
          title="Retry"
        >
          🔄
        </button>
        <button
          className="action-button close-button"
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