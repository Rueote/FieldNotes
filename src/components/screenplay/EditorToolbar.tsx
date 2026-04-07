import { LineType } from '@/types/screenplay';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Hash, FileText, Eye, Edit3, Download, Settings, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useTheme } from '@/hooks/useTheme';

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

interface ColorRowProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  preview?: string;
}

function ColorRow({ label, value, onChange, preview }: ColorRowProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-foreground w-20">{label}</span>
      <div className="flex items-center gap-2">
        <div
          className="w-6 h-6 rounded border border-border shadow-sm"
          style={{ backgroundColor: value }}
        />
        <input
          type="color"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-8 h-8 cursor-pointer rounded border-0 bg-transparent p-0"
          title={label}
        />
        <span className="text-xs text-muted-foreground font-mono w-16">{value}</span>
      </div>
    </div>
  );
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
  const { colors, updateColor, reset } = useTheme();

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
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleSceneNumbers}
          title="Toggle scene numbers"
          className={cn('text-xs', showSceneNumbers && 'bg-accent')}
        >
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
            <DropdownMenuItem onClick={onExportPDF}>Export as PDF</DropdownMenuItem>
            <DropdownMenuItem onClick={onExportFDX}>Export as FDX (Final Draft)</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Settings */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" title="Appearance settings">
              <Settings className="w-3.5 h-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Appearance</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={reset}
                  className="text-xs text-muted-foreground gap-1 h-7"
                  title="Reset to defaults"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset
                </Button>
              </div>

              <div className="space-y-3">
                <ColorRow
                  label="Background"
                  value={colors.bg}
                  onChange={val => updateColor('bg', val)}
                />
                <ColorRow
                  label="Paper"
                  value={colors.paper}
                  onChange={val => updateColor('paper', val)}
                />
                <ColorRow
                  label="Toolbar"
                  value={colors.toolbar}
                  onChange={val => updateColor('toolbar', val)}
                />
              </div>

              <p className="text-xs text-muted-foreground">
                Changes apply instantly and are saved automatically.
              </p>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
