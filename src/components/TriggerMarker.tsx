import React, { useEffect, useRef } from 'react';

type Trigger = 'text-selection' | 'input-focus';

interface RectLike {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

interface TriggerMarkerProps {
  visible: boolean;
  trigger: Trigger;
  rect: RectLike;
  endRect?: RectLike;
  text: string;
  onHover: (anchorRect: DOMRect) => void;
  onMount?: (el: HTMLDivElement | null) => void;
}

const TriggerMarker: React.FC<TriggerMarkerProps> = ({ visible, trigger, rect, endRect, onHover, onMount }) => {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (onMount) onMount(ref.current);
  }, [ref.current]);

  useEffect(() => {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ 'agent-bar-marker-trigger': trigger });
      }
    } catch { }
  }, [trigger]);

  if (!visible || !rect) return null;

  const margin = 6;
  const size = 18;
  const vpRight = window.innerWidth;
  const vpBottom = window.innerHeight;
  const centerY = rect.top + rect.height / 2;
  const upper = centerY < vpBottom / 2;
  let left: number;
  let top: number;

  if (trigger === 'text-selection') {
    const r = upper ? (endRect || rect) : rect;
    if (upper) {
      left = r.right + margin;
      top = r.bottom - size / 2;
    } else {
      left = r.right + margin;
      top = r.top - size / 2;
    }
  } else {
    if (upper) {
      left = rect.right + margin;
      top = rect.bottom - size / 2;
    } else {
      left = rect.right + margin;
      top = rect.top - size / 2;
    }
  }

  if (left + size + margin > vpRight) left = rect.left - size - margin;
  if (left < margin) left = margin;
  if (top + size + margin > vpBottom) top = vpBottom - size - margin;
  if (top < margin) top = margin;

  return (
    <div
      ref={ref}
      data-trigger={trigger}
      className="agent-bar-selection-marker"
      onMouseEnter={() => {
        const el = ref.current;
        if (!el) return;
        const mr = el.getBoundingClientRect();
        onHover(mr);
      }}
      style={{
        position: 'fixed',
        left,
        top,
        width: size,
        height: size,
        borderRadius: '50%',
        background: '#2563eb',
        boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
        border: '2px solid #fff',
        zIndex: 2147483646,
        cursor: 'pointer',
        pointerEvents: 'auto'
      }}
    />
  );
};

export default TriggerMarker;
