import { LineType } from '@/types/screenplay';
import { Button } from '@/components/ui/button';
import { Hash, FileText, Eye, Edit3, Download, Search, Clock, List } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type EditorMode = 'script' | 'labelling' | 'shotlist';

interface EditorToolbarProps {
  currentLineType: LineType;
  mode: EditorMode;
  onModeChange: (mode: EditorMode) => void;
  showSceneNumbers: boolean;
  onToggleSceneNumbers: () => void;
  onTitlePage: () => void;
  onExportPDF: () => void;
  onExportFDX: () => void;
  onExportFountain: () => void;
  onExportDOCX: () => void;
  onPreview: () => void;
  projectName: string;
  searchOpen: boolean;
  onToggleSearch: () => void;
  pageCount: number;
}

function formatDuration(seconds: number): string {
  const totalMins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (totalMins < 60) return secs > 0 ? `${totalMins}m ${secs}s` : `${totalMins}m`;
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  const s = secs > 0 ? ` ${secs}s` : '';
  return m === 0 ? `${h}h${s}` : `${h}h ${m}m${s}`;
}

export function EditorToolbar({
  mode, onModeChange,
  showSceneNumbers, onToggleSceneNumbers,
  onTitlePage,
  onExportPDF, onExportFDX, onExportFountain, onExportDOCX,
  onPreview,
  projectName, searchOpen, onToggleSearch, pageCount,
}: EditorToolbarProps) {
  return (
    <div className="h-12 bg-toolbar-bg border-b border-border flex items-center px-3 gap-2 shrink-0">

      <span className="text-sm font-medium truncate max-w-[200px]">{projectName}</span>
      <div className="h-5 w-px bg-border mx-2" />

      {/* Mode tabs */}
      <div className="flex items-center gap-1">
        <Button variant={mode === 'script'   ? 'default' : 'ghost'} size="sm" onClick={() => onModeChange('script')}   className="gap-1 text-xs">
          <Edit3 className="w-3.5 h-3.5" />Script
        </Button>
        <Button variant={mode === 'shotlist' ? 'default' : 'ghost'} size="sm" onClick={() => onModeChange('shotlist')} className="gap-1 text-xs">
          <List className="w-3.5 h-3.5" />Shot List
        </Button>
        <Button variant={mode === 'labelling'? 'default' : 'ghost'} size="sm" onClick={() => onModeChange('labelling')} className="gap-1 text-xs">
          <Eye className="w-3.5 h-3.5" />Labelling
        </Button>
      </div>

      {/* Right side */}
      <div className="ml-auto flex items-center gap-1">
        {(mode === 'script' || mode === 'labelling') && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-accent/50 text-muted-foreground"
            title="Estimated screen time · 1 page ≈ 1 min">
            <Clock className="w-3.5 h-3.5" />
            <span className="text-xs font-medium tabular-nums">{formatDuration(pageCount)}</span>
          </div>
        )}

        <div className="w-px h-4 bg-border mx-1" />

        {mode === 'script' && (
          <Button variant="ghost" size="sm" onClick={onToggleSearch}
            title="Search (Ctrl+F)"
            className={cn('text-xs gap-1', searchOpen && 'bg-accent text-accent-foreground')}>
            <Search className="w-3.5 h-3.5" />
          </Button>
        )}

        {/* Scene numbers toggle */}
        <Button variant="ghost" size="sm" onClick={onToggleSceneNumbers}
          title={showSceneNumbers ? 'Hide scene numbers' : 'Show scene numbers'}
          className={cn('text-xs gap-1', showSceneNumbers && 'bg-accent text-accent-foreground')}>
          <Hash className="w-3.5 h-3.5" />
          <span className="text-xs">Scenes</span>
        </Button>

        <Button variant="ghost" size="sm" onClick={onTitlePage} className="text-xs gap-1">
          <FileText className="w-3.5 h-3.5" />Title
        </Button>

        {/* Preview button */}
        <Button variant="ghost" size="sm" onClick={onPreview} className="text-xs gap-1"
          title="Preview & export">
          <Eye className="w-3.5 h-3.5" />Preview
        </Button>

        {/* Export dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="text-xs gap-1">
              <Download className="w-3.5 h-3.5" />Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onExportPDF}>Export as PDF</DropdownMenuItem>
            <DropdownMenuItem onClick={onExportDOCX}>Export as DOCX (Word)</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onExportFDX}>Export as FDX (Final Draft)</DropdownMenuItem>
            <DropdownMenuItem onClick={onExportFountain}>Export as .fountain</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
