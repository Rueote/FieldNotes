import { LineType } from '@/types/screenplay';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Hash, FileText, Eye, Edit3, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const LINE_TYPES: { type: LineType; label: string; shortcut: string }[] = [
  { type: 'scene-heading', label: 'Scene', shortcut: '1' },
  { type: 'action', label: 'Action', shortcut: '2' },
  { type: 'character', label: 'Character', shortcut: '3' },
  { type: 'dialogue', label: 'Dialogue', shortcut: '4' },
  { type: 'parenthetical', label: 'Paren', shortcut: '5' },
  { type: 'transition', label: 'Transition', shortcut: '6' },
];

interface EditorToolbarProps {
  currentLineType: LineType;
  onChangeLineType: (type: LineType) => void;
  mode: 'script' | 'labelling';
  onModeChange: (mode: 'script' | 'labelling') => void;
  showSceneNumbers: boolean;
  onToggleSceneNumbers: () => void;
  onBack: () => void;
  onTitlePage: () => void;
  onExportPDF: () => void;
  onExportFDX: () => void;
  projectName: string;
}

export function EditorToolbar({
  currentLineType,
  onChangeLineType,
  mode,
  onModeChange,
  showSceneNumbers,
  onToggleSceneNumbers,
  onBack,
  onTitlePage,
  onExportPDF,
  onExportFDX,
  projectName,
}: EditorToolbarProps) {
  return (
    <div className="h-12 bg-toolbar-bg border-b border-border flex items-center px-3 gap-2 shrink-0">
      <Button variant="ghost" size="sm" onClick={onBack} className="mr-1">
        <ArrowLeft className="w-4 h-4" />
      </Button>

      <span className="text-sm font-medium text-foreground truncate max-w-[160px]">{projectName}</span>

      <div className="h-5 w-px bg-border mx-2" />

      <div className="flex items-center gap-1">
        <Button
          variant={mode === 'script' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onModeChange('script')}
          className="gap-1 text-xs"
        >
          <Edit3 className="w-3.5 h-3.5" />
          Script
        </Button>
        <Button
          variant={mode === 'labelling' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onModeChange('labelling')}
          className="gap-1 text-xs"
        >
          <Eye className="w-3.5 h-3.5" />
          Labelling
        </Button>
      </div>

      <div className="h-5 w-px bg-border mx-2" />

      {mode === 'script' && (
        <div className="flex items-center gap-0.5">
          {LINE_TYPES.map(lt => (
            <Button
              key={lt.type}
              variant="ghost"
              size="sm"
              onClick={() => onChangeLineType(lt.type)}
              className={cn(
                'text-xs px-2 h-7',
                currentLineType === lt.type && 'bg-accent text-accent-foreground'
              )}
              title={`${lt.label} (Ctrl+${lt.shortcut})`}
            >
              {lt.label}
            </Button>
          ))}
        </div>
      )}

      <div className="ml-auto flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={onToggleSceneNumbers} title="Toggle scene numbers" className={cn('text-xs', showSceneNumbers && 'bg-accent')}>
          <Hash className="w-3.5 h-3.5" />
        </Button>
        <Button variant="ghost" size="sm" onClick={onTitlePage} className="text-xs gap-1">
          <FileText className="w-3.5 h-3.5" />
          Title
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="text-xs gap-1">
              <Download className="w-3.5 h-3.5" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onExportPDF}>
              Export as PDF
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onExportFDX}>
              Export as FDX (Final Draft)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
