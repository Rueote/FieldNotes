import { useState, useCallback } from 'react';
import { Project, LineType } from '@/types/screenplay';
import { useProject } from '@/hooks/useProject';
import { EditorToolbar } from './EditorToolbar';
import { ScriptEditor } from './ScriptEditor';
import { LabellingMode } from './LabellingMode';
import { BreakdownPanel } from './BreakdownPanel';
import { TitlePageDialog } from './TitlePageDialog';
import { TagManager } from './TagManager';
import { SceneNavSidebar } from './SceneNavSidebar';
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
  const [showBreakdown, setShowBreakdown] = useState(true);
  const [showSceneNav, setShowSceneNav] = useState(true);
  const [highlightLineId, setHighlightLineId] = useState<string | null>(null);

  const handleChangeLineType = useCallback((type: LineType) => {
    if (focusLineId) {
      updateLine(focusLineId, { type });
    }
    setCurrentLineType(type);
  }, [focusLineId, updateLine]);

  const handleScrollToLine = useCallback((lineId: string) => {
    setFocusLineId(lineId);
    setHighlightLineId(lineId);
    setTimeout(() => {
      const el = document.querySelector(`[data-line-id="${lineId}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
    // Clear highlight after animation
    setTimeout(() => setHighlightLineId(null), 1500);
  }, []);

  return (
    <div className="h-screen flex flex-col bg-background">
      <EditorToolbar
        currentLineType={currentLineType}
        onChangeLineType={handleChangeLineType}
        mode={mode}
        onModeChange={setMode}
        showSceneNumbers={project.showSceneNumbers}
        onToggleSceneNumbers={toggleSceneNumbers}
        onBack={onBack}
        onTitlePage={() => setShowTitlePage(true)}
        onExportPDF={() => exportToPDF(project)}
        onExportFDX={() => exportToFDX(project)}
        projectName={project.name}
      />

      {mode === 'labelling' && (
        <div className="h-9 bg-toolbar-bg border-b border-border flex items-center px-3 gap-2">
          <TagManager tags={project.tags} onAddTag={addTag} onUpdateTag={updateTag} onRemoveTag={removeTag} />
          <div className="h-4 w-px bg-border" />
          <span className="text-xs text-muted-foreground">Click words to select • Ctrl+click for multi-select • Apply a tag to label</span>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Scene Navigation Sidebar */}
        <SceneNavSidebar
          lines={project.lines}
          onScrollToScene={handleScrollToLine}
          isOpen={showSceneNav}
          onToggle={() => setShowSceneNav(prev => !prev)}
        />

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

        {showBreakdown && (
          <>
            <div className="w-px bg-border shrink-0" />
            <div className="w-[300px] shrink-0 bg-breakdown-bg overflow-hidden">
              <BreakdownPanel
                lines={project.lines}
                labels={project.labels}
                tags={project.tags}
                onRemoveLabel={removeLabel}
                onScrollToLine={handleScrollToLine}
              />
            </div>
          </>
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
