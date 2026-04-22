import { useState } from 'react';
import { Project } from '@/types/screenplay';
import { useProjectList } from '@/hooks/useProject';
import { useUsageTime } from '@/hooks/useUsageTime';

import { HomeScreen } from '@/components/screenplay/HomeScreen';
import { EditorWorkspace } from '@/components/screenplay/EditorWorkspace';
import { DocumentsTab } from '@/components/screenplay/DocumentsTab';
import { CollabView } from '@/components/screenplay/CollabView';
import { SettingsPanel } from '@/components/screenplay/SettingsPanel';

import { Home, FolderOpen, FileText, Users, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

type Tab = 'start' | 'documents' | 'script' | 'collab' | 'settings';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'start',     label: 'Start',     icon: <Home      className="w-4 h-4" /> },
  { id: 'documents', label: 'Documents', icon: <FolderOpen className="w-4 h-4" /> },
  { id: 'script',    label: 'Script',    icon: <FileText  className="w-4 h-4" /> },
  { id: 'collab',    label: 'Collab',    icon: <Users     className="w-4 h-4" /> },
  { id: 'settings',  label: 'Settings',  icon: <Settings  className="w-4 h-4" /> },
];

export default function Index() {
  const { projects, addProject, deleteProject, saveProject } = useProjectList();

  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [tab, setTab] = useState<Tab>('start');

  const { totalSeconds, reset: resetTime } = useUsageTime();

  const handleOpenProject = (project: Project) => {
    setActiveProject(project);
    setTab('script');
  };

  const handleNewProject = (name: string) => {
    const p = addProject(name);
    setActiveProject(p);
    setTab('script');
    return p;
  };

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">

      {/* ── Main content ── */}
      <div className="flex-1 overflow-hidden">
        {tab === 'start' && (
          <HomeScreen
            projects={projects}
            onNewProject={handleNewProject}
            onOpenProject={handleOpenProject}
            onDeleteProject={deleteProject}
            onImportProject={saveProject}
          />
        )}

        {tab === 'documents' && (
          <DocumentsTab project={activeProject} />
        )}

        {tab === 'script' && (
          activeProject ? (
            <EditorWorkspace
              key={activeProject.id}
              initialProject={activeProject}
              onSave={saveProject}
              onBack={() => setTab('start')}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <FileText className="w-10 h-10 opacity-30" />
              <p className="text-sm">
                No project open — go to Start to open or create one
              </p>
              <button
                className="text-xs underline underline-offset-2 opacity-60 hover:opacity-100 transition-opacity"
                onClick={() => setTab('start')}
              >
                Go to Start
              </button>
            </div>
          )
        )}

        {tab === 'collab' && <CollabView />}

        {tab === 'settings' && (
          <SettingsPanel
            totalSeconds={totalSeconds}
            onResetTime={resetTime}
          />
        )}
      </div>

      {/* ── Bottom navigation ── */}
      <div className="shrink-0 h-10 bg-[#1a1a1e] border-t border-white/10 flex items-stretch">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 text-[11px] font-medium tracking-wide transition-colors relative',
              tab === t.id
                ? 'text-white bg-white/10'
                : 'text-white/40 hover:text-white/70 hover:bg-white/5'
            )}
          >
            {tab === t.id && (
              <span className="absolute top-0 left-0 right-0 h-[2px] bg-[#4d9fff]" />
            )}
            {t.icon}
            <span className="uppercase">{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
