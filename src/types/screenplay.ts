export type LineType = 'scene-heading' | 'action' | 'character' | 'dialogue' | 'parenthetical' | 'transition' | 'non-printable' | 'lyrics';

export interface ScriptLine {
  id: string;
  type: LineType;
  text: string;
  bold?: boolean;
  italic?: boolean;
  sceneNumber?: number;
}

export interface Label {
  id: string;
  lineId: string;
  startIndex: number;
  endIndex: number;
  text: string;
  tagId: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  category: string;
}

export interface TitlePage {
  title: string;
  writtenBy: string;
  genre?: string;
  basedOn?: string;
  additional?: string;
  contact?: string;
  year?: string;
}

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  titlePage: TitlePage;
  lines: ScriptLine[];
  labels: Label[];
  tags: Tag[];
  showSceneNumbers: boolean;
}

export const DEFAULT_TAGS: Tag[] = [
  { id: 'tag-1', name: 'Prop',     color: '#f59e0b', category: 'Props' },
  { id: 'tag-2', name: 'Wardrobe', color: '#8b5cf6', category: 'Wardrobe' },
  { id: 'tag-3', name: 'VFX',      color: '#06b6d4', category: 'VFX' },
  { id: 'tag-4', name: 'SFX',      color: '#ef4444', category: 'Sound' },
  { id: 'tag-5', name: 'Location', color: '#22c55e', category: 'Locations' },
  { id: 'tag-6', name: 'Cast',     color: '#ec4899', category: 'Cast' },
  { id: 'tag-7', name: 'Vehicle',  color: '#f97316', category: 'Vehicles' },
  { id: 'tag-8', name: 'Makeup',   color: '#a855f7', category: 'Makeup' },
  { id: 'tag-9', name: 'Lighting', color: '#eab308', category: 'Lighting' },
];

export function createLine(type: LineType = 'action', text = ''): ScriptLine {
  return { id: crypto.randomUUID(), type, text };
}

export function createProject(name: string): Project {
  return {
    id: crypto.randomUUID(),
    name,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    titlePage: { title: name, writtenBy: '', genre: '', year: new Date().getFullYear().toString() },
    lines: [createLine('scene-heading', ''), createLine('action', '')],
    labels: [],
    tags: [...DEFAULT_TAGS],
    showSceneNumbers: true,
  };
}

export function getSceneNumber(lines: ScriptLine[], lineIndex: number): number {
  let scene = 0;
  for (let i = 0; i <= lineIndex; i++) {
    if (lines[i].type === 'scene-heading') scene++;
  }
  return scene;
}

export interface SceneInfo {
  heading: string;
  index: number;
  number: number;
  intExt: string;
  location: string;
  timeOfDay: string;
  firstLine: string;
  characters: string[];
}

export function getScenes(lines: ScriptLine[]): SceneInfo[] {
  const scenes: SceneInfo[] = [];
  let num = 0;
  lines.forEach((line, i) => {
    if (line.type === 'scene-heading') {
      num++;
      const heading = line.text || `Scene ${num}`;
      const match = heading.match(/^(INT\.|EXT\.|INT\.\/EXT\.|I\/E\.)\s*(.*?)(?:\s*-\s*(.*))?$/i);
      const intExt = match?.[1]?.toUpperCase() || '';
      const location = match?.[2]?.trim() || heading;
      const timeOfDay = match?.[3]?.trim() || '';

      let firstLine = '';
      const characters: string[] = [];
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].type === 'scene-heading') break;
        if (!firstLine && lines[j].text.trim() && lines[j].type === 'action') {
          firstLine = lines[j].text.trim().substring(0, 60);
        }
        if (lines[j].type === 'character' && lines[j].text.trim()) {
          const name = lines[j].text.trim().replace(/\s*\(.*\)$/, '');
          if (!characters.includes(name)) characters.push(name);
        }
      }
      scenes.push({ heading, index: i, number: num, intExt, location, timeOfDay, firstLine, characters });
    }
  });
  return scenes;
}

/** Collect all unique character names used in the script */
export function getCharacterNames(lines: ScriptLine[]): string[] {
  const names = new Set<string>();
  lines.forEach(l => {
    if (l.type === 'character' && l.text.trim()) {
      names.add(l.text.trim().replace(/\s*\(.*\)$/, '').toUpperCase());
    }
  });
  return Array.from(names).sort();
}
