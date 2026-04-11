import { useState, useCallback, useEffect, useRef } from 'react';
import {
  Project, createProject, createLine, ScriptLine, Label, Tag, LineType, TitlePage,
  Shot, ShotColumn, DEFAULT_SHOT_COLUMNS, createShot,
} from '@/types/screenplay';

const STORAGE_KEY = 'screenplay-projects';

function loadProjects(): Project[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const raw: any[] = JSON.parse(data);
    return raw.map(p => ({
      ...p,
      shots:        p.shots        ?? [],
      shotColumns:  p.shotColumns  ?? [...DEFAULT_SHOT_COLUMNS],
      showSceneNumbers: p.showSceneNumbers ?? true,
    }));
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
    save(loadProjects().filter(p => p.id !== id));
  }, [save]);

  const saveProject = useCallback((project: Project) => {
    const all = loadProjects();
    const idx = all.findIndex(p => p.id === project.id);
    const hydrated = {
      ...project,
      shots:       project.shots       ?? [],
      shotColumns: project.shotColumns ?? [...DEFAULT_SHOT_COLUMNS],
      updatedAt:   Date.now(),
    };
    if (idx >= 0) { all[idx] = hydrated; } else { all.push(hydrated); }
    save(all);
  }, [save]);

  return { projects, addProject, deleteProject, saveProject };
}

export function useProject(initialProject: Project) {
  const [project, setProject] = useState<Project>({
    ...initialProject,
    shots:       initialProject.shots       ?? [],
    shotColumns: initialProject.shotColumns ?? [...DEFAULT_SHOT_COLUMNS],
  });

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const all = loadProjects();
      const idx = all.findIndex(p => p.id === project.id);
      const toSave = { ...project, updatedAt: Date.now() };
      if (idx >= 0) { all[idx] = toSave; } else { all.push(toSave); }
      saveProjectsToStorage(all);
    }, 300);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [project]);

  // ── Lines ──────────────────────────────────────────────────────────────────
  const updateLine = useCallback((lineId: string, updates: Partial<ScriptLine>) => {
    setProject(p => ({ ...p, lines: p.lines.map(l => l.id === lineId ? { ...l, ...updates } : l) }));
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
      return { ...p, lines: p.lines.filter(l => l.id !== lineId), labels: p.labels.filter(l => l.lineId !== lineId) };
    });
  }, []);

  // ── Labels ─────────────────────────────────────────────────────────────────
  const addLabel    = useCallback((label: Label) => setProject(p => ({ ...p, labels: [...p.labels, label] })), []);
  const removeLabel = useCallback((id: string)   => setProject(p => ({ ...p, labels: p.labels.filter(l => l.id !== id) })), []);

  // ── Tags ───────────────────────────────────────────────────────────────────
  const addTag    = useCallback((tag: Tag) => setProject(p => ({ ...p, tags: [...p.tags, tag] })), []);
  const updateTag = useCallback((id: string, updates: Partial<Tag>) =>
    setProject(p => ({ ...p, tags: p.tags.map(t => t.id === id ? { ...t, ...updates } : t) })), []);
  const removeTag = useCallback((id: string) =>
    setProject(p => ({ ...p, tags: p.tags.filter(t => t.id !== id), labels: p.labels.filter(l => l.tagId !== id) })), []);

  // ── Title / misc ───────────────────────────────────────────────────────────
  const updateTitlePage   = useCallback((tp: Partial<TitlePage>) =>
    setProject(p => ({ ...p, titlePage: { ...p.titlePage, ...tp } })), []);
  const toggleSceneNumbers = useCallback(() =>
    setProject(p => ({ ...p, showSceneNumbers: !p.showSceneNumbers })), []);

  // ── Shots ──────────────────────────────────────────────────────────────────
  const addShot = useCallback((sceneNumber: number) => {
    setProject(p => {
      const n = p.shots.filter(s => s.sceneNumber === sceneNumber).length + 1;
      return { ...p, shots: [...p.shots, createShot(sceneNumber, n)] };
    });
  }, []);

  const updateShot = useCallback((id: string, updates: Partial<Shot>) =>
    setProject(p => ({ ...p, shots: p.shots.map(s => s.id === id ? { ...s, ...updates } : s) })), []);

  const removeShot = useCallback((id: string) => {
    setProject(p => {
      const remaining = p.shots.filter(s => s.id !== id);
      // Re-number within each scene
      const sceneNums = [...new Set(remaining.map(s => s.sceneNumber))];
      const renumbered = remaining.map(s => {
        const siblings = remaining.filter(x => x.sceneNumber === s.sceneNumber);
        return { ...s, shotNumber: siblings.indexOf(s) + 1 };
      });
      return { ...p, shots: renumbered };
    });
  }, []);

  const updateShotColumns = useCallback((columns: ShotColumn[]) =>
    setProject(p => ({ ...p, shotColumns: columns })), []);

  return {
    project, setProject,
    updateLine, insertLineAfter, removeLine,
    addLabel, removeLabel,
    addTag, updateTag, removeTag,
    updateTitlePage, toggleSceneNumbers,
    addShot, updateShot, removeShot, updateShotColumns,
  };
}
