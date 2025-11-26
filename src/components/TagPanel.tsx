import React, { useRef, useLayoutEffect, useState } from 'react';
import TagList from './TagList';
import type { DropdownConfig } from '../types';

interface TagPanelProps {
  dropdowns: DropdownConfig[];
  style?: React.CSSProperties;
  toolbarId: string;
  buttonId: string;
  anchorRect?: DOMRect;
}

const TagPanel: React.FC<TagPanelProps> = ({ dropdowns, style, toolbarId, buttonId, anchorRect }) => {
  const panelRef = useRef<HTMLDivElement>(null)
  const [arrowLeft, setArrowLeft] = useState<number | null>(null)

  useLayoutEffect(() => {
    const panel = panelRef.current
    if (!panel || !anchorRect) { setArrowLeft(null); return }
    const pr = panel.getBoundingClientRect()
    const targetCenter = anchorRect.left + anchorRect.width / 2
    const left = targetCenter - pr.left
    const clamped = Math.max(8, Math.min(left, pr.width - 8))
    setArrowLeft(clamped)
  }, [anchorRect])

  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        padding: '8px',
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap',
        pointerEvents: 'auto',
        position: 'relative',
        minWidth: '300px',
        ...style,
      }}
      ref={panelRef}
    >
      <TagList
        dropdowns={dropdowns}
        toolbarId={toolbarId}
        buttonId={buttonId}
        style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-6px',
          left: arrowLeft != null ? `${arrowLeft}px` : '50%',
          width: '12px',
          height: '12px',
          background: '#ffffff',
          borderLeft: '1px solid #e5e7eb',
          borderBottom: '1px solid #e5e7eb',
          transform: 'translateX(-50%) rotate(45deg)',
          boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
          pointerEvents: 'none'
        }}
      />
    </div>
  );
};

export default TagPanel;
