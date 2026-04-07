import { useState, useCallback, useEffect, useRef } from 'react';
import { Project, createProject, createLine, ScriptLine, Label, Tag, LineType, TitlePage } from '@/types/screenplay';

const STORAGE_KEY = 'screenplay-projects';

function loadProjects(): Project[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

function saveProjectsToStorage(projects: Project[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

export function useProjectList() {
  const [projects, setProjects] = useState<Project[]>(loadProjects);

  const save = useCallback((ps: Project[]) => {
    setProjects(ps);
    saveProjectsToStorage(ps);
  }, []);

  const addProject = useCallback((name: string) => {
    const p = createProject(name);
    const updated = [...loadProjects(), p];
    save(updated);
    return p;
  }, [save]);

  const deleteProject = useCallback((id: string) => {
    const updated = loadProjects().filter(p => p.id !== id);
    save(updated);
  }, [save]);

  const saveProject = useCallback((project: Project) => {
    const all = loadProjects();
    const idx = all.findIndex(p => p.id === project.id);
    if (idx >= 0) {
      all[idx] = { ...project, updatedAt: Date.now() };
    } else {
      all.push({ ...project, updatedAt: Date.now() });
    }
    save(all);
  }, [save]);

  return { projects, addProject, deleteProject, saveProject };
}

export function useProject(initialProject: Project) {
  const [project, setProject] = useState<Project>(initialProject);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-save with debounce - saves ALL project data including labels
  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const all = loadProjects();
      const idx = all.findIndex(p => p.id === project.id);
      const toSave = { ...project, updatedAt: Date.now() };
      if (idx >= 0) {
        all[idx] = toSave;
      } else {
        all.push(toSave);
      }
      saveProjectsToStorage(all);
    }, 300);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [project]);

  const updateLine = useCallback((lineId: string, updates: Partial<ScriptLine>) => {
    setProject(p => ({
      ...p,
      lines: p.lines.map(l => l.id === lineId ? { ...l, ...updates } : l),
    }));
  }, []);

  const insertLineAfter = useCallback((afterId: string, type: LineType = 'action') => {
    const newLine = createLine(type);
    setProject(p => {
      const idx = p.lines.findIndex(l => l.id === afterId);
      const lines = [...p.lines];
      lines.splice(idx + 1, 0, newLine);
      return { ...p, lines };
    });
    return newLine.id;
  }, []);

  const removeLine = useCallback((lineId: string) => {
    setProject(p => {
      if (p.lines.length <= 1) return p;
      return {
        ...p,
        lines: p.lines.filter(l => l.id !== lineId),
        // Also clean up labels for removed lines
        labels: p.labels.filter(l => l.lineId !== lineId),
      };
    });
  }, []);

  const addLabel = useCallback((label: Label) => {
    setProject(p => ({ ...p, labels: [...p.labels, label] }));
  }, []);

  const removeLabel = useCallback((labelId: string) => {
    setProject(p => ({ ...p, labels: p.labels.filter(l => l.id !== labelId) }));
  }, []);

  const addTag = useCallback((tag: Tag) => {
    setProject(p => ({ ...p, tags: [...p.tags, tag] }));
  }, []);

  const updateTag = useCallback((tagId: string, updates: Partial<Tag>) => {
    setProject(p => ({
      ...p,
      tags: p.tags.map(t => t.id === tagId ? { ...t, ...updates } : t),
    }));
  }, []);

  const removeTag = useCallback((tagId: string) => {
    setProject(p => ({
      ...p,
      tags: p.tags.filter(t => t.id !== tagId),
      labels: p.labels.filter(l => l.tagId !== tagId),
    }));
  }, []);

  const updateTitlePage = useCallback((tp: Partial<TitlePage>) => {
    setProject(p => ({ ...p, titlePage: { ...p.titlePage, ...tp } }));
  }, []);

  const toggleSceneNumbers = useCallback(() => {
    setProject(p => ({ ...p, showSceneNumbers: !p.showSceneNumbers }));
  }, []);

  return {
    project,
    setProject,
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
  };
}
