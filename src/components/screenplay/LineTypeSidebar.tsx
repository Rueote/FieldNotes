import { LineType } from '@/types/screenplay';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { PanelRightClose, PanelRight } from 'lucide-react';

interface LineTypeSidebarProps {
  currentLineType: LineType;
  onChangeLineType: (type: LineType) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const LINE_TYPES: { type: LineType; label: string; shortcut: string; description: string }[] = [
  { type: 'scene-heading',     label: 'Scene Heading',      shortcut: '1', description: 'INT./EXT. location' },
  { type: 'action',            label: 'Action',             shortcut: '2', description: 'Stage direction' },
  { type: 'character',         label: 'Character',          shortcut: '3', description: 'Character name' },
  { type: 'dialogue',          label: 'Dialogue',           shortcut: '4', description: 'Spoken words' },
  { type: 'parenthetical',     label: 'Parenthetical',      shortcut: '5', description: '(Acting direction)' },
  { type: 'transition',        label: 'Transition',         shortcut: '6', description: 'CUT TO: / FADE OUT.' },
  { type: 'non-printable',     label: 'Non-Printable',      shortcut: '7', description: 'Notes, not in export' },
  { type: 'lyrics',            label: 'Lyrics',             shortcut: '8', description: 'Song lyrics' },
];

export function LineTypeSidebar({ currentLineType, onChangeLineType, isOpen, onToggle }: LineTypeSidebarProps) {
  if (!isOpen) {
    return (
      <div className="shrink-0 border-l border-border bg-sidebar flex flex-col items-center py-2 gap-1" style={{ width: 40 }}>
        <Button variant="ghost" size="sm" onClick={onToggle} title="Open line types" className="w-8 h-8 p-0">
          <PanelRight className="w-4 h-4" />
        </Button>
        <div className="flex flex-col gap-1 mt-2">
          {LINE_TYPES.map(lt => (
            <div
              key={lt.type}
              onClick={() => onChangeLineType(lt.type)}
              title={`${lt.label} (Ctrl+${lt.shortcut})`}
              className={cn(
                'w-5 h-5 rounded-sm cursor-pointer flex items-center justify-center text-[9px] font-bold transition-colors',
                currentLineType === lt.type
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-sidebar-accent text-sidebar-foreground opacity-60 hover:opacity-100'
              )}
            >
              {lt.shortcut}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="shrink-0 border-l border-border bg-sidebar flex flex-col" style={{ width: '100%' }}>
      <div className="h-10 flex items-center justify-between px-3 border-b border-sidebar-border shrink-0">
        <span className="text-xs font-semibold text-sidebar-foreground uppercase tracking-wider">Line Type</span>
        <Button variant="ghost" size="sm" onClick={onToggle} className="w-7 h-7 p-0 text-sidebar-foreground">
          <PanelRightClose className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex flex-col gap-1 p-2 overflow-y-auto flex-1">
        {LINE_TYPES.map(lt => (
          <button
            key={lt.type}
            onClick={() => onChangeLineType(lt.type)}
            title={`Ctrl+${lt.shortcut}`}
            className={cn(
              'w-full text-left px-3 py-2.5 rounded-md transition-colors',
              currentLineType === lt.type
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-sidebar-accent text-sidebar-foreground'
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold">{lt.label}</span>
              <span className={cn(
                'text-[10px] font-mono px-1 py-0.5 rounded',
                currentLineType === lt.type
                  ? 'bg-white/20 text-white'
                  : 'bg-sidebar-accent text-muted-foreground'
              )}>
                {lt.shortcut}
              </span>
            </div>
            <p className={cn(
              'text-[11px] mt-0.5 leading-tight',
              currentLineType === lt.type ? 'text-white/70' : 'text-muted-foreground'
            )}>
              {lt.description}
            </p>
          </button>
        ))}
      </div>

      <div className="p-3 border-t border-sidebar-border shrink-0">
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          Tab / Shift+Tab to cycle · Ctrl+1–8
        </p>
      </div>
    </div>
  );
}
