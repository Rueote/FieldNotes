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
    if (line.type === 'non-printable') continue;
    let rows = 1;
    if (line.text) {
      const charsPerRow =
        line.type === 'dialogue'      ? 35 :
        line.type === 'character'     ? 38 :
        line.type === 'parenthetical' ? 28 :
        line.type === 'lyrics'        ? 45 : 60;
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

// Scene heading INT./EXT. prefix completions
const SCENE_PREFIXES = ['INT. ', 'EXT. ', 'INT./EXT. ', 'I/E. '];

function getSceneCompletion(text: string): string | null {
  const upper = text.toUpperCase().trimEnd();
  for (const prefix of SCENE_PREFIXES) {
    if (prefix.trimEnd().startsWith(upper) && upper.length < prefix.trimEnd().length) {
      return prefix;
    }
  }
  return null;
}

// After typing INT. LOCATION, Tab should append ' - ' for time of day
// Returns the text to insert, or null if not applicable
function getLocationDashCompletion(text: string): string | null {
  const upper = text.toUpperCase();
  // Must start with a known prefix and have content after it (the location)
  // and NOT already have a dash
  const hasPrefix = SCENE_PREFIXES.some(p => upper.startsWith(p.trim()));
  if (!hasPrefix) return null;
  if (upper.includes(' - ') || upper.includes(' — ')) return null;
  // Must have something after the prefix (i.e. location started)
  const afterPrefix = SCENE_PREFIXES.reduce((rem, p) => {
    if (upper.startsWith(p.trim())) return text.slice(p.trim().length).trimStart();
    return rem;
  }, '');
  if (!afterPrefix.trim()) return null;
  return text.trimEnd() + ' - ';
}

export function ScriptEditor({
  lines, showSceneNumbers,
  onUpdateLine, onInsertAfter, onRemoveLine,
  focusLineId, onFocusLine, onLineTypeChange,
  highlightLineId,
}: ScriptEditorProps) {
  const containerRef  = useRef<HTMLDivElement>(null);
  const lineRefs      = useRef<Map<string, HTMLTextAreaElement>>(new Map());
  const [focusCursorPos, setFocusCursorPos] = useState<number | null>(null);
  const [charSuggest, setCharSuggest]       = useState<{ lineId: string; suggestion: string } | null>(null);
  // Ghost text state for scene heading Tab preview
  const [sceneGhost, setSceneGhost]         = useState<{ lineId: string; ghost: string } | null>(null);

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

    // Ctrl+B / Ctrl+I
    if (e.ctrlKey && e.key === 'b') { e.preventDefault(); onUpdateLine(line.id, { bold: !line.bold }); return; }
    if (e.ctrlKey && e.key === 'i') { e.preventDefault(); onUpdateLine(line.id, { italic: !line.italic }); return; }

    // Ctrl+1–8 line type
    if (e.ctrlKey && e.key >= '1' && e.key <= '8') {
      e.preventDefault();
      const types: LineType[] = ['scene-heading','action','character','dialogue','parenthetical','transition','non-printable','lyrics'];
      const newType = types[parseInt(e.key) - 1];
      onUpdateLine(line.id, { type: newType });
      onLineTypeChange(newType);
      return;
    }

    if (e.ctrlKey && (e.key === 'z' || e.key === 'y')) return;

    // ── Tab ──────────────────────────────────────────────────────────
    if (e.key === 'Tab') {
      e.preventDefault();

      if (line.type === 'scene-heading') {
        // Priority 1: INT./EXT. prefix completion
        const prefixCompletion = getSceneCompletion(el.value);
        if (prefixCompletion) {
          onUpdateLine(line.id, { text: prefixCompletion });
          setSceneGhost(null);
          setTimeout(() => {
            const ref = lineRefs.current.get(line.id);
            if (ref) { ref.setSelectionRange(prefixCompletion.length, prefixCompletion.length); autoResize(ref); }
          }, 0);
          return;
        }
        // Priority 2: append ' - ' for time of day after location
        const dashCompletion = getLocationDashCompletion(el.value);
        if (dashCompletion) {
          onUpdateLine(line.id, { text: dashCompletion });
          setSceneGhost(null);
          setTimeout(() => {
            const ref = lineRefs.current.get(line.id);
            if (ref) { ref.setSelectionRange(dashCompletion.length, dashCompletion.length); autoResize(ref); }
          }, 0);
          return;
        }
      }

      // Accept char suggestion
      if (line.type === 'character' && charSuggest?.lineId === line.id) {
        onUpdateLine(line.id, { text: charSuggest.suggestion });
        setCharSuggest(null);
        setTimeout(() => {
          const ref = lineRefs.current.get(line.id);
          if (ref) { ref.setSelectionRange(charSuggest.suggestion.length, charSuggest.suggestion.length); autoResize(ref); }
        }, 0);
        return;
      }

      // Action → character on Tab
      if (line.type === 'action' && !e.shiftKey) {
        onUpdateLine(line.id, { type: 'character' });
        onLineTypeChange('character');
        return;
      }

      // Cycle types
      const typeOrder: LineType[] = ['action','scene-heading','character','dialogue','parenthetical','transition','non-printable','lyrics'];
      const ci = typeOrder.indexOf(line.type);
      const ni = e.shiftKey ? (ci - 1 + typeOrder.length) % typeOrder.length : (ci + 1) % typeOrder.length;
      onUpdateLine(line.id, { type: typeOrder[ni] });
      onLineTypeChange(typeOrder[ni]);
      return;
    }

    // ── Enter ─────────────────────────────────────────────────────────
    if (e.key === 'Enter') {
      e.preventDefault();
      setCharSuggest(null);
      setSceneGhost(null);

      const cursorPos    = el.selectionStart;
      const beforeCursor = el.value.substring(0, cursorPos);
      const afterCursor  = el.value.substring(cursorPos);

      // Empty action line → pressing Enter again converts it to scene-heading
      if (line.type === 'action' && !el.value.trim()) {
        onUpdateLine(line.id, { type: 'scene-heading' });
        onLineTypeChange('scene-heading');
        return;
      }

      onUpdateLine(line.id, { text: beforeCursor });
      const nextType = getNextLineType(line.type);
      const newId    = onInsertAfter(line.id, nextType);
      setTimeout(() => {
        onUpdateLine(newId, { text: afterCursor });
        setFocusCursorPos(0);
        onFocusLine(newId);
        onLineTypeChange(nextType);
      }, 0);
      return;
    }

    // ── Backspace at start: merge with prev ──────────────────────────
    if (e.key === 'Backspace') {
      setCharSuggest(null);
      setSceneGhost(null);
      const cursorPos = el.selectionStart;
      const selEnd    = el.selectionEnd;
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

    if (e.key === 'Escape') { setCharSuggest(null); setSceneGhost(null); return; }

    if (e.key === 'ArrowDown' && el.selectionStart === el.value.length) {
      const next = lines[index + 1];
      if (next) { e.preventDefault(); setFocusCursorPos(0); onFocusLine(next.id); onLineTypeChange(next.type); }
    }
    if (e.key === 'ArrowUp' && el.selectionStart === 0) {
      const prev = lines[index - 1];
      if (prev) { e.preventDefault(); setFocusCursorPos(prev.text.length); onFocusLine(prev.id); onLineTypeChange(prev.type); }
    }
  }, [lines, onUpdateLine, onInsertAfter, onRemoveLine, onFocusLine, onLineTypeChange, getNextLineType, autoResize, charSuggest]);

  const handleChange = useCallback((line: ScriptLine, e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    onUpdateLine(line.id, { text });
    autoResize(e.target);

    // Character autocomplete ghost
    if (line.type === 'character' && text.trim().length >= 1) {
      const knownNames = getCharacterNames(lines);
      const upper = text.toUpperCase();
      const match = knownNames.find(n => n.startsWith(upper) && n !== upper);
      setCharSuggest(match ? { lineId: line.id, suggestion: match } : null);
    } else {
      setCharSuggest(null);
    }

    // Scene heading ghost — show what Tab will do
    if (line.type === 'scene-heading' && text.trim()) {
      const prefixGhost = getSceneCompletion(text);
      if (prefixGhost) {
        // Ghost shows the remaining prefix characters
        setSceneGhost({ lineId: line.id, ghost: prefixGhost.slice(text.length) });
        return;
      }
      const dashGhost = getLocationDashCompletion(text);
      if (dashGhost) {
        setSceneGhost({ lineId: line.id, ghost: ' - ' });
        return;
      }
    }
    setSceneGhost(null);
  }, [onUpdateLine, autoResize, lines]);

  const setRef = useCallback((lineId: string, el: HTMLTextAreaElement | null) => {
    if (el) { lineRefs.current.set(lineId, el); autoResize(el); }
    else    { lineRefs.current.delete(lineId); }
  }, [autoResize]);

  const pageBreaks = computePageBreaks(lines);
  let sceneCount  = 0;
  let pageNumber  = 1;

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto custom-scrollbar bg-editor-bg">
      <div className="screenplay-page mx-auto py-12 bg-editor-paper min-h-full shadow-sm">
        {lines.map((line, i) => {
          if (line.type === 'scene-heading') sceneCount++;
          const isHighlighted  = highlightLineId === line.id;
          const hasBreakBefore = pageBreaks.has(i);
          if (hasBreakBefore) pageNumber++;

          // Character ghost
          const charSug  = charSuggest?.lineId === line.id ? charSuggest.suggestion : null;
          const charGhost = charSug && line.text ? charSug.slice(line.text.length) : null;

          // Scene heading ghost
          const scGhost = sceneGhost?.lineId === line.id ? sceneGhost.ghost : null;

          return (
            <div key={line.id}>
              {/* Page break indicator */}
              {hasBreakBefore && (
                <div className="relative select-none" style={{ margin: '2em 0', height: 24 }} aria-hidden>
                  <div style={{ position: 'absolute', top: '50%', left: '-1.5in', right: '-1in', borderTop: '2px dashed rgba(128,128,128,0.35)' }} />
                  <span style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', fontSize: 10, fontFamily: 'Courier New, monospace', opacity: 0.4, paddingLeft: 6 }}>
                    {pageNumber}.
                  </span>
                </div>
              )}

              <div
                className={cn('relative group', isHighlighted && 'animate-flash-highlight')}
                data-line-id={line.id}
              >
                {/* Scene number — only when showSceneNumbers is true */}
                {showSceneNumbers && line.type === 'scene-heading' && (
                  <span
                    className="absolute top-0 text-xs text-muted-foreground font-mono select-none"
                    style={{ left: '-2.5rem', marginTop: '2em' }}
                  >
                    {sceneCount}.
                  </span>
                )}

                {line.type === 'non-printable' ? (
                  <textarea
                    ref={el => setRef(line.id, el)}
                    value={line.text}
                    onChange={e => handleChange(line, e)}
                    onKeyDown={e => handleKeyDown(e, line, i)}
                    onFocus={() => { onFocusLine(line.id); onLineTypeChange(line.type); }}
                    className="screenplay-line non-printable"
                    rows={1}
                    placeholder=""
                    style={{ fontStyle: 'italic', opacity: 0.5, borderLeft: '3px solid hsl(var(--muted-foreground) / 0.4)', paddingLeft: 8 }}
                  />
                ) : (
                  <div className="relative">
                    {/* Character name ghost text */}
                    {charGhost && (
                      <div aria-hidden className={cn('screenplay-line', line.type)}
                        style={{ position: 'absolute', top: 0, left: 0, right: 0, pointerEvents: 'none', color: 'transparent', userSelect: 'none' }}>
                        {line.text}
                        <span style={{ opacity: 0.35, color: 'hsl(var(--foreground))' }}>{charGhost}</span>
                      </div>
                    )}

                    {/* Scene heading ghost text (Tab preview) */}
                    {scGhost && line.type === 'scene-heading' && (
                      <div aria-hidden className={cn('screenplay-line scene-heading')}
                        style={{ position: 'absolute', top: 0, left: 0, right: 0, pointerEvents: 'none', userSelect: 'none' }}>
                        <span style={{ color: 'transparent' }}>{line.text.toUpperCase()}</span>
                        <span style={{ opacity: 0.35, color: 'hsl(var(--foreground))' }}>{scGhost.toUpperCase()}</span>
                      </div>
                    )}

                    <textarea
                      ref={el => setRef(line.id, el)}
                      value={line.text}
                      onChange={e => handleChange(line, e)}
                      onKeyDown={e => handleKeyDown(e, line, i)}
                      onFocus={() => { onFocusLine(line.id); onLineTypeChange(line.type); }}
                      className={cn('screenplay-line', line.type)}
                      rows={1}
                      placeholder=""
                      style={{
                        fontWeight:  line.bold   ? 'bold'   : undefined,
                        fontStyle:   line.italic ? 'italic' : undefined,
                        position:    'relative',
                        background:  'transparent',
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
