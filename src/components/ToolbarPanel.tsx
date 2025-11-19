import React from 'react';
import ResultPanel from './ResultPanel';
import type { ToolbarPosition, ToolbarButton, ToolbarButtonConfig } from '../types';
import ToolbarButtons from './ToolbarButtons';

interface ToolbarPanelProps {
    containerRef: React.RefObject<HTMLDivElement>;
    position: ToolbarPosition;
    buttons: (ToolbarButtonConfig & { toolbarId: string; toolbarName: string })[];
    loading: boolean;
    onButtonClick: (button: ToolbarButton | ToolbarButtonConfig) => void;
    resultPanelVisible: boolean;
    resultPanelContent: string;
    resultPanelPosition: { x: number; y: number };
    onResultPanelClose: () => void;
    onResultPanelCopy: () => void;
    onResultPanelRetry: () => void;
    onDragStart?: (e: React.MouseEvent) => void;
}

const ToolbarPanel: React.FC<ToolbarPanelProps> = ({
    containerRef,
    position,
    buttons,
    loading,
    onButtonClick,
    resultPanelVisible,
    resultPanelContent,
    resultPanelPosition,
    onResultPanelClose,
    onResultPanelCopy,
    onResultPanelRetry,
}) => {
    if (!position.visible && !resultPanelVisible) return null;

    return (
        <div
            ref={containerRef}
            className="agent-bar-toolbar"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
            }}
            style={{
                position: 'absolute',
                left: `${position.x}px`,
                top: `${position.y}px`,
                zIndex: 10000,
                pointerEvents: position.visible || resultPanelVisible ? 'auto' : 'none',
            }}
        >
            <div className={`toolbar-container ${position.visible
                ? position.direction === 'up' ? 'visible-up' : 'visible-down'
                : 'hidden'
                }`}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
            >
                <ToolbarButtons
                    buttons={buttons}
                    loading={loading}
                    onButtonClick={onButtonClick}
                    extraLeftControls={(
                        <button
                            className="toolbar-button"
                            onMouseDown={(e) => {
                                e.preventDefault();
                            }}
                            title="Drag"
                        >⠿</button>
                    )}
                    extraRightControls={null}
                />
                {position.direction === 'up' && (
                    <div className="toolbar-arrow toolbar-arrow-up" />
                )}
                {position.direction === 'down' && (
                    <div className="toolbar-arrow toolbar-arrow-down" />
                )}
                {/* Result Panel */}
                {resultPanelVisible && (
                    <ResultPanel
                        visible={resultPanelVisible}
                        content={resultPanelContent}
                        loading={loading}
                        position={resultPanelPosition}
                        onClose={onResultPanelClose}
                        onCopy={onResultPanelCopy}
                        onRetry={onResultPanelRetry}
                    />
                )}
            </div>

        </div>
    );
};

export default ToolbarPanel;
