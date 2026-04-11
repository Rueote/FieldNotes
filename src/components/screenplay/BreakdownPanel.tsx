import { useMemo, useState } from 'react';
import { ScriptLine, Label, Tag, getScenes } from '@/types/screenplay';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, LayoutList } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface BreakdownPanelProps {
  lines: ScriptLine[];
  labels: Label[];
  tags: Tag[];
  onRemoveLabel: (id: string) => void;
  onScrollToLine: (lineId: string) => void;
}

function normaliseText(raw: string): string {
  return raw
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/(^|\s)\S/g, c => c.toUpperCase());
}

const COLLAPSED_KEY = 'breakdown-collapsed';

function loadCollapsed(): Set<number> {
  try {
    const raw = localStorage.getItem(COLLAPSED_KEY);
    return raw ? new Set<number>(JSON.parse(raw)) : new Set<number>();
  } catch { return new Set<number>(); }
}

function saveCollapsed(set: Set<number>) {
  try { localStorage.setItem(COLLAPSED_KEY, JSON.stringify(Array.from(set))); } catch {}
}

// ── All Labels dialog ─────────────────────────────────────────────────────────
function AllLabelsDialog({
  open,
  onClose,
  labels,
  tags,
  onScrollToLine,
}: {
  open: boolean;
  onClose: () => void;
  labels: Label[];
  tags: Tag[];
  onScrollToLine: (lineId: string) => void;
}) {
  const tagMap = useMemo(() => new Map(tags.map(t => [t.id, t])), [tags]);

  const grouped = useMemo(() => {
    const result = new Map<string, Map<string, Map<string, Label>>>();

    labels.forEach(l => {
      const tag = tagMap.get(l.tagId);
      if (!tag) return;

      const cat = tag.category || tag.name;

      if (!result.has(cat)) result.set(cat, new Map());
      const byTag = result.get(cat)!;

      if (!byTag.has(tag.name)) byTag.set(tag.name, new Map());
      const byText = byTag.get(tag.name)!;

      const key = normaliseText(l.text);
      if (!byText.has(key)) byText.set(key, l);
    });

    return result;
  }, [labels, tagMap]);

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg h-[80vh] flex flex-col overflow-hidden p-0 gap-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border shrink-0">
          <DialogTitle className="text-sm font-semibold">All Labels</DialogTitle>
        </DialogHeader>

        {labels.length === 0 ? (
          <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
            No labels yet. Switch to Labelling mode to tag elements.
          </div>
        ) : (
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full pr-2">
              <div className="px-5 py-4 space-y-6">
                {Array.from(grouped.entries()).map(([category, byTag]) => (
                  <div key={category}>
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
                      {category}
                    </h3>
                    <div className="space-y-4">
                      {Array.from(byTag.entries()).map(([tagName, byText]) => {
                        const tag = tags.find(t => t.name === tagName);
                        if (!tag) return null;
                        const items = Array.from(byText.entries());
                        return (
                          <div key={tagName}>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
                              <span className="text-xs font-semibold text-foreground">{tag.name}</span>
                              <Badge variant="secondary" className="text-[10px] h-4 px-1.5 ml-auto">{items.length}</Badge>
                            </div>
                            <ul className="space-y-1 pl-5">
                              {items.map(([key, label]) => (
                                <li key={key}>
                                  <button
                                    onClick={() => { onScrollToLine(label.lineId); onClose(); }}
                                    className="text-xs text-left hover:underline underline-offset-2 transition-colors"
                                    style={{ color: tag.color }}
                                    title="Click to jump to line"
                                  >
                                    {label.text}
                                  </button>
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────
export function BreakdownPanel({
  lines,
  labels,
  tags,
  onRemoveLabel,
  onScrollToLine
}: BreakdownPanelProps) {

  const tagMap = useMemo(() => new Map(tags.map(t => [t.id, t])), [tags]);
  const scenes = useMemo(() => getScenes(lines), [lines]);

  const [collapsedScenes, setCollapsedScenes] = useState<Set<number>>(loadCollapsed);
  const [showAll, setShowAll] = useState(false);

  const toggleScene = (n: number) => {
    setCollapsedScenes(prev => {
      const next = new Set(prev);
      next.has(n) ? next.delete(n) : next.add(n);
      saveCollapsed(next);
      return next;
    });
  };

  const breakdownByScene = useMemo(() => {
    return scenes.map((scene, i) => {
      const startIdx = scene.index;
      const endIdx = i < scenes.length - 1 ? scenes[i + 1].index - 1 : lines.length - 1;
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
    <>
      <div className="h-full flex flex-col">

        <div className="h-10 flex items-center justify-between px-3 border-b border-border shrink-0">
          <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Breakdown</h3>
          <Button variant="ghost" size="sm" onClick={() => setShowAll(true)} className="h-7 px-2 gap-1.5 text-xs">
            <LayoutList className="w-3.5 h-3.5" />
            All Labels
          </Button>
        </div>

        <div className="flex-1 min-h-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">

              {breakdownByScene.map(({ scene, labels: sceneLabels, byTag }) => (
                sceneLabels.length > 0 && (
                  <div key={scene.number} className="space-y-2">

                    <button
                      onClick={() => toggleScene(scene.number)}
                      className="flex items-center gap-1 w-full text-left hover:bg-accent/50 rounded px-1 py-0.5 transition-colors"
                    >
                      {collapsedScenes.has(scene.number)
                        ? <ChevronRight className="w-3 h-3 text-muted-foreground" />
                        : <ChevronDown className="w-3 h-3 text-muted-foreground" />
                      }
                      <span className="text-xs font-medium text-muted-foreground truncate">
                        Scene {scene.number}: {scene.heading}
                      </span>
                    </button>

                    {!collapsedScenes.has(scene.number) && (
                      <>
                        {Array.from(byTag.entries()).map(([tagId, tagLabels]) => {
                          const tag = tagMap.get(tagId);
                          if (!tag) return null;

                          const seen = new Set<string>();
                          const uniqueLabels = tagLabels.filter(l => {
                            const key = normaliseText(l.text);
                            if (seen.has(key)) return false;
                            seen.add(key);
                            return true;
                          });

                          return (
                            <div key={tagId} className="pl-2">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color }} />
                                <span className="text-xs font-medium text-foreground">{tag.name}</span>
                                <Badge variant="secondary" className="text-[10px] h-4 px-1">{uniqueLabels.length}</Badge>
                              </div>
                              <div className="flex flex-wrap gap-1 pl-4">
                                {uniqueLabels.map(l => (
                                  <span
                                    key={l.id}
                                    onClick={() => onScrollToLine(l.lineId)}
                                    onContextMenu={e => { e.preventDefault(); onRemoveLabel(l.id); }}
                                    className="text-xs px-2 py-0.5 rounded cursor-pointer hover:opacity-80 transition-opacity"
                                    style={{
                                      backgroundColor: `${tag.color}22`,
                                      color: tag.color,
                                      border: `1px solid ${tag.color}44`
                                    }}
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

              <div className="border-t border-border pt-4 mt-4">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Summary</h4>
                {tags.map(tag => {
                  const seen = new Set<string>();
                  const count = labels.filter(l => {
                    if (l.tagId !== tag.id) return false;
                    const key = normaliseText(l.text);
                    if (seen.has(key)) return false;
                    seen.add(key);
                    return true;
                  }).length;
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
        </div>
      </div>

      <AllLabelsDialog
        open={showAll}
        onClose={() => setShowAll(false)}
        labels={labels}
        tags={tags}
        onScrollToLine={onScrollToLine}
      />
    </>
  );
}
