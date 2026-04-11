import { useState, useCallback, useEffect, useMemo } from 'react';
import { Project, LineType } from '@/types/screenplay';
import { useProject } from '@/hooks/useProject';
import { EditorToolbar } from './EditorToolbar';
import { ScriptEditor } from './ScriptEditor';
import { LabellingMode } from './LabellingMode';
import { BreakdownPanel } from './BreakdownPanel';
import { TitlePageDialog } from './TitlePageDialog';
import { TagManager } from './TagManager';
import { SceneNavSidebar } from './SceneNavSidebar';
import { LineTypeSidebar } from './LineTypeSidebar';
import { ResizablePanel } from './ResizablePanel';
import { SearchBar } from './SearchBar';
import { ShotlistView } from './ShotlistView';
import { ScriptPreviewDialog } from './ScriptPreviewDialog';
import { exportToPDF, exportToFDX, exportToFountain, exportToDOCX } from '@/lib/screenplayExport';

type EditorMode = 'script' | 'labelling' | 'shotlist';

interface EditorWorkspaceProps {
  initialProject: Project;
  onBack: () => void;
  onSave: (project: Project) => void;
}

function estimateRuntimeSeconds(lines: Project['lines']): number {
  const LINES_PER_PAGE = 26;
  const printableLines = lines.filter(l => l.text.trim().length > 0 && l.type !== 'non-printable').length;
  const pages = printableLines / LINES_PER_PAGE;
  return Math.max(60, Math.round(pages * 60 * 0.93));
}

export function EditorWorkspace({ initialProject, onBack, onSave }: EditorWorkspaceProps) {
  const {
    project,
    updateLine, insertLineAfter, removeLine,
    addLabel, removeLabel,
    addTag, updateTag, removeTag,
    updateTitlePage, toggleSceneNumbers,
    addShot, updateShot, removeShot, updateShotColumns,
  } = useProject(initialProject);

  const [mode, setMode]                       = useState<EditorMode>('script');
  const [focusLineId, setFocusLineId]         = useState<string | null>(null);
  const [currentLineType, setCurrentLineType] = useState<LineType>('action');
  const [showTitlePage, setShowTitlePage]     = useState(false);
  const [showSceneNav, setShowSceneNav]       = useState(true);
  const [showLineTypes, setShowLineTypes]     = useState(true);
  const [showBreakdown, setShowBreakdown]     = useState(true);
  const [highlightLineId, setHighlightLineId] = useState<string | null>(null);
  const [searchOpen, setSearchOpen]           = useState(false);
  const [previewOpen, setPreviewOpen]         = useState(false);

  const runtimeSeconds = useMemo(() => estimateRuntimeSeconds(project.lines), [project.lines]);

  useEffect(() => { onSave(project); }, [project]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') { e.preventDefault(); setSearchOpen(v => !v); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleChangeLineType = useCallback((type: LineType) => {
    if (focusLineId) updateLine(focusLineId, { type });
    setCurrentLineType(type);
  }, [focusLineId, updateLine]);

  const handleScrollToLine = useCallback((lineId: string) => {
    setFocusLineId(lineId);
    setHighlightLineId(lineId);
    setTimeout(() => {
      const el = document.querySelector(`[data-line-id="${lineId}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
    setTimeout(() => setHighlightLineId(null), 1500);
  }, []);

  const toolbar = (
    <EditorToolbar
      currentLineType={currentLineType}
      mode={mode}
      onModeChange={m => setMode(m as EditorMode)}
      showSceneNumbers={project.showSceneNumbers}
      onToggleSceneNumbers={toggleSceneNumbers}
      onTitlePage={() => setShowTitlePage(true)}
      onExportPDF={() => exportToPDF(project)}
      onExportFDX={() => exportToFDX(project)}
      onExportFountain={() => exportToFountain(project)}
      onExportDOCX={() => exportToDOCX(project)}
      onPreview={() => setPreviewOpen(true)}
      projectName={project.name}
      searchOpen={searchOpen}
      onToggleSearch={() => setSearchOpen(v => !v)}
      pageCount={runtimeSeconds}
    />
  );

  if (mode === 'shotlist') {
    return (
      <div className="h-full flex flex-col bg-background">
        {toolbar}
        <ShotlistView
          lines={project.lines}
          shots={project.shots ?? []}
          shotColumns={project.shotColumns ?? []}
          onAddShot={addShot}
          onUpdateShot={updateShot}
          onRemoveShot={removeShot}
          onUpdateColumns={updateShotColumns}
        />
        <TitlePageDialog open={showTitlePage} onOpenChange={setShowTitlePage}
          titlePage={project.titlePage} onUpdate={updateTitlePage} />
        <ScriptPreviewDialog open={previewOpen} onClose={() => setPreviewOpen(false)} project={project} />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {toolbar}

      <SearchBar
        lines={project.lines}
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onScrollToLine={handleScrollToLine}
      />

      {mode === 'labelling' && (
        <div className="h-9 bg-toolbar-bg border-b border-border flex items-center px-3 gap-2 shrink-0">
          <TagManager tags={project.tags} onAddTag={addTag} onUpdateTag={updateTag} onRemoveTag={removeTag} />
          <div className="h-4 w-px bg-border" />
          <span className="text-xs text-muted-foreground">
            Click words to select · Ctrl+click for multi-select · Apply a tag to label
          </span>
        </div>
      )}

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <ResizablePanel defaultWidth={300} minWidth={40} maxWidth={500}
          side="left" isOpen={showSceneNav} storageKey="scriptsmith-left-width">
          <SceneNavSidebar
            lines={project.lines}
            onScrollToScene={handleScrollToLine}
            isOpen={showSceneNav}
            onToggle={() => setShowSceneNav(v => !v)}
          />
        </ResizablePanel>

        {mode === 'script' ? (
          <ScriptEditor
            lines={project.lines}
            showSceneNumbers={project.showSceneNumbers}
            onUpdateLine={updateLine}
            onInsertAfter={insertLineAfter}
            onRemoveLine={removeLine}
            focusLineId={focusLineId}
            onFocusLine={setFocusLineId}
            onLineTypeChange={setCurrentLineType}
            highlightLineId={highlightLineId}
          />
        ) : (
          <LabellingMode
            lines={project.lines}
            labels={project.labels}
            tags={project.tags}
            showSceneNumbers={project.showSceneNumbers}
            onAddLabel={addLabel}
            onRemoveLabel={removeLabel}
            onScrollToLine={handleScrollToLine}
          />
        )}

        {mode === 'script' ? (
          <ResizablePanel defaultWidth={200} minWidth={40} maxWidth={360}
            side="right" isOpen={showLineTypes} storageKey="scriptsmith-right-script-width">
            <LineTypeSidebar
              currentLineType={currentLineType}
              onChangeLineType={handleChangeLineType}
              isOpen={showLineTypes}
              onToggle={() => setShowLineTypes(v => !v)}
            />
          </ResizablePanel>
        ) : (
          showBreakdown && (
            <ResizablePanel defaultWidth={300} minWidth={200} maxWidth={480}
              side="right" isOpen={showBreakdown} storageKey="scriptsmith-right-label-width"
              className="border-l border-border bg-breakdown-bg">
              <BreakdownPanel
                lines={project.lines}
                labels={project.labels}
                tags={project.tags}
                onRemoveLabel={removeLabel}
                onScrollToLine={handleScrollToLine}
              />
            </ResizablePanel>
          )
        )}
      </div>

      <TitlePageDialog open={showTitlePage} onOpenChange={setShowTitlePage}
        titlePage={project.titlePage} onUpdate={updateTitlePage} />

      <ScriptPreviewDialog open={previewOpen} onClose={() => setPreviewOpen(false)} project={project} />
    </div>
  );
}
