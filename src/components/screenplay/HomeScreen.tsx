import { useState } from 'react';
import { Project } from '@/types/screenplay';
import { FilePlus, FileText, Trash2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { importFile } from '@/lib/screenplayImport';
import { useToast } from '@/hooks/use-toast';

interface HomeScreenProps {
  projects: Project[];
  onNewProject: (name: string) => Project;
  onOpenProject: (project: Project) => void;
  onDeleteProject: (id: string) => void;
  onImportProject: (project: Project) => void;
}

export function HomeScreen({ projects, onNewProject, onOpenProject, onDeleteProject, onImportProject }: HomeScreenProps) {
  const [newName, setNewName] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const handleCreate = () => {
    if (!newName.trim()) return;
    const p = onNewProject(newName.trim());
    setNewName('');
    setDialogOpen(false);
    onOpenProject(p);
  };

  const handleImport = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.fdx,.kitsp,.fountain,.txt';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      try {
        const result = await importFile(file);
        const name = file.name.replace(/\.[^/.]+$/, '');

        if (result.project) {
          // Full project import (kitsp)
          onImportProject(result.project);
          onOpenProject(result.project);
          toast({ title: 'Imported', description: `Loaded project "${result.project.name}"` });
        } else if (result.lines) {
          // Lines-only import
          const p = onNewProject(name);
          // We need to update the project lines
          const updatedProject = { ...p, lines: result.lines };
          onImportProject(updatedProject);
          onOpenProject(updatedProject);
          toast({ title: 'Imported', description: `Parsed ${result.lines.length} lines from "${file.name}"` });
        }
      } catch (err) {
        toast({ title: 'Import failed', description: 'Could not parse the file.', variant: 'destructive' });
      }
    };
    input.click();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center pt-20 px-4">
      <div className="max-w-2xl w-full animate-fade-in">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight text-foreground mb-2">ScriptCraft</h1>
          <p className="text-muted-foreground text-lg">Professional screenplay editor & breakdown tool</p>
        </div>

        <div className="flex gap-3 justify-center mb-12">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="gap-2">
                <FilePlus className="w-5 h-5" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Project</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <Input
                  placeholder="Project title..."
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                  autoFocus
                />
                <Button onClick={handleCreate} className="w-full" disabled={!newName.trim()}>
                  Create Project
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Button variant="outline" size="lg" className="gap-2" onClick={handleImport}>
            <FileText className="w-5 h-5" />
            Import Script
          </Button>
        </div>

        {projects.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Recent Projects</h2>
            {projects
              .sort((a, b) => b.updatedAt - a.updatedAt)
              .map(p => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-card border border-border hover:border-primary/30 transition-colors cursor-pointer group"
                  onClick={() => onOpenProject(p)}
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <div className="font-medium text-foreground">{p.name}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(p.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                    onClick={e => { e.stopPropagation(); onDeleteProject(p.id); }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
