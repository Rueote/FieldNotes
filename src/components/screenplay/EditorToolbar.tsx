import { LineType } from '@/types/screenplay';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Hash, FileText, Eye, Edit3, Download, Settings, RotateCcw, Search } from 'lucide-react';
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

interface EditorToolbarProps {
  currentLineType: LineType;
  mode: 'script' | 'labelling';
  onModeChange: (mode: 'script' | 'labelling') => void;
  showSceneNumbers: boolean;
  onToggleSceneNumbers: () => void;
  onBack: () => void;
  onTitlePage: () => void;
  onExportPDF: () => void;
  onExportFDX: () => void;
  projectName: string;
  searchOpen: boolean;
  onToggleSearch: () => void;
}

interface ColorRowProps {
  label: string;
  description: string;
  value: string;
  onChange: (val: string) => void;
}

function ColorRow({ label, description, value, onChange }: ColorRowProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs opacity-60">{description}</div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div className="w-6 h-6 rounded border border-white/20 shadow-sm" style={{ backgroundColor: value }} />
        <input
          type="color"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-8 h-8 cursor-pointer rounded border-0 bg-transparent p-0"
        />
        <span className="text-xs opacity-50 font-mono w-16">{value}</span>
      </div>
    </div>
  );
}

export function EditorToolbar({
  mode,
  onModeChange,
  showSceneNumbers,
  onToggleSceneNumbers,
  onBack,
  onTitlePage,
  onExportPDF,
  onExportFDX,
  projectName,
  searchOpen,
  onToggleSearch,
}: EditorToolbarProps) {
  const { colors, updateColor, reset } = useTheme();

  return (
    <div className="h-12 bg-toolbar-bg border-b border-border flex items-center px-3 gap-2 shrink-0">
      <Button variant="ghost" size="sm" onClick={onBack} className="mr-1">
        <ArrowLeft className="w-4 h-4" />
      </Button>

      <span className="text-sm font-medium truncate max-w-[200px]">{projectName}</span>

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

      <div className="ml-auto flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleSearch}
          title="Search (Ctrl+F)"
          className={cn('text-xs gap-1', searchOpen && 'bg-accent text-accent-foreground')}
        >
          <Search className="w-3.5 h-3.5" />
        </Button>

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

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" title="Appearance">
              <Settings className="w-3.5 h-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 bg-toolbar-bg border-border">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Appearance</h3>
                <Button variant="ghost" size="sm" onClick={reset} className="text-xs opacity-60 gap-1 h-7">
                  <RotateCcw className="w-3 h-3" />
                  Reset
                </Button>
              </div>
              <div className="space-y-3">
                <ColorRow label="Background" description="Area behind the script page" value={colors.bg} onChange={val => updateColor('bg', val)} />
                <ColorRow label="Paper" description="The script page itself" value={colors.paper} onChange={val => updateColor('paper', val)} />
                <ColorRow label="Menus" description="Toolbar, scene list & breakdown panel" value={colors.ui} onChange={val => updateColor('ui', val)} />
              </div>
              <p className="text-xs opacity-50">Text colour adjusts automatically based on brightness.</p>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
