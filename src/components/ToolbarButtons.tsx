import React, { useRef, useState } from 'react';
import type { ToolbarButton, ToolbarButtonConfig, DropdownConfig } from '../types';
import TagPanel from './TagPanel';

interface ToolbarButtonsProps {
    buttons: ToolbarButtonConfig[];
    loading: boolean;
    onButtonClick: (button: ToolbarButton | ToolbarButtonConfig) => void;
    extraLeftControls?: React.ReactNode;
    extraRightControls?: React.ReactNode;
}

const hasEnabledDropdowns = (button: any): boolean => {
    return 'dropdowns' in button &&
        Array.isArray(button.dropdowns) &&
        button.dropdowns.some((dropdown: any) => dropdown.enabled);
};

const ToolbarButtons: React.FC<ToolbarButtonsProps> = ({ buttons, loading, onButtonClick, extraLeftControls, extraRightControls }) => {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
    return (
        <div className="toolbar-buttons">
            {extraLeftControls}
            {buttons.map((btn, index) => {
                const button = btn as any;
                const enabledDropdowns: DropdownConfig[] = (
                    'dropdowns' in button && Array.isArray(button.dropdowns)
                        ? button.dropdowns.filter((d: any) => d && d.enabled)
                        : []
                );
                return (
                    <div
                        key={`${'toolbarId' in button ? button.toolbarId : 'legacy'}-${button.id}`}
                        style={{ position: 'relative', display: 'inline-block' }}
                        onMouseEnter={() => {
                            setHoveredIndex(index)
                        }}
                        onMouseLeave={() => setHoveredIndex((prev) => (prev === index ? null : prev))}
                    >
                        <button
                            className="toolbar-button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => onButtonClick(button)}
                            disabled={loading}
                            title={'toolbarName' in button ? `${button.toolbarName}: ${button.title}` : button.name}
                            style={{
                                animationDelay: `${index * 50}ms`,
                            }}
                            ref={(el) => { buttonRefs.current[index] = el }}
                        >
                            {'icon' in button && button.icon && (
                                <span className="button-icon">{button.icon}</span>
                            )}
                            <span className="button-text">{'title' in button ? button.title : button.name}</span>
                            {hasEnabledDropdowns(button) && (
                                <span className="dropdown-indicator-badge" />
                            )}
                        </button>

                        {hoveredIndex === index && enabledDropdowns.length > 0 && (
                            <div
                                style={{
                                    position: 'absolute',
                                    bottom: '100%',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    zIndex: 9000,
                                }}
                            >
                                <TagPanel
                                    dropdowns={enabledDropdowns}
                                    toolbarId={button.toolbarId}
                                    buttonId={button.id}
                                    anchorRect={buttonRefs.current[index]?.getBoundingClientRect()}
                                />
                            </div>
                        )}
                    </div>
                );
            })}
            {extraRightControls}
        </div>
    );
};

export default ToolbarButtons;
