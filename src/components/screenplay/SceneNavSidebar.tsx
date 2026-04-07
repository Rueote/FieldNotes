import { useMemo, useState } from 'react';
import { ScriptLine, getScenes } from '@/types/screenplay';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { PanelLeftClose, PanelLeft, MapPin, Clock } from 'lucide-react';

interface SceneNavSidebarProps {
  lines: ScriptLine[];
  onScrollToScene: (lineId: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export function SceneNavSidebar({ lines, onScrollToScene, isOpen, onToggle }: SceneNavSidebarProps) {
  const scenes = useMemo(() => getScenes(lines), [lines]);

  if (!isOpen) {
    return (
      <div className="shrink-0 border-r border-border bg-sidebar flex flex-col items-center py-2">
        <Button variant="ghost" size="sm" onClick={onToggle} title="Open scene navigator" className="w-8 h-8 p-0">
          <PanelLeft className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="w-[260px] shrink-0 border-r border-border bg-sidebar flex flex-col">
      <div className="h-10 flex items-center justify-between px-3 border-b border-sidebar-border">
        <span className="text-xs font-semibold text-sidebar-foreground uppercase tracking-wider">Scenes</span>
        <Button variant="ghost" size="sm" onClick={onToggle} className="w-7 h-7 p-0 text-sidebar-foreground">
          <PanelLeftClose className="w-4 h-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {scenes.length === 0 && (
            <p className="text-xs text-muted-foreground px-2 py-4 text-center">
              No scenes yet. Add a Scene Heading to get started.
            </p>
          )}
          {scenes.map(scene => (
            <button
              key={scene.number}
              onClick={() => onScrollToScene(lines[scene.index].id)}
              className="w-full text-left px-3 py-2.5 rounded-md hover:bg-sidebar-accent transition-colors group"
            >
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-bold text-sidebar-primary bg-sidebar-accent px-1.5 py-0.5 rounded">
                  {scene.number}
                </span>
                {scene.intExt && (
                  <span className="text-[10px] font-medium text-muted-foreground uppercase">
                    {scene.intExt}
                  </span>
                )}
              </div>
              {scene.location && (
                <div className="flex items-center gap-1 mt-1">
                  <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                  <span className="text-xs font-medium text-sidebar-foreground truncate">{scene.location}</span>
                </div>
              )}
              {scene.timeOfDay && (
                <div className="flex items-center gap-1 mt-0.5">
                  <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
                  <span className="text-[11px] text-muted-foreground">{scene.timeOfDay}</span>
                </div>
              )}
              {scene.firstLine && (
                <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 italic">
                  {scene.firstLine}
                </p>
              )}
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
