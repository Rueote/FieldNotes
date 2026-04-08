import { useRef, useEffect, useCallback, useState, KeyboardEvent } from 'react';
import { ScriptLine, LineType, getCharacterNames } from '@/types/screenplay';
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

const LINES_PER_PAGE = 55;

function computePageBreaks(lines: ScriptLine[]): Set<number> {
  const breaks = new Set<number>();
  let lineCount = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip non-printable in page count
    if (line.type === 'non-printable') continue;

    let rows = 1;
    if (line.text) {
      const charsPerRow =
        line.type === 'dialogue'      ? 35 :
        line.type === 'character'     ? 38 :
        line.type === 'parenthetical' ? 28 :
        line.type === 'lyrics'        ? 45 :
        60;
      rows = Math.max(1, Math.ceil(line.text.length / charsPerRow));
    }
    if (line.type === 'scene-heading') lineCount += 2;
    else if (['action', 'character', 'transition'].includes(line.type)) lineCount += 1;
    lineCount += rows;

    if (lineCount >= LINES_PER_PAGE && i < lines.length - 1) {
      breaks.add(i + 1);
      lineCount = 0;
    }
  }
  return breaks;
}

// Scene heading autocomplete prefixes
const SCENE_PREFIXES = ['INT. ', 'EXT. ', 'INT./EXT. ', 'I/E. '];

function getSceneCompletion(text: string): string | null {
  const upper = text.toUpperCase();
  for (const prefix of SCENE_PREFIXES) {
    if (prefix.startsWith(upper) && upper !== prefix.trim()) {
      return prefix;
    }
  }
  return null;
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
  // Character autocomplete
  const [charSuggest, setCharSuggest] = useState<{ lineId: string; suggestion: string } | null>(null);

  const autoResize = useCallback((el: HTMLTextAreaElement) => {
    el.style.height = '0';
    el.style.height = el.scrollHeight + 'px';
  }, []);

  useEffect(() => {
    if (focusLineId) {
      const el = lineRefs.current.get(focusLineId);
      if (el) {
        el.focus();
        if (focusCursorPos !== null) {
          el.setSelectionRange(focusCursorPos, focusCursorPos);
          setFocusCursorPos(null);
        } else {
          const len = el.value.length;
          el.setSelectionRange(len, len);
        }
      }
    }
  }, [focusLineId, focusCursorPos]);

  useEffect(() => {
    lineRefs.current.forEach(el => autoResize(el));
  }, [lines.length, autoResize]);

  const getNextLineType = useCallback((currentType: LineType): LineType => {
    switch (currentType) {
      case 'character':     return 'dialogue';
      case 'dialogue':      return 'action';
      case 'parenthetical': return 'dialogue';
      case 'scene-heading': return 'action';
      case 'lyrics':        return 'action';
      default:              return 'action';
    }
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>, line: ScriptLine, index: number) => {
    const el = e.currentTarget;

    // ── Ctrl+B bold, Ctrl+I italic ──────────────────────────────────
    if (e.ctrlKey && e.key === 'b') {
      e.preventDefault();
      onUpdateLine(line.id, { bold: !line.bold });
      return;
    }
    if (e.ctrlKey && e.key === 'i') {
      e.preventDefault();
      onUpdateLine(line.id, { italic: !line.italic });
      return;
    }

    // ── Ctrl+1–8 line type ──────────────────────────────────────────
    if (e.ctrlKey && e.key >= '1' && e.key <= '8') {
      e.preventDefault();
      const types: LineType[] = ['scene-heading', 'action', 'character', 'dialogue', 'parenthetical', 'transition', 'non-printable', 'lyrics'];
      const newType = types[parseInt(e.key) - 1];
      onUpdateLine(line.id, { type: newType });
      onLineTypeChange(newType);
      return;
    }

    if (e.ctrlKey && (e.key === 'z' || e.key === 'y')) return;

    // ── Tab ─────────────────────────────────────────────────────────
    if (e.key === 'Tab') {
      e.preventDefault();

      // Scene heading: Tab to autocomplete INT./EXT.
      if (line.type === 'scene-heading') {
        const completion = getSceneCompletion(el.value);
        if (completion) {
          onUpdateLine(line.id, { text: completion });
          setTimeout(() => {
            const ref = lineRefs.current.get(line.id);
            if (ref) {
              ref.setSelectionRange(completion.length, completion.length);
              autoResize(ref);
            }
          }, 0);
          return;
        }
      }

      // After action line: Tab switches to character
      if (line.type === 'action' && !e.shiftKey) {
        onUpdateLine(line.id, { type: 'character' });
        onLineTypeChange('character');
        return;
      }

      // Otherwise cycle through types
      const typeOrder: LineType[] = ['action', 'scene-heading', 'character', 'dialogue', 'parenthetical', 'transition', 'non-printable', 'lyrics'];
      const currentIdx = typeOrder.indexOf(line.type);
      const nextIdx = e.shiftKey
        ? (currentIdx - 1 + typeOrder.length) % typeOrder.length
        : (currentIdx + 1) % typeOrder.length;
      const newType = typeOrder[nextIdx];
      onUpdateLine(line.id, { type: newType });
      onLineTypeChange(newType);
      return;
    }

    // ── Tab to accept character suggestion ───────────────────────────
    // Handled above — character suggestion accept is done inline in onChange

    // ── Enter ───────────────────────────────────────────────────────
    if (e.key === 'Enter') {
      e.preventDefault();
      setCharSuggest(null);
      const cursorPos = el.selectionStart;
      const beforeCursor = el.value.substring(0, cursorPos);
      const afterCursor = el.value.substring(cursorPos);
      onUpdateLine(line.id, { text: beforeCursor });
      const nextType = getNextLineType(line.type);
      const newId = onInsertAfter(line.id, nextType);
      setTimeout(() => {
        onUpdateLine(newId, { text: afterCursor });
        // Cursor goes to START of new line (front of text moved down)
        setFocusCursorPos(0);
        onFocusLine(newId);
        onLineTypeChange(nextType);
      }, 0);
      return;
    }

    // ── Backspace at start: merge with prev ─────────────────────────
    if (e.key === 'Backspace') {
      setCharSuggest(null);
      const cursorPos = el.selectionStart;
      const selEnd = el.selectionEnd;
      if (cursorPos === 0 && selEnd === 0 && index > 0) {
        e.preventDefault();
        const prevLine = lines[index - 1];
        const prevText = prevLine.text;
        onUpdateLine(prevLine.id, { text: prevText + el.value });
        onRemoveLine(line.id);
        setFocusCursorPos(prevText.length);
        onFocusLine(prevLine.id);
        onLineTypeChange(prevLine.type);
        return;
      }
    }

    // ── Escape: dismiss suggestions ─────────────────────────────────
    if (e.key === 'Escape') {
      setCharSuggest(null);
      return;
    }

    // ── Arrow navigation between lines ─────────────────────────────
    if (e.key === 'ArrowDown' && el.selectionStart === el.value.length) {
      const nextLine = lines[index + 1];
      if (nextLine) {
        e.preventDefault();
        setFocusCursorPos(0);
        onFocusLine(nextLine.id);
        onLineTypeChange(nextLine.type);
      }
    }
    if (e.key === 'ArrowUp' && el.selectionStart === 0) {
      const prevLine = lines[index - 1];
      if (prevLine) {
        e.preventDefault();
        setFocusCursorPos(prevLine.text.length);
        onFocusLine(prevLine.id);
        onLineTypeChange(prevLine.type);
      }
    }
  }, [lines, onUpdateLine, onInsertAfter, onRemoveLine, onFocusLine, onLineTypeChange, getNextLineType, autoResize]);

  const handleChange = useCallback((line: ScriptLine, e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    onUpdateLine(line.id, { text });
    autoResize(e.target);

    // Character autocomplete
    if (line.type === 'character' && text.trim().length >= 1) {
      const knownNames = getCharacterNames(lines);
      const upper = text.toUpperCase();
      const match = knownNames.find(n => n.startsWith(upper) && n !== upper);
      if (match) {
        setCharSuggest({ lineId: line.id, suggestion: match });
      } else {
        setCharSuggest(null);
      }
    } else {
      setCharSuggest(null);
    }
  }, [onUpdateLine, autoResize, lines]);

  // Accept character suggestion on Tab (keydown fires before change, so we handle it here)
  const handleCharSuggestAccept = useCallback((line: ScriptLine) => {
    if (charSuggest && charSuggest.lineId === line.id) {
      onUpdateLine(line.id, { text: charSuggest.suggestion });
      setCharSuggest(null);
      setTimeout(() => {
        const ref = lineRefs.current.get(line.id);
        if (ref) {
          ref.setSelectionRange(charSuggest.suggestion.length, charSuggest.suggestion.length);
          autoResize(ref);
        }
      }, 0);
      return true;
    }
    return false;
  }, [charSuggest, onUpdateLine, autoResize]);

  const handleKeyDownWithSuggest = useCallback((e: KeyboardEvent<HTMLTextAreaElement>, line: ScriptLine, index: number) => {
    // Accept character suggestion with Tab
    if (e.key === 'Tab' && line.type === 'character' && charSuggest?.lineId === line.id) {
      e.preventDefault();
      handleCharSuggestAccept(line);
      return;
    }
    handleKeyDown(e, line, index);
  }, [handleKeyDown, charSuggest, handleCharSuggestAccept]);

  const setRef = useCallback((lineId: string, el: HTMLTextAreaElement | null) => {
    if (el) {
      lineRefs.current.set(lineId, el);
      autoResize(el);
    } else {
      lineRefs.current.delete(lineId);
    }
  }, [autoResize]);

  const pageBreaks = computePageBreaks(lines);
  let sceneCount = 0;
  let pageNumber = 1;

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto custom-scrollbar bg-editor-bg">
      <div className="screenplay-page mx-auto py-12 bg-editor-paper min-h-full shadow-sm">
        {lines.map((line, i) => {
          if (line.type === 'scene-heading') sceneCount++;
          const isHighlighted = highlightLineId === line.id;
          const hasBreakBefore = pageBreaks.has(i);
          if (hasBreakBefore) pageNumber++;

          const suggest = charSuggest?.lineId === line.id ? charSuggest.suggestion : null;
          const ghostText = suggest && line.text ? suggest.slice(line.text.length) : null;

          return (
            <div key={line.id}>
              {/* ── Page break ── */}
              {hasBreakBefore && (
                <div className="relative select-none" style={{ margin: '2em 0', height: 24 }} aria-hidden>
                  {/* Visual gap with dashed line */}
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '-1.5in',
                    right: '-1in',
                    borderTop: '2px dashed rgba(128,128,128,0.35)',
                  }} />
                  <span style={{
                    position: 'absolute',
                    right: 0,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: 10,
                    fontFamily: 'Courier New, monospace',
                    opacity: 0.4,
                    background: 'inherit',
                    paddingLeft: 6,
                  }}>
                    {pageNumber}.
                  </span>
                </div>
              )}

              {/* ── Line ── */}
              <div
                className={cn('relative group', isHighlighted && 'animate-flash-highlight')}
                data-line-id={line.id}
              >
                {/* Scene number */}
                {line.type === 'scene-heading' && (
                  <span className="absolute -left-10 top-0 text-xs text-muted-foreground font-mono mt-[2em]">
                    {sceneCount}
                  </span>
                )}

                {/* Non-printable styling wrapper */}
                {line.type === 'non-printable' ? (
                  <div className="relative">
                    <textarea
                      ref={el => setRef(line.id, el)}
                      value={line.text}
                      onChange={e => handleChange(line, e)}
                      onKeyDown={e => handleKeyDownWithSuggest(e, line, i)}
                      onFocus={() => { onFocusLine(line.id); onLineTypeChange(line.type); }}
                      className="screenplay-line non-printable"
                      rows={1}
                      placeholder=""
                      style={{
                        fontStyle: 'italic',
                        opacity: 0.5,
                        borderLeft: '3px solid hsl(var(--muted-foreground) / 0.4)',
                        paddingLeft: 8,
                      }}
                    />
                  </div>
                ) : (
                  <div className="relative">
                    {/* Ghost text for character autocomplete */}
                    {ghostText && (
                      <div
                        aria-hidden
                        className={cn('screenplay-line', line.type)}
                        style={{
                          position: 'absolute',
                          top: 0, left: 0, right: 0,
                          pointerEvents: 'none',
                          color: 'transparent',
                          userSelect: 'none',
                        }}
                      >
                        {line.text}
                        <span style={{ opacity: 0.35, color: 'hsl(var(--foreground))' }}>{ghostText}</span>
                      </div>
                    )}
                    <textarea
                      ref={el => setRef(line.id, el)}
                      value={line.text}
                      onChange={e => handleChange(line, e)}
                      onKeyDown={e => handleKeyDownWithSuggest(e, line, i)}
                      onFocus={() => { onFocusLine(line.id); onLineTypeChange(line.type); }}
                      className={cn('screenplay-line', line.type)}
                      rows={1}
                      placeholder=""
                      style={{
                        fontWeight: line.bold ? 'bold' : undefined,
                        fontStyle: line.italic ? 'italic' : undefined,
                        position: 'relative',
                        background: 'transparent',
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
