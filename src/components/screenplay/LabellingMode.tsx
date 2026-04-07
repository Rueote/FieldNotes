import { useState, useCallback, useMemo } from 'react';
import { ScriptLine, Label, Tag } from '@/types/screenplay';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface LabellingModeProps {
  lines: ScriptLine[];
  labels: Label[];
  tags: Tag[];
  showSceneNumbers: boolean;
  onAddLabel: (label: Label) => void;
  onRemoveLabel: (id: string) => void;
  onScrollToLine: (lineId: string) => void;
}

interface SelectedWord {
  lineId: string;
  wordIndex: number;
  word: string;
}

export function LabellingMode({ lines, labels, tags, showSceneNumbers, onAddLabel, onRemoveLabel }: LabellingModeProps) {
  const [selectedWords, setSelectedWords] = useState<SelectedWord[]>([]);
  const [activeTagId, setActiveTagId] = useState<string>(tags[0]?.id || '');

  const handleWordClick = useCallback((lineId: string, wordIndex: number, word: string, ctrlKey: boolean) => {
    setSelectedWords(prev => {
      const exists = prev.find(w => w.lineId === lineId && w.wordIndex === wordIndex);
      if (exists) return prev.filter(w => !(w.lineId === lineId && w.wordIndex === wordIndex));
      if (ctrlKey) return [...prev, { lineId, wordIndex, word }];
      return [{ lineId, wordIndex, word }];
    });
  }, []);

  const applyLabel = useCallback(() => {
    if (selectedWords.length === 0 || !activeTagId) return;
    const lineId = selectedWords[0].lineId;
    const sameLineWords = selectedWords.filter(w => w.lineId === lineId);
    if (sameLineWords.length === 0) return;

    const text = sameLineWords.sort((a, b) => a.wordIndex - b.wordIndex).map(w => w.word).join(' ');
    const indices = sameLineWords.map(w => w.wordIndex).sort((a, b) => a - b);

    const label: Label = {
      id: crypto.randomUUID(),
      lineId,
      startIndex: indices[0],
      endIndex: indices[indices.length - 1],
      text,
      tagId: activeTagId,
    };
    onAddLabel(label);
    setSelectedWords([]);
  }, [selectedWords, activeTagId, onAddLabel]);

  const labelsByLine = useMemo(() => {
    const map = new Map<string, Label[]>();
    labels.forEach(l => {
      const arr = map.get(l.lineId) || [];
      arr.push(l);
      map.set(l.lineId, arr);
    });
    return map;
  }, [labels]);

  const tagMap = useMemo(() => new Map(tags.map(t => [t.id, t])), [tags]);

  let sceneCount = 0;

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar bg-editor-bg">
      {selectedWords.length > 0 && (
        <div className="sticky top-0 z-10 bg-card border-b border-border p-2 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            Selected: <strong className="text-foreground">{selectedWords.map(w => w.word).join(' ')}</strong>
          </span>
          <Select value={activeTagId} onValueChange={setActiveTagId}>
            <SelectTrigger className="w-[140px] h-7 text-xs">
              <SelectValue placeholder="Select tag" />
            </SelectTrigger>
            <SelectContent>
              {tags.map(t => (
                <SelectItem key={t.id} value={t.id}>
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: t.color }} />
                    {t.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" className="h-7 text-xs" onClick={applyLabel}>Apply Label</Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setSelectedWords([])}>Clear</Button>
        </div>
      )}

      <div className="screenplay-page mx-auto py-12 bg-editor-paper min-h-full shadow-sm">
        {lines.map((line) => {
          if (line.type === 'scene-heading') sceneCount++;
          const lineLabels = labelsByLine.get(line.id) || [];
          const words = line.text.split(/\s+/).filter(Boolean);

          return (
            <div key={line.id} className="relative group" data-line-id={line.id}>
              {showSceneNumbers && line.type === 'scene-heading' && (
                <span className="absolute -left-10 top-0 text-xs text-muted-foreground font-mono mt-[2em]">
                  {sceneCount}
                </span>
              )}
              <div className={cn('screenplay-line select-none', line.type)}>
                {words.length === 0 ? (
                  <span>&nbsp;</span>
                ) : (
                  words.map((word, wi) => {
                    const isSelected = selectedWords.some(w => w.lineId === line.id && w.wordIndex === wi);
                    const matchingLabel = lineLabels.find(l => wi >= l.startIndex && wi <= l.endIndex);
                    const tag = matchingLabel ? tagMap.get(matchingLabel.tagId) : null;

                    return (
                      <span key={wi}>
                        <span
                          className={cn('labelling-word', isSelected && 'selected')}
                          style={tag ? { backgroundColor: `${tag.color}33`, borderBottom: `2px solid ${tag.color}` } : undefined}
                          onClick={e => handleWordClick(line.id, wi, word, e.ctrlKey || e.metaKey)}
                          title={tag ? `${tag.name}: ${matchingLabel!.text}` : undefined}
                        >
                          {word}
                        </span>
                        {wi < words.length - 1 ? ' ' : ''}
                      </span>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
