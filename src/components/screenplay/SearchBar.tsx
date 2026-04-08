import { useState, useEffect, useRef, useCallback } from 'react';
import { ScriptLine } from '@/types/screenplay';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, ChevronUp, ChevronDown, CaseSensitive } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchMatch {
  lineId: string;
  lineIndex: number;
  matchIndex: number; // which match within the line
}

interface SearchBarProps {
  lines: ScriptLine[];
  isOpen: boolean;
  onClose: () => void;
  onScrollToLine: (lineId: string) => void;
}

export function SearchBar({ lines, isOpen, onClose, onScrollToLine }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Build match list
  const matches: SearchMatch[] = [];
  if (query.trim()) {
    const needle = caseSensitive ? query : query.toLowerCase();
    lines.forEach((line, lineIndex) => {
      const hay = caseSensitive ? line.text : line.text.toLowerCase();
      let pos = 0;
      let mi = 0;
      while ((pos = hay.indexOf(needle, pos)) !== -1) {
        matches.push({ lineId: line.id, lineIndex, matchIndex: mi });
        pos += needle.length;
        mi++;
      }
    });
  }

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Keyboard shortcut handler (Escape to close)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Jump to current match
  useEffect(() => {
    if (matches.length > 0) {
      const m = matches[Math.min(currentIdx, matches.length - 1)];
      onScrollToLine(m.lineId);
    }
  }, [currentIdx, matches.length, query, caseSensitive]);

  const prev = useCallback(() => {
    setCurrentIdx(i => (i - 1 + Math.max(matches.length, 1)) % Math.max(matches.length, 1));
  }, [matches.length]);

  const next = useCallback(() => {
    setCurrentIdx(i => (i + 1) % Math.max(matches.length, 1));
  }, [matches.length]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.shiftKey ? prev() : next();
    }
  };

  if (!isOpen) return null;

  const safeIdx = matches.length > 0 ? Math.min(currentIdx, matches.length - 1) : -1;

  return (
    <div className="h-10 bg-toolbar-bg border-b border-border flex items-center px-3 gap-2 shrink-0 animate-fade-in">
      <div className="flex items-center gap-1 flex-1 max-w-sm">
        <Input
          ref={inputRef}
          value={query}
          onChange={e => { setQuery(e.target.value); setCurrentIdx(0); }}
          onKeyDown={handleKeyDown}
          placeholder="Search script..."
          className="h-7 text-xs"
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCaseSensitive(v => !v)}
          title="Case sensitive"
          className={cn('h-7 w-7 p-0 text-xs', caseSensitive && 'bg-accent text-accent-foreground')}
        >
          <CaseSensitive className="w-3.5 h-3.5" />
        </Button>
      </div>

      <span className="text-xs text-muted-foreground min-w-[60px]">
        {query.trim()
          ? matches.length > 0
            ? `${safeIdx + 1} / ${matches.length}`
            : 'No results'
          : ''}
      </span>

      <div className="flex items-center gap-0.5">
        <Button variant="ghost" size="sm" onClick={prev} disabled={matches.length === 0} className="h-7 w-7 p-0">
          <ChevronUp className="w-3.5 h-3.5" />
        </Button>
        <Button variant="ghost" size="sm" onClick={next} disabled={matches.length === 0} className="h-7 w-7 p-0">
          <ChevronDown className="w-3.5 h-3.5" />
        </Button>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-7 w-7 p-0">
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
