import React, { useState, useRef, useEffect } from 'react';
import useOutsideClick from './UseOutsideClick';

interface TagSelectorProps {
    defaultValue?: string;
    placeHolder?: string;
    predefinedTags?: string[];
    showRemoveButton?: boolean;
    onTagSelect?: (tag: string) => void;
    onTagClear?: (previousTag: string | null) => void;
    style?: React.CSSProperties;
    isDarkMode?: boolean;
    openOnHover?: boolean;
    direction?: 'up' | 'down';
}

interface TagSelectorRef {
    getSelectedTag: () => string | null;
    setSelectedTag: (tag: string | null) => void;
    clear: () => void;
    showToast: (message: string, type?: 'info' | 'success' | 'error' | 'warning') => void;
}

const TagSelector = React.forwardRef<TagSelectorRef, TagSelectorProps>(({
    defaultValue,
    placeHolder = 'No tag selected',
    predefinedTags = [],
    showRemoveButton = true,
    onTagSelect = () => { },
    onTagClear = () => { },
    isDarkMode = true,
    ...props
}, ref) => {
    const [selectedTag, setSelectedTag] = useState<string | null>(defaultValue || null);
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [dropdownDirection, setDropdownDirection] = useState<'down' | 'up'>('down');
    const containerRef = useRef<HTMLDivElement>(null);

    // Update selectedTag state when defaultValue changes
    useEffect(() => {
        if (defaultValue !== undefined) {
            setSelectedTag(defaultValue);
        }
    }, [defaultValue]);

    // Use useOutsideClick to handle click outside events
    useOutsideClick(containerRef, () => {
        setIsOpen(false);
    });

    // Inject styles
    useEffect(() => {
        const styleId = 'tag-selector-styles';
        if (document.getElementById(styleId)) return;

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            @keyframes tagFadeIn {
                from {
                    opacity: 0;
                    transform: scale(0.8);
                }
                to {
                    opacity: 1;
                    transform: scale(1);
                }
            }

            @keyframes slideInRight {
                from {
                    opacity: 0;
                    transform: translateX(100%);
                }
                to {
                    opacity: 1;
                    transform: translateX(0);
                }
            }

            @keyframes slideOutRight {
                from {
                    opacity: 1;
                    transform: translateX(0);
                }
                to {
                    opacity: 0;
                    transform: translateX(100%);
                }
            }

            .tag-display:hover {
                border-color: #667eea !important;
            }

            .selected-tag:hover .tag-remove {
                background: rgba(255, 255, 255, 0.3) !important;
            }

            .tag-selector {
                margin: 0 !important;
                padding: 0 !important;
            }

            .tag-display {
                margin: 0 !important;
                box-sizing: border-box !important;
            }

            .selected-tag {
                margin: 0 !important;
                padding: 1px 2px !important;
            }
        `;
        document.head.appendChild(style);

        return () => {
            const existingStyle = document.getElementById(styleId);
            if (existingStyle) {
                existingStyle.remove();
            }
        };
    }, []);

    // Add ESC key and scroll event listeners
    useEffect(() => {
        const handleEscKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsOpen(false);
            }
        };

        const handleScrollOrResize = (e: Event) => {
            if (containerRef.current && e.target instanceof Node && containerRef.current.contains(e.target)) {
                return;
            }
            setIsOpen(false);
        };

        if (isOpen) {
            // Use setTimeout to ensure event handling is complete before adding listeners
            const timeoutId = setTimeout(() => {
                document.addEventListener('keydown', handleEscKey);
                window.addEventListener('scroll', handleScrollOrResize, true);
                window.addEventListener('resize', handleScrollOrResize);
            }, 0);

            return () => {
                clearTimeout(timeoutId);
                document.removeEventListener('keydown', handleEscKey);
                window.removeEventListener('scroll', handleScrollOrResize, true);
                window.removeEventListener('resize', handleScrollOrResize);
            };
        }
    }, [isOpen]);


    const selectTag = (tag: string) => {
        setSelectedTag(tag);
        setIsOpen(false);
        onTagSelect(tag);
    };

    const clearTag = () => {
        const previousTag = selectedTag;
        setSelectedTag(null);
        onTagClear(previousTag);
    };

    // Detect whether dropdown should display up or down
    const checkDropdownDirection = () => {
        if (!containerRef.current) return 'down';

        const containerRect = containerRef.current.getBoundingClientRect();
        const dropdownHeight = 200; // Estimated dropdown height
        const viewportHeight = window.innerHeight;
        const spaceBelow = viewportHeight - containerRect.bottom;
        const spaceAbove = containerRect.top;

        // If space below is insufficient and space above is more sufficient, display upward
        if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
            return 'up';
        }
        return 'down';
    };

    const toggleDropdown = () => {
        if (!isOpen) {
            // Detect direction before opening dropdown
            const direction = props.direction ?? checkDropdownDirection();
            setDropdownDirection(direction);
        }
        setIsOpen(!isOpen);
    };

    const showToast = (message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
        const toast = document.createElement('div');
        toast.className = 'tag-selector-toast';
        toast.textContent = message;

        const colors = {
            success: '#28a745',
            error: '#dc3545',
            warning: '#ffc107',
            info: '#17a2b8'
        };

        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${colors[type]};
            color: white;
            padding: 8px 16px;
            border-radius: 4px;
            font-size: 12px;
            z-index: 10001;
            animation: slideInRight 0.3s ease;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        `;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (document.body.contains(toast)) {
                    document.body.removeChild(toast);
                }
            }, 300);
        }, 2000);
    };

    // Expose methods to parent component
    React.useImperativeHandle(ref, () => ({
        getSelectedTag: () => selectedTag,
        setSelectedTag: (tag) => {
            setSelectedTag(tag);
            setIsOpen(false);
        },
        clear: clearTag,
        showToast
    }));

    const renderDisplay = () => {
        if (selectedTag) {
            const removeButtonHtml = showRemoveButton ? (
                <span
                    className="tag-remove"
                    onClick={(e) => {
                        clearTag();
                        e.stopPropagation();
                    }}
                    style={{
                        cursor: 'pointer',
                        width: '12px',
                        height: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '50%',
                        background: isDarkMode ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.6)',
                        color: isDarkMode ? '#ffffff' : '#1e40af',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        lineHeight: '1',
                        marginLeft: '2px'
                    }}
                >
                    ×
                </span>
            ) : null;

            return (
                <span
                    className="selected-tag"
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '1px 3px',
                        background: isDarkMode ? 'rgba(102, 126, 234, 0.2)' : 'rgba(59, 130, 246, 0.15)',
                        border: `1px solid ${isDarkMode ? 'rgba(102, 126, 234, 0.3)' : 'rgba(59, 130, 246, 0.4)'}`,
                        color: isDarkMode ? '#ffffff' : '#1e40af',
                        borderRadius: '6px',
                        fontSize: '10px',
                        fontWeight: '500'
                    }}
                >
                    <span className="tag-text">{selectedTag}</span>
                    {removeButtonHtml}
                </span>
            );
        } else {
            // When no tag is selected, display placeholder
            return (
                <span
                    className="placeholder-tag"
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '1px 3px',
                        background: isDarkMode ? 'rgba(100, 100, 100, 0.3)' : 'rgba(100, 100, 100, 0.2)',
                        color: isDarkMode ? '#cccccc' : '#666666',
                        borderRadius: '6px',
                        fontSize: '10px',
                        fontWeight: '400',
                        fontStyle: 'italic'
                    }}
                >
                    {placeHolder}
                </span>
            );
        }
    };

    const renderDropdown = () => {
        if (predefinedTags.length === 0) {
            return (
                <div
                    className="dropdown-empty"
                    style={{
                        padding: '12px',
                        textAlign: 'center',
                        color: isDarkMode ? '#999999' : '#666666',
                        fontSize: '14px',
                        fontStyle: 'italic'
                    }}
                >
                    No tags available
                </div>
            );
        }

        return predefinedTags.map((tag, index) => (
            <div
                key={index}
                className="dropdown-item"
                onClick={(e) => {
                    selectTag(tag)
                    e.stopPropagation()
                }}
                onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                    (e.target as HTMLDivElement).style.background = isDarkMode ? 'rgba(102, 126, 234, 0.1)' : 'rgba(102, 126, 234, 0.05)';
                }}
                onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                    (e.target as HTMLDivElement).style.background = 'transparent';
                }}
                style={{
                    padding: '10px 12px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: isDarkMode ? '#ffffff' : '#000000',
                    borderBottom: `1px solid ${isDarkMode ? 'rgba(100, 100, 100, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    whiteSpace: 'nowrap'
                }}
            >
                <span>{tag}</span>
            </div>
        ));
    };

    return (
        <div
            ref={containerRef}
            className="tag-selector"
            style={{
                position: 'relative',
                zIndex: isOpen ? 10002 : 'auto',
                display: 'inline-block',
                width: 'auto',
                minWidth: 'auto',
                margin: '0',
                padding: '0',
                ...props.style
            }}
            onClick={(e) => {
                e.stopPropagation()
            }
            }
            onMouseEnter={() => {
                if (props.openOnHover) {
                    const direction = props.direction ?? checkDropdownDirection();
                    setDropdownDirection(direction);
                    setIsOpen(true);
                }
            }}
            onMouseLeave={() => {
                if (props.openOnHover) {
                    setIsOpen(false);
                }
            }}
        >
            <div
                className="tag-display"
                onClick={(e) => {
                    e.stopPropagation()
                    toggleDropdown()
                }}
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '2px',
                    padding: '1px 2px',
                    margin: '0',
                    border: 'none',
                    borderRadius: '3px',
                    background: 'transparent', // Change to transparent background
                    minHeight: '16px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                    whiteSpace: 'nowrap'
                }}
            >
                {renderDisplay()}
            </div>
            {isOpen && (
                <div
                    className="tag-dropdown"
                    style={{
                        position: 'absolute',
                        top: dropdownDirection === 'down' ? '100%' : 'auto',
                        bottom: dropdownDirection === 'up' ? '100%' : 'auto',
                        left: '0',
                        background: isDarkMode ? 'rgba(50, 50, 50, 0.95)' : 'rgba(240, 240, 240, 0.95)',
                        backdropFilter: 'blur(10px)',
                        WebkitBackdropFilter: 'blur(10px)',
                        border: `1px solid ${isDarkMode ? 'rgba(100, 100, 100, 0.3)' : 'rgba(0, 0, 0, 0.2)'}`,
                        borderTop: dropdownDirection === 'down' ? 'none' : `1px solid ${isDarkMode ? 'rgba(100, 100, 100, 0.3)' : 'rgba(0, 0, 0, 0.2)'}`,
                        borderBottom: dropdownDirection === 'up' ? 'none' : `1px solid ${isDarkMode ? 'rgba(100, 100, 100, 0.3)' : 'rgba(0, 0, 0, 0.2)'}`,
                        borderRadius: dropdownDirection === 'down' ? '8px' : '8px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                        maxHeight: '200px',
                        overflowY: 'auto',
                        zIndex: 10000,
                        width: 'max-content',
                        minWidth: '150px'
                    }}
                >
                    {renderDropdown()}
                </div>
            )}
        </div>
    );
});

TagSelector.displayName = 'TagSelector';

export default TagSelector;
