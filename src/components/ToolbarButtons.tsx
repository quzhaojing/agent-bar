import React, { useState } from 'react';
import type { ToolbarButton, ToolbarButtonConfig, DropdownConfig } from '../types';
import TagSelector from './TagSelector';

interface ToolbarButtonsProps {
    buttons: ToolbarButtonConfig[];
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
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    console.log("ToolbarButtons rendering. Buttons count:", buttons.length);
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
                        onMouseEnter={() => setHoveredIndex(index)}
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
                                    left: 0,
                                    zIndex: 10001,
                                    pointerEvents: 'none',
                                    display: 'flex',
                                    gap: '6px',
                                    flexWrap: 'wrap'
                                }}
                            >
                                {enabledDropdowns.map((dd: DropdownConfig, ddi: number) => {
                                    const defaultOptionLabel = dd.defaultOptionId && Array.isArray(dd.options)
                                        ? (dd.options.find((o: any) => o && o.id === dd.defaultOptionId)?.label || '')
                                        : '';
                                    return (
                                        <TagSelector
                                            key={dd.id || ddi}
                                            defaultValue={defaultOptionLabel}
                                            placeHolder={dd.name || 'Dropdown'}
                                            predefinedTags={Array.isArray(dd.options)
                                                ? dd.options.filter((o: any) => o && o.enabled).map((o: any) => o.label || 'Option')
                                                : []}
                                            showRemoveButton={false}
                                            isDarkMode={false}
                                            openOnHover={true}
                                            direction={'up'}
                                            style={{ pointerEvents: 'auto' }}
                                        />
                                    );
                                })}
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
