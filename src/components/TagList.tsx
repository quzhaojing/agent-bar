import React from 'react';
import TagSelector from './TagSelector';
import type { DropdownConfig } from '../types';

interface TagListProps {
  dropdowns: DropdownConfig[];
  toolbarId: string;
  buttonId: string;
  style?: React.CSSProperties;
}

const TagList: React.FC<TagListProps> = ({ dropdowns, toolbarId, buttonId, style }) => {
  const [selectionMap, setSelectionMap] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    const host = (typeof window !== 'undefined' && window.location) ? window.location.host : 'unknown-host';
    const loadSelections = async () => {
      const entries = await Promise.all(
        dropdowns.map((dd) => (
          new Promise<[string, string]>((resolve) => {
            try {
              const key = `agent-bar-selection:${host}:${toolbarId}:${buttonId}:${dd.id}`;
              if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                chrome.storage.local.get([key], (result) => {
                  const stored = result[key];
                  const label = stored && typeof stored === 'object' ? (stored.label || '') : (typeof stored === 'string' ? stored : '');
                  resolve([dd.id, label || '']);
                });
              } else {
                resolve([dd.id, '']);
              }
            } catch {
              resolve([dd.id, '']);
            }
          })
        ))
      );
      const map: Record<string, string> = {};
      entries.forEach(([id, label]) => { if (label) map[id] = label; });
      setSelectionMap(map);
    };
    loadSelections();
  }, [dropdowns, toolbarId, buttonId]);

  return (
    <div style={style}>
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
            defaultValue={selectionMap[dd.id] || defaultOptionLabel}
            placeHolder={dd.name || 'Dropdown'}
            predefinedTags={optionLabels}
            showRemoveButton={false}
            isDarkMode={false}
            openOnHover={true}
            direction={'up'}
            style={{}}
            onTagSelect={(tag) => {
              try {
                const host = (typeof window !== 'undefined' && window.location) ? window.location.host : 'unknown-host';
                const key = `agent-bar-selection:${host}:${toolbarId}:${buttonId}:${dd.id}`;
                const optionId = Array.isArray(dd.options)
                  ? dd.options.find((o: any) => o && o.label === tag)?.id
                  : undefined;
                const value = optionId ? { label: tag, optionId } : { label: tag };
                if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                  chrome.storage.local.set({ [key]: value });
                }
              } catch {}
              setSelectionMap((prev) => ({ ...prev, [dd.id]: tag }));
            }}
            onTagClear={() => {
              try {
                const host = (typeof window !== 'undefined' && window.location) ? window.location.host : 'unknown-host';
                const key = `agent-bar-selection:${host}:${toolbarId}:${buttonId}:${dd.id}`;
                if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                  chrome.storage.local.remove([key]);
                }
              } catch {}
              setSelectionMap((prev) => {
                const next = { ...prev };
                delete next[dd.id];
                return next;
              });
            }}
          />
        );
      })}
    </div>
  );
};

export default TagList;
