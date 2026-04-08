import { useRef, useState, useCallback, useEffect } from 'react';

interface ResizablePanelProps {
  defaultWidth: number;
  minWidth: number;
  maxWidth: number;
  side: 'left' | 'right';
  isOpen: boolean;
  collapsedWidth?: number;
  storageKey: string;
  children: React.ReactNode;
  className?: string;
}

export function ResizablePanel({
  defaultWidth,
  minWidth,
  maxWidth,
  side,
  isOpen,
  collapsedWidth = 40,
  storageKey,
  children,
  className = '',
}: ResizablePanelProps) {
  const [width, setWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? parseInt(saved, 10) : defaultWidth;
    } catch {
      return defaultWidth;
    }
  });

  const dragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging.current) return;
    const delta = side === 'left'
      ? e.clientX - startX.current
      : startX.current - e.clientX;
    const next = Math.min(maxWidth, Math.max(minWidth, startWidth.current + delta));
    setWidth(next);
  }, [side, minWidth, maxWidth]);

  const onMouseUp = useCallback(() => {
    if (!dragging.current) return;
    dragging.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [onMouseMove, onMouseUp]);

  // Persist width
  useEffect(() => {
    try { localStorage.setItem(storageKey, String(width)); } catch {}
  }, [width, storageKey]);

  const startDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    startX.current = e.clientX;
    startWidth.current = width;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [width]);

  const currentWidth = isOpen ? width : collapsedWidth;

  return (
    <div
      className={`relative shrink-0 flex ${className}`}
      style={{ width: currentWidth }}
    >
      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col" style={{ width: '100%' }}>
        {children}
      </div>

      {/* Drag handle */}
      {isOpen && (
        <div
          onMouseDown={startDrag}
          className={`absolute top-0 bottom-0 w-1 cursor-col-resize z-20 group ${
            side === 'left' ? 'right-0' : 'left-0'
          }`}
          style={{ touchAction: 'none' }}
        >
          <div className="absolute inset-y-0 w-1 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: 'hsl(var(--primary) / 0.5)' }}
          />
        </div>
      )}
    </div>
  );
}
