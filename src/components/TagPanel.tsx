import React from 'react';
import TagSelector from './TagSelector';
import type { DropdownConfig } from '../types';

interface TagPanelProps {
  dropdowns: DropdownConfig[];
  style?: React.CSSProperties;
}

const TagPanel: React.FC<TagPanelProps> = ({ dropdowns, style }) => {
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
        ...style,
      }}
    >
      {dropdowns.map((dd, ddi) => {
        const defaultOptionLabel = dd.defaultOptionId && Array.isArray(dd.options)
          ? (dd.options.find((o: any) => o && o.id === dd.defaultOptionId)?.label || '')
          : '';

        const optionLabels = Array.isArray(dd.options)
          ? dd.options.filter((o: any) => o && o.enabled).map((o: any) => o.label || 'Option')
          : [];

        return (
          <TagSelector
            key={dd.id || ddi}
            defaultValue={defaultOptionLabel}
            placeHolder={dd.name || 'Dropdown'}
            predefinedTags={optionLabels}
            showRemoveButton={false}
            isDarkMode={false}
            openOnHover={true}
            direction={'up'}
            style={{}}
          />
        );
      })}
    </div>
  );
};

export default TagPanel;
