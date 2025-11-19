import React from 'react';
import type { ToolbarButton, ToolbarButtonConfig } from '../types';

interface ToolbarButtonsProps {
    buttons: (ToolbarButtonConfig & { toolbarId: string; toolbarName: string })[];
    loading: boolean;
    onButtonClick: (button: ToolbarButton | ToolbarButtonConfig) => void;
}

const ToolbarButtons: React.FC<ToolbarButtonsProps> = ({ buttons, loading, onButtonClick }) => {
    return (
        <div className="toolbar-buttons">
            {buttons.map((btn, index) => {
                const button = btn as any;
                return (
                <button
                  key={`${'toolbarId' in button ? button.toolbarId : 'legacy'}-${button.id}`}
                  className="toolbar-button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => onButtonClick(button)}
                  disabled={loading}
                  title={'toolbarName' in button ? `${button.toolbarName}: ${button.title}` : button.name}
                  style={{
                    animationDelay: `${index * 50}ms`,
                  }}
                >
                        {'icon' in button && button.icon && (
                            <span className="button-icon">{button.icon}</span>
                        )}
                        <span className="button-text">{'title' in button ? button.title : button.name}</span>
                    </button>
                );
            })}
        </div>
    );
};

export default ToolbarButtons;
