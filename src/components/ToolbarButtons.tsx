import React from 'react';
import type { ToolbarButton, ToolbarButtonConfig } from '../types';

interface ToolbarButtonsProps {
    buttons: (ToolbarButtonConfig & { toolbarId: string; toolbarName: string })[];
    loading: boolean;
    onButtonClick: (button: ToolbarButton | ToolbarButtonConfig) => void;
    extraLeftControls?: React.ReactNode;
    extraRightControls?: React.ReactNode;
}

const hasEnabledDropdowns = (button: any): boolean => {
    console.log("=====button:", button);
    return 'dropdowns' in button &&
        Array.isArray(button.dropdowns) &&
        button.dropdowns.some((dropdown: any) => dropdown.enabled);
};

const ToolbarButtons: React.FC<ToolbarButtonsProps> = ({ buttons, loading, onButtonClick, extraLeftControls, extraRightControls }) => {
    console.log("ToolbarButtons rendering. Buttons count:", buttons.length);
    return (
        <div className="toolbar-buttons">
            {extraLeftControls}
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
                        {hasEnabledDropdowns(button) && (
                            <span className="dropdown-indicator-badge" />
                        )}
                    </button>
                );
            })}
            {extraRightControls}
        </div>
    );
};

export default ToolbarButtons;
