import React, { useState, useRef, useEffect } from 'react';
import './style.css';

interface ResultPanelProps {
  visible: boolean;
  content: string;
  loading: boolean;
  position: {
    x: number;
    y: number;
  };
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
  const [isMinimized, setIsMinimized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [panelPos, setPanelPos] = useState(position);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPanelPos(position);
  }, [position]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.panel-header')) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - panelPos.x,
        y: e.clientY - panelPos.y,
      });
      e.preventDefault();
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      setPanelPos({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      onCopy();
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  };

  const formatContent = (text: string) => {
    // Simple markdown-like formatting
    return text
      .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      .replace(/^\- (.*$)/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^/, '<p>')
      .replace(/$/, '</p>');
  };

  if (!visible) return null;

  return (
    <div
      ref={panelRef}
      className={`result-panel ${isMinimized ? 'minimized' : ''} ${isDragging ? 'dragging' : ''}`}
      style={{
        left: `${panelPos.x}px`,
        top: `${panelPos.y}px`,
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="panel-header">
        <div className="panel-title">
          <span className="title-text">Agent Bar Response</span>
          {loading && <div className="loading-indicator" />}
        </div>
        <div className="panel-controls">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="control-btn minimize-btn"
            title={isMinimized ? 'Expand' : 'Minimize'}
          >
            {isMinimized ? '▲' : '▼'}
          </button>
          <button
            onClick={onRetry}
            className="control-btn retry-btn"
            title="Retry"
            disabled={loading}
          >
            ↻
          </button>
          <button
            onClick={handleCopy}
            className="control-btn copy-btn"
            title="Copy"
            disabled={!content || loading}
          >
            📋
          </button>
          <button
            onClick={onClose}
            className="control-btn close-btn"
            title="Close"
          >
            ×
          </button>
        </div>
      </div>

      {!isMinimized && (
        <div className="panel-content">
          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner" />
              <div className="loading-text">Generating response...</div>
            </div>
          ) : content ? (
            <div
              className="content-text"
              dangerouslySetInnerHTML={{ __html: formatContent(content) }}
            />
          ) : (
            <div className="empty-state">
              <div className="empty-icon">💭</div>
              <div className="empty-text">No content to display</div>
            </div>
          )}
        </div>
      )}

      {content && !loading && !isMinimized && (
        <div className="panel-footer">
          <div className="content-stats">
            <span className="char-count">{content.length} characters</span>
            <span className="word-count">{content.split(/\s+/).filter(word => word.length > 0).length} words</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultPanel;