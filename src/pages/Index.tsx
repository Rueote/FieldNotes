import { useState } from 'react';
import { Project } from '@/types/screenplay';
import { useProjectList } from '@/hooks/useProject';
import { HomeScreen } from '@/components/screenplay/HomeScreen';
import { EditorWorkspace } from '@/components/screenplay/EditorWorkspace';

export default function Index() {
  const { projects, addProject, deleteProject, saveProject } = useProjectList();
  const [activeProject, setActiveProject] = useState<Project | null>(null);

  return activeProject ? (
    <EditorWorkspace
      key={activeProject.id}
      initialProject={activeProject}
      onBack={() => setActiveProject(null)}
    />
  ) : (
    <HomeScreen
      projects={projects}
      onNewProject={addProject}
      onOpenProject={setActiveProject}
      onDeleteProject={deleteProject}
      onImportProject={saveProject}
    />
  );
}
