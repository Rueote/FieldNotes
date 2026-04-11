import { useState, useCallback } from 'react';
import { Project } from '@/types/screenplay';
import { Plus, Folder, FileText, X, GripVertical, ChevronRight, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface Note {
  id: string;
  title: string;
  content: string;
  color: string;
  x: number;
  y: number;
  width: number;
}

interface ResearchFolder {
  id: string;
  name: string;
  notes: Note[];
  collapsed: boolean;
}

interface ResearchData {
  folders: ResearchFolder[];
  loose: Note[];
}

const NOTE_COLORS = ['#2a2a35', '#1e2a1e', '#2a1e1e', '#1e1e2a', '#2a261e'];
const NOTE_COLOR_LABELS = ['Default', 'Green', 'Red', 'Blue', 'Amber'];

function useResearchStorage(projectId: string | null) {
  const key = projectId ? `research_${projectId}` : null;

  const load = (): ResearchData => {
    if (!key) return { folders: [], loose: [] };
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : { folders: [], loose: [] };
    } catch { return { folders: [], loose: [] }; }
  };

  const save = (data: ResearchData) => {
    if (!key) return;
    localStorage.setItem(key, JSON.stringify(data));
  };

  return { load, save };
}

interface NoteCardProps {
  note: Note;
  onUpdate: (id: string, updates: Partial<Note>) => void;
  onDelete: (id: string) => void;
}

function NoteCard({ note, onUpdate, onDelete }: NoteCardProps) {
  const [editing, setEditing] = useState(false);

  return (
    <div
      className="rounded-lg border border-white/10 overflow-hidden flex flex-col"
      style={{ backgroundColor: note.color, minHeight: 120, width: note.width }}
    >
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-white/10">
        <GripVertical className="w-3 h-3 text-white/20 cursor-grab shrink-0" />
        <input
          className="flex-1 bg-transparent text-xs font-semibold text-white/80 outline-none placeholder:text-white/30 min-w-0"
          value={note.title}
          onChange={e => onUpdate(note.id, { title: e.target.value })}
          placeholder="Title..."
        />
        <button onClick={() => onDelete(note.id)} className="text-white/20 hover:text-white/60 transition-colors shrink-0">
          <X className="w-3 h-3" />
        </button>
      </div>
      <textarea
        className="flex-1 bg-transparent text-xs text-white/70 p-2 outline-none resize-none placeholder:text-white/25 min-h-[80px]"
        value={note.content}
        onChange={e => onUpdate(note.id, { content: e.target.value })}
        placeholder="Write anything..."
      />
    </div>
  );
}

interface FolderSectionProps {
  folder: ResearchFolder;
  onUpdate: (id: string, updates: Partial<ResearchFolder>) => void;
  onDelete: (id: string) => void;
  onAddNote: (folderId: string) => void;
  onUpdateNote: (folderId: string, noteId: string, updates: Partial<Note>) => void;
  onDeleteNote: (folderId: string, noteId: string) => void;
}

function FolderSection({ folder, onUpdate, onDelete, onAddNote, onUpdateNote, onDeleteNote }: FolderSectionProps) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-2 group">
        <button
          onClick={() => onUpdate(folder.id, { collapsed: !folder.collapsed })}
          className="flex items-center gap-2 text-white/60 hover:text-white/90 transition-colors"
        >
          {folder.collapsed
            ? <ChevronRight className="w-3.5 h-3.5" />
            : <ChevronDown className="w-3.5 h-3.5" />
          }
          <Folder className="w-3.5 h-3.5 text-[#4d9fff]" />
          <input
            className="bg-transparent text-sm font-semibold text-white/80 outline-none placeholder:text-white/30"
            value={folder.name}
            onChange={e => onUpdate(folder.id, { name: e.target.value })}
            onClick={e => e.stopPropagation()}
            placeholder="Folder name..."
          />
        </button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-white/40 hover:text-white/80"
          onClick={() => onAddNote(folder.id)}
        >
          <Plus className="w-3 h-3" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-white/40 hover:text-red-400"
          onClick={() => onDelete(folder.id)}
        >
          <X className="w-3 h-3" />
        </Button>
      </div>

      {!folder.collapsed && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3 pl-5">
          {folder.notes.map(note => (
            <NoteCard
              key={note.id}
              note={note}
              onUpdate={(id, updates) => onUpdateNote(folder.id, id, updates)}
              onDelete={(id) => onDeleteNote(folder.id, id)}
            />
          ))}
          <button
            onClick={() => onAddNote(folder.id)}
            className="rounded-lg border border-dashed border-white/10 text-white/20 hover:text-white/40 hover:border-white/20 transition-colors flex items-center justify-center gap-2 text-xs min-h-[120px]"
          >
            <Plus className="w-3.5 h-3.5" />
            Add note
          </button>
        </div>
      )}
    </div>
  );
}

interface ResearchBoardProps {
  project: Project | null;
}

export function ResearchBoard({ project }: ResearchBoardProps) {
  const { load, save } = useResearchStorage(project?.id ?? null);
  const [data, setData] = useState<ResearchData>(() => load());

  const update = useCallback((next: ResearchData) => {
    setData(next);
    save(next);
  }, [save]);

  const addFolder = () => {
    const next = {
      ...data,
      folders: [...data.folders, {
        id: crypto.randomUUID(),
        name: 'New Folder',
        notes: [],
        collapsed: false,
      }]
    };
    update(next);
  };

  const updateFolder = (id: string, updates: Partial<ResearchFolder>) => {
    update({ ...data, folders: data.folders.map(f => f.id === id ? { ...f, ...updates } : f) });
  };

  const deleteFolder = (id: string) => {
    update({ ...data, folders: data.folders.filter(f => f.id !== id) });
  };

  const addNote = (folderId?: string) => {
    const note: Note = {
      id: crypto.randomUUID(),
      title: '',
      content: '',
      color: NOTE_COLORS[0],
      x: 0, y: 0,
      width: 220,
    };
    if (folderId) {
      update({ ...data, folders: data.folders.map(f => f.id === folderId ? { ...f, notes: [...f.notes, note] } : f) });
    } else {
      update({ ...data, loose: [...data.loose, note] });
    }
  };

  const updateNote = (folderId: string | null, noteId: string, updates: Partial<Note>) => {
    if (folderId) {
      update({ ...data, folders: data.folders.map(f => f.id === folderId ? { ...f, notes: f.notes.map(n => n.id === noteId ? { ...n, ...updates } : n) } : f) });
    } else {
      update({ ...data, loose: data.loose.map(n => n.id === noteId ? { ...n, ...updates } : n) });
    }
  };

  const deleteNote = (folderId: string | null, noteId: string) => {
    if (folderId) {
      update({ ...data, folders: data.folders.map(f => f.id === folderId ? { ...f, notes: f.notes.filter(n => n.id !== noteId) } : f) });
    } else {
      update({ ...data, loose: data.loose.filter(n => n.id !== noteId) });
    }
  };

  if (!project) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <FlaskConical className="w-10 h-10 opacity-30" />
        <p className="text-sm">Open a project first to access Research</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#111116] overflow-hidden">
      {/* Header */}
      <div className="shrink-0 h-12 border-b border-white/8 flex items-center px-4 gap-3">
        <span className="text-sm font-semibold text-white/70">{project.name} · Research</span>
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="sm"
          className="text-white/40 hover:text-white/80 gap-1.5 text-xs h-7"
          onClick={addFolder}
        >
          <Folder className="w-3.5 h-3.5" />
          New Folder
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-white/40 hover:text-white/80 gap-1.5 text-xs h-7"
          onClick={() => addNote()}
        >
          <Plus className="w-3.5 h-3.5" />
          New Note
        </Button>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        {data.folders.length === 0 && data.loose.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-4 text-white/20">
            <FileText className="w-12 h-12 opacity-30" />
            <p className="text-sm">Your research board is empty</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="text-xs border-white/10 text-white/40 hover:text-white/70" onClick={addFolder}>
                <Folder className="w-3.5 h-3.5 mr-1.5" />New Folder
              </Button>
              <Button variant="outline" size="sm" className="text-xs border-white/10 text-white/40 hover:text-white/70" onClick={() => addNote()}>
                <Plus className="w-3.5 h-3.5 mr-1.5" />New Note
              </Button>
            </div>
          </div>
        ) : (
          <>
            {data.folders.map(folder => (
              <FolderSection
                key={folder.id}
                folder={folder}
                onUpdate={updateFolder}
                onDelete={deleteFolder}
                onAddNote={addNote}
                onUpdateNote={(fid, nid, updates) => updateNote(fid, nid, updates)}
                onDeleteNote={(fid, nid) => deleteNote(fid, nid)}
              />
            ))}

            {data.loose.length > 0 && (
              <div>
                {data.folders.length > 0 && (
                  <div className="text-xs text-white/20 uppercase tracking-wider mb-3 mt-2">Unsorted</div>
                )}
                <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
                  {data.loose.map(note => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      onUpdate={(id, updates) => updateNote(null, id, updates)}
                      onDelete={(id) => deleteNote(null, id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Fix missing import
function FlaskConical(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 2v7.31" /><path d="M14 9.3V1.99" /><path d="M8.5 2h7" />
      <path d="M14 9.3a6.5 6.5 0 1 1-4 0" /><path d="M5.52 16h12.96" />
    </svg>
  );
}
