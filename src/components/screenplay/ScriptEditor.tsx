import { useRef, useEffect, useCallback, useState, KeyboardEvent } from 'react';
import { ScriptLine, LineType, createLine } from '@/types/screenplay';
import { cn } from '@/lib/utils';

interface ScriptEditorProps {
  lines: ScriptLine[];
  showSceneNumbers: boolean;
  onUpdateLine: (id: string, updates: Partial<ScriptLine>) => void;
  onInsertAfter: (afterId: string, type?: LineType) => string;
  onRemoveLine: (id: string) => void;
  focusLineId: string | null;
  onFocusLine: (id: string) => void;
  onLineTypeChange: (type: LineType) => void;
  highlightLineId: string | null;
}

export function ScriptEditor({
  lines,
  showSceneNumbers,
  onUpdateLine,
  onInsertAfter,
  onRemoveLine,
  focusLineId,
  onFocusLine,
  onLineTypeChange,
  highlightLineId,
}: ScriptEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<Map<string, HTMLTextAreaElement>>(new Map());
  const [focusCursorPos, setFocusCursorPos] = useState<number | null>(null);

  // Auto-resize textarea
  const autoResize = useCallback((el: HTMLTextAreaElement) => {
    el.style.height = '0';
    el.style.height = el.scrollHeight + 'px';
  }, []);

  // Focus management
  useEffect(() => {
    if (focusLineId) {
      const el = lineRefs.current.get(focusLineId);
      if (el) {
        el.focus();
        if (focusCursorPos !== null) {
          el.setSelectionRange(focusCursorPos, focusCursorPos);
          setFocusCursorPos(null);
        } else {
          // Place cursor at end
          const len = el.value.length;
          el.setSelectionRange(len, len);
        }
      }
    }
  }, [focusLineId, focusCursorPos]);

  // Auto-resize all textareas on mount and line changes
  useEffect(() => {
    lineRefs.current.forEach(el => autoResize(el));
  }, [lines.length, autoResize]);

  const getNextLineType = useCallback((currentType: LineType): LineType => {
    switch (currentType) {
      case 'character': return 'dialogue';
      case 'dialogue': return 'action';
      case 'parenthetical': return 'dialogue';
      case 'scene-heading': return 'action';
      default: return 'action';
    }
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>, line: ScriptLine, index: number) => {
    const el = e.currentTarget;

    // Ctrl+number for line type
    if (e.ctrlKey && e.key >= '1' && e.key <= '6') {
      e.preventDefault();
      const types: LineType[] = ['scene-heading', 'action', 'character', 'dialogue', 'parenthetical', 'transition'];
      const newType = types[parseInt(e.key) - 1];
      onUpdateLine(line.id, { type: newType });
      onLineTypeChange(newType);
      return;
    }

    // Ctrl+Z / Ctrl+Y - let browser handle natively
    if (e.ctrlKey && (e.key === 'z' || e.key === 'y')) {
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      const cursorPos = el.selectionStart;
      const text = el.value;
      const beforeCursor = text.substring(0, cursorPos);
      const afterCursor = text.substring(cursorPos);

      // Update current line with text before cursor
      onUpdateLine(line.id, { text: beforeCursor });

      // Create new line with text after cursor
      const nextType = getNextLineType(line.type);
      const newId = onInsertAfter(line.id, nextType);
      
      // Set the after-cursor text on the new line
      setTimeout(() => {
        onUpdateLine(newId, { text: afterCursor });
        setFocusCursorPos(0);
        onFocusLine(newId);
        onLineTypeChange(nextType);
      }, 0);
      return;
    }

    if (e.key === 'Backspace') {
      const cursorPos = el.selectionStart;
      const selEnd = el.selectionEnd;
      
      // Only handle at start of line with no selection
      if (cursorPos === 0 && selEnd === 0 && index > 0) {
        e.preventDefault();
        const prevLine = lines[index - 1];
        const prevText = prevLine.text;
        const currentText = el.value;
        
        // Merge with previous line
        onUpdateLine(prevLine.id, { text: prevText + currentText });
        onRemoveLine(line.id);
        setFocusCursorPos(prevText.length);
        onFocusLine(prevLine.id);
        onLineTypeChange(prevLine.type);
        return;
      }
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      const typeOrder: LineType[] = ['action', 'scene-heading', 'character', 'dialogue', 'parenthetical', 'transition'];
      const currentIdx = typeOrder.indexOf(line.type);
      const nextIdx = e.shiftKey
        ? (currentIdx - 1 + typeOrder.length) % typeOrder.length
        : (currentIdx + 1) % typeOrder.length;
      const newType = typeOrder[nextIdx];
      onUpdateLine(line.id, { type: newType });
      onLineTypeChange(newType);
    }

    // Arrow down at end of textarea
    if (e.key === 'ArrowDown' && el.selectionStart === el.value.length) {
      const nextLine = lines[index + 1];
      if (nextLine) {
        e.preventDefault();
        setFocusCursorPos(0);
        onFocusLine(nextLine.id);
        onLineTypeChange(nextLine.type);
      }
    }

    // Arrow up at start of textarea
    if (e.key === 'ArrowUp' && el.selectionStart === 0) {
      const prevLine = lines[index - 1];
      if (prevLine) {
        e.preventDefault();
        setFocusCursorPos(prevLine.text.length);
        onFocusLine(prevLine.id);
        onLineTypeChange(prevLine.type);
      }
    }
  }, [lines, onUpdateLine, onInsertAfter, onRemoveLine, onFocusLine, onLineTypeChange, getNextLineType]);

  const handleChange = useCallback((lineId: string, e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    onUpdateLine(lineId, { text });
    autoResize(e.target);
  }, [onUpdateLine, autoResize]);

  const setRef = useCallback((lineId: string, el: HTMLTextAreaElement | null) => {
    if (el) {
      lineRefs.current.set(lineId, el);
      autoResize(el);
    } else {
      lineRefs.current.delete(lineId);
    }
  }, [autoResize]);

  let sceneCount = 0;

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto custom-scrollbar bg-editor-bg">
      <div className="screenplay-page mx-auto py-12 bg-editor-paper min-h-full shadow-sm">
        {lines.map((line, i) => {
          if (line.type === 'scene-heading') sceneCount++;
          const isHighlighted = highlightLineId === line.id;
          return (
            <div
              key={line.id}
              className={cn('relative group', isHighlighted && 'animate-flash-highlight')}
              data-line-id={line.id}
            >
              {showSceneNumbers && line.type === 'scene-heading' && (
                <span className="absolute -left-10 top-0 text-xs text-muted-foreground font-mono mt-[2em]">
                  {sceneCount}
                </span>
              )}
              <textarea
                ref={el => setRef(line.id, el)}
                value={line.text}
                onChange={e => handleChange(line.id, e)}
                onKeyDown={e => handleKeyDown(e, line, i)}
                onFocus={() => {
                  onFocusLine(line.id);
                  onLineTypeChange(line.type);
                }}
                className={cn('screenplay-line', line.type)}
                rows={1}
                placeholder={
                  line.type === 'scene-heading' ? 'INT./EXT. LOCATION - TIME' :
                  line.type === 'character' ? 'CHARACTER NAME' :
                  line.type === 'dialogue' ? 'Dialogue...' :
                  line.type === 'parenthetical' ? '(parenthetical)' :
                  line.type === 'transition' ? 'CUT TO:' :
                  line.type === 'action' ? 'Action description...' : ''
                }
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
