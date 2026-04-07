import { useMemo, useState } from 'react';
import { ScriptLine, Label, Tag, getScenes } from '@/types/screenplay';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface BreakdownPanelProps {
  lines: ScriptLine[];
  labels: Label[];
  tags: Tag[];
  onRemoveLabel: (id: string) => void;
  onScrollToLine: (lineId: string) => void;
}

export function BreakdownPanel({ lines, labels, tags, onRemoveLabel, onScrollToLine }: BreakdownPanelProps) {
  const tagMap = useMemo(() => new Map(tags.map(t => [t.id, t])), [tags]);
  const scenes = useMemo(() => getScenes(lines), [lines]);
  const [collapsedScenes, setCollapsedScenes] = useState<Set<number>>(new Set());

  const toggleScene = (sceneNum: number) => {
    setCollapsedScenes(prev => {
      const next = new Set(prev);
      if (next.has(sceneNum)) next.delete(sceneNum);
      else next.add(sceneNum);
      return next;
    });
  };

  const breakdownByScene = useMemo(() => {
    const sceneRanges: { scene: typeof scenes[0]; startIdx: number; endIdx: number }[] = [];
    scenes.forEach((scene, i) => {
      const startIdx = scene.index;
      const endIdx = i < scenes.length - 1 ? scenes[i + 1].index - 1 : lines.length - 1;
      sceneRanges.push({ scene, startIdx, endIdx });
    });

    return sceneRanges.map(({ scene, startIdx, endIdx }) => {
      const lineIds = new Set(lines.slice(startIdx, endIdx + 1).map(l => l.id));
      const sceneLabels = labels.filter(l => lineIds.has(l.lineId));
      const byTag = new Map<string, Label[]>();
      sceneLabels.forEach(l => {
        const arr = byTag.get(l.tagId) || [];
        arr.push(l);
        byTag.set(l.tagId, arr);
      });
      return { scene, labels: sceneLabels, byTag };
    });
  }, [scenes, lines, labels]);

  if (labels.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="text-center text-muted-foreground">
          <p className="text-sm">No labels yet</p>
          <p className="text-xs mt-1">Switch to Labelling mode to tag elements</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Breakdown</h3>
        
        {breakdownByScene.map(({ scene, labels: sceneLabels, byTag }) => (
          sceneLabels.length > 0 && (
            <div key={scene.number} className="space-y-2">
              <button
                onClick={() => toggleScene(scene.number)}
                className="flex items-center gap-1 w-full text-left hover:bg-accent/50 rounded px-1 py-0.5 transition-colors"
              >
                {collapsedScenes.has(scene.number) ? (
                  <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
                )}
                <span className="text-xs font-medium text-muted-foreground truncate">
                  Scene {scene.number}: {scene.heading}
                </span>
              </button>

              {!collapsedScenes.has(scene.number) && (
                <>
                  {Array.from(byTag.entries()).map(([tagId, tagLabels]) => {
                    const tag = tagMap.get(tagId);
                    if (!tag) return null;
                    return (
                      <div key={tagId} className="pl-2">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color }} />
                          <span className="text-xs font-medium text-foreground">{tag.name}</span>
                          <Badge variant="secondary" className="text-[10px] h-4 px-1">{tagLabels.length}</Badge>
                        </div>
                        <div className="flex flex-wrap gap-1 pl-4">
                          {tagLabels.map(l => (
                            <span
                              key={l.id}
                              className="text-xs px-2 py-0.5 rounded cursor-pointer hover:opacity-80 transition-opacity"
                              style={{ backgroundColor: `${tag.color}22`, color: tag.color, border: `1px solid ${tag.color}44` }}
                              onClick={() => onScrollToLine(l.lineId)}
                              onContextMenu={e => { e.preventDefault(); onRemoveLabel(l.id); }}
                              title="Click to jump • Right-click to remove"
                            >
                              {l.text}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )
        ))}

        {/* Summary */}
        <div className="border-t border-border pt-4 mt-4">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Summary</h4>
          {tags.map(tag => {
            const count = labels.filter(l => l.tagId === tag.id).length;
            if (count === 0) return null;
            return (
              <div key={tag.id} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color }} />
                  <span className="text-xs text-foreground">{tag.name}</span>
                </div>
                <span className="text-xs text-muted-foreground">{count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </ScrollArea>
  );
}
