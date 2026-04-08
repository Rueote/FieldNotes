import { useState, useCallback, useEffect } from 'react';
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
import { exportToPDF, exportToFDX } from '@/lib/screenplayExport';

interface EditorWorkspaceProps {
  initialProject: Project;
  onBack: () => void;
}

export function EditorWorkspace({ initialProject, onBack }: EditorWorkspaceProps) {
  const {
    project,
    updateLine,
    insertLineAfter,
    removeLine,
    addLabel,
    removeLabel,
    addTag,
    updateTag,
    removeTag,
    updateTitlePage,
    toggleSceneNumbers,
  } = useProject(initialProject);

  const [mode, setMode] = useState<'script' | 'labelling'>('script');
  const [focusLineId, setFocusLineId] = useState<string | null>(null);
  const [currentLineType, setCurrentLineType] = useState<LineType>('action');
  const [showTitlePage, setShowTitlePage] = useState(false);
  const [showSceneNav, setShowSceneNav] = useState(true);
  const [showLineTypes, setShowLineTypes] = useState(true);
  const [showBreakdown, setShowBreakdown] = useState(true);
  const [highlightLineId, setHighlightLineId] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);

  // Ctrl+F
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setSearchOpen(v => !v);
      }
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

  return (
    <div className="h-screen flex flex-col bg-background">
      <EditorToolbar
        currentLineType={currentLineType}
        mode={mode}
        onModeChange={setMode}
        showSceneNumbers={project.showSceneNumbers}
        onToggleSceneNumbers={toggleSceneNumbers}
        onBack={onBack}
        onTitlePage={() => setShowTitlePage(true)}
        onExportPDF={() => exportToPDF(project)}
        onExportFDX={() => exportToFDX(project)}
        projectName={project.name}
        searchOpen={searchOpen}
        onToggleSearch={() => setSearchOpen(v => !v)}
      />

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

      <div className="flex flex-1 overflow-hidden">

        {/* ── Left: scene nav ── */}
        <ResizablePanel
          defaultWidth={260}
          minWidth={40}
          maxWidth={400}
          side="left"
          isOpen={showSceneNav}
          storageKey="scriptsmith-left-width"
        >
          <SceneNavSidebar
            lines={project.lines}
            onScrollToScene={handleScrollToLine}
            isOpen={showSceneNav}
            onToggle={() => setShowSceneNav(v => !v)}
          />
        </ResizablePanel>

        {/* ── Centre ── */}
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

        {/* ── Right: line types (script) or breakdown (labelling) ── */}
        {mode === 'script' ? (
          <ResizablePanel
            defaultWidth={200}
            minWidth={40}
            maxWidth={360}
            side="right"
            isOpen={showLineTypes}
            storageKey="scriptsmith-right-script-width"
          >
            <LineTypeSidebar
              currentLineType={currentLineType}
              onChangeLineType={handleChangeLineType}
              isOpen={showLineTypes}
              onToggle={() => setShowLineTypes(v => !v)}
            />
          </ResizablePanel>
        ) : (
          showBreakdown && (
            <ResizablePanel
              defaultWidth={300}
              minWidth={200}
              maxWidth={500}
              side="right"
              isOpen={showBreakdown}
              storageKey="scriptsmith-right-label-width"
              className="border-l border-border bg-breakdown-bg"
            >
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

      <TitlePageDialog
        open={showTitlePage}
        onOpenChange={setShowTitlePage}
        titlePage={project.titlePage}
        onUpdate={updateTitlePage}
      />
    </div>
  );
}
