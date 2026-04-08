import { useState, useEffect } from 'react';
import { Project } from '@/types/screenplay';
import { FilePlus, FileText, Trash2, Clock, Download, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { importFile } from '@/lib/screenplayImport';
import { useToast } from '@/hooks/use-toast';
import { needsWhiteText } from '@/hooks/useTheme';

interface HomeScreenProps {
  projects: Project[];
  onNewProject: (name: string) => Project;
  onOpenProject: (project: Project) => void;
  onDeleteProject: (id: string) => void;
  onImportProject: (project: Project) => void;
}

const HOME_DEFAULT_BG = '#3f4245';

function formatDateTime(ts: number): string {
  const d = new Date(ts);
  const date = d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
  const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  return `${date} · ${time}`;
}

export function HomeScreen({ projects, onNewProject, onOpenProject, onDeleteProject, onImportProject }: HomeScreenProps) {
  const [newName, setNewName] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const prev = document.body.style.backgroundColor;
    document.body.style.backgroundColor = HOME_DEFAULT_BG;
    return () => { document.body.style.backgroundColor = prev; };
  }, []);

  const textColor   = needsWhiteText(HOME_DEFAULT_BG) ? '#ffffff' : '#1a1a1a';
  const mutedColor  = needsWhiteText(HOME_DEFAULT_BG) ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.45)';
  const cardBg      = needsWhiteText(HOME_DEFAULT_BG) ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)';
  const cardBorder  = needsWhiteText(HOME_DEFAULT_BG) ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)';

  const handleCreate = () => {
    if (!newName.trim()) return;
    const p = onNewProject(newName.trim());
    setNewName('');
    setDialogOpen(false);
    onOpenProject(p);
  };

  const handleExportAll = () => {
    if (projects.length === 0) {
      toast({ title: 'Nothing to export', description: 'Create a project first.' });
      return;
    }
    const json = JSON.stringify(projects, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scriptsmith-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Exported', description: `${projects.length} project(s) saved.` });
  };

  const handleExportProject = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    const json = JSON.stringify(project, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.replace(/\s+/g, '-').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Exported', description: `"${project.name}" saved.` });
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
          const text = await file.text();
          const parsed = JSON.parse(text);
          const projectsToImport: Project[] = Array.isArray(parsed) ? parsed : [parsed];
          projectsToImport.forEach(p => onImportProject(p));
          toast({ title: 'Imported', description: `Loaded ${projectsToImport.length} project(s).` });
          if (projectsToImport.length === 1) onOpenProject(projectsToImport[0]);
        } catch {
          toast({ title: 'Import failed', description: 'Invalid JSON file.', variant: 'destructive' });
        }
        return;
      }
      try {
        const result = await importFile(file);
        const name = file.name.replace(/\.[^/.]+$/, '');
        if (result.project) {
          onImportProject(result.project);
          onOpenProject(result.project);
          toast({ title: 'Imported', description: `Loaded "${result.project.name}"` });
        } else if (result.lines) {
          const p = onNewProject(name);
          const updatedProject = { ...p, lines: result.lines };
          onImportProject(updatedProject);
          onOpenProject(updatedProject);
          toast({ title: 'Imported', description: `Parsed ${result.lines.length} lines from "${file.name}"` });
        }
      } catch {
        toast({ title: 'Import failed', description: 'Could not parse the file.', variant: 'destructive' });
      }
    };
    input.click();
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center pt-20 px-4"
      style={{ backgroundColor: HOME_DEFAULT_BG, color: textColor }}
    >
      <div className="max-w-2xl w-full animate-fade-in">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight mb-2" style={{ color: textColor }}>ScriptCraft</h1>
          <p className="text-lg" style={{ color: mutedColor }}>Professional screenplay editor & breakdown tool</p>
        </div>

        <div className="flex gap-3 justify-center mb-12 flex-wrap">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="gap-2"><FilePlus className="w-5 h-5" />New Project</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Project</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <Input
                  placeholder="Project title..."
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                  autoFocus
                />
                <Button onClick={handleCreate} className="w-full" disabled={!newName.trim()}>Create Project</Button>
              </div>
            </DialogContent>
          </Dialog>

          <Button variant="outline" size="lg" className="gap-2" onClick={handleImport}>
            <Upload className="w-5 h-5" />Import
          </Button>

          <Button variant="outline" size="lg" className="gap-2" onClick={handleExportAll}>
            <Download className="w-5 h-5" />Export All
          </Button>
        </div>

        {projects.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-medium uppercase tracking-wider mb-4" style={{ color: mutedColor }}>
              Recent Projects
            </h2>
            {[...projects]
              .sort((a, b) => b.updatedAt - a.updatedAt)
              .map(p => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-4 rounded-lg cursor-pointer group transition-colors"
                  style={{ backgroundColor: cardBg, border: `1px solid ${cardBorder}` }}
                  onClick={() => onOpenProject(p)}
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 shrink-0" style={{ color: mutedColor }} />
                    <div>
                      <div className="font-medium" style={{ color: textColor }}>{p.name}</div>
                      <div className="text-xs flex items-center gap-1 mt-0.5" style={{ color: mutedColor }}>
                        <Clock className="w-3 h-3 shrink-0" />
                        {formatDateTime(p.updatedAt)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="sm" style={{ color: mutedColor }} onClick={e => handleExportProject(e, p)} title="Export">
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={e => { e.stopPropagation(); onDeleteProject(p.id); }} title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
