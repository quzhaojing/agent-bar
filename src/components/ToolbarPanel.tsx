import React from 'react';
import ResultPanel from './ResultPanel';
import type { ToolbarPosition, ToolbarButton, ToolbarButtonConfig, DropdownConfig } from '../types';
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
    onResultPanelConfigure?: () => void;
    resultPanelShowConfigure?: boolean;
    panelDropdowns?: DropdownConfig[] | null;
    panelToolbarId?: string | null;
    panelButtonId?: string | null;
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
    onResultPanelConfigure,
    onDragStart,
    resultPanelShowConfigure,
    panelDropdowns,
    panelToolbarId,
    panelButtonId,
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
                zIndex: 8000,
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
                                if (onDragStart) onDragStart(e);
                            }}
                            title="Drag"
                        >⠿</button>
                    )}
                    extraRightControls={null}
                />
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
                        onConfigure={onResultPanelConfigure}
                        showConfigure={resultPanelShowConfigure}
                        dropdowns={panelDropdowns || undefined}
                        toolbarId={panelToolbarId || undefined}
                        buttonId={panelButtonId || undefined}
                    />
                )}
            </div>

        </div>
    );
};

export default ToolbarPanel;
