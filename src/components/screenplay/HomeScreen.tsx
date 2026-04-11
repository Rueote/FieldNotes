import { useState, useEffect } from 'react';
import { Project } from '@/types/screenplay';
import { FilePlus, FileText, Trash2, Clock, Download, Upload, FolderOpen, Film, Tag, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { importFile } from '@/lib/screenplayImport';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface HomeScreenProps {
  projects: Project[];
  onNewProject: (name: string) => Project;
  onOpenProject: (project: Project) => void;
  onDeleteProject: (id: string) => void;
  onImportProject: (project: Project) => void;
}

function formatDateTime(ts: number): string {
  const d = new Date(ts);
  const date = d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
  const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  return `${date} · ${time}`;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

export function HomeScreen({ projects, onNewProject, onOpenProject, onDeleteProject, onImportProject }: HomeScreenProps) {
  const [newName, setNewName] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const { toast } = useToast();

  const sorted = [...projects].sort((a, b) => b.updatedAt - a.updatedAt);
  const selectedProject = sorted.find(p => p.id === selected) ?? null;

  useEffect(() => {
    if (!selected && sorted.length > 0) setSelected(sorted[0].id);
  }, [sorted.length]);

  const handleCreate = () => {
    if (!newName.trim()) return;
    const p = onNewProject(newName.trim());
    setNewName('');
    setDialogOpen(false);
    onOpenProject(p);
  };

  const handleExportProject = (project: Project, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.replace(/\s+/g, '-').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Exported', description: `"${project.name}" saved.` });
  };

  const handleExportAll = () => {
    if (!projects.length) { toast({ title: 'Nothing to export' }); return; }
    const blob = new Blob([JSON.stringify(projects, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fieldnotes-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Exported', description: `${projects.length} project(s) saved.` });
  };

  const handleImport = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.fdx,.kitsp,.fountain,.txt,.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      if (file.name.endsWith('.json')) {
        try {
          const parsed = JSON.parse(await file.text());
          const toImport: Project[] = Array.isArray(parsed) ? parsed : [parsed];
          toImport.forEach(p => onImportProject(p));
          toast({ title: 'Imported', description: `Loaded ${toImport.length} project(s).` });
          if (toImport.length === 1) onOpenProject(toImport[0]);
        } catch { toast({ title: 'Import failed', variant: 'destructive' }); }
        return;
      }
      try {
        const result = await importFile(file);
        const name = file.name.replace(/\.[^/.]+$/, '');
        if (result.project) {
          onImportProject(result.project); onOpenProject(result.project);
          toast({ title: 'Imported', description: `Loaded "${result.project.name}"` });
        } else if (result.lines) {
          const p = onNewProject(name);
          const updated = { ...p, lines: result.lines };
          onImportProject(updated); onOpenProject(updated);
          toast({ title: 'Imported', description: `Parsed ${result.lines.length} lines.` });
        }
      } catch { toast({ title: 'Import failed', description: 'Could not parse file.', variant: 'destructive' }); }
    };
    input.click();
  };

  return (
    <div className="h-full flex bg-[#1c1c21] text-white overflow-hidden">

      {/* ── Left sidebar ── */}
      <div className="w-[220px] shrink-0 flex flex-col border-r border-white/8 bg-[#16161a]">
        <div className="px-4 pt-5 pb-4 border-b border-white/8">
          <h1 className="text-sm font-bold text-white tracking-tight">FieldNotes</h1>
          <p className="text-[10px] text-white/35 mt-0.5">Screenplay editor & breakdown</p>
        </div>

        <div className="px-2 py-2 space-y-0.5 border-b border-white/8">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <button className="w-full flex items-center gap-2 px-3 py-2 rounded text-xs font-medium text-white/75 hover:bg-white/8 hover:text-white transition-colors">
                <FilePlus className="w-3.5 h-3.5 text-[#4d9fff]" />
                New Project
              </button>
            </DialogTrigger>
            <DialogContent className="bg-[#1c1c21] border-white/10 text-white">
              <DialogHeader><DialogTitle className="text-white">New Project</DialogTitle></DialogHeader>
              <div className="space-y-3 pt-2">
                <Input
                  placeholder="Project title..."
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                  autoFocus
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
                <Button onClick={handleCreate} className="w-full" disabled={!newName.trim()}>
                  Create Project
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <button onClick={handleImport}
            className="w-full flex items-center gap-2 px-3 py-2 rounded text-xs font-medium text-white/75 hover:bg-white/8 hover:text-white transition-colors">
            <Upload className="w-3.5 h-3.5 text-white/40" />
            Open / Import
          </button>

          <button onClick={handleExportAll}
            className="w-full flex items-center gap-2 px-3 py-2 rounded text-xs font-medium text-white/75 hover:bg-white/8 hover:text-white transition-colors">
            <Download className="w-3.5 h-3.5 text-white/40" />
            Export All
          </button>
        </div>

        {/* project count */}
        <div className="px-4 pt-3 pb-1">
          <p className="text-[10px] font-semibold text-white/25 uppercase tracking-wider">
            Projects ({sorted.length})
          </p>
        </div>

        {/* project list in sidebar — just names for quick switching */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pb-2">
          {sorted.map(p => (
            <button
              key={p.id}
              onClick={() => setSelected(p.id)}
              onDoubleClick={() => onOpenProject(p)}
              className={cn(
                'w-full text-left px-4 py-2 transition-colors border-l-2',
                selected === p.id
                  ? 'bg-[#4d9fff]/12 border-[#4d9fff] text-white'
                  : 'border-transparent text-white/50 hover:text-white/80 hover:bg-white/5'
              )}
            >
              <span className="text-xs font-medium truncate block">{p.name}</span>
            </button>
          ))}
          {sorted.length === 0 && (
            <p className="text-[11px] text-white/20 px-4 py-3">No projects yet</p>
          )}
        </div>
      </div>

      {/* ── Right: main content ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Stats bar — only when a project is selected */}
        {selectedProject && (
          <div className="shrink-0 flex items-center gap-6 px-6 py-3 border-b border-white/8 bg-[#18181c]">
            {/* Project name */}
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-white truncate">{selectedProject.name}</h2>
              <p className="text-[10px] text-white/35 mt-0.5">
                {selectedProject.titlePage.writtenBy
                  ? `Written by ${selectedProject.titlePage.writtenBy} · `
                  : ''}
                {formatDateTime(selectedProject.updatedAt)}
              </p>
            </div>

            <div className="h-8 w-px bg-white/8" />

            {/* Stats */}
            <div className="flex items-center gap-5 shrink-0">
              <Stat icon={<Film className="w-3 h-3" />}
                value={selectedProject.lines.filter(l => l.type === 'scene-heading').length}
                label="Scenes" />
              <Stat icon={<FileText className="w-3 h-3" />}
                value={selectedProject.lines.filter(l => l.text.trim() && l.type !== 'non-printable').length}
                label="Lines" />
              <Stat icon={<Tag className="w-3 h-3" />}
                value={selectedProject.labels.length}
                label="Labels" />
              <Stat icon={<Camera className="w-3 h-3" />}
                value={(selectedProject.shots ?? []).length}
                label="Shots" />
            </div>

            <div className="h-8 w-px bg-white/8" />

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0 ml-auto">
              <button
                onClick={e => handleExportProject(selectedProject, e)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11px] text-white/45 hover:text-white/75 hover:bg-white/6 transition-colors"
              >
                <Download className="w-3 h-3" />Export
              </button>
              <button
                onClick={() => { onDeleteProject(selectedProject.id); setSelected(null); }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11px] text-red-400/50 hover:text-red-400 hover:bg-red-400/8 transition-colors"
              >
                <Trash2 className="w-3 h-3" />Delete
              </button>
              <button
                onClick={() => onOpenProject(selectedProject)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-semibold bg-[#4d9fff] hover:bg-[#3d8fee] text-white transition-colors"
              >
                <FolderOpen className="w-3 h-3" />Open
              </button>
            </div>
          </div>
        )}

        {/* ── Project grid ── */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          {sorted.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-5 text-center">
              <div className="w-12 h-12 rounded-xl bg-[#4d9fff]/12 flex items-center justify-center">
                <FileText className="w-6 h-6 text-[#4d9fff]" />
              </div>
              <div>
                <p className="text-sm font-medium text-white/60 mb-1">No projects yet</p>
                <p className="text-xs text-white/25">Create a new project or import a script to get started.</p>
              </div>
              <div className="flex gap-2">
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2 bg-[#4d9fff] hover:bg-[#3d8fee] text-white border-0 text-xs">
                      <FilePlus className="w-3.5 h-3.5" />New Project
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-[#1c1c21] border-white/10 text-white">
                    <DialogHeader><DialogTitle className="text-white">New Project</DialogTitle></DialogHeader>
                    <div className="space-y-3 pt-2">
                      <Input placeholder="Project title..." value={newName}
                        onChange={e => setNewName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleCreate()} autoFocus
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
                      <Button onClick={handleCreate} className="w-full" disabled={!newName.trim()}>Create Project</Button>
                    </div>
                  </DialogContent>
                </Dialog>
                <Button variant="outline" onClick={handleImport}
                  className="gap-2 border-white/10 bg-transparent text-white/60 hover:text-white hover:bg-white/6 text-xs">
                  <Upload className="w-3.5 h-3.5" />Import
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
              {sorted.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelected(p.id)}
                  onDoubleClick={() => onOpenProject(p)}
                  className={cn(
                    'text-left p-4 rounded-lg border transition-all group',
                    selected === p.id
                      ? 'bg-[#4d9fff]/10 border-[#4d9fff]/40 ring-1 ring-[#4d9fff]/30'
                      : 'bg-white/3 border-white/8 hover:bg-white/6 hover:border-white/15'
                  )}
                >
                  {/* icon + title */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className={cn(
                      'w-8 h-8 rounded-md flex items-center justify-center shrink-0 mt-0.5',
                      selected === p.id ? 'bg-[#4d9fff]/20' : 'bg-white/6'
                    )}>
                      <FileText className={cn('w-4 h-4', selected === p.id ? 'text-[#4d9fff]' : 'text-white/40')} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white truncate">{p.name}</div>
                      {p.titlePage.genre && (
                        <div className="text-[10px] text-white/35 mt-0.5 truncate">{p.titlePage.genre}</div>
                      )}
                    </div>
                  </div>

                  {/* mini stats */}
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-[10px] text-white/30">
                      {p.lines.filter(l => l.type === 'scene-heading').length} scenes
                    </span>
                    {(p.shots ?? []).length > 0 && (
                      <span className="text-[10px] text-white/30">
                        {(p.shots ?? []).length} shots
                      </span>
                    )}
                    {p.labels.length > 0 && (
                      <span className="text-[10px] text-white/30">
                        {p.labels.length} labels
                      </span>
                    )}
                  </div>

                  {/* date */}
                  <div className="flex items-center gap-1 text-[10px] text-white/25">
                    <Clock className="w-2.5 h-2.5" />
                    {formatDate(p.updatedAt)}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-white/30">{icon}</span>
      <span className="text-sm font-semibold text-white tabular-nums">{value}</span>
      <span className="text-[10px] text-white/30">{label}</span>
    </div>
  );
}
